'use strict';

/**
 * Non-regression : failles reellement reproduites lors de l'audit adversarial du
 * 22/09/2026 (demande explicite de Nomena, meme methode que le 15/09/2026), toutes
 * corrigees le meme jour. Chaque test ici reproduit exactement l'entree qui passait
 * a travers le garde-fou AVANT la correction.
 *
 * Deuxieme passage le meme jour (apres l'integration du logo Claude Agency dans
 * linkedin-carrousel) : 3 nouvelles pistes explicitement demandees, 3 failles
 * reelles confirmees et corrigees -- lien avec espaces inseres, variation
 * d'espace interne dans un nom cible, date de publication future/invalide sur
 * le plafond dur de fraicheur. Une 4e piste (genre declare sans que le
 * contenu corresponde) n'a rien revele de nouveau : voir la fin de ce fichier.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { validerCommentaire, validerGenre } = require('../lib/valider-commentaire');
const { normaliserAuteurCible, validerQuotaJournalier, validerFraicheurMaximale } = require('../lib/planifier-commentaires');

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

// ---------------------------------------------------------------------------
// Deuxieme passage du 22/09/2026 -- pistes demandees explicitement
// ---------------------------------------------------------------------------

test('un lien avec des espaces inseres autour du point ("mon site . fr") est refuse comme un lien', () => {
  assert.throws(
    () => validerCommentaire({
      texte: 'Interessant, va voir sur mon site . fr pour plus de details. Ca aide vraiment ?',
      genre: 'vraie_question',
    }),
    /aucun lien autorise/
  );
});

test('un lien avec espace uniquement d\'un cote du point ("site .fr" ou "site. fr") est refuse', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Va voir sur mon site .fr. Ca vous semble juste ?', genre: 'vraie_question' }),
    /aucun lien autorise/
  );
  assert.throws(
    () => validerCommentaire({ texte: 'Va voir sur mon site. fr par exemple. Ca vous semble juste ?', genre: 'vraie_question' }),
    /aucun lien autorise/
  );
});

test('des phrases francaises courantes avec un point de fin de phrase ne sont pas refusees a tort par le correctif espace+lien', () => {
  const phrasesSaines = [
    'Ce point est central. Comment le mesureriez-vous concrètement ?',
    'On observe ça souvent au début. Vous le voyez aussi de votre côté ?',
  ];
  for (const texte of phrasesSaines) {
    assert.doesNotThrow(() => validerCommentaire({ texte, genre: 'vraie_question' }), `faux positif sur : "${texte}"`);
  }
});

test('normaliserAuteurCible fusionne desormais une variation d\'espace interne dans le meme nom ("Theophile Burnet" vs "Theophile  Burnet")', () => {
  assert.equal(normaliserAuteurCible('Theophile Burnet'), normaliserAuteurCible('Theophile  Burnet'));
  assert.equal(normaliserAuteurCible('Theophile\tBurnet'), normaliserAuteurCible('Theophile Burnet'));
});

test('validerQuotaJournalier refuse desormais un doublon cree par un simple double-espace dans le nom cible', () => {
  const entreesDuJour = [{ date: '2026-09-22', auteurCible: 'Theophile Burnet' }];
  assert.throws(
    () => validerQuotaJournalier(entreesDuJour, { auteurCible: 'Theophile  Burnet' }),
    /deja recu un commentaire aujourd'hui/
  );
});

test('validerFraicheurMaximale refuse desormais une date de publication future (manifestement invalide)', () => {
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  assert.throws(
    () => validerFraicheurMaximale({ postedAt: dansUnMois }),
    /date de publication future/
  );
});

test('validerFraicheurMaximale refuse desormais une date de publication non parsable', () => {
  assert.throws(
    () => validerFraicheurMaximale({ postedAt: 'date-invalide-n-importe-quoi' }),
    /invalide \(non parsable\)/
  );
});

// Piste testee, rien de nouveau trouve : "information_chiffree" declare sans
// aucun chiffre dans le texte est deja bloque (voir validerGenre existant).
// "histoire_vecue" et "desaccord_argumente" ne verifient pas la coherence du
// contenu -- mais c'est une limite DEJA documentee explicitement en tete de
// lib/valider-commentaire.js ("juger si un argument est solide ou une
// histoire credible reste hors de portee d'une regle mecanique"), pas une
// faille nouvellement decouverte. Ce test fige ce comportement CONNU plutot
// que de forcer un "correctif" pour un cas deja assume.
test('genre "information_chiffree" sans chiffre reste bloque ; "histoire_vecue"/"desaccord_argumente" sans contenu correspondant restent, eux, un angle mort assume (pas une regression)', () => {
  assert.throws(
    () => validerGenre('Un avis general, sans aucun chiffre nulle part dans ce texte.', 'information_chiffree'),
    /aucun chiffre trouve/
  );
  assert.doesNotThrow(() => validerGenre('Une phrase quelconque. Une deuxieme phrase quelconque.', 'histoire_vecue'));
  assert.doesNotThrow(() => validerGenre('Une phrase quelconque. Une deuxieme sans aucun argument oppose.', 'desaccord_argumente'));
});
