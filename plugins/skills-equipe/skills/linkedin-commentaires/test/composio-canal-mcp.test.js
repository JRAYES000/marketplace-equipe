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
const { validerCle, executerActionComposio } = require('../lib/composio');

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
  try {
    await assert.rejects(
      () => executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', { arguments: {}, apiKey: 'ak_wrong-format' }),
      /format "ak_\.\.\." \(couche PLATFORM\)/
    );
    assert.equal(fetchAppele, false, 'validerCle doit refuser AVANT le premier appel reseau');
  } finally {
    global.fetch = fetchOriginal;
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
  try {
    await assert.rejects(() =>
      executerActionComposio('LINKEDIN_GET_MY_INFO', { arguments: {}, apiKey: 'ck_test' })
    );
    assert.ok(urlsAppelees.length > 0, 'au moins un appel reseau attendu');
    for (const url of urlsAppelees) {
      assert.equal(url, 'https://connect.composio.dev/mcp');
    }
  } finally {
    global.fetch = fetchOriginal;
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
  try {
    await assert.rejects(() =>
      executerActionComposio('LINKEDIN_GET_MY_INFO', { compte: 'julien-agency', arguments: {}, apiKey: 'ck_test' })
    );
    assert.ok(urlsAppelees.every((u) => u === 'https://connect.composio.dev/mcp'), 'julien-agency ne doit jamais appeler le REST direct');
  } finally {
    global.fetch = fetchOriginal;
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
