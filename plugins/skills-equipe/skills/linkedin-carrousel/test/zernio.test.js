'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { presignerFichier, televerserFichier, creerPost, BASE_URL } = require('../lib/zernio');

function mockerFetch(gestionnaire) {
  const original = global.fetch;
  global.fetch = gestionnaire;
  return () => { global.fetch = original; };
}

test('BASE_URL pointe sur zernio.com/api/v1 (confirme par docs.zernio.com/quickstart et le README du SDK Node)', () => {
  assert.equal(BASE_URL, 'https://zernio.com/api/v1');
});

test('presignerFichier envoie filename/contentType/size et exige uploadUrl+publicUrl en retour', async () => {
  const restaurer = mockerFetch(async (url, opts) => {
    assert.equal(String(url), `${BASE_URL}/media/presign`);
    assert.equal(opts.headers.Authorization, 'Bearer sk_test');
    const corps = JSON.parse(opts.body);
    assert.deepEqual(corps, { filename: 'x.pdf', contentType: 'application/pdf', size: 42 });
    return { ok: true, status: 200, json: async () => ({ uploadUrl: 'https://s.example/put', publicUrl: 'https://media.zernio.com/x.pdf', key: 'temp/x.pdf', expiresIn: 3600 }) };
  });
  try {
    const resultat = await presignerFichier({ apiKey: 'sk_test', filename: 'x.pdf', contentType: 'application/pdf', size: 42 });
    assert.equal(resultat.publicUrl, 'https://media.zernio.com/x.pdf');
  } finally {
    restaurer();
  }
});

test('presignerFichier refuse une reponse sans uploadUrl/publicUrl', async () => {
  const restaurer = mockerFetch(async () => ({ ok: true, status: 200, json: async () => ({ key: 'temp/x.pdf' }) }));
  try {
    await assert.rejects(
      () => presignerFichier({ apiKey: 'sk_test', filename: 'x.pdf', contentType: 'application/pdf' }),
      /reponse inexploitable/
    );
  } finally {
    restaurer();
  }
});

test('presignerFichier remonte le code HTTP en cas d\'echec', async () => {
  const restaurer = mockerFetch(async () => ({ ok: false, status: 401, text: async () => 'Invalid API key' }));
  try {
    await assert.rejects(
      () => presignerFichier({ apiKey: 'sk_mauvaise', filename: 'x.pdf', contentType: 'application/pdf' }),
      /media\/presign a echoue \(HTTP 401\).*Invalid API key/s
    );
  } finally {
    restaurer();
  }
});

test('televerserFichier fait un PUT sans en-tete Authorization', async () => {
  const restaurer = mockerFetch(async (url, opts) => {
    assert.equal(String(url), 'https://s.example/put?sig=abc');
    assert.equal(opts.method, 'PUT');
    assert.equal(opts.headers['Content-Type'], 'application/pdf');
    assert.ok(!('Authorization' in opts.headers));
    return { ok: true, status: 200 };
  });
  try {
    await televerserFichier({ uploadUrl: 'https://s.example/put?sig=abc', contentType: 'application/pdf', buffer: Buffer.from('x') });
  } finally {
    restaurer();
  }
});

test('creerPost construit mediaItems[document] + platforms[].platformSpecificData.documentTitle', async () => {
  const restaurer = mockerFetch(async (url, opts) => {
    assert.equal(String(url), `${BASE_URL}/posts`);
    const corps = JSON.parse(opts.body);
    assert.equal(corps.platforms[0].platformSpecificData.documentTitle, 'Mon titre');
    assert.deepEqual(corps.mediaItems, [{ type: 'document', url: 'https://media.zernio.com/x.pdf' }]);
    return { ok: true, status: 201, json: async () => ({ message: 'ok', post: { _id: '1', status: 'published' } }) };
  });
  try {
    const resultat = await creerPost({
      apiKey: 'sk_test',
      content: 'texte',
      accountId: 'acc-1',
      documentTitle: 'Mon titre',
      publicUrl: 'https://media.zernio.com/x.pdf',
    });
    assert.equal(resultat.post._id, '1');
  } finally {
    restaurer();
  }
});

test('creerPost refuse les champs requis manquants avant tout appel reseau', async () => {
  await assert.rejects(() => creerPost({ apiKey: 'sk_test' }), /content requis/);
  await assert.rejects(() => creerPost({ apiKey: 'sk_test', content: 'x' }), /accountId requis/);
  await assert.rejects(() => creerPost({ apiKey: 'sk_test', content: 'x', accountId: 'a' }), /documentTitle requis/);
  await assert.rejects(() => creerPost({ apiKey: 'sk_test', content: 'x', accountId: 'a', documentTitle: 't' }), /publicUrl requis/);
});
