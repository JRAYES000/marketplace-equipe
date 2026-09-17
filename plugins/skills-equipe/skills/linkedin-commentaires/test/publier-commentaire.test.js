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

test('verifierConnexionAvantPublication refuse quand la connexion MCP reelle ne correspond pas (compte force explicitement)', async () => {
  // Depuis le 17/09/2026, julien-partners (ZvLHybJZhj) route vers REST, pas MCP -- ce
  // test force `compte: 'julien-agency'` pour continuer a couvrir la logique de
  // detection de mismatch sur le canal MCP lui-meme (le risque documente le
  // 17/09/2026 : une connexion partagee qui ne resout pas vers l'identite attendue).
  const fetchOriginal = global.fetch;
  global.fetch = creerFetchMock('aFqu-W7ClW', { appelsCreationCommentaire: [] });
  try {
    await assert.rejects(
      () => verifierConnexionAvantPublication('urn:li:person:ZvLHybJZhj', { compte: 'julien-agency', apiKey: 'ck_test' }),
      /resout vers "aFqu-W7ClW", pas vers "ZvLHybJZhj"/
    );
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('publierCommentaire (julien-agency, MCP) refuse AVANT tout appel de creation si la connexion ne correspond pas', async () => {
  // Simule le cas ou la connexion partagee MCP active ne resout pas vers
  // l'identite attendue (le risque documente le 17/09/2026).
  const fetchOriginal = global.fetch;
  const appelsCreationCommentaire = [];
  global.fetch = creerFetchMock('id-inattendu', { appelsCreationCommentaire });
  try {
    await assert.rejects(
      () =>
        publierCommentaire({
          actorUrn: 'urn:li:person:aFqu-W7ClW',
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

test('publierCommentaire (julien-agency, MCP) appelle bien la creation du commentaire quand la connexion correspond', async () => {
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

/**
 * Ajoute le 17/09/2026 -- publierCommentaire(julien-partners) doit passer
 * par le canal REST (backend.composio.dev), jamais par le mock MCP, et
 * transmettre connected_account_id.
 */
test('publierCommentaire (julien-partners, REST) appelle LINKEDIN_CREATE_COMMENT_ON_POST via backend.composio.dev avec connected_account_id', async () => {
  const fetchOriginal = global.fetch;
  const urlsAppelees = [];
  const corpsCreation = [];
  global.fetch = async (url, opts) => {
    urlsAppelees.push(String(url));
    const corps = JSON.parse(opts.body);
    if (String(url).includes('LINKEDIN_GET_MY_INFO')) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ successful: true, data: { id: 'ZvLHybJZhj' } }) };
    }
    if (String(url).includes('LINKEDIN_CREATE_COMMENT_ON_POST')) {
      corpsCreation.push(corps);
      return { ok: true, status: 200, text: async () => JSON.stringify({ successful: true, data: { id: 'comment-rest-test' } }) };
    }
    throw new Error(`Mock fetch : requete inattendue -- ${url}`);
  };
  try {
    const resultat = await publierCommentaire({
      actorUrn: 'urn:li:person:ZvLHybJZhj',
      targetUrn: 'urn:li:share:456',
      message: 'texte de test',
      apiKey: 'ak_test',
    });
    assert.equal(resultat.data.id, 'comment-rest-test');
    assert.ok(urlsAppelees.every((u) => u.startsWith('https://backend.composio.dev/')), 'julien-partners ne doit jamais appeler le canal MCP');
    assert.equal(corpsCreation[0].connected_account_id, 'ca_vn1-dhh8VcYf');
  } finally {
    global.fetch = fetchOriginal;
  }
});
