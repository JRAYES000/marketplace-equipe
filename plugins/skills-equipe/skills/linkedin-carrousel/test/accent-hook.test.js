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

test('injecterDiapo applique le span des que le champ "accent" est fourni, quel que soit le role', () => {
  const { blocDiapo } = chargerGabarit('julien-partners');

  const htmlHook = injecterDiapo(blocDiapo, { role: 'hook', titre: 'Le vrai signal a suivre', accent: 'vrai signal' }, 0);
  assert.match(htmlHook, /<span class="accent-mot">vrai signal<\/span>/);

  // Bug trouve le 18/09/2026 en production reelle (premier post de veille) :
  // genererImageCouverture clone TOUJOURS la diapo avec role: 'contenu' pour
  // afficher le logo (voir generer-images.js, forcerLogoVisible) -- si le
  // rendu conditionnait l'accent sur `role === 'hook'`, l'accent disparaissait
  // silencieusement sur CHAQUE image "couverture", le cas d'usage principal de
  // cette fonctionnalite. Le champ `accent` est desormais le seul signal :
  // present -> colore, quel que soit `role`.
  const htmlContenu = injecterDiapo(blocDiapo, { role: 'contenu', titre: 'Le vrai signal a suivre', accent: 'vrai signal' }, 1);
  assert.match(htmlContenu, /<span class="accent-mot">vrai signal<\/span>/);
});

test('injecterDiapo ne colore rien sur une diapo "contenu" sans champ "accent" (cas normal, multi-images)', () => {
  const { blocDiapo } = chargerGabarit('julien-partners');
  const html = injecterDiapo(blocDiapo, { role: 'contenu', titre: 'Une diapo de contenu normale' }, 2);
  assert.doesNotMatch(html, /<span class="accent-mot">/);
});
