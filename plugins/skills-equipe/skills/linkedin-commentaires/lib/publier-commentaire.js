'use strict';

const { executerActionComposio } = require('./composio');
const { resoudreCompteParUrn } = require('../../../lib/composio-canal');

/**
 * Verifie, AVANT tout appel de publication, que la connexion LinkedIn
 * reellement active sur ce canal Composio correspond bien au compte pour
 * lequel on s'apprete a publier -- ajoute le 17/09/2026 apres avoir prouve
 * (7 variantes de parametres testees, y compris deux appels de controle
 * nommant explicitement chaque connexion partagee) qu'aucun parametre
 * connu (`connected_account_id`, `account_id`, `user_id`, `auth_config_id`,
 * en sibling ou dans `arguments`) ne permet de cibler une connexion
 * partagee precise sur ce canal MCP quand plusieurs existent pour le meme
 * toolkit -- voir `references/actions-composio.md`, sections 16/09 et
 * 17/09, pour le detail complet des tests.
 *
 * Consequence directe : tant que ce blocage Composio n'est pas leve,
 * TOUT appel resout silencieusement vers la connexion "preferee"
 * (`averse-cooser` / julien-agency / `aFqu-W7ClW`), meme si le code
 * demande explicitement `actorUrn` = julien-partners. Sans cette
 * verification, un commentaire prepare pour julien-partners partirait
 * silencieusement sous l'identite julien-agency -- exactement le risque
 * signale par Julien. Cette fonction rend ce risque impossible : elle
 * refuse explicitement la publication plutot que de la laisser partir
 * sous la mauvaise identite.
 *
 * Depuis le 17/09/2026, le compte peut etre passe explicitement (`compte`)
 * pour forcer le canal utilise par la verification -- sinon il est derive de
 * `actorUrnAttendu` via resoudreCompteParUrn (comportement par defaut,
 * compatible avec les appelants existants).
 */
async function verifierConnexionAvantPublication(actorUrnAttendu, { compte, userId, apiKey } = {}) {
  const compteResolu = compte || resoudreCompteParUrn(actorUrnAttendu);
  const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', {
    compte: compteResolu,
    arguments: {},
    userId,
    apiKey,
  });
  const idReel = resultat && resultat.data && resultat.data.id;
  if (!idReel) {
    throw new Error(
      `Publication refusee : impossible de verifier la connexion active avant publication -- ` +
      `LINKEDIN_GET_MY_INFO n'a renvoye aucun id exploitable (${JSON.stringify(resultat)}).`
    );
  }
  const idAttendu = String(actorUrnAttendu || '').replace('urn:li:person:', '');
  if (idReel !== idAttendu) {
    throw new Error(
      `Publication refusee : la connexion Composio active resout vers "${idReel}", pas vers ` +
      `"${idAttendu}" attendu pour ce compte. Aucun parametre connu ne permet aujourd'hui de ` +
      `cibler explicitement une connexion partagee precise sur ce canal MCP quand plusieurs ` +
      `existent pour le meme toolkit (voir references/actions-composio.md) -- publier maintenant ` +
      `posterait sous la mauvaise identite LinkedIn. Ne pas contourner : attendre que Composio ` +
      `resolve ce point (ticket support ouvert le 17/09/2026) ou que la connexion active change ` +
      `reellement cote dashboard.`
    );
  }
}

/**
 * SEUL point d'appel qui publie reellement un commentaire sur LinkedIn.
 * Isole ici a dessein : rien d'autre dans le module n'a d'effet de bord
 * reseau ecrivant sur LinkedIn.
 *
 * `actorUrn` : URN de l'auteur du commentaire (le compte qui commente),
 * substituable -- `urn:li:person:...` pour julien-partners/julien-agency.
 * Verifie desormais reellement AVANT publication (`verifierConnexionAvantPublication`) --
 * jamais suppose correct juste parce qu'il est passe en parametre.
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

  const compte = resoudreCompteParUrn(actorUrn);
  await verifierConnexionAvantPublication(actorUrn, { compte, userId, apiKey });

  const args = {
    actor: actorUrn,
    object: targetUrn,
    target_urn: targetUrn,
    message: { text: message },
  };
  if (parentCommentUrn) args.parent_comment = parentCommentUrn;

  return executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', {
    compte,
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

module.exports = { publierCommentaire, resoudreActeurParDefaut, verifierConnexionAvantPublication };
