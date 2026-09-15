'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { executerPourCompte } = require('../dry-run');
const reglages = require('../reglages-comptes.json');

test('dry run produit le texte final pour chaque compte sans appeler de publication', async () => {
  assert.equal(process.env.APIFY_TOKEN, undefined, 'ce test suppose un environnement sans APIFY_TOKEN (chemin fixture)');

  for (const [compte, config] of Object.entries(reglages)) {
    const resultat = await executerPourCompte(compte, config);

    assert.match(resultat.source, /fixture/);
    assert.equal(resultat.postChoisi.id, 'p1');
    assert.ok(resultat.contenuFinal && resultat.contenuFinal.length > 0, `contenuFinal manquant pour ${compte}`);
    assert.equal(resultat.argumentsPublierPost.authorUrn, config.author_urn);
    assert.equal(resultat.argumentsPublierPost.commentary, resultat.contenuFinal);
    assert.match(resultat.publicationReelle, /NON EFFECTUEE/);
  }
});

test("n'importe jamais lib/publier.js -- aucun risque d'appel de publication reel depuis ce script", () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'dry-run.js'), 'utf8');
  assert.ok(!source.includes("require('./lib/publier')"), 'dry-run.js ne doit pas importer lib/publier.js');
});

test('quota hebdomadaire deja atteint (registre reel) -- refuse le candidat malgre un post retenu -- cas demande par l\'audit du 15/09/2026', async () => {
  const compte = 'julien-agency';
  const config = reglages[compte];
  // La fixture est datee au lundi 2026-09-14 (MAINTENANT_FIXTURE) : 3 posts
  // deja "publies" plus tot la meme semaine (mardi a jeudi, donc PAS le
  // 14 -- sinon c'est la regle "jamais deux le meme jour" qui refuserait en
  // premier, pas celle testee ici) pour saturer le quota hebdomadaire.
  const cheminRegistre = path.join(os.tmpdir(), `registre-veille-test-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(
    cheminRegistre,
    JSON.stringify({
      [compte]: [
        { date: '2026-09-15', postId: 'x' },
        { date: '2026-09-16', postId: 'y' },
        { date: '2026-09-17', postId: 'z' },
      ],
    }),
    'utf8'
  );

  try {
    const resultat = await executerPourCompte(compte, config, { cheminRegistre });
    assert.equal(resultat.quotaDejaUtiliseCetteSemaine, 3);
    assert.equal(resultat.contenuFinal, null, 'contenuFinal doit etre null : quota deja atteint');
    assert.match(resultat.erreurQuota, /quota hebdomadaire atteint \(3\/3/);
    assert.equal(resultat.argumentsPublierPost, null);
  } finally {
    fs.rmSync(cheminRegistre, { force: true });
  }
});

test('deja un post publie le meme jour (registre reel) -- refuse malgre un quota hebdomadaire non atteint', async () => {
  const compte = 'julien-partners';
  const config = reglages[compte];
  // MAINTENANT_FIXTURE = 2026-09-14T12:00:00.000Z -> aujourdhui = 2026-09-14.
  const cheminRegistre = path.join(os.tmpdir(), `registre-veille-test-${Date.now()}-${Math.random()}.json`);
  fs.writeFileSync(cheminRegistre, JSON.stringify({ [compte]: [{ date: '2026-09-14', postId: 'deja-publie' }] }), 'utf8');

  try {
    const resultat = await executerPourCompte(compte, config, { cheminRegistre });
    assert.equal(resultat.contenuFinal, null, 'contenuFinal doit etre null : deja publie ce jour');
    assert.match(resultat.erreurQuota, /jamais deux le meme jour/);
  } finally {
    fs.rmSync(cheminRegistre, { force: true });
  }
});
