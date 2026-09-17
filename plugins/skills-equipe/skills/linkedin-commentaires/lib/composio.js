'use strict';

/**
 * Appel d'une action Composio pour linkedin-commentaires, avec routage par
 * compte depuis le 17/09/2026 (voir lib/composio-canal.js, ROUTAGE_COMPTES) :
 *  - julien-agency : canal MCP consumer ("FOR YOU", connect.composio.dev/mcp)
 *    -- inchange, verifie en conditions reelles le 16/09/2026 (5 commentaires
 *    publies pour de vrai via ce canal). C'est TOUJOURS le seul canal
 *    fonctionnel pour ce compte (aucune connexion pour lui sur le projet
 *    "ak_", verifie le 17/09/2026).
 *  - julien-partners : bascule le 17/09/2026 vers le canal REST direct
 *    (POST /api/v3.1/tools/execute/<slug>, cle "ak_...") avec
 *    connected_account_id explicite (ca_vn1-dhh8VcYf) -- une connexion
 *    LinkedIn ACTIVE existe reellement pour ce compte sur ce canal (verifie
 *    via GET /api/v3/connected_accounts). L'implementation REST vit dans
 *    lib/composio-canal.js (partagee avec linkedin-carrousel).
 *
 * Historique : ce fichier a utilise le REST direct jusqu'au 16/09/2026, sans
 * jamais fonctionner (pas de cle de projet ak_ alors disponible) -- migre
 * vers MCP ce jour-la (voir `validerCle` ci-dessous, qui refuse une cle "ak_"
 * passee par erreur sur ce chemin). Le REST redevient un canal reel le
 * 17/09/2026, mais UNIQUEMENT via le routage explicite par compte ci-dessous
 * -- jamais en passant directement une cle ak_ a `validerCle`/`executerActionMcp`,
 * qui la refusent toujours.
 *
 * Protocole MCP standard (JSON-RPC 2.0 sur HTTP, reponse JSON ou SSE) :
 * `initialize` -> recupere un `Mcp-Session-Id` a repasser sur les appels
 * suivants -> `notifications/initialized` -> `tools/call` sur
 * `COMPOSIO_MULTI_EXECUTE_TOOL` avec `{ tools: [{ tool_slug, arguments }] }`,
 * qui enveloppe l'appel reel a l'outil natif (ex. `LINKEDIN_CREATE_COMMENT_ON_POST`).
 * Une session MCP neuve est ouverte a chaque appel MCP (signature stateless
 * volontairement conservee pour ne pas casser les appelants existants) --
 * cout d'un aller-retour supplementaire par appel, assume pour la simplicite.
 */

const path = require('path');
const { resoudreRoutage, executerActionRest, journaliserEchec } = require('../../../lib/composio-canal');

const MCP_URL = 'https://connect.composio.dev/mcp';

/**
 * Registre des echecs Composio/LinkedIn (17/09/2026, suite) -- comble le
 * manque signale par le rapport du 16/09 (seuls les succes etaient
 * enregistres, voir lib/registre.js). Meme convention gitignore que
 * data/registre-commentaires.json (voir .gitignore racine).
 */
const CHEMIN_REGISTRE_ECHECS = path.join(__dirname, '..', 'data', 'registre-echecs.json');

/**
 * Refuse explicitement une cle du mauvais format AVANT tout appel reseau --
 * "ak_..." (couche PLATFORM, admin d'organisation, n'existe pas sur ce
 * compte) plutot que "ck_..." (cle consumer, surface "FOR YOU", la seule
 * qui fonctionne ici) est exactement l'erreur qui a coute une demi-heure de
 * debug le 16/09/2026 -- HTTP 401 "Invalid API key" opaque, sans indication
 * du bon canal.
 */
