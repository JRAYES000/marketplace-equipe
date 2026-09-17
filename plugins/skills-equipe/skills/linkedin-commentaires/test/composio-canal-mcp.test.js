'use strict';

/**
 * Non-regression -- incident du 16/09/2026 : lib/composio.js appelait le
 * canal REST direct (cle "ak_...", couche PLATFORM), qui n'a jamais
 * fonctionne sur ce compte (aucune cle de projet ak_ n'existe ici, voir
 * references/actions-composio.md). Une session a perdu une demi-heure a
 * obtenir une cle "ck_..." (canal MCP consumer, le seul qui fonctionne
 * reellement) et a recu un HTTP 401 "Invalid API key" opaque en la passant
 * au mauvais canal -- deja diagnostique le 12/09/2026, redecouvert a
 * l'identique faute de garde-fou. `validerCle` refuse desormais ce cas
 * explicitement, avant tout appel reseau.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validerCle, executerActionComposio } = require('../lib/composio');

/**
 * Chemin de registre d'echecs jetable, un par test -- evite d'ecrire dans le
 * vrai data/registre-echecs.json du paquet pendant les tests (voir
 * lib/composio-canal.js, journaliserEchec, ajoute le 17/09/2026 suite).
 */
function cheminRegistreJetable() {
  return path.join(os.tmpdir(), `registre-echecs-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

function lireRegistre(chemin) {
  try {
    return JSON.parse(fs.readFileSync(chemin, 'utf8'));
  } catch {
    return [];
  }
}

test('validerCle refuse une cle absente, message explicite vers COMPOSIO_CONSUMER_API_KEY', () => {
  assert.throws(() => validerCle(undefined), /COMPOSIO_CONSUMER_API_KEY manquant/);
});

test('validerCle refuse une cle au format ak_ (couche PLATFORM) -- cas reel du 16/09/2026', () => {
  assert.throws(() => validerCle('ak_nz4gKAqnX4jAEOmXJ9jG'), /format "ak_\.\.\." \(couche PLATFORM\)/);
});

test('validerCle accepte une cle au format ck_ (canal consumer, celui qui fonctionne)', () => {
  assert.doesNotThrow(() => validerCle('ck_exempledeclefictive000000'));
});

test('executerActionComposio refuse une cle ak_ avant tout appel reseau (aucun fetch declenche)', async () => {
  let fetchAppele = false;
  const fetchOriginal = global.fetch;
  global.fetch = async () => {
    fetchAppele = true;
    throw new Error('fetch n\'aurait jamais du etre appele');
  };
  const cheminRegistreEchecs = cheminRegistreJetable();
  try {
    await assert.rejects(
      () => executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', { arguments: {}, apiKey: 'ak_wrong-format', cheminRegistreEchecs }),
      /format "ak_\.\.\." \(couche PLATFORM\)/
    );
    assert.equal(fetchAppele, false, 'validerCle doit refuser AVANT le premier appel reseau');
  } finally {
    global.fetch = fetchOriginal;
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});

test('executerActionComposio appelle le canal MCP (connect.composio.dev/mcp), pas le REST direct -- sans compte precise', async () => {
  const urlsAppelees = [];
  const fetchOriginal = global.fetch;
  global.fetch = async (url) => {
    urlsAppelees.push(String(url));
    return {
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () => JSON.stringify({ error: 'unauthorized' }),
    };
  };
  const cheminRegistreEchecs = cheminRegistreJetable();
  try {
    await assert.rejects(() =>
      executerActionComposio('LINKEDIN_GET_MY_INFO', { arguments: {}, apiKey: 'ck_test', cheminRegistreEchecs })
    );
    assert.ok(urlsAppelees.length > 0, 'au moins un appel reseau attendu');
    for (const url of urlsAppelees) {
      assert.equal(url, 'https://connect.composio.dev/mcp');
    }
  } finally {
    global.fetch = fetchOriginal;
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});

/**
 * Ajoute le 17/09/2026 -- non-regression du routage par compte
 * (lib/composio-canal.js) : julien-agency doit TOUJOURS passer par MCP,
 * julien-partners doit passer par REST avec son connected_account_id, jamais
 * l'inverse ni un melange.
 */
test('executerActionComposio(compte: "julien-agency") reste sur le canal MCP', async () => {
  const urlsAppelees = [];
  const fetchOriginal = global.fetch;
  global.fetch = async (url) => {
    urlsAppelees.push(String(url));
    return { ok: false, status: 401, headers: { get: () => null }, text: async () => JSON.stringify({ error: 'unauthorized' }) };
  };
  const cheminRegistreEchecs = cheminRegistreJetable();
  try {
    await assert.rejects(() =>
      executerActionComposio('LINKEDIN_GET_MY_INFO', { compte: 'julien-agency', arguments: {}, apiKey: 'ck_test', cheminRegistreEchecs })
    );
    assert.ok(urlsAppelees.every((u) => u === 'https://connect.composio.dev/mcp'), 'julien-agency ne doit jamais appeler le REST direct');
  } finally {
    global.fetch = fetchOriginal;
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});

test('executerActionComposio(compte: "julien-partners") passe par le REST direct avec connected_account_id', async () => {
  const urlsAppelees = [];
  const corpsAppeles = [];
  const fetchOriginal = global.fetch;
  global.fetch = async (url, opts) => {
    urlsAppelees.push(String(url));
    corpsAppeles.push(JSON.parse(opts.body));
    return { ok: true, status: 200, text: async () => JSON.stringify({ successful: true, data: { id: 'ZvLHybJZhj' } }) };
  };
  try {
    const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', {
      compte: 'julien-partners',
      arguments: {},
      apiKey: 'ak_test',
    });
    assert.equal(resultat.data.id, 'ZvLHybJZhj');
    assert.ok(
      urlsAppelees.every((u) => u.startsWith('https://backend.composio.dev/api/v3.1/tools/execute/')),
      'julien-partners ne doit jamais appeler le canal MCP'
    );
    assert.equal(corpsAppeles[0].connected_account_id, 'ca_vn1-dhh8VcYf');
  } finally {
    global.fetch = fetchOriginal;
  }
});

test('resoudreRoutage refuse un compte inconnu', () => {
  const { resoudreRoutage } = require('../../../lib/composio-canal');
  assert.throws(() => resoudreRoutage('compte-inexistant'), /Compte Composio inconnu/);
});

/**
 * Ajoute le 17/09/2026 (suite) -- comble le manque signale par le rapport du
 * 16/09 : jusque-la, seuls les succes etaient journalises
 * (data/registre-commentaires.json), aucune trace des echecs.
 */
test('un echec MCP (401) cree une entree dans le registre d\'echecs, sans changer l\'erreur propagee', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    headers: { get: () => null },
    text: async () => 'Invalid API key',
  });
  const cheminRegistreEchecs = cheminRegistreJetable();
  try {
    await assert.rejects(
      () => executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', {
        compte: 'julien-agency', arguments: {}, apiKey: 'ck_test', cheminRegistreEchecs,
      }),
      /Composio MCP \(initialize\) a repondu 401/
    );
    const entrees = lireRegistre(cheminRegistreEchecs);
    assert.equal(entrees.length, 1);
    assert.equal(entrees[0].compte, 'julien-agency');
    assert.equal(entrees[0].canal, 'mcp');
    assert.equal(entrees[0].action, 'LINKEDIN_CREATE_COMMENT_ON_POST');
    assert.equal(entrees[0].httpStatus, 401);
    assert.equal(entrees[0].source, 'composio');
    assert.match(entrees[0].message, /Invalid API key/);
    assert.ok(entrees[0].horodatage, 'un horodatage doit etre present');
  } finally {
    global.fetch = fetchOriginal;
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});

test('un rejet cote LinkedIn (successful:false, HTTP 200) est journalise avec source "linkedin", pas "composio"', async () => {
  const fetchOriginal = global.fetch;
  let appel = 0;
  global.fetch = async (url, opts) => {
    appel += 1;
    const corps = JSON.parse(opts.body);
    if (corps.method === 'initialize') {
      return { ok: true, status: 200, headers: { get: (h) => (h.toLowerCase() === 'mcp-session-id' ? 's-test' : null) }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) };
    }
    if (corps.method === 'notifications/initialized') {
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => '' };
    }
    const enveloppe = { successful: true, data: { results: [{ response: { successful: false, error: 'shareUrn invalide' } }] } };
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: JSON.stringify(enveloppe) }] } }) };
  };
  const cheminRegistreEchecs = cheminRegistreJetable();
  try {
    await assert.rejects(() =>
      executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', { compte: 'julien-agency', arguments: {}, apiKey: 'ck_test', cheminRegistreEchecs })
    );
    const entrees = lireRegistre(cheminRegistreEchecs);
    assert.equal(entrees.length, 1);
    assert.equal(entrees[0].source, 'linkedin');
    assert.equal(entrees[0].httpStatus, null, 'HTTP 200 cote transport : pas de code HTTP d\'echec a rapporter');
    assert.ok(appel >= 3);
  } finally {
    global.fetch = fetchOriginal;
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});

test('un succes ne cree AUCUNE entree dans le registre d\'echecs (pas de faux positif)', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = async (url, opts) => {
    const corps = JSON.parse(opts.body);
    if (corps.method === 'initialize') {
      return { ok: true, status: 200, headers: { get: (h) => (h.toLowerCase() === 'mcp-session-id' ? 's-test' : null) }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: 1, result: {} }) };
    }
    if (corps.method === 'notifications/initialized') {
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => '' };
    }
    const enveloppe = { successful: true, data: { results: [{ response: { successful: true, data: { id: 'aFqu-W7ClW' } } }] } };
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: JSON.stringify(enveloppe) }] } }) };
  };
  const cheminRegistreEchecs = cheminRegistreJetable();
  try {
    const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', { compte: 'julien-agency', arguments: {}, apiKey: 'ck_test', cheminRegistreEchecs });
    assert.equal(resultat.data.id, 'aFqu-W7ClW');
    assert.equal(fs.existsSync(cheminRegistreEchecs), false, 'aucun fichier ne doit meme etre cree en l\'absence d\'echec');
  } finally {
    global.fetch = fetchOriginal;
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});
