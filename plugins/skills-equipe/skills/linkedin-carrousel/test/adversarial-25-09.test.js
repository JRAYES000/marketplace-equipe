'use strict';

/**
 * Non-regression : les deux fautes d'accent reellement passees dans le carrousel
 * julien-agency publie le 25/09/2026 (urn:li:ugcPost:7509117168333287425, signalees par
 * Julien le meme jour) -- ni l'une ni l'autre n'etait attrapee avant correction. Chaque
 * test ici rejoue exactement l'entree qui est passee a travers le garde-fou.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { convertirGras } = require('../lib/valider-post');
const { validerAccents } = require('../lib/valider-orthographe');

// --- Erreur 1 : "declaratif au reel" dans un passage en gras du texte du post -----
//
// Avant correction : CARACTERES_ACCENTUES ne refuse un segment en gras que s'il
// contient DEJA un accent -- un mot ecrit sans l'accent qu'il devrait porter n'a
// aucun caractere accentue a detecter, donc passait. Une fois converti en gras
// Unicode, le mot devient de toute facon invisible a validerAccents (plage hors
// A-Za-zÀ-ÖØ-öø-ÿ) -- aucun filet ne le rattrapait plus loin.

test('"**Passez du declaratif au reel**" (exact du brouillon du 25/09) est refuse', () => {
  assert.throws(
    () => convertirGras('**Passez du declaratif au reel**. Un audit gratuit de 30 minutes.'),
    /"declaratif".*"déclaratif"|"reel".*"réel"/
  );
});

test('un mot du meme genre isole en gras ("**reel**") est refuse', () => {
  assert.throws(() => convertirGras('Du **reel**, pas du vent.'), /"réel"/);
});

test('le meme segment correctement accentue mais SANS le forcer en gras reste accepte', () => {
  // Le mot accentue reste possible tant qu'il n'est pas a l'interieur de **...** --
  // seul le passage en gras est structurellement incapable de le porter.
  assert.doesNotThrow(() => convertirGras('Passez du déclaratif au réel. **Un audit gratuit**.'));
});

// --- Erreur 2 : "L'IA declarative" dans le documentTitle passe a publier-zernio.js -----
//
// Avant correction : aucun garde-fou ne portait sur documentTitle -- generer-post.js/
// valider-post.js ne verifient que le texte du post, jamais ce titre, transmis tel
// quel en argument CLI a publier-zernio.js.

test('"L\'IA declarative" (documentTitle exact utilise le 25/09) est refuse par validerAccents', () => {
  assert.throws(() => validerAccents("L'IA declarative"), /"declarative".*"déclarative"/);
});

test('"L\'IA déclarative" (documentTitle corrige) est accepte', () => {
  assert.doesNotThrow(() => validerAccents("L'IA déclarative"));
});
