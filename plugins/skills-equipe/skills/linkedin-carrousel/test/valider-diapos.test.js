'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerDiapos } = require('../lib/valider-diapos');

const diapos10Conformes = require('../fixtures/diapos-10-conformes.json');

test('accepte un carrousel de 10 diapos conformes', () => {
  assert.doesNotThrow(() => validerDiapos(diapos10Conformes));
});

test('refuse un carrousel de 5 diapos (sous le minimum de 8)', () => {
  const diapos5 = diapos10Conformes.slice(0, 5);
  assert.throws(() => validerDiapos(diapos5), /entre 8 et 12/);
});

test('refuse un carrousel de 13 diapos (au-dessus du maximum de 12)', () => {
  const derniereIdee = diapos10Conformes[diapos10Conformes.length - 2];
  const diapos13 = [
    ...diapos10Conformes.slice(0, -1),
    derniereIdee, derniereIdee, derniereIdee,
    diapos10Conformes[diapos10Conformes.length - 1],
  ];
  assert.throws(() => validerDiapos(diapos13), /entre 8 et 12/);
});

test('refuse une diapo depassant 25 mots -- cas demande : une diapo a 34 mots (9 de trop)', () => {
  // Titre "Titre court" = 2 mots + texte de 32 mots = 34 mots au total sur la
  // diapo, soit 9 de plus que le maximum de 25 -- cas exact demande.
  const diapos = diapos10Conformes.map((d, i) => (i === 3
    ? {
      role: 'contenu',
      titre: 'Titre court',
      texte: 'Un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze '
        + 'seize dixsept dixhuit dixneuf vingt vingtetun vingtdeux vingttrois vingtquatre '
        + 'vingtcinq vingtsix vingtsept vingthuit vingtneuf trente trenteetun trentedeux.',
    }
    : d));
  assert.throws(
    () => validerDiapos(diapos),
    /diapo n°4.*34 mots/s
  );
});

test('refuse si la premiere diapo n\'a pas le role "hook"', () => {
  const diapos = diapos10Conformes.map((d, i) => (i === 0 ? { ...d, role: 'contenu' } : d));
  assert.throws(() => validerDiapos(diapos), /role "hook"/);
});

test('refuse si la diapo hook porte un texte de soutien', () => {
  const diapos = diapos10Conformes.map((d, i) => (i === 0 ? { ...d, texte: 'Ne devrait pas etre la.' } : d));
  assert.throws(() => validerDiapos(diapos), /accroche seule, sans texte de soutien/);
});
