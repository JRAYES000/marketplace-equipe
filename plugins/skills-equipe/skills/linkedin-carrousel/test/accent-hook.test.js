'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { titreAvecAccent, chargerGabarit, injecterDiapo } = require('../generer-pdf');

/**
 * Retour de Julien du 18/09/2026 (3 carrousels de reference : Theophile
 * Burnet, Sebastien Grillot, Benoit Dubos) : un seul mot/chiffre du titre en
 * couleur sur le hook, jamais tout le titre dans la meme teinte. Voir
 * lib/valider-diapos.js (champ "accent" obligatoire sur le hook) et
 * templates/*.html (.accent-mot). Ces tests couvrent le rendu, pas la
 * validation (deja couverte par test/valider-diapos.test.js).
 */

test('titreAvecAccent entoure exactement le segment "accent" d\'un span, reste echappe autour', () => {
  const html = titreAvecAccent('Pourquoi vos meilleurs candidats disparaissent-ils avant l\'offre ?', 'disparaissent-ils');
  assert.equal(
    html,
    'Pourquoi vos meilleurs candidats <span class="accent-mot">disparaissent-ils</span> avant l\'offre ?'
  );
});

test('titreAvecAccent echappe les caracteres HTML dans le titre et dans le segment accentue', () => {
  const html = titreAvecAccent('Le signal <clair> & net', 'clair');
  assert.match(html, /Le signal &lt;<span class="accent-mot">clair<\/span>&gt; &amp; net/);
});

test('titreAvecAccent retombe sur le titre simplement echappe si "accent" n\'est pas une sous-chaine reelle', () => {
  const html = titreAvecAccent('Un titre normal', 'absent du titre');
  assert.equal(html, 'Un titre normal');
  assert.doesNotMatch(html, /<span/);
});

test('injecterDiapo applique le span uniquement sur le hook, jamais sur une diapo "contenu"', () => {
  const { blocDiapo } = chargerGabarit('julien-partners');

  const htmlHook = injecterDiapo(blocDiapo, { role: 'hook', titre: 'Le vrai signal a suivre', accent: 'vrai signal' }, 0);
  assert.match(htmlHook, /<span class="accent-mot">vrai signal<\/span>/);

  // Meme si "accent" est present par erreur sur une diapo "contenu", le
  // garde-fou (lib/valider-diapos.js) ne l'exige que sur le hook -- mais le
  // rendu, lui, ne doit jamais l'appliquer hors du hook (les 3 references de
  // Julien ne colorent que la diapo 1).
  const htmlContenu = injecterDiapo(blocDiapo, { role: 'contenu', titre: 'Le vrai signal a suivre', accent: 'vrai signal' }, 1);
  assert.doesNotMatch(htmlContenu, /<span class="accent-mot">/);
});
