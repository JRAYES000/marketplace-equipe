'use strict';

/**
 * Mis a jour le 17/09/2026 -- avant cette date, publierCarrouselViaImage
 * etait du code mort (throw inconditionnel avant tout appel reseau,
 * `eslint-disable-next-line no-unreachable` sur le code qui suivait) : voir
 * l'ancienne version de ce fichier dans l'historique git pour les tests qui
 * verifiaient explicitement cet etat. La cause (LINKEDIN_CREATE_LINKED_IN_POST
 * .images exige un FileUploadable {name, mimetype, s3key}, pas l'URN LinkedIn
 * simple que produisait l'ancienne methode) est corrigee : le televersement
 * passe desormais par l'endpoint Composio /api/v3/files/upload/request (voir
 * lib/composio-canal.js, televerserFichierComposio), confirme fonctionnel le
 * 17/09/2026 avec une cle de projet ak_ reelle.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { publierCarrouselViaImage, publierCarrousel } = require('../lib/publier');

test('publierCarrouselViaImage refuse un modeRepli absent ou invalide', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', cheminsImages: ['a.png'], commentary: 'texte' }),
    /modeRepli requis/
  );
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', modeRepli: 'pdf', cheminsImages: ['a.png'], commentary: 'texte' }),
    /modeRepli requis/
  );
});

test('publierCarrouselViaImage exige exactement une image en mode "couverture"', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({
      authorUrn: 'urn:li:person:x',
      modeRepli: 'couverture',
      cheminsImages: ['a.png', 'b.png'],
      commentary: 'texte',
    }),
    /exactement une image/
  );
});

test('publierCarrouselViaImage exige cheminsImages non vide', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', modeRepli: 'par-diapo', cheminsImages: [], commentary: 'texte' }),
    /cheminsImages requis/
  );
});

test('publierCarrouselViaImage exige authorUrn et commentary', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({ modeRepli: 'couverture', cheminsImages: ['a.png'], commentary: 'texte' }),
    /authorUrn requis/
  );
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', modeRepli: 'couverture', cheminsImages: ['a.png'] }),
    /commentary requis/
  );
});

test('publierCarrousel refuse un compte inconnu', async () => {
  await assert.rejects(
    () => publierCarrousel({ compte: 'compte-inexistant', modeRepli: 'couverture', cheminsImages: ['a.png'], commentary: 'texte' }),
    /Compte inconnu dans reglages-comptes\.json/
  );
});

test('publierCarrousel refuse julien-agency -- canal_publication_reel pas a true (route de toute facon vers MCP, non implemente ici)', async () => {
  await assert.rejects(
    () => publierCarrousel({ compte: 'julien-agency', modeRepli: 'couverture', cheminsImages: ['a.png'], commentary: 'texte' }),
    /canal_publication_reel n'est pas a true/
  );
});

test('publierCarrousel refuse page-claude -- canal_publication_reel pas a true', async () => {
  await assert.rejects(
    () => publierCarrousel({ compte: 'page-claude', modeRepli: 'couverture', cheminsImages: ['a.png'], commentary: 'texte' }),
    /canal_publication_reel n'est pas a true/
  );
});

test('publierCarrousel(julien-partners) televerse puis publie via le canal REST, avec connected_account_id', async (t) => {
  const urlsAppelees = [];
  const cheminImage = require('path').join(__dirname, 'fixtures-tmp-image.png');
  // PNG 1x1 minimal, suffisant pour un test d'appel (pas de vraie decodage cote mock).
  require('fs').writeFileSync(cheminImage, Buffer.from('89504e470d0a1a0a', 'hex'));
  t.after(() => { try { require('fs').unlinkSync(cheminImage); } catch { /* deja absent */ } });

  const fetchOriginal = global.fetch;
  global.fetch = async (url, opts) => {
    urlsAppelees.push(String(url));
    if (String(url) === 'https://backend.composio.dev/api/v3/files/upload/request') {
      return { ok: true, status: 200, json: async () => ({ key: 's3-key-test', new_presigned_url: 'https://s3.example/put' }) };
    }
    if (String(url) === 'https://s3.example/put') {
      return { ok: true, status: 200 };
    }
    if (String(url).startsWith('https://backend.composio.dev/api/v3.1/tools/execute/LINKEDIN_CREATE_LINKED_IN_POST')) {
      const corps = JSON.parse(opts.body);
      assert.equal(corps.connected_account_id, 'ca_vn1-dhh8VcYf', 'connected_account_id doit etre transmis pour julien-partners');
      assert.equal(corps.arguments.images[0].s3key, 's3-key-test');
      return { ok: true, status: 200, text: async () => JSON.stringify({ successful: true, data: { id: 'post-test' } }) };
    }
    throw new Error(`Mock fetch : requete inattendue -- ${url}`);
  };
  try {
    const resultat = await publierCarrousel({
      compte: 'julien-partners',
      modeRepli: 'couverture',
      cheminsImages: [cheminImage],
      commentary: 'texte de test',
      apiKey: 'ak_test',
    });
    assert.equal(resultat.data.id, 'post-test');
    assert.ok(urlsAppelees.some((u) => u.includes('files/upload/request')));
    assert.ok(urlsAppelees.some((u) => u.includes('LINKEDIN_CREATE_LINKED_IN_POST')));
  } finally {
    global.fetch = fetchOriginal;
  }
});
