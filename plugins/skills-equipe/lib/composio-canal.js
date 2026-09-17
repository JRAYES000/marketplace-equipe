'use strict';

/**
 * Selection du canal Composio par compte, partagee entre linkedin-carrousel et
 * linkedin-commentaires.
 *
 * Decision actee le 17/09/2026, apres verification reelle (GET
 * /api/v3/connected_accounts sur le projet de la cle "ak_" -- voir
 * references/actions-composio.md) :
 *  - julien-agency reste sur le canal MCP consumer ("ck_",
 *    connect.composio.dev/mcp) : seule connexion reellement active et
 *    testee en conditions reelles pour ce compte (5 commentaires publies le
 *    15/09/2026, connexion "averse-cooser" / aFqu-W7ClW). Aucune connexion
 *    pour ce compte n'existe sur le projet "ak_" (8 connexions listees le
 *    17/09/2026, aucune n'est aFqu-W7ClW).
 *  - julien-partners passe sur le canal REST direct ("ak_",
 *    backend.composio.dev/api/v3.1) avec connected_account_id explicite :
 *    seule connexion LinkedIn au statut ACTIVE trouvee sur le projet "ak_"
 *    (ca_vn1-dhh8VcYf, contact@claudepartners.fr).
 *
 * Ne pas ajouter ou deplacer un compte ici sans avoir verifie sa connexion
 * reelle sur le canal vise (GET /api/v3/connected_accounts pour REST,
 * COMPOSIO_SEARCH_TOOLS ou un appel LINKEDIN_GET_MY_INFO reel pour MCP) --
 * voir references/actions-composio.md pour la methode complete.
 */
const ROUTAGE_COMPTES = Object.freeze({
  'julien-agency': Object.freeze({
    canal: 'mcp',
    authorUrn: 'urn:li:person:aFqu-W7ClW',
  }),
  'julien-partners': Object.freeze({
    canal: 'rest',
    authorUrn: 'urn:li:person:ZvLHybJZhj',
    connectedAccountId: 'ca_vn1-dhh8VcYf',
    // Requis par le REST direct des qu'un connected_account_id est fourni sur une action
    // d'ecriture (voir entity_id dans executerActionRest) -- c'est le user_id Composio du
    // proprietaire du projet ("julien"), pas un identifiant LinkedIn. Verifie le 17/09/2026
    // via GET /api/v3/connected_accounts (champ user_id de ca_vn1-dhh8VcYf).
    userId: 'julien',
  }),
});

function resoudreRoutage(compte) {
  const routage = ROUTAGE_COMPTES[compte];
  if (!routage) {
    throw new Error(
      `Compte Composio inconnu : "${compte}". Comptes geres : ${Object.keys(ROUTAGE_COMPTES).join(', ')}. ` +
      'Ajouter une entree dans ROUTAGE_COMPTES (plugins/skills-equipe/lib/composio-canal.js) ' +
      'seulement apres verification reelle de la connexion sur le canal vise.'
    );
  }
  return routage;
}

/**
 * Retrouve le nom de compte a partir de son authorUrn/actorUrn -- permet aux
 * appelants existants qui ne connaissent qu'une URN (pas le nom de compte) de
 * beneficier du routage sans changer leur signature.
 */
function resoudreCompteParUrn(urn) {
  const entree = Object.entries(ROUTAGE_COMPTES).find(([, routage]) => routage.authorUrn === urn);
  if (!entree) {
    throw new Error(
      `Aucun compte connu pour l'URN "${urn}". Voir ROUTAGE_COMPTES dans ` +
      'plugins/skills-equipe/lib/composio-canal.js.'
    );
  }
  return entree[0];
}

/**
 * Appel bas niveau REST direct (couche PLATFORM, cle "ak_...",
 * POST /api/v3.1/tools/execute/<slug>). Deplace ici le 17/09/2026 depuis
 * linkedin-carrousel/lib/composio.js pour etre partage avec
 * linkedin-commentaires (compte julien-partners) -- comportement inchange.
 */
