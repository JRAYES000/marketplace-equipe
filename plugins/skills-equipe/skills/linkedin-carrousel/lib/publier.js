'use strict';

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
 * REPLI POSSIBLE, NON IMPLEMENTE -- documente le 11/09/2026 pour que
 * l'information soit prete des que Julien tranche. Ne pas coder tant qu'il
 * n'a pas choisi entre les deux options ci-dessous (ou confirme qu'il
 * prefere garder le PDF deposé a la main).
 *
 * Contrairement au document/PDF (aucune action ne le gere, voir
 * publierCarrousel ci-dessus), le toolkit `linkedin` de Composio gere bien
 * l'IMAGE, verifie dans references/actions-composio.md (catalogue des 24
 * actions, section LINKEDIN_REGISTER_IMAGE_UPLOAD / LINKEDIN_CREATE_LINKED_IN_POST) :
 *
 *   1. `LINKEDIN_REGISTER_IMAGE_UPLOAD` (parametre requis `owner_urn`) ou
 *      `LINKEDIN_INITIALIZE_IMAGE_UPLOAD` (parametre requis `owner`) --
 *      initialise un televersement natif et renvoie une URL presignee
 *      (`upload_url`) plus l'URN de l'asset image resultant.
 *   2. Televerser les octets de l'image sur `upload_url` via une requete PUT
 *      (etape hors Composio, HTTP direct).
 *   3. Appeler `LINKEDIN_CREATE_LINKED_IN_POST` avec son parametre optionnel
 *      `images` renseigne avec l'URN obtenue a l'etape 1 -- ce parametre
 *      existe deja dans le schema de l'action (a cote de `author`/`commentary`
 *      qui sont requis), aucune action supplementaire a decouvrir.
 *
 * Deux formes de repli possibles avec ce mecanisme, aucune choisie pour
 * l'instant :
 *   (a) Une image par diapo : convertir chaque page du PDF genere par
 *       generer-pdf.js en PNG, televerser chacune (etapes 1-2 repetees), puis
 *       les passer toutes dans `images` du meme post -- a verifier par test
 *       si l'action accepte plusieurs URN dans ce tableau (le nom du
 *       parametre au pluriel le suggere, non confirme ici).
 *   (b) Une image de couverture unique : ne televerser que le rendu de la
 *       premiere diapo, et renvoyer vers le PDF complet via le texte du post
 *       (`commentary`) ou un lien externe -- perd le format carrousel
 *       feuilletable, mais publiable immediatement sans depot manuel.
 *
 * Ni (a) ni (b) n'est implemente ici : le choix (et son cout en temps de
 * developpement, notamment pour (a) qui suppose un rendu PNG par page en
 * plus du PDF) revient a Julien.
 */

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

module.exports = { publierCarrousel, resoudreAuteurParDefaut };
