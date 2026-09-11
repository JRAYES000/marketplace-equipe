'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { executerPourCompte } = require('../dry-run');
const reglages = require('../reglages-comptes.json');

test('dry run produit le commentaire final pour chaque compte sans appeler de publication', async () => {
  assert.equal(process.env.APIFY_TOKEN, undefined, 'ce test suppose un environnement sans APIFY_TOKEN (chemin fixture)');

  for (const [compte, config] of Object.entries(reglages)) {
    const resultat = await executerPourCompte(compte, config);

    assert.match(resultat.source, /fixture/);
    assert.equal(resultat.postCible.id, 'c1');
    assert.match(resultat.postCible.shareUrn, /^urn:li:share:/);
    assert.ok(resultat.contenuFinal && resultat.contenuFinal.length > 0, `contenuFinal manquant pour ${compte}`);
    assert.equal(resultat.argumentsPublierCommentaire.actorUrn, config.actor_urn);
    assert.equal(resultat.argumentsPublierCommentaire.targetUrn, resultat.postCible.shareUrn);
    assert.equal(resultat.argumentsPublierCommentaire.message, resultat.contenuFinal);
    assert.match(resultat.publicationReelle, /NON EFFECTUEE/);
  }
});

test("n'importe jamais lib/publier-commentaire.js -- aucun risque d'appel de publication reel depuis ce script", () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'dry-run.js'), 'utf8');
  assert.ok(!source.includes("require('./lib/publier-commentaire')"), 'dry-run.js ne doit pas importer lib/publier-commentaire.js');
});
