'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerAccents } = require('../lib/valider-orthographe');
const { validerCommentaire } = require('../lib/valider-commentaire');

test('accepte un texte correctement accentue', () => {
  assert.doesNotThrow(() => validerAccents('Le délai a été respecté, comme prévu.'));
});

test('refuse un mot de la liste sans son accent -- cas reel', () => {
  assert.throws(() => validerAccents('Le delai a ete respecte.'), /"delai" \(attendu "délai"\)/);
});

test('validerCommentaire refuse un commentaire par ailleurs conforme mais sans accent -- cas reel du 14/09/2026', () => {
  // Version non accentuee du commentaire reellement prepare pour Virginie Caurraze le 14/09/2026
  // avant correction -- forme et genre valides, seul l'accent manque.
  const texte = "Bon, ca rejoint un point qu'on voit souvent chez les independants. Vous le refaites a chaque mission ?";
  assert.throws(
    () => validerCommentaire({ texte, genre: 'vraie_question' }),
    /mot\(s\) sans l'accent attendu/
  );
});
