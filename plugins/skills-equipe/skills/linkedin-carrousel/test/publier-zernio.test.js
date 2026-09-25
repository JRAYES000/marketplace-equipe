'use strict';

/**
 * Publication via Zernio (24/09/2026, mail de Julien -- remplace le repli
 * image Composio, voir lib/publier-zernio.js et publier-zernio.js). Toutes
 * les requetes reseau sont mockees via global.fetch ; le test reel de bout
 * en bout (presign + upload, PDF _test-6-modeles.pdf) a ete fait a la main
 * en session, pas ici -- voir SKILL.md.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  verifierCompteZernio,
  preparerEnvoiZernio,
  publierDocumentZernio,
} = require('../lib/publier-zernio');

const COMPTE_ZERNIO_JULIEN_AGENCY = {
  _id: '6ab50c438d284ffb213b7c55',
  platform: 'linkedin',
  profileUrl: 'https://www.linkedin.com/in/julien-rayes/',
  isActive: true,
};

const REGLAGES_TEST = {
  'julien-agency': {
    zernio_account_id: '6ab50c438d284ffb213b7c55',
    zernio_linkedin_url: 'https://www.linkedin.com/in/julien-rayes/',
  },
  'julien-partners': {
    zernio_account_id: '6ab50c738d284ffb213b7d22',
    zernio_linkedin_url: 'https://www.linkedin.com/in/julien-rayes-claude-partners/',
  },
};

function mockerFetch(gestionnaire) {
  const original = global.fetch;
  global.fetch = gestionnaire;
  return () => { global.fetch = original; };
}

function reponseJson(corps, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => corps, text: async () => JSON.stringify(corps) };
}

test('verifierCompteZernio refuse un compte inconnu du paquet (pas julien-agency/julien-partners)', async () => {
  await assert.rejects(
    () => verifierCompteZernio({ compte: 'page-claude', apiKey: 'sk_test', reglages: REGLAGES_TEST }),
    /Compte inconnu pour la publication Zernio/
  );
});

test('verifierCompteZernio refuse si le compte n\'a pas de zernio_account_id', async () => {
  await assert.rejects(
    () => verifierCompteZernio({
      compte: 'julien-agency',
      apiKey: 'sk_test',
      reglages: { 'julien-agency': {}, 'julien-partners': REGLAGES_TEST['julien-partners'] },
    }),
    /Aucun "zernio_account_id" renseigne/
  );
});

test('verifierCompteZernio refuse si le compte est absent de GET /v1/accounts', async () => {
  const restaurer = mockerFetch(async (url) => {
    assert.equal(String(url), 'https://zernio.com/api/v1/accounts');
    return reponseJson({ accounts: [] });
  });
  try {
    await assert.rejects(
      () => verifierCompteZernio({ compte: 'julien-agency', apiKey: 'sk_test', reglages: REGLAGES_TEST }),
      /aucun compte Zernio avec _id=.* n'apparait dans GET \/v1\/accounts/
    );
  } finally {
    restaurer();
  }
});

test('verifierCompteZernio refuse si le compte trouve n\'est pas de type linkedin', async () => {
  const restaurer = mockerFetch(async () => reponseJson({
    accounts: [{ ...COMPTE_ZERNIO_JULIEN_AGENCY, platform: 'instagram' }],
  }));
  try {
    await assert.rejects(
      () => verifierCompteZernio({ compte: 'julien-agency', apiKey: 'sk_test', reglages: REGLAGES_TEST }),
      /n'est pas de type "linkedin"/
    );
  } finally {
    restaurer();
  }
});

test('verifierCompteZernio refuse si le compte trouve n\'est pas actif', async () => {
  const restaurer = mockerFetch(async () => reponseJson({
    accounts: [{ ...COMPTE_ZERNIO_JULIEN_AGENCY, isActive: false }],
  }));
  try {
    await assert.rejects(
      () => verifierCompteZernio({ compte: 'julien-agency', apiKey: 'sk_test', reglages: REGLAGES_TEST }),
      /n'est pas actif/
    );
  } finally {
    restaurer();
  }
});

test('verifierCompteZernio refuse si l\'URL de profil ne correspond pas au compte demande -- coeur du garde-fou', async () => {
  const restaurer = mockerFetch(async () => reponseJson({
    accounts: [{ ...COMPTE_ZERNIO_JULIEN_AGENCY, profileUrl: 'https://www.linkedin.com/in/un-autre-profil/' }],
  }));
  try {
    await assert.rejects(
      () => verifierCompteZernio({ compte: 'julien-agency', apiKey: 'sk_test', reglages: REGLAGES_TEST }),
      /le profil LinkedIn du compte Zernio .* ne correspond pas/
    );
  } finally {
    restaurer();
  }
});

test('verifierCompteZernio resout accountId quand tout correspond', async () => {
  const restaurer = mockerFetch(async () => reponseJson({ accounts: [COMPTE_ZERNIO_JULIEN_AGENCY] }));
  try {
    const { accountId } = await verifierCompteZernio({ compte: 'julien-agency', apiKey: 'sk_test', reglages: REGLAGES_TEST });
    assert.equal(accountId, '6ab50c438d284ffb213b7c55');
  } finally {
    restaurer();
  }
});

test('preparerEnvoiZernio refuse un PDF introuvable', async () => {
  await assert.rejects(
    () => preparerEnvoiZernio({ compte: 'julien-agency', cheminPdf: '/chemin/inexistant.pdf', apiKey: 'sk_test', reglages: REGLAGES_TEST }),
    /Fichier introuvable/
  );
});

test('preparerEnvoiZernio : verification puis presign puis upload, dans l\'ordre, jamais /v1/posts', async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'zernio-test-'));
  const cheminPdf = path.join(dossier, 'carrousel-test.pdf');
  fs.writeFileSync(cheminPdf, Buffer.from('%PDF-1.4 contenu factice'));

  const urlsAppelees = [];
  const restaurer = mockerFetch(async (url, opts) => {
    urlsAppelees.push(String(url));
    if (String(url) === 'https://zernio.com/api/v1/accounts') {
      return reponseJson({ accounts: [COMPTE_ZERNIO_JULIEN_AGENCY] });
    }
    if (String(url) === 'https://zernio.com/api/v1/media/presign') {
      const corps = JSON.parse(opts.body);
      assert.equal(corps.filename, 'carrousel-test.pdf');
      assert.equal(corps.contentType, 'application/pdf');
      assert.ok(corps.size > 0);
      return reponseJson({
        uploadUrl: 'https://storage.example/upload?signature=secret',
        publicUrl: 'https://media.zernio.com/temp/carrousel-test.pdf',
        key: 'temp/carrousel-test.pdf',
        expiresIn: 3600,
      });
    }
    if (String(url) === 'https://storage.example/upload?signature=secret') {
      assert.equal(opts.method, 'PUT');
      assert.equal(opts.headers['Content-Type'], 'application/pdf');
      assert.ok(!('Authorization' in opts.headers), 'aucune Authorization sur l\'upload presigne');
      return { ok: true, status: 200 };
    }
    throw new Error(`Mock fetch : requete inattendue -- ${url}`);
  });

  try {
    const resultat = await preparerEnvoiZernio({ compte: 'julien-agency', cheminPdf, apiKey: 'sk_test', reglages: REGLAGES_TEST });
    assert.equal(resultat.accountId, '6ab50c438d284ffb213b7c55');
    assert.equal(resultat.publicUrl, 'https://media.zernio.com/temp/carrousel-test.pdf');
    assert.equal(resultat.filename, 'carrousel-test.pdf');
    assert.deepEqual(urlsAppelees, [
      'https://zernio.com/api/v1/accounts',
      'https://zernio.com/api/v1/media/presign',
      'https://storage.example/upload?signature=secret',
    ]);
    assert.ok(!urlsAppelees.some((u) => u.includes('/v1/posts')), 'preparerEnvoiZernio ne doit jamais appeler /v1/posts');
  } finally {
    restaurer();
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('publierDocumentZernio revalide le compte puis envoie mediaItems document + platformSpecificData.documentTitle', async () => {
  const restaurer = mockerFetch(async (url, opts) => {
    if (String(url) === 'https://zernio.com/api/v1/accounts') {
      return reponseJson({ accounts: [COMPTE_ZERNIO_JULIEN_AGENCY] });
    }
    if (String(url) === 'https://zernio.com/api/v1/posts') {
      const corps = JSON.parse(opts.body);
      assert.equal(corps.content, 'Texte du post deja valide.');
      assert.equal(corps.publishNow, true);
      assert.deepEqual(corps.mediaItems, [{ type: 'document', url: 'https://media.zernio.com/temp/carrousel-test.pdf' }]);
      assert.equal(corps.platforms.length, 1);
      assert.equal(corps.platforms[0].platform, 'linkedin');
      assert.equal(corps.platforms[0].accountId, '6ab50c438d284ffb213b7c55');
      assert.equal(corps.platforms[0].platformSpecificData.documentTitle, 'Six modeles de carrousel, un test');
      return reponseJson({ message: 'ok', post: { _id: 'post-test', status: 'published' } }, 201);
    }
    throw new Error(`Mock fetch : requete inattendue -- ${url}`);
  });

  try {
    const resultat = await publierDocumentZernio({
      compte: 'julien-agency',
      content: 'Texte du post deja valide.',
      publicUrl: 'https://media.zernio.com/temp/carrousel-test.pdf',
      documentTitle: 'Six modeles de carrousel, un test',
      apiKey: 'sk_test',
      reglages: REGLAGES_TEST,
    });
    assert.equal(resultat.post._id, 'post-test');
  } finally {
    restaurer();
  }
});

test('publierDocumentZernio(scheduledFor+timezone) envoie publishNow=false et les deux champs, jamais publishNow=true en meme temps', async () => {
  const restaurer = mockerFetch(async (url, opts) => {
    if (String(url) === 'https://zernio.com/api/v1/accounts') {
      return reponseJson({ accounts: [COMPTE_ZERNIO_JULIEN_AGENCY] });
    }
    if (String(url) === 'https://zernio.com/api/v1/posts') {
      const corps = JSON.parse(opts.body);
      assert.equal(corps.publishNow, false, 'publishNow doit etre false des qu\'un post est programme');
      assert.equal(corps.scheduledFor, '2026-09-26T08:30:00');
      assert.equal(corps.timezone, 'Europe/Paris');
      return reponseJson({ message: 'ok', post: { _id: 'post-programme', status: 'scheduled', scheduledFor: '2026-09-26T08:30:00' } }, 201);
    }
    throw new Error(`Mock fetch : requete inattendue -- ${url}`);
  });
  try {
    const resultat = await publierDocumentZernio({
      compte: 'julien-agency',
      content: 'Texte du post deja valide.',
      publicUrl: 'https://media.zernio.com/temp/carrousel-test.pdf',
      documentTitle: 'Six modeles de carrousel, un test',
      apiKey: 'sk_test',
      reglages: REGLAGES_TEST,
      scheduledFor: '2026-09-26T08:30:00',
      timezone: 'Europe/Paris',
    });
    assert.equal(resultat.post.status, 'scheduled');
  } finally {
    restaurer();
  }
});

test('publierDocumentZernio refuse scheduledFor sans timezone (et inversement)', async () => {
  await assert.rejects(
    () => publierDocumentZernio({
      compte: 'julien-agency',
      content: 'Texte',
      publicUrl: 'https://media.zernio.com/temp/x.pdf',
      documentTitle: 'Titre',
      apiKey: 'sk_test',
      reglages: REGLAGES_TEST,
      scheduledFor: '2026-09-26T08:30:00',
      // timezone absent
    }),
    /doivent etre fournis ensemble/
  );
  await assert.rejects(
    () => publierDocumentZernio({
      compte: 'julien-agency',
      content: 'Texte',
      publicUrl: 'https://media.zernio.com/temp/x.pdf',
      documentTitle: 'Titre',
      apiKey: 'sk_test',
      reglages: REGLAGES_TEST,
      timezone: 'Europe/Paris',
      // scheduledFor absent
    }),
    /doivent etre fournis ensemble/
  );
});

test('publierDocumentZernio refuse de publier si la revalidation du compte echoue (profil different)', async () => {
  const restaurer = mockerFetch(async (url) => {
    if (String(url) === 'https://zernio.com/api/v1/accounts') {
      return reponseJson({ accounts: [{ ...COMPTE_ZERNIO_JULIEN_AGENCY, profileUrl: 'https://www.linkedin.com/in/mauvais-profil/' }] });
    }
    throw new Error(`Mock fetch : requete inattendue (ne doit jamais atteindre /v1/posts) -- ${url}`);
  });
  try {
    await assert.rejects(
      () => publierDocumentZernio({
        compte: 'julien-agency',
        content: 'Texte',
        publicUrl: 'https://media.zernio.com/temp/x.pdf',
        documentTitle: 'Titre',
        apiKey: 'sk_test',
        reglages: REGLAGES_TEST,
      }),
      /ne correspond pas/
    );
  } finally {
    restaurer();
  }
});
