'use strict';

const fs = require('fs');
const { executerActionComposio } = require('./composio');

/**
 * SEUL point d'appel destine a publier reellement le carrousel sur LinkedIn.
 * Isole ici a dessein, meme s'il ne peut pas encore aboutir -- voir le constat
 * ci-dessous.
 *
 * `authorUrn` est un parametre substituable, volontairement generique :
 *   - `urn:li:person:<id>` pour julien-partners ou julien-agency (verifies
 *     par Julien le 11/09/2026, voir reglages-comptes.json).
 *   - `urn:li:organization:<id>` pour page-claude, une fois l'autorisation
 *     d'organisation validee cote LinkedIn (403 sur LINKEDIN_GET_COMPANY_INFO
 *     au 11/09/2026, Julien s'en occupe). Il suffira de brancher cette URN
 *     ici, aucune autre modification de cette fonction n'est necessaire.
 *
 * CONSTAT (11/09/2026, verifie dans references/actions-composio.md) : le
 * catalogue des 24 actions du toolkit `linkedin` de Composio ne contient
 * AUCUNE action pour deposer un document/PDF (l'equivalent d'un "carrousel"
 * LinkedIn). Les actions les plus proches --
 * `LINKEDIN_REGISTER_IMAGE_UPLOAD`/`LINKEDIN_INITIALIZE_IMAGE_UPLOAD` -- ne
 * gerent que des IMAGES, pas des documents PDF multi-pages, et
 * `LINKEDIN_CREATE_LINKED_IN_POST` n'accepte que `images[]`, pas de champ
 * document. Coherent avec un constat deja fait cote visibilite-ops
 * (JOURNAL.md, 04/09) : la passerelle Composio n'a jamais su deposer une
 * image sur un post, les posts illustres ont ete abandonnes pour cette
 * raison. Cette fonction leve donc une erreur explicite plutot que de
 * pretendre publier quelque chose qui ne correspond pas au carrousel reel.
 */
async function publierCarrousel({ authorUrn, cheminPdf }) {
  throw new Error(
    'publierCarrousel() : aucune action Composio ne permet de deposer un document/PDF sur ' +
    'LinkedIn au 11/09/2026 (verifie sur les 24 actions du toolkit linkedin, voir ' +
    'references/actions-composio.md). Publication a faire manuellement pour l\'instant : ' +
    `PDF pret dans ${cheminPdf || 'sortants/<compte>/'}, a deposer a la main sur LinkedIn ` +
    `en tant que "document post" pour ${authorUrn || '<authorUrn>'}.`
  );
}

/**
 * REPLI IMAGE -- code reellement implemente le 12/09/2026, mais AUCUN appel
 * automatique nulle part dans ce paquet : ni CLI, ni main(), ni appel depuis
 * publierCarrousel ci-dessus. `publierCarrouselViaImage` n'est invoquee que si
 * quelqu'un l'appelle explicitement avec un `modeRepli` -- tant que Julien n'a
 * pas tranche entre "par-diapo" et "couverture" (ou confirme qu'il garde le
 * PDF depose a la main), cette fonction reste inerte. Objectif : le jour ou il
 * tranche, il n'y a plus qu'a l'appeler avec le bon `modeRepli`, rien a coder.
 *
 * Rendu local des images (verifie sans aucun appel Composio, voir
 * generer-images.js et test/generer-images.test.js -- 1080x1350px, meme
 * gabarit HTML que le PDF) : `genererImagesParDiapo` (une image par diapo,
 * option a) et `genererImageCouverture` (une seule image, la diapo "hook" ou
 * la premiere, option b). Cette fonction-ci ne fait QUE la partie Composio :
 * televerser des images DEJA rendues localement, puis creer le post.
 *
 *   1. `LINKEDIN_REGISTER_IMAGE_UPLOAD` (parametre requis `owner_urn`) --
 *      initialise un televersement natif et renvoie une URL presignee
 *      (`upload_url`) plus l'URN de l'asset image resultant. Noms de champs
 *      de la reponse non confirmes par un appel reel (le catalogue public
 *      documente les parametres d'entree, pas le detail de la sortie) --
 *      `televerserImageComposio` ci-dessous essaie plusieurs noms plausibles
 *      et echoue explicitement si aucun ne correspond, plutot que de
 *      pretendre a tort avoir recupere une URN.
 *   2. Televerser les octets de l'image sur `upload_url` via une requete PUT
 *      (etape hors Composio, HTTP direct).
 *   3. Appeler `LINKEDIN_CREATE_LINKED_IN_POST` avec son parametre optionnel
 *      `images` renseigne avec l'URN (ou les URN) obtenues a l'etape 1.
 *
 * Point non verifie par un appel reel : est-ce que `images` accepte plusieurs
 * URN (necessaire pour le mode "par-diapo") ? Le nom au pluriel le suggere,
 * ce n'est pas confirme. Si un appel reel un jour montre que non, le mode
 * "par-diapo" devra republier une image a la fois (plusieurs posts) ou etre
 * abandonne au profit du mode "couverture" -- pas un changement d'ici la.
 */
