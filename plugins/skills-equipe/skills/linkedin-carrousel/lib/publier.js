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
 *      (`upload_url`) plus l'URN de l'asset image resultant. CONFIRME par
 *      appel reel le 12/09/2026 (julien-agency) : la reponse contient bien
 *      `upload_url`/`asset_urn`, et l'appel de `LINKEDIN_REGISTER_IMAGE_UPLOAD`
 *      via ce chemin reussit.
 *   2. Televerser les octets de l'image sur `upload_url` via une requete PUT
 *      (etape hors Composio, HTTP direct). CONFIRME par appel reel le
 *      12/09/2026 : `201 Created`.
 *   3. Appeler `LINKEDIN_CREATE_LINKED_IN_POST` avec son parametre optionnel
 *      `images` renseigne avec l'URN obtenue a l'etape 1.
 *
 * **ETAPE 3 CONFIRMEE CASSEE par appel reel le 12/09/2026** (julien-agency,
 * mode "couverture", tentative de publication reelle -- aucun post cree,
 * echec propre en amont) : `LINKEDIN_CREATE_LINKED_IN_POST.images` n'accepte
 * PAS une URN d'asset en chaine simple. Le schema reel (recupere via
 * `COMPOSIO_GET_TOOL_SCHEMAS` sur le canal MCP) exige, pour chaque element
 * du tableau `images`, un objet `{ name, mimetype, s3key }` -- un fichier
 * deja stocke dans le S3/R2 propre a Composio, pas une URN LinkedIn native.
 * Erreur reelle obtenue : `400 "Invalid request data provided - Input
 * should be a valid dictionary or instance of FileUploadable on parameter
 * images.0"`. Consequence : `televerserImageComposio` ci-dessous produit
 * bien une URN LinkedIn valide (etapes 1-2 fonctionnent), mais cette URN
 * est **inutilisable telle quelle** a l'etape 3 -- `publierCarrouselViaImage`
 * echouera systematiquement a la creation du post tant que ce point n'est
 * pas corrige.
 *
 * PISTE INVESTIGUEE LE 12/09/2026, IMPASSE CONFIRMEE (pas un blocage du
 * classifieur cette fois -- une vraie reponse d'API) : le SDK Python officiel
 * de Composio (`ComposioHQ/composio`, `python/composio/core/models/_files.py`,
 * lu publiquement via `gh api` sans authentification) construit un
 * `FileUploadable` en deux etapes : (1) `POST /api/v3/files/upload/request`
 * sur `backend.composio.dev` (body `{ md5, filename, mimetype, tool_slug,
 * toolkit_slug }`) renvoie une URL S3 presignee + une cle ; (2) PUT des
 * octets bruts du fichier sur cette URL (pas de base64 -- meme primitive PUT
 * que l'etape 2 ci-dessus, deja validee). Teste reellement le 12/09/2026 :
 * cet endpoint refuse la cle "consumer" MCP (`x-consumer-api-key` -> 401
 * `Auth_NoAuthProvided` ; la meme valeur en `x-api-key` -> 401
 * `APIKey_InvalidAPIKey`, prefixe `ck_` non reconnu comme cle de projet). Il
 * exige une veritable `COMPOSIO_API_KEY` de projet (prefixe `ak_`),
 * indisponible dans cet environnement -- et celle deja documentee dans
 * `references/actions-composio.md` (`ak_nz4gKAqnX4jAEOmXJ9jG`) appartient a
 * un projet Composio sans aucune connexion LinkedIn, donc ne resoudrait pas
 * le probleme meme si on l'avait ici. Aucun outil MCP accessible via la cle
 * consumer n'expose cette etape de televersement autrement (le seul chemin
 * indirect, `COMPOSIO_REMOTE_WORKBENCH`/`upload_local_file`, suppose de
 * faire entrer les octets locaux dans son bac a sable distant -- tente via
 * encodage base64, bloque par le classifieur auto-mode, non contourne).
 * **A ce jour, aucun chemin legitime connu ne permet de terminer cette etape
 * avec les acces disponibles dans une session Claude Code.** A debloquer par
 * une `COMPOSIO_API_KEY` de projet couvrant a la fois `averse-cooser` et cet
 * endpoint de fichiers, ou par un mecanisme MCP equivalent que Composio
 * n'expose pas encore a ce jour.
 *
 * Point toujours non verifie (bloque par le point ci-dessus avant de pouvoir
 * l'observer) : est-ce que `images` accepte plusieurs elements a la fois
 * (necessaire pour le mode "par-diapo") ? Le nom au pluriel le suggere, ce
 * n'est pas confirme.
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

  // CONFIRME CASSE par appel reel le 12/09/2026 (julien-agency, mode
  // "couverture") -- voir le commentaire au-dessus de televerserImageComposio
  // pour le detail complet (erreur reelle obtenue, schema reel recupere via
  // COMPOSIO_GET_TOOL_SCHEMAS). LINKEDIN_CREATE_LINKED_IN_POST.images exige
  // { name, mimetype, s3key } (stockage S3 propre a Composio), pas une URN
  // d'asset LinkedIn simple -- la seule chose que televerserImageComposio
  // ci-dessous sait produire. Le garde-fou est place ICI, avant tout appel
  // reseau reel, pour ne pas re-televerser inutilement une image sur
  // LinkedIn (etapes 1-2 fonctionnent, mais leur resultat est ensuite
  // inutilisable) a chaque tentative tant que ce point n'est pas corrige.
  throw new Error(
    'Repli image (publierCarrouselViaImage) : LINKEDIN_CREATE_LINKED_IN_POST.images exige {name, mimetype, ' +
    's3key} (stockage S3 propre a Composio), confirme par un appel reel le 12/09/2026 -- une URN ' +
    'LinkedIn simple (ce que televerserImageComposio produit) est refusee (400 "images.0" doit ' +
    'etre un FileUploadable). Voir le commentaire au-dessus de televerserImageComposio avant de ' +
    'corriger et retenter.'
  );

  // eslint-disable-next-line no-unreachable -- code laisse en place, pret a
  // reactiver des que l'etape 3 (creation du post) est corrigee pour passer
  // par le stockage S3 de Composio plutot qu'une URN LinkedIn simple.
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
