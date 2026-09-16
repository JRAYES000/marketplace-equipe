'use strict';

/**
 * Appel d'une action Composio via le canal MCP consumer ("FOR YOU",
 * https://connect.composio.dev/mcp) -- le SEUL canal reellement fonctionnel
 * sur ce compte, verifie en conditions reelles le 16/09/2026 (5 commentaires
 * publies pour de vrai via ce canal).
 *
 * Migre le 16/09/2026 depuis le canal REST direct
 * (POST /api/v3.1/tools/execute/<slug>, cle "ak_..." de la couche PLATFORM)
 * que ce fichier utilisait jusque-la : ce canal n'a JAMAIS fonctionne sur ce
 * compte, faute de cle de projet ak_ existante -- deja diagnostique et
 * documente le 12/09/2026 (`references/actions-composio.md`), puis
 * RE-DECOUVERT a l'identique le 16/09/2026 (une session a perdu du temps a
 * obtenir une cle ck_, la passer a ce fichier, et se heurter au meme 401
 * "Invalid API key" avant de comprendre que le fichier appelait le mauvais
 * canal). Ce fichier ne doit plus jamais retomber dans ce piege : voir
 * `validerCle` ci-dessous, qui refuse explicitement une cle du mauvais
 * format plutot que de laisser Composio repondre un 401 opaque.
 *
 * Protocole MCP standard (JSON-RPC 2.0 sur HTTP, reponse JSON ou SSE) :
 * `initialize` -> recupere un `Mcp-Session-Id` a repasser sur les appels
 * suivants -> `notifications/initialized` -> `tools/call` sur
 * `COMPOSIO_MULTI_EXECUTE_TOOL` avec `{ tools: [{ tool_slug, arguments }] }`,
 * qui enveloppe l'appel reel a l'outil natif (ex. `LINKEDIN_CREATE_COMMENT_ON_POST`).
 * Une session MCP neuve est ouverte a chaque appel de `executerActionComposio`
 * (signature stateless volontairement conservee pour ne pas casser les
 * appelants existants) -- cout d'un aller-retour supplementaire par appel,
 * assume pour la simplicite.
 */

const MCP_URL = 'https://connect.composio.dev/mcp';

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
async function executerActionComposio(slug, { arguments: args = {}, userId, apiKey } = {}) {
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
    throw new Error('Composio MCP (initialize) : aucun Mcp-Session-Id recu, session non etablie.');
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
    throw new Error(`Composio MCP (tools/call ${slug}) erreur JSON-RPC : ${JSON.stringify(json.error)}`);
  }

  const texteInterne = json && json.result && json.result.content && json.result.content[0] && json.result.content[0].text;
  if (!texteInterne) {
    throw new Error(`Composio MCP (tools/call ${slug}) : reponse sans contenu exploitable -- ${JSON.stringify(json)}`);
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
    throw err;
  }

  const reponseOutil = resultatOutil.response;
  if (reponseOutil.successful === false) {
    const err = new Error(`Composio ${slug} a echoue : ${JSON.stringify(reponseOutil)}`);
    err.reponse = reponseOutil;
    throw err;
  }

  return reponseOutil;
}

module.exports = { executerActionComposio, validerCle };
