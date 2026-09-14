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

test('sur le carrousel julien-agency v2 (republie le 15/09/2026) : plus aucun mot sans accent -- non-regression', () => {
  // Ce carrousel avait ete publie le 14/09/2026 integralement sans accents (~68 occurrences
  // reelles, 53 attrapees par la liste fermee -- voir references/etat-linkedin-20260912.md,
  // Point n13). Corrige et republie le 15/09/2026 (contenu source + PDF regeneres via le
  // pipeline reel) -- ce test verifie desormais que le probleme ne revient pas, plutot que de
  // prouver qu'il existe.
  const diapos = require('../a-publier/julien-agency-2026-09-14-v2.json');
  const totalTrouves = diapos.reduce(
    (somme, d) => somme + detecterMotsSansAccent(`${d.titre || ''} ${d.texte || ''}`).length,
    0
  );
  assert.equal(totalTrouves, 0, `attendu 0 mot sans accent dans le carrousel republie, trouve ${totalTrouves}`);

  const post = fs.readFileSync(
    path.join(__dirname, '..', 'a-publier', 'julien-agency-2026-09-14-v2.commentary.txt'),
    'utf8'
  );
  const totalPost = detecterMotsSansAccent(post).length;
  assert.equal(totalPost, 0, `attendu 0 mot sans accent dans le texte du post republie, trouve ${totalPost}`);
});
