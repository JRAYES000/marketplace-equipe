'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerAccents } = require('../lib/valider-orthographe');
const { executerPourCompte } = require('../dry-run');

test('accepte un texte correctement accentue', () => {
  assert.doesNotThrow(() => validerAccents('Le délai a été respecté, comme prévu.'));
});

test('refuse un mot de la liste sans son accent -- cas reel', () => {
  assert.throws(() => validerAccents('Le delai a ete respecte.'), /"delai" \(attendu "délai"\)/);
});

test('dry-run.js : une redaction sans accent est ecartee (contenuFinal null), pas publiee telle quelle', async () => {
  const reglages = require('../reglages-comptes.json');
  const redactionsExemple = require('../fixtures/redactions-exemple.json');
  const compte = 'julien-agency';
  const config = reglages[compte];

  // Sabote une copie de la redaction fixture (deja accentuee correctement) pour verifier le
  // garde-fou reellement, sans dependre de l'etat futur du fichier fixture.
  const ancienne = redactionsExemple[compte].p1;
  redactionsExemple[compte].p1 = 'Un recrutement bloque 3 mois, sans jamais de reponse claire.';
  try {
    const resultat = await executerPourCompte(compte, config);
    assert.equal(resultat.contenuFinal, null, 'une redaction sans accent ne doit jamais devenir contenuFinal');
    assert.match(resultat.erreurOrthographe, /mot\(s\) sans l'accent attendu/);
    assert.equal(resultat.argumentsPublierPost, null);
  } finally {
    redactionsExemple[compte].p1 = ancienne;
  }
});
