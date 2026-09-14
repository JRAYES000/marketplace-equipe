'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerCommentaire } = require('../lib/valider-commentaire');

test('accepte un commentaire conforme, genre "information_chiffree"', () => {
  const texte = "Bon, sur ce sujet on a mesure 12% de gain de temps chez trois clients ce trimestre. Ca vaut le test.";
  assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'information_chiffree' }));
});

test('accepte un commentaire conforme, genre "vraie_question"', () => {
  const texte = "Interessant. Vous avez teste ca sur des equipes de combien de personnes ?";
  assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'vraie_question' }));
});

test('refuse un commentaire vide -- cas demande : "Super post !"', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Super post !', genre: 'desaccord_argumente' }),
    /formulation vide detectee/
  );
});

test('refuse "Tellement vrai"', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Tellement vrai', genre: 'histoire_vecue' }),
    /formulation vide detectee/
  );
});

test('refuse un commentaire avec emoji -- cas demande', () => {
  assert.throws(
    () => validerCommentaire({ texte: "Bon point, ca rejoint ce qu'on a vu chez un client 👍.", genre: 'histoire_vecue' }),
    /aucun emoji autorise/
  );
});

test('refuse un commentaire avec lien -- cas demande', () => {
  assert.throws(
    () => validerCommentaire({ texte: "Sujet interessant, on en parle ici https://exemple.fr/article.", genre: 'histoire_vecue' }),
    /aucun lien autorise/
  );
});

test('refuse une liste a puces -- cas demande', () => {
  const texte = "Trois points a retenir.\n- le premier\n- le second";
  assert.throws(() => validerCommentaire({ texte, genre: 'desaccord_argumente' }), /liste a puces/);
});

test('refuse hors de la fourchette 2-4 phrases -- cas demande : 1 seule phrase', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Interessant.', genre: 'histoire_vecue' }),
    /1 phrase\(s\) detectee/
  );
});

test('refuse hors de la fourchette 2-4 phrases -- cas demande : 5 phrases', () => {
  const texte = 'Un. Deux. Trois. Quatre. Cinq.';
  assert.throws(() => validerCommentaire({ texte, genre: 'histoire_vecue' }), /5 phrase\(s\) detectee/);
});

test('refuse "information_chiffree" sans aucun chiffre -- cas demande', () => {
  assert.throws(
    () => validerCommentaire({
      texte: "On a vu ca aussi chez nous. Ca a vraiment aide l'equipe a avancer plus vite.",
      genre: 'information_chiffree',
    }),
    /aucun chiffre trouve/
  );
});

test('refuse "vraie_question" qui ne se termine pas par un point d\'interrogation', () => {
  assert.throws(
    () => validerCommentaire({
      texte: "Ca me fait penser a un sujet proche. On devrait creuser ca ensemble.",
      genre: 'vraie_question',
    }),
    /ne se termine pas par/
  );
});

test('refuse un genre inconnu', () => {
  assert.throws(
    () => validerCommentaire({
      texte: 'Un texte tout a fait correct par ailleurs. Deux phrases bien formees.',
      genre: 'compliment',
    }),
    /genre "compliment" inconnu/
  );
});

test('refuse un texte vide', () => {
  assert.throws(() => validerCommentaire({ texte: '', genre: 'histoire_vecue' }), /texte vide/);
});
