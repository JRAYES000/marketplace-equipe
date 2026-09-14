'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerCommentaire } = require('../lib/valider-commentaire');

test('accepte un commentaire conforme, genre "information_chiffree"', () => {
  const texte = "Bon sujet. Sur ce type de projet, un délai de 4 à 6 semaines avant le premier résultat visible revient souvent.";
  assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'information_chiffree' }));
});

test('accepte un commentaire conforme, genre "vraie_question"', () => {
  const texte = "Intéressant. Vous avez testé ça sur des équipes de combien de personnes ?";
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

test('refuse une affirmation a la premiere personne sur un client sans source -- cas reel trouve le 14/09/2026', () => {
  const texte = "On a mis en place un tri similaire chez un client hôtelier l'an dernier. Le déclic a été le même, ça a vraiment aidé.";
  assert.throws(
    () => validerCommentaire({ texte, genre: 'histoire_vecue' }),
    /affirmation a la premiere personne sur une experience/
  );
});

test('refuse une affirmation sur une equipe/un resultat chiffre sans source -- meme regle', () => {
  const texte = "On l'utilise avec une equipe de 8 personnes. Ca a coupe le temps de debug de moitie en un mois.";
  assert.throws(
    () => validerCommentaire({ texte, genre: 'information_chiffree' }),
    /affirmation a la premiere personne sur une experience/
  );
});

test('accepte la meme affirmation si anecdoteSourcee: true -- confirmee par Julien avant redaction', () => {
  const texte = "On a mis en place un tri similaire chez un client hôtelier l'an dernier. Le déclic a été le même, ça a vraiment aidé.";
  assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'histoire_vecue', anecdoteSourcee: true }));
});

test('detecte l\'affirmation meme avec des mots accentues -- piege \\b/\\w trouve et corrige le 14/09/2026', () => {
  // \b en JS se base sur \w, qui ne reconnait pas les lettres accentuees :
  // "livré " echouait a matcher /\blivr[eé]\b/ avant la correction (lookaround
  // Unicode \p{L}/\p{N}). Ce texte est la version correctement accentuee du
  // commentaire "Valentin Muller" reellement prepare le 14/09/2026.
  const texte = "Pas sur que la difference tienne au temps passe. On a livre des SaaS multi-tenant en 10 semaines avec une methode proche.";
  const texteAccentue = "Pas sûr que la différence tienne au temps passé. On a livré des SaaS multi-tenant en 10 semaines avec une méthode proche.";
  assert.throws(() => validerCommentaire({ texte, genre: 'desaccord_argumente' }), /affirmation a la premiere personne/);
  assert.throws(() => validerCommentaire({ texte: texteAccentue, genre: 'desaccord_argumente' }), /affirmation a la premiere personne/);
});

test("n'accuse pas a tort une observation generale sans experience personnelle revendiquee", () => {
  const texte = "Ça rejoint un point qu'on voit souvent chez les indépendants qui commencent à embaucher. Vous le refaites à chaque mission ?";
  assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'vraie_question' }));
});
