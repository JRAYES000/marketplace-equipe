'use strict';

// Genre "reponse" (ajoute le 07/10/2026) : reponses aux commentaires recus
// sous les posts de Julien. Textes reels R1, R2, R3 du 07/10/2026, tels que
// publies (livrables-Claude-Agency, linkedin/2026-10-07/apres-midi.md et
// NOTES.md). Decision de Nomena du 07/10 : R3 passe, R1 et R2 sont refusees
// parce qu'elles promettent un recontact au nom de Julien.

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerCommentaire, GENRES, GENRE_REPONSE } = require('../lib/valider-commentaire');

const R1 =
  "Bonjour Sylvain, oui, la mission est réelle. Elle est portée par Claude Agency et dure 3 mois, à 100 % à distance avec 2 ateliers sur site. Le lieu de ces ateliers n'est pas écrit dans l'annonce : je vous le donne en message privé.";
const R2 =
  "Merci Jérémy, candidature bien notée. Pour rappel, l'annonce demande trois ans d'expérience et plus en ingénierie pédagogique, IA générative et conduite du changement. Je reviens vers vous, comme indiqué dans l'annonce.";
const R3 =
  "Merci Florent. Le premier message est celui où la personnalisation pèse le plus : c'est lui qui décide si la conversation commence. Bonne prospection !";

test('genre "reponse" : R3 (Florent Argoullon) passe', () => {
  assert.doesNotThrow(() => validerCommentaire({ texte: R3, genre: 'reponse' }));
});

test('genre "reponse" : R1 (Sylvain DRAUX) refusee, promesse de message prive', () => {
  assert.throws(
    () => validerCommentaire({ texte: R1, genre: 'reponse' }),
    /promesse au nom de Julien detectee \(recontact ou message prive : "en message privé"\)/
  );
});

test('genre "reponse" : R2 (Jeremy Wild) refusee, "Je reviens vers vous"', () => {
  assert.throws(
    () => validerCommentaire({ texte: R2, genre: 'reponse' }),
    /promesse au nom de Julien detectee \(recontact ou message prive : "Je reviens vers"\)/
  );
});

test('genre "reponse" : "je reviens vers vous" refuse', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Merci pour votre retour. je reviens vers vous très vite.', genre: 'reponse' }),
    /promesse au nom de Julien detectee/
  );
});

test('genre "reponse" : promesse de rendez-vous refusee', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Merci Paul. Calons un rendez-vous la semaine prochaine.', genre: 'reponse' }),
    /promesse au nom de Julien detectee \(rendez-vous/
  );
});

test('genre "reponse" : prix annonce refuse', () => {
  assert.throws(
    () => validerCommentaire({ texte: 'Merci Paul. La mission est payée 800 € par jour.', genre: 'reponse' }),
    /promesse au nom de Julien detectee \(prix/
  );
});

test('genre "reponse" : controles de forme habituels toujours appliques', () => {
  assert.throws(() => validerCommentaire({ texte: 'Merci !', genre: 'reponse' }), /phrase\(s\) detectee\(s\)/);
  assert.throws(
    () => validerCommentaire({ texte: 'Merci Paul. Voyez https://exemple.fr pour la suite.', genre: 'reponse' }),
    /aucun lien autorise/
  );
  assert.throws(
    () => validerCommentaire({ texte: 'Merci Paul. La plupart des freelances font pareil.', genre: 'reponse' }),
    /generalisation statistique vague/
  );
  assert.throws(
    () => validerCommentaire({ texte: "Merci Paul. On a livré ce projet chez un client l'an dernier.", genre: 'reponse' }),
    /experience professionnelle/
  );
});

test('controle des promesses reserve au genre "reponse"', () => {
  // Un commentaire du jour n'est pas soumis a ce controle (comportement inchange).
  assert.doesNotThrow(() =>
    validerCommentaire({ texte: 'Bon point. Vous fixez un rendez-vous de suivi après chaque mission ?', genre: 'vraie_question' })
  );
});

test('"reponse" reste hors de GENRES (base Notion des commentaires du jour)', () => {
  assert.equal(GENRE_REPONSE, 'reponse');
  assert.ok(!GENRES.includes('reponse'));
});
