'use strict';

const { executerActionComposio } = require('./composio');
const { resoudreRoutage, televerserFichierComposio } = require('../../../lib/composio-canal');
const reglagesComptes = require('../reglages-comptes.json');

/**
 * Point d'entree public de publication du carrousel.
 *
 * CE QUI N'A PAS CHANGE au 17/09/2026 : aucune des 24 actions du toolkit
 * `linkedin` de Composio ne depose un document/PDF multi-pages (verifie le
 * 11/09/2026, voir references/actions-composio.md). Cette fonction ne publie
 * donc jamais le PDF du carrousel tel quel -- elle publie une IMAGE
 * (couverture ou par-diapo, voir generer-images.js) via le repli documente le
 * 12/09/2026.
 *
 * CE QUI A CHANGE : ce repli est desormais reellement fonctionnel pour
 * julien-partners (canal REST/ak_, connected_account_id ca_vn1-dhh8VcYf) --
 * voir televerserFichierComposio dans lib/composio-canal.js, qui corrige
 * l'impasse du 12/09/2026 (LINKEDIN_CREATE_LINKED_IN_POST.images exige un
 * FileUploadable {name, mimetype, s3key}, pas l'URN simple que produisait
 * l'ancienne methode LINKEDIN_REGISTER_IMAGE_UPLOAD).
 *
 * julien-agency reste sur le canal MCP/ck_ (voir lib/composio-canal.js,
 * ROUTAGE_COMPTES) -- non implemente ICI : ce fichier n'a jamais teste de
 * publication d'image reelle via MCP (contrairement a linkedin-commentaires
 * pour les commentaires), donc il refuse explicitement plutot que de
 * pretendre que ca marche.
 */
async function publierCarrousel({ compte, modeRepli, cheminsImages, commentary, userId, apiKey }) {
  if (!compte) throw new Error('compte requis ("julien-agency" ou "julien-partners").');

  const reglages = reglagesComptes[compte];
  if (!reglages) {
    throw new Error(`Compte inconnu dans reglages-comptes.json : "${compte}".`);
  }
  if (reglages.canal_publication_reel !== true) {
    throw new Error(
      `Publication refusee pour "${compte}" : canal_publication_reel n'est pas a true dans ` +
      'reglages-comptes.json (voir la note associee pour la raison -- connexion non verifiee, ' +
      'chantier abandonne, etc.). Ne pas contourner ce garde-fou.'
    );
  }

  const routage = resoudreRoutage(compte);
  if (routage.canal !== 'rest') {
    throw new Error(
      `publierCarrousel() : le compte "${compte}" route vers le canal "${routage.canal}", non implemente ` +
      'pour la publication d\'image dans ce fichier -- seul le canal "rest" (julien-partners) l\'est a ce ' +
      'jour. Voir lib/composio-canal.js (ROUTAGE_COMPTES) et le commentaire en tete de ce fichier.'
    );
  }

  return publierCarrouselViaImage({
    authorUrn: routage.authorUrn,
    connectedAccountId: routage.connectedAccountId,
    modeRepli,
    cheminsImages,
    commentary,
    userId: userId || routage.userId,
    apiKey,
  });
}

/**
 * Televerse une image locale vers le stockage Composio et renvoie le
 * descripteur FileUploadable ({name, mimetype, s3key}) attendu par
 * LINKEDIN_CREATE_LINKED_IN_POST.images -- voir televerserFichierComposio
 * dans lib/composio-canal.js pour le detail du protocole (endpoint
 * /api/v3/files/upload/request, confirme fonctionnel le 17/09/2026 avec une
 * cle de projet ak_ reelle).
 */
async function televerserImageComposio({ cheminImage, apiKey }) {
  return televerserFichierComposio({
    cheminFichier: cheminImage,
    mimetype: 'image/png',
    toolSlug: 'LINKEDIN_CREATE_LINKED_IN_POST',
    toolkitSlug: 'linkedin',
    apiKey,
  });
}

/**
 * Publication reelle du repli image. `cheminsImages` doit venir de
 * generer-images.js : un seul chemin pour `modeRepli: 'couverture'`,
 * plusieurs pour `modeRepli: 'par-diapo'`.
 */
async function publierCarrouselViaImage({ authorUrn, connectedAccountId, modeRepli, cheminsImages, commentary, userId, apiKey }) {
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

  const fichiers = [];
  for (const cheminImage of cheminsImages) {
    fichiers.push(await televerserImageComposio({ cheminImage, apiKey }));
  }

  return executerActionComposio('LINKEDIN_CREATE_LINKED_IN_POST', {
    arguments: { author: authorUrn, commentary, images: fichiers },
    userId,
    apiKey,
    connectedAccountId,
  });
}

/**
 * Fallback documente, non appele par defaut : resout l'URN d'un compte
 * personnel via LINKEDIN_GET_MY_INFO (ne fonctionne pas pour une
 * organisation -- utiliser LINKEDIN_GET_COMPANY_INFO dans ce cas, bloque en
 * 403 au 11/09/2026 pour page-claude).
 */
async function resoudreAuteurParDefaut({ userId, apiKey, connectedAccountId }) {
  const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', {
    arguments: {},
    userId,
    apiKey,
    connectedAccountId,
  });
  const id = resultat && resultat.data && resultat.data.id;
  if (!id) throw new Error(`LINKEDIN_GET_MY_INFO n'a pas renvoye d'id exploitable : ${JSON.stringify(resultat)}`);
  return `urn:li:person:${id}`;
}

module.exports = { publierCarrousel, publierCarrouselViaImage, resoudreAuteurParDefaut };
