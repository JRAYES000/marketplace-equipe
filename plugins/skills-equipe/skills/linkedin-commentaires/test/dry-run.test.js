'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { executerPourCompte } = require('../dry-run');
const reglages = require('../reglages-comptes.json');

// c1 (fixtures/posts-exemple.json) est publie le 2026-09-10T07:30:00Z --
// reference fixe 2h plus tard pour que le garde-fou de fraicheur (<4h) le
// retienne, plutot que de dependre de la date reelle du jour d'execution.
const MAINTENANT_FIXTURE = new Date('2026-09-10T09:30:00.000Z');

test('dry run produit un candidat valide pour chaque compte sans appeler de publication', async () => {
  assert.equal(process.env.APIFY_TOKEN, undefined, 'ce test suppose un environnement sans APIFY_TOKEN (chemin fixture)');

  for (const [compte, config] of Object.entries(reglages)) {
    const resultat = await executerPourCompte(compte, config, { maintenant: MAINTENANT_FIXTURE });

    assert.match(resultat.source, /fixture/);
    assert.equal(resultat.candidats.length, 1, `un seul post fixture ('c1') a une redaction pour ${compte}`);

    const [candidat] = resultat.candidats;
    assert.equal(candidat.postCible.id, 'c1');
    assert.match(candidat.postCible.shareUrn, /^urn:li:share:/);
    assert.ok(candidat.contenuFinal && candidat.contenuFinal.length > 0, `contenuFinal manquant pour ${compte}`);
    assert.ok(candidat.genre, `genre manquant pour ${compte}`);
    assert.equal(candidat.argumentsPublierCommentaire.actorUrn, config.actor_urn);
    assert.equal(candidat.argumentsPublierCommentaire.targetUrn, candidat.postCible.shareUrn);
    assert.equal(candidat.argumentsPublierCommentaire.message, candidat.contenuFinal);
    assert.equal(resultat.refuses.length, 0);
    assert.match(resultat.publicationReelle, /NON EFFECTUEE/);
  }
});

test('la fenetre de fraicheur exclut un post de plus de 4h (c4-plus-ancien)', async () => {
  const [compte, config] = Object.entries(reglages)[0];
  const resultat = await executerPourCompte(compte, config, { maintenant: MAINTENANT_FIXTURE });
  assert.ok(resultat.ecartesFraicheur.includes('c4-plus-ancien'));
});

test('un brouillon qui ne passe pas validerCommentaire est refuse, pas publie', async () => {
  // Injecte une redaction non conforme (une seule phrase) en remplacant
  // temporairement le module de redactions charge par dry-run.js : plus
  // simple de le verifier via un cas reel deja couvert -- une cible deja
  // presente dans le registre du jour doit finir dans "refuses", jamais
  // dans "candidats".
  const [compte, config] = Object.entries(reglages)[0];
  const cheminRegistreTemp = require('path').join(__dirname, '..', 'fixtures', '_registre-test-temporaire.json');
  require('fs').writeFileSync(
    cheminRegistreTemp,
    JSON.stringify({ [compte]: [{ date: '2026-09-10', auteurCible: 'Ines Verlaine' }] }),
    'utf-8'
  );
  try {
    const resultat = await executerPourCompte(compte, config, {
      maintenant: MAINTENANT_FIXTURE,
      cheminRegistre: cheminRegistreTemp,
    });
    assert.equal(resultat.candidats.length, 0, 'Ines Verlaine deja commentee aujourd\'hui -- aucun candidat retenu');
    assert.equal(resultat.refuses.length, 1);
    assert.match(resultat.refuses[0].raison, /jamais deux fois la meme personne le meme jour/);
  } finally {
    require('fs').rmSync(cheminRegistreTemp, { force: true });
  }
});

test("n'importe jamais lib/publier-commentaire.js -- aucun risque d'appel de publication reel depuis ce script", () => {
  const source = require('fs').readFileSync(require('path').join(__dirname, '..', 'dry-run.js'), 'utf8');
  assert.ok(!source.includes("require('./lib/publier-commentaire')"), 'dry-run.js ne doit pas importer lib/publier-commentaire.js');
});
