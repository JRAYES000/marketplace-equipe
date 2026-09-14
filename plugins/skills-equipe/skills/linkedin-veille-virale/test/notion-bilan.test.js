'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculerBilan } = require('../lib/notion');

const ENTREES = [
  { compte: 'julien-agency', format: 'carrousel', sujet: 'recrutement', score: 0.8, dateOrigine: '2026-09-01' },
  { compte: 'julien-agency', format: 'carrousel', sujet: 'recrutement', score: 0.6, dateOrigine: '2026-09-05' },
  { compte: 'julien-agency', format: 'texte', sujet: 'ia-productivite', score: 0.3, dateOrigine: '2026-09-10' },
  { compte: 'julien-partners', format: 'video', sujet: 'reseau', score: 1.2, dateOrigine: '2026-09-08' },
];

test('calcule la moyenne de score par format et par sujet, triee decroissante', () => {
  const bilan = calculerBilan(ENTREES, { compte: 'julien-agency' });
  assert.equal(bilan.nombreEntrees, 3);
  assert.deepEqual(bilan.parFormat.map((f) => f.nom), ['carrousel', 'texte']);
  assert.equal(bilan.parFormat[0].nombre, 2);
  assert.ok(Math.abs(bilan.parFormat[0].scoreMoyen - 0.7) < 1e-9);
  assert.equal(bilan.meilleurFormat.nom, 'carrousel');
  assert.equal(bilan.meilleurSujet.nom, 'recrutement');
});

test('filtre bien par compte -- julien-partners n\'apparait pas dans le bilan julien-agency', () => {
  const bilan = calculerBilan(ENTREES, { compte: 'julien-agency' });
  const sujets = bilan.parSujet.map((s) => s.nom);
  assert.ok(!sujets.includes('reseau'));
});

test('renvoie un message explicite plutot qu\'un resultat vide silencieux -- cas demande : aucune entree', () => {
  const bilan = calculerBilan([], { compte: 'page-claude' });
  assert.equal(bilan.nombreEntrees, 0);
  assert.match(bilan.message, /Aucune entree/);
});
