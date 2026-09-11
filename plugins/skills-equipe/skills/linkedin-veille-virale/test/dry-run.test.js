'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'dry-run.js'), 'utf8');
  assert.ok(!source.includes("require('./lib/publier')"), 'dry-run.js ne doit pas importer lib/publier.js');
});