function validerCle(cle) {
  if (!cle) {
    throw new Error(
      'COMPOSIO_CONSUMER_API_KEY manquant (variable d\'environnement ou parametre apiKey) -- ' +
      'cle "consumer" (prefixe ck_), Reglages du compte personnel Composio -> "Sessions & API ' +
      'Key", surface "FOR YOU" (voir references/actions-composio.md pour le protocole complet).'
    );
  }
  if (cle.startsWith('ak_')) {
    throw new Error(
      `Cle Composio au format "ak_..." (couche PLATFORM) passee a executerActionComposio, qui ` +
      'attend une cle consumer "ck_...". Ce format ne fonctionne pas sur ce compte (aucune cle ' +
      'de projet ak_ n\'existe ici, voir references/actions-composio.md) -- utiliser la cle ' +
      'consumer de la surface "FOR YOU" (Reglages du compte personnel Composio -> "Sessions & ' +
      'API Key"), jamais celle de la couche PLATFORM.'
    );
  }
}

function creerErreurCorpsInvalide(contexte, texteBrut, erreurParsing, httpStatus) {
  const err = new Error(
    `Composio MCP (${contexte}) a repondu ${httpStatus} avec un corps qui n'est pas du JSON ` +
    `exploitable (${erreurParsing.message}). Debut du corps recu : "${texteBrut.slice(0, 200)}".`
  );
  err.httpStatus = httpStatus;
  err.source = 'composio'; // corps de reponse illisible -- probleme de protocole/transport, pas l'action elle-meme
  return err;
}

function parseSseOuJson(texte, contexte, httpStatus) {
  const trimmed = texte.trim();
  if (!trimmed) return null; // reponse vide normale pour une notification (pas d'id)
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch (erreur) {
      throw creerErreurCorpsInvalide(contexte, texte, erreur, httpStatus);
    }
  }
  // Format SSE ("event: message\ndata: {...}\n\n") : prend le dernier bloc data.
  const dataLines = trimmed
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim());
  if (dataLines.length === 0) {
    throw creerErreurCorpsInvalide(contexte, texte, new Error('ni JSON ni SSE reconnaissable'), httpStatus);
  }
  try {
    return JSON.parse(dataLines[dataLines.length - 1]);
  } catch (erreur) {
    throw creerErreurCorpsInvalide(contexte, texte, erreur, httpStatus);
  }
}

async function appelMcpBrut(corps, cle, sessionId, contexte) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'x-consumer-api-key': cle,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const reponse = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(corps) });
  const sidRecu = reponse.headers && typeof reponse.headers.get === 'function' ? reponse.headers.get('mcp-session-id') : null;
  const texteBrut = await reponse.text();
  const json = parseSseOuJson(texteBrut, contexte, reponse.status);

  if (!reponse.ok) {
    const err = new Error(`Composio MCP (${contexte}) a echoue (HTTP ${reponse.status}) : ${texteBrut.slice(0, 500)}`);
    err.httpStatus = reponse.status;
    err.source = 'composio'; // rejet de transport MCP, avant tout relais vers l'outil natif
    throw err;
  }

  return { json, sessionId: sidRecu || sessionId };
}

/**
 * Ouvre une session MCP (handshake `initialize` + `notifications/initialized`),
 * appelle l'outil natif `slug` via `COMPOSIO_MULTI_EXECUTE_TOOL`, et renvoie
 * le `response` de cet outil tel que Composio le renvoie (memes champs
 * `successful`/`data` qu'avant la migration -- `resultat.data.id` etc. cote
 * appelant continuent de fonctionner sans changement).
 */
