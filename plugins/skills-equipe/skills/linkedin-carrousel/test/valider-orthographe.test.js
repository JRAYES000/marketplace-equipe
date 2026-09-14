'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validerAccents, detecterMotsSansAccent } = require('../lib/valider-orthographe');

test('accepte un texte correctement accentue', () => {
  assert.doesNotThrow(() => validerAccents('Le délai a été respecté, comme prévu.'));
});

test('refuse un mot de la liste sans son accent -- cas reel', () => {
  assert.throws(
    () => validerAccents('Le delai a ete respecte.'),
    /"delai" \(attendu "délai"\)/
  );
});

test('liste tous les mots concernes, pas seulement le premier', () => {
  const trouves = detecterMotsSansAccent('Le delai etait deja depasse, meme apres relance.');
  assert.deepEqual(trouves.map((t) => t.trouve), ['delai', 'etait', 'deja', 'meme', 'apres']);
});

test('n\'accuse pas a tort un mot deja correctement accentue', () => {
  assert.doesNotThrow(() => validerAccents('Le délai était déjà dépassé, même après relance.'));
});

test('limite assumee : "a"/"à" et "ou"/"où" ne sont jamais signales -- trop ambigus (verbe vs preposition)', () => {
  assert.doesNotThrow(() => validerAccents('Il a fini le rapport ou attend encore une reponse.'.replace('reponse', 'réponse')));
});

test('sur le carrousel reellement publie le 14/09/2026 (julien-agency, v2) : detecte bien le probleme reel', () => {
  const diapos = require('../a-publier/julien-agency-2026-09-14-v2.json');
  const totalTrouves = diapos.reduce(
    (somme, d) => somme + detecterMotsSansAccent(`${d.titre || ''} ${d.texte || ''}`).length,
    0
  );
  assert.ok(totalTrouves > 20, `attendu plus de 20 mots sans accent dans le carrousel reel, trouve ${totalTrouves}`);

  const post = fs.readFileSync(
    path.join(__dirname, '..', 'a-publier', 'julien-agency-2026-09-14-v2.commentary.txt'),
    'utf8'
  );
  const totalPost = detecterMotsSansAccent(post).length;
  assert.ok(totalPost > 20, `attendu plus de 20 mots sans accent dans le texte du post reel, trouve ${totalPost}`);
});
