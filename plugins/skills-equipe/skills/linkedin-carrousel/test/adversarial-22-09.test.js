'use strict';

/**
 * Non-regression : failles reellement reproduites lors de l'audit adversarial du
 * 22/09/2026 (demande explicite de Nomena, meme methode que le 15/09/2026), toutes
 * corrigees le meme jour. Chaque test ici reproduit exactement l'entree qui passait
 * a travers le garde-fou AVANT la correction.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validerInterdits, validerHashtags } = require('../lib/valider-post');

// --- Volet 1 : formulations interdites contournees par espacement/ponctuation ----

test('"C O M M E N T E Z   O U I" (une lettre par groupe) toujours refuse', () => {
  assert.throws(
    () => validerInterdits('Un vrai post. C O M M E N T E Z   O U I si vous etes concerne.'),
    /commentez OUI/
  );
});

test('"commentez-oui" (tiret au lieu d\'un espace) toujours refuse', () => {
  assert.throws(
    () => validerInterdits('Un vrai post. commentez-oui si vous etes concerne.'),
    /commentez OUI/
  );
});

test('"commentez : oui" (ponctuation intercalee) toujours refuse', () => {
  assert.throws(
    () => validerInterdits('Un vrai post. commentez : oui si vous etes concerne.'),
    /commentez OUI/
  );
});

test('"partagez-si" (tiret) et "partagez : si" (ponctuation) toujours refuses -- meme correctif', () => {
  assert.throws(() => validerInterdits('Un vrai post. partagez-si vous etes d\'accord.'), /partagez si/);
  assert.throws(() => validerInterdits('Un vrai post. partagez : si vous etes d\'accord.'), /partagez si/);
});

test('un texte qui contient reellement "commentez" et "oui" sans lien entre eux n\'est pas refuse a tort', () => {
  // Garde-fou contre un faux positif du correctif ci-dessus : la normalisation ne doit
  // pas refuser un texte qui n'a jamais forme la sequence "commentezoui" une fois compacte.
  assert.doesNotThrow(() => validerInterdits(
    'Un vrai post. Vous pouvez commentez si vous le souhaitez, ou repondre oui plus tard dans la journee.'
  ));
});

// --- Volet 2 : hashtags contournes par un caractere fullwidth --------------------

test('3 hashtags ecrits avec le diese fullwidth "＃" (U+FF03) refuses comme 3 vrais hashtags', () => {
  assert.throws(
    () => validerHashtags('Un post. ＃un ＃deux ＃trois'),
    /3 mots-diese en fin de post, maximum 2/
  );
});

test('un melange de diese ASCII et fullwidth compte pour le meme total', () => {
  assert.throws(
    () => validerHashtags('Un post. #un ＃deux #trois'),
    /3 mots-diese en fin de post, maximum 2/
  );
});
