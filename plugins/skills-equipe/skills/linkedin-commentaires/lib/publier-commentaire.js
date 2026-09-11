'use strict';

const { executerActionComposio } = require('./composio');

/**
 * SEUL point d'appel qui publie reellement un commentaire sur LinkedIn.
 * Isole ici a dessein : rien d'autre dans le module n'a d'effet de bord
 * reseau ecrivant sur LinkedIn.
 *
 * `actorUrn` : URN de l'auteur du commentaire (le compte qui commente),
 * substituable -- `urn:li:person:...` pour julien-partners/julien-agency.
 * `targetUrn` / `object` : le `shareUrn` du post cible (voir
 * lib/trouver-posts.js) -- jamais une URN `urn:li:activity:`, refusee par
 * l'API.
 * `parentCommentUrn` optionnel : pour repondre a un commentaire plutot qu'au
 * post, au format `urn:li:comment:({postUrn},{idDuCommentaire})`.
 */
async function publierCommentaire({ actorUrn, targetUrn, message, parentCommentUrn, userId, apiKey }) {
  if (!actorUrn) throw new Error('actorUrn requis (urn:li:person:...).');
  if (!targetUrn) throw new Error('targetUrn requis (shareUrn du post cible, jamais une urn:li:activity:).');
  if (!message) throw new Error('message requis (texte du commentaire).');

  const args = {
    actor: actorUrn,
    object: targetUrn,
    target_urn: targetUrn,
    message: { text: message },
  };
  if (parentCommentUrn) args.parent_comment = parentCommentUrn;

  return executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', {
    arguments: args,
    userId,
    apiKey,
  });
}

/**
 * Fallback documente, non appele par defaut : resout l'URN d'un compte via
 * LINKEDIN_GET_MY_INFO. Les URN de julien-partners/julien-agency sont deja
 * verifies et stables -- ne pas re-router par ici sans raison.
 */
async function resoudreActeurParDefaut({ userId, apiKey }) {
  const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', {
    arguments: {},
    userId,
    apiKey,
  });
  const id = resultat && resultat.data && resultat.data.id;
  if (!id) throw new Error(`LINKEDIN_GET_MY_INFO n'a pas renvoye d'id exploitable : ${JSON.stringify(resultat)}`);
  return `urn:li:person:${id}`;
}

module.exports = { publierCommentaire, resoudreActeurParDefaut };