async function executerActionRest(slug, { arguments: args = {}, userId, apiKey, connectedAccountId } = {}) {
  const cle = apiKey || process.env.COMPOSIO_API_KEY;
  if (!cle) {
    throw new Error('COMPOSIO_API_KEY manquant (variable d\'environnement ou parametre apiKey).');
  }

  const corps = { arguments: args };
  if (userId) {
    corps.user_id = userId;
    // Requis par certaines actions d'ecriture (ex. LINKEDIN_CREATE_LINKED_IN_POST) quand
    // connected_account_id est fourni -- confirme par erreur reelle le 17/09/2026
    // (HTTP 400 ActionExecute_ConnectedAccountEntityIdRequired, "Pass entity_id (your user
    // identifier) in the request body along with connected_account_id"). Absent, ce n'est
    // pas repris en compte par l'API : sans effet sur les actions qui n'en ont pas besoin.
    if (connectedAccountId) corps.entity_id = userId;
  }
  if (connectedAccountId) corps.connected_account_id = connectedAccountId;

  const reponse = await fetch(`https://backend.composio.dev/api/v3.1/tools/execute/${slug}`, {
    method: 'POST',
    headers: { 'x-api-key': cle, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });

  const texteBrut = await reponse.text();
  let json;
  try {
    json = texteBrut ? JSON.parse(texteBrut) : {};
  } catch (erreur) {
    const err = new Error(
      `Composio ${slug} a repondu ${reponse.status} avec un corps qui n'est pas du JSON exploitable ` +
      `(${erreur.message}). Debut du corps recu : "${texteBrut.slice(0, 200)}".`
    );
    err.httpStatus = reponse.status;
    throw err;
  }
  if (!reponse.ok || json.successful === false) {
    const err = new Error(`Composio ${slug} a echoue (HTTP ${reponse.status}) : ${JSON.stringify(json)}`);
    err.httpStatus = reponse.status;
    err.reponse = json;
    throw err;
  }
  return json;
}

/**
 * Televerse un fichier local vers le stockage S3/R2 propre a Composio et
 * renvoie le descripteur FileUploadable ({name, mimetype, s3key}) attendu par
 * les parametres de type fichier des actions Composio (ex.
 * LINKEDIN_CREATE_LINKED_IN_POST.images) -- confirme fonctionnel le
 * 17/09/2026 avec une cle de projet "ak_" reelle (POST
 * /api/v3/files/upload/request -> 200, PUT sur l'URL S3 presignee -> 200).
 *
 * Corrige une impasse documentee le 12/09/2026 : la methode alors utilisee
 * (LINKEDIN_REGISTER_IMAGE_UPLOAD + PUT sur l'URL LinkedIn native) produit une
 * URN LinkedIn simple, refusee par LINKEDIN_CREATE_LINKED_IN_POST.images (400
 * "doit etre un FileUploadable"). Cette fonction-ci passe par le bon
 * endpoint -- celui que le SDK Python officiel de Composio utilise.
 */
async function televerserFichierComposio({ cheminFichier, mimetype, toolSlug, toolkitSlug, apiKey }) {
  const cle = apiKey || process.env.COMPOSIO_API_KEY;
  if (!cle) {
    throw new Error('COMPOSIO_API_KEY manquant pour televerserFichierComposio (variable d\'environnement ou parametre apiKey).');
  }

  const fs = require('fs');
  const crypto = require('crypto');
  const path = require('path');

  const octets = fs.readFileSync(cheminFichier);
  const md5 = crypto.createHash('md5').update(octets).digest('hex');
  const filename = path.basename(cheminFichier);

  const reponseRequest = await fetch('https://backend.composio.dev/api/v3/files/upload/request', {
    method: 'POST',
    headers: { 'x-api-key': cle, 'Content-Type': 'application/json' },
    body: JSON.stringify({ md5, filename, mimetype, tool_slug: toolSlug, toolkit_slug: toolkitSlug }),
  });
  if (!reponseRequest.ok) {
    const texte = await reponseRequest.text();
    throw new Error(`Composio files/upload/request a echoue (HTTP ${reponseRequest.status}) : ${texte.slice(0, 300)}`);
  }
  const donneesRequest = await reponseRequest.json();
  const cleS3 = donneesRequest.key;
  const urlPresignee = donneesRequest.new_presigned_url || donneesRequest.newPresignedUrl;
  if (!cleS3 || !urlPresignee) {
    throw new Error(`Composio files/upload/request n'a pas renvoye key/new_presigned_url exploitables : ${JSON.stringify(donneesRequest)}`);
  }

  const reponsePut = await fetch(urlPresignee, {
    method: 'PUT',
    headers: { 'Content-Type': mimetype },
    body: octets,
  });
  if (!reponsePut.ok) {
    throw new Error(`PUT de ${cheminFichier} vers l'URL S3 presignee a echoue (HTTP ${reponsePut.status}).`);
  }

  return { name: filename, mimetype, s3key: cleS3 };
}

module.exports = {
  ROUTAGE_COMPTES,
  resoudreRoutage,
  resoudreCompteParUrn,
  executerActionRest,
  televerserFichierComposio,
};