async function televerserImageComposio({ ownerUrn, cheminImage, userId, apiKey }) {
  const initialisation = await executerActionComposio('LINKEDIN_REGISTER_IMAGE_UPLOAD', {
    arguments: { owner_urn: ownerUrn },
    userId,
    apiKey,
  });

  const donnees = (initialisation && initialisation.data) || {};
  const uploadUrl = donnees.upload_url || donnees.uploadUrl;
  const assetUrn = donnees.asset || donnees.asset_urn || donnees.assetUrn || donnees.image_urn || donnees.imageUrn;
  if (!uploadUrl || !assetUrn) {
    throw new Error(
      `LINKEDIN_REGISTER_IMAGE_UPLOAD n'a pas renvoye upload_url/asset exploitables ` +
      `(noms de champs reels a verifier sur un appel reussi) : ${JSON.stringify(initialisation)}`
    );
  }

  const octets = fs.readFileSync(cheminImage);
  const reponsePut = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png' },
    body: octets,
  });
  if (!reponsePut.ok) {
    throw new Error(`PUT de ${cheminImage} vers l'URL presignee a echoue (HTTP ${reponsePut.status}).`);
  }

  return assetUrn;
}

/**
 * Point d'appel du repli image -- NON appele automatiquement (voir
 * commentaire ci-dessus). `cheminsImages` doit venir de generer-images.js :
 * un seul chemin pour `modeRepli: 'couverture'`, plusieurs pour
 * `modeRepli: 'par-diapo'`.
 */
async function publierCarrouselViaImage({ authorUrn, modeRepli, cheminsImages, commentary, userId, apiKey }) {
  if (!authorUrn) throw new Error('authorUrn requis (urn:li:person:... ou urn:li:organization:...).');
  if (modeRepli !== 'par-diapo' && modeRepli !== 'couverture') {
    throw new Error('modeRepli requis : "par-diapo" ou "couverture".');
  }
  if (!Array.isArray(cheminsImages) || cheminsImages.length === 0) {
    throw new Error('cheminsImages requis : tableau non vide de chemins PNG locaux (voir generer-images.js).');
  }
  if (modeRepli === 'couverture' && cheminsImages.length !== 1) {
    throw new Error('modeRepli "couverture" attend exactement une image dans cheminsImages.');
  }
  if (!commentary) throw new Error('commentary requis (texte du post).');

  const assetUrns = [];
  for (const cheminImage of cheminsImages) {
    assetUrns.push(await televerserImageComposio({ ownerUrn: authorUrn, cheminImage, userId, apiKey }));
  }

  return executerActionComposio('LINKEDIN_CREATE_LINKED_IN_POST', {
    arguments: { author: authorUrn, commentary, images: assetUrns },
    userId,
    apiKey,
  });
}

/**
 * Fallback documente, non appele par defaut : resout l'URN d'un compte
 * personnel via LINKEDIN_GET_MY_INFO (ne fonctionne pas pour une
 * organisation -- utiliser LINKEDIN_GET_COMPANY_INFO dans ce cas, bloque en
 * 403 au 11/09/2026 pour page-claude).
 */
async function resoudreAuteurParDefaut({ userId, apiKey }) {
  const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', {
    arguments: {},
    userId,
    apiKey,
  });
  const id = resultat && resultat.data && resultat.data.id;
  if (!id) throw new Error(`LINKEDIN_GET_MY_INFO n'a pas renvoye d'id exploitable : ${JSON.stringify(resultat)}`);
  return `urn:li:person:${id}`;
}

module.exports = { publierCarrousel, publierCarrouselViaImage, resoudreAuteurParDefaut };