async function executerActionMcpBrut(slug, { arguments: args = {}, userId, apiKey } = {}) {
  const cle = apiKey || process.env.COMPOSIO_CONSUMER_API_KEY;
  validerCle(cle);

  const { sessionId } = await appelMcpBrut(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'linkedin-commentaires', version: '1.0.0' },
      },
    },
    cle,
    null,
    'initialize'
  );
  if (!sessionId) {
    const err = new Error('Composio MCP (initialize) : aucun Mcp-Session-Id recu, session non etablie.');
    err.source = 'composio';
    throw err;
  }

  // Notification standard MCP, pas de reponse attendue -- ignore le corps.
  await appelMcpBrut({ jsonrpc: '2.0', method: 'notifications/initialized' }, cle, sessionId, 'notifications/initialized');

  const toolArgs = userId ? { ...args, user_id: userId } : args;
  const { json } = await appelMcpBrut(
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'COMPOSIO_MULTI_EXECUTE_TOOL',
        arguments: { tools: [{ tool_slug: slug, arguments: toolArgs }] },
      },
    },
    cle,
    sessionId,
    `tools/call ${slug}`
  );

  if (json && json.error) {
    const err = new Error(`Composio MCP (tools/call ${slug}) erreur JSON-RPC : ${JSON.stringify(json.error)}`);
    err.source = 'composio';
    throw err;
  }

  const texteInterne = json && json.result && json.result.content && json.result.content[0] && json.result.content[0].text;
  if (!texteInterne) {
    const err = new Error(`Composio MCP (tools/call ${slug}) : reponse sans contenu exploitable -- ${JSON.stringify(json)}`);
    err.source = 'composio';
    throw err;
  }

  let enveloppe;
  try {
    enveloppe = JSON.parse(texteInterne);
  } catch (erreur) {
    throw creerErreurCorpsInvalide(`tools/call ${slug}, contenu interne`, texteInterne, erreur, 200);
  }

  const resultatOutil = enveloppe.data && Array.isArray(enveloppe.data.results) && enveloppe.data.results[0];

  if (enveloppe.successful === false || !resultatOutil || resultatOutil.response == null) {
    const err = new Error(`Composio ${slug} a echoue : ${JSON.stringify(enveloppe)}`);
    err.reponse = enveloppe;
    // La session MCP a repondu, mais l'enveloppe globale (pas l'outil lui-meme) signale un
    // echec -- toujours cote Composio (echec d'orchestration, pas de l'action LinkedIn).
    err.source = 'composio';
    throw err;
  }

  const reponseOutil = resultatOutil.response;
  if (reponseOutil.successful === false) {
    const err = new Error(`Composio ${slug} a echoue : ${JSON.stringify(reponseOutil)}`);
    err.reponse = reponseOutil;
    // Ici, l'outil natif (l'action LinkedIn) a bien ete execute et A REPONDU un echec --
    // c'est le cas "rejet apres relais" du rapport du 17/09 (ex. validation LinkedIn).
    err.source = 'linkedin';
    throw err;
  }

  return reponseOutil;
}

/**
 * Journalise tout echec de executerActionMcpBrut dans le registre d'echecs
 * avant de le relancer -- ajoute le 17/09/2026 (suite). Le comportement
 * d'erreur pour l'appelant est strictement inchange (meme Error relance).
 */
async function executerActionMcp(slug, { arguments: args = {}, userId, apiKey, compte, cheminRegistreEchecs = CHEMIN_REGISTRE_ECHECS } = {}) {
  try {
    return await executerActionMcpBrut(slug, { arguments: args, userId, apiKey });
  } catch (erreur) {
    journaliserEchec(cheminRegistreEchecs, {
      compte,
      canal: 'mcp',
      action: slug,
      httpStatus: erreur.httpStatus == null ? null : erreur.httpStatus,
      source: erreur.source || 'composio',
      message: erreur.message,
    });
    throw erreur;
  }
}

/**
 * Point d'entree public : route vers REST (julien-partners) ou MCP
 * (julien-agency, et tout appel sans `compte` -- comportement inchange pour
 * les appelants existants qui ne connaissent pas encore le routage, voir
 * lib/publier-commentaire.js qui derive `compte` depuis l'actorUrn).
 */
async function executerActionComposio(slug, { compte, arguments: args = {}, userId, apiKey, connectedAccountId, cheminRegistreEchecs } = {}) {
  const routage = compte ? resoudreRoutage(compte) : null;
  if (routage && routage.canal === 'rest') {
    return executerActionRest(slug, {
      arguments: args,
      userId: userId || routage.userId,
      apiKey: apiKey || process.env.COMPOSIO_API_KEY,
      connectedAccountId: connectedAccountId || routage.connectedAccountId,
      compte,
      cheminRegistreEchecs: cheminRegistreEchecs || CHEMIN_REGISTRE_ECHECS,
    });
  }
  return executerActionMcp(slug, { arguments: args, userId, apiKey, compte, cheminRegistreEchecs });
}

module.exports = { executerActionComposio, executerActionMcp, validerCle };
