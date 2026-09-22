'use strict';

/**
 * Non-regression : failles reellement reproduites lors de l'audit adversarial du
 * 22/09/2026 (demande explicite de Nomena, meme methode que le 15/09/2026), toutes
 * corrigees le meme jour. Chaque test ici reproduit exactement l'entree qui passait
 * a travers le garde-fou AVANT la correction.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validerCommentaire } = require('../lib/valider-commentaire');

test('un domaine nu sans "www." ni "http(s)://" ("monsite.fr") est refuse comme un lien', () => {
  assert.throws(
    () => validerCommentaire({
      texte: 'Interessant point de vue sur ce sujet. Va voir monsite.fr, quelle est la suite ?',
      genre: 'vraie_question',
    }),
    /aucun lien autorise/
  );
});

test('un raccourcisseur sans www/http ("bit.ly/abc123") est refuse comme un lien', () => {
  assert.throws(
    () => validerCommentaire({
      texte: 'Interessant point de vue sur ce sujet. Regarde bit.ly/abc123, quelle est la suite ?',
      genre: 'vraie_question',
    }),
    /aucun lien autorise/
  );
});

test('une reference a un vrai nom de domaine dans le texte reste refusee (pas un faux positif recherche)', () => {
  // Deliveroo.fr est un vrai domaine : LinkedIn le rendrait cliquable comme n'importe
  // quel autre. Ce n'est pas un faux positif a corriger, mais une verification que le
  // correctif ci-dessus se comporte comme prevu sur un cas plausible.
  assert.throws(
    () => validerCommentaire({
      texte: 'Deliveroo.fr a change de strategie recemment. Quel impact ca a eu selon vous ?',
      genre: 'vraie_question',
    }),
    /aucun lien autorise/
  );
});

test('des phrases francaises courantes sans lien ne sont jamais refusees a tort par le correctif de domaine', () => {
  const phrasesSaines = [
    'Le taux était de 3.5 points la semaine dernière. Ça correspond à votre lecture ?',
    'Cette approche paraît solide sur le papier. Comment la testeriez-vous en pratique ?',
  ];
  for (const texte of phrasesSaines) {
    assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'vraie_question' }), `faux positif sur : "${texte}"`);
  }
});

// Confirme un comportement DEJA tranche le 15/09/2026 (pas une nouvelle faille) : une
// ouverture creuse ("Super post !") suivie d'une vraie phrase substantielle reste
// acceptee -- voir FRAGMENTS_VIDES_PAR_PHRASE dans lib/valider-commentaire.js, "le but
// reste de bloquer le vide integral, pas de punir une accroche informelle".
test('une ouverture creuse suivie d\'une vraie question reste acceptee (comportement voulu, tranche le 15/09)', () => {
  assert.doesNotThrow(() => validerCommentaire({
    texte: 'Super post ! Quelle est la prochaine étape que vous envisagez ?',
    genre: 'vraie_question',
  }));
});
