'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { trierPosts, calculerScore } = require('../lib/veille');

const MAINTENANT = new Date('2026-09-14T12:00:00.000Z');
const COEFFICIENTS = { reactions: 1, commentaires: 3, partages: 5 };
const ABONNES = { auteurA: 10000, auteurB: 100000 };

function post(overrides) {
  return {
    id: 'x',
    authorPublicIdentifier: 'auteurA',
    postedAt: '2026-09-12T00:00:00.000Z',
    reactionsCount: 100,
    commentsCount: 10,
    sharesCount: 5,
    ...overrides,
  };
}

test('calculerScore applique la formule du brief : (reactions + 3*commentaires + 5*partages) / abonnes', () => {
  const score = calculerScore(post({ reactionsCount: 100, commentsCount: 10, sharesCount: 5 }), {
    coefficients: COEFFICIENTS,
    abonnesParIdentifiant: ABONNES,
  });
  assert.equal(score, (100 + 3 * 10 + 5 * 5) / 10000);
});

test('calculerScore renvoie null (pas 0) si les abonnes de l\'auteur sont inconnus -- cas demande', () => {
  const score = calculerScore(post({ authorPublicIdentifier: 'inconnu' }), {
    coefficients: COEFFICIENTS,
    abonnesParIdentifiant: ABONNES,
  });
  assert.equal(score, null);
});

test('trierPosts ecarte les carrousels (document.totalPageCount present)', () => {
  const posts = [
    post({ id: 'a' }),
    post({ id: 'b', document: { totalPageCount: 4 } }),
  ];
  const retenus = trierPosts(posts, { seuilScore: 0, coefficients: COEFFICIENTS, abonnesParIdentifiant: ABONNES, maintenant: MAINTENANT });
  assert.deepEqual(retenus.map((p) => p.id), ['a']);
});

test('trierPosts refuse un post dont le score ne depasse pas seuilScore -- cas demande', () => {
  const posts = [
    post({ id: 'fort', reactionsCount: 1000, commentsCount: 100, sharesCount: 50 }),
    post({ id: 'faible', reactionsCount: 1, commentsCount: 0, sharesCount: 0 }),
  ];
  const retenus = trierPosts(posts, { seuilScore: 0.05, coefficients: COEFFICIENTS, abonnesParIdentifiant: ABONNES, maintenant: MAINTENANT });
  assert.deepEqual(retenus.map((p) => p.id), ['fort']);
});

test('trierPosts refuse un post de plus de fenetreJours -- cas demande : post vieux de 10 jours, fenetre 7 jours', () => {
  const posts = [
    post({ id: 'frais', postedAt: '2026-09-10T00:00:00.000Z' }),
    post({ id: 'vieux', postedAt: '2026-09-03T00:00:00.000Z' }),
  ];
  const retenus = trierPosts(posts, { seuilScore: 0, coefficients: COEFFICIENTS, fenetreJours: 7, abonnesParIdentifiant: ABONNES, maintenant: MAINTENANT });
  assert.deepEqual(retenus.map((p) => p.id), ['frais']);
});

test('trierPosts ecarte un post dont l\'auteur n\'a pas d\'abonnes connus -- jamais suppose "assez bon"', () => {
  const posts = [post({ id: 'x', authorPublicIdentifier: 'compte-non-suivi' })];
  const retenus = trierPosts(posts, { seuilScore: 0, coefficients: COEFFICIENTS, abonnesParIdentifiant: ABONNES, maintenant: MAINTENANT });
  assert.deepEqual(retenus, []);
});

test('trierPosts trie par score decroissant (le meilleur candidat a recycler en premier)', () => {
  const posts = [
    post({ id: 'moyen', authorPublicIdentifier: 'auteurB', reactionsCount: 500, commentsCount: 50, sharesCount: 10 }),
    post({ id: 'meilleur', authorPublicIdentifier: 'auteurA', reactionsCount: 500, commentsCount: 50, sharesCount: 10 }),
  ];
  const retenus = trierPosts(posts, { seuilScore: 0, coefficients: COEFFICIENTS, abonnesParIdentifiant: ABONNES, maintenant: MAINTENANT });
  assert.deepEqual(retenus.map((p) => p.id), ['meilleur', 'moyen']);
  assert.ok(retenus[0].score > retenus[1].score);
});

test('sur le jeu fixture reel : garde uniquement p1 (carrousel, seuil et fraicheur ecartent les 3 autres)', () => {
  const postsFixture = require('../fixtures/posts-exemple.json');
  const abonnesFixture = require('../fixtures/abonnes-exemple.json');
  const reglageScore = require('../reglage-score.json');
  const retenus = trierPosts(postsFixture, {
    seuilScore: reglageScore.seuil_score,
    coefficients: reglageScore.coefficients,
    fenetreJours: reglageScore.fenetre_jours,
    abonnesParIdentifiant: abonnesFixture,
    maintenant: MAINTENANT,
  });
  assert.deepEqual(retenus.map((p) => p.id), ['p1']);
});
