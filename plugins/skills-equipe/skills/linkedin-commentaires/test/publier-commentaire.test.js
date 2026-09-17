'use strict';

/**
 * Non-regression -- incident du 17/09/2026 : rien n'empechait un appel de
 * publication de partir sous la mauvaise identite LinkedIn quand plusieurs
 * connexions partagees existent pour le meme toolkit (aucun parametre connu
 * ne permet de choisir laquelle utiliser, voir references/actions-composio.md).
 * `verifierConnexionAvantPublication` refuse desormais explicitement toute
 * publication dont l'`actorUrn` demande ne correspond pas a la connexion
 * reellement active, verifiee juste avant chaque appel.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { publierCommentaire, verifierConnexionAvantPublication } = require('../lib/publier-commentaire');

function reponseMcp(json) {
  return {
    ok: true,
    status: 200,
    headers: { get: (h) => (h.toLowerCase() === 'mcp-session-id' ? 'session-test' : null) },
    text: async () => JSON.stringify(json),
  };
}

/**
 * Mock minimal du canal MCP : repond a `initialize`, ignore
 * `notifications/initialized`, et repond a `tools/call` avec le profil
 * `idReelRenvoye` pour LINKEDIN_GET_MY_INFO et un succes generique pour tout
 * autre outil (ex. LINKEDIN_CREATE_COMMENT_ON_POST) -- permet de verifier que
 * ce dernier n'est JAMAIS appele quand la connexion ne correspond pas.
 */
function creerFetchMock(idReelRenvoye, { appelsCreationCommentaire }) {
  return async (url, opts) => {
    const corps = JSON.parse(opts.body);
    if (corps.method === 'initialize') {
      return reponseMcp({ jsonrpc: '2.0', id: corps.id, result: {} });
    }
    if (corps.method === 'notifications/initialized') {
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => '' };
    }
    if (corps.method === 'tools/call') {
      const slug = corps.params.arguments.tools[0].tool_slug;
      if (slug === 'LINKEDIN_GET_MY_INFO') {
        const enveloppe = {
          data: { results: [{ response: { successful: true, data: { id: idReelRenvoye } } }] },
          successful: true,
        };
        return reponseMcp({ jsonrpc: '2.0', id: corps.id, result: { content: [{ type: 'text', text: JSON.stringify(enveloppe) }] } });
      }
      if (slug === 'LINKEDIN_CREATE_COMMENT_ON_POST') {
        appelsCreationCommentaire.push(corps.params.arguments.tools[0].arguments);
        const enveloppe = {
          data: { results: [{ response: { successful: true, data: { id: 'comment-123' } } }] },
          successful: true,
        };
        return reponseMcp({ jsonrpc: '2.0', id: corps.id, result: { content: [{ type: 'text', text: JSON.stringify(enveloppe) }] } });
      }
    }
    throw new Error(`Mock fetch : requete inattendue -- ${JSON.stringify(corps)}`);
  };
}

test('verifierConnexionAvantPublication accepte quand la connexion reelle correspond', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = creerFetchMock('aFqu-W7ClW', { appelsCreationCommentaire: [] });
  try {
    await assert.doesNotReject(() =>
      verifierConnexionAvantPublication('urn:li:person:aFqu-W7ClW', { apiKey: 'ck_test' })
    );
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('verifierConnexionAvantPublication refuse quand la connexion reelle ne correspond pas -- cas reel du 17/09/2026', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = creerFetchMock('aFqu-W7ClW', { appelsCreationCommentaire: [] });
  try {
    await assert.rejects(
      () => verifierConnexionAvantPublication('urn:li:person:ZvLHybJZhj', { apiKey: 'ck_test' }),
      /resout vers "aFqu-W7ClW", pas vers "ZvLHybJZhj"/
    );
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('publierCommentaire refuse AVANT tout appel de creation de commentaire si la connexion ne correspond pas', async () => {
  const fetchOriginal = global.fetch;
  const appelsCreationCommentaire = [];
  global.fetch = creerFetchMock('aFqu-W7ClW', { appelsCreationCommentaire });
  try {
    await assert.rejects(
      () =>
        publierCommentaire({
          actorUrn: 'urn:li:person:ZvLHybJZhj',
          targetUrn: 'urn:li:share:123',
          message: 'texte de test',
          apiKey: 'ck_test',
        }),
      /Publication refusee/
    );
    assert.equal(appelsCreationCommentaire.length, 0, 'LINKEDIN_CREATE_COMMENT_ON_POST ne doit jamais etre appele');
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('publierCommentaire appelle bien la creation du commentaire quand la connexion correspond', async () => {
  const fetchOriginal = global.fetch;
  const appelsCreationCommentaire = [];
  global.fetch = creerFetchMock('aFqu-W7ClW', { appelsCreationCommentaire });
  try {
    await publierCommentaire({
      actorUrn: 'urn:li:person:aFqu-W7ClW',
      targetUrn: 'urn:li:share:123',
      message: 'texte de test',
      apiKey: 'ck_test',
    });
    assert.equal(appelsCreationCommentaire.length, 1);
    assert.equal(appelsCreationCommentaire[0].actor, 'urn:li:person:aFqu-W7ClW');
  } finally {
    global.fetch = fetchOriginal;
  }
});
