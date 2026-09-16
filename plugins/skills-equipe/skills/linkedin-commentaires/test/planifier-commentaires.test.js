'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  filtrerPostsFrais,
  validerQuotaJournalier,
  validerFraicheurMaximale,
  validerCanalPublicationReel,
} = require('../lib/planifier-commentaires');

const MAINTENANT = new Date('2026-09-14T12:00:00.000Z');

function ilYA(heures) {
  return new Date(MAINTENANT.getTime() - heures * 60 * 60 * 1000).toISOString();
}

test('filtrerPostsFrais garde seulement les posts de moins de 4h, tries du plus recent', () => {
  const posts = [
    { id: 'a', postedAt: ilYA(5) },
    { id: 'b', postedAt: ilYA(1) },
    { id: 'c', postedAt: ilYA(3.9) },
    { id: 'd', postedAt: ilYA(0.1) },
  ];
  const retenus = filtrerPostsFrais(posts, MAINTENANT);
  assert.deepEqual(retenus.map((p) => p.id), ['d', 'b', 'c']);
});

test('filtrerPostsFrais refuse un post de plus de 4h -- cas demande : post vieux de 5h', () => {
  const posts = [{ id: 'vieux', postedAt: ilYA(5) }];
  const retenus = filtrerPostsFrais(posts, MAINTENANT);
  assert.deepEqual(retenus, []);
});

test('validerQuotaJournalier accepte sous le quota, cible jamais commentee aujourd\'hui', () => {
  const entreesDuJour = [
    { date: '2026-09-14', auteurCible: 'urn:li:person:a' },
    { date: '2026-09-14', auteurCible: 'urn:li:person:b' },
  ];
  assert.doesNotThrow(() => validerQuotaJournalier(entreesDuJour, { auteurCible: 'urn:li:person:c' }));
});

test('refuse au-dela de 5 commentaires le meme jour -- cas demande', () => {
  const entreesDuJour = Array.from({ length: 5 }, (_, i) => ({
    date: '2026-09-14',
    auteurCible: `urn:li:person:${i}`,
  }));
  assert.throws(
    () => validerQuotaJournalier(entreesDuJour, { auteurCible: 'urn:li:person:nouveau' }),
    /quota journalier atteint \(5\/5/
  );
});

test('refuse un second commentaire a la meme personne le meme jour -- cas demande', () => {
  const entreesDuJour = [{ date: '2026-09-14', auteurCible: 'urn:li:person:deja-vu' }];
  assert.throws(
    () => validerQuotaJournalier(entreesDuJour, { auteurCible: 'urn:li:person:deja-vu' }),
    /jamais deux fois la meme personne le meme jour/
  );
});

test('validerFraicheurMaximale accepte un post de moins de 48h', () => {
  const post = { postedAt: ilYA(24) };
  assert.doesNotThrow(() => validerFraicheurMaximale(post, MAINTENANT));
});

test('validerFraicheurMaximale refuse un post au-dela de 48h -- cas reel du 16/09/2026 (post de 5 mois propose)', () => {
  const posteVieuxDeCinqMois = { postedAt: ilYA(24 * 30 * 5) };
  assert.throws(
    () => validerFraicheurMaximale(posteVieuxDeCinqMois, MAINTENANT),
    /au-dela du plafond de 48h/
  );
});

test('validerFraicheurMaximale refuse pile au-dessus du seuil (48.1h) et accepte pile au seuil (48h)', () => {
  assert.doesNotThrow(() => validerFraicheurMaximale({ postedAt: ilYA(48) }, MAINTENANT));
  assert.throws(
    () => validerFraicheurMaximale({ postedAt: ilYA(48.1) }, MAINTENANT),
    /au-dela du plafond de 48h/
  );
});

test('validerFraicheurMaximale refuse un post sans postedAt', () => {
  assert.throws(() => validerFraicheurMaximale({}, MAINTENANT), /fraicheur non verifiable/);
});

test('validerCanalPublicationReel accepte un compte avec canal_publication_reel: true', () => {
  const reglages = { 'julien-agency': { canal_publication_reel: true } };
  assert.doesNotThrow(() => validerCanalPublicationReel('julien-agency', reglages));
});

test('validerCanalPublicationReel refuse un compte avec canal_publication_reel: false -- cas reel julien-partners', () => {
  const reglages = { 'julien-partners': { canal_publication_reel: false } };
  assert.throws(
    () => validerCanalPublicationReel('julien-partners', reglages),
    /canal de publication reel/
  );
});

test('validerCanalPublicationReel refuse un compte absent des reglages (rien de permissif par defaut)', () => {
  assert.throws(() => validerCanalPublicationReel('compte-inconnu', {}), /canal de publication reel/);
});

test('validerCanalPublicationReel refuse si le champ est absent (pas de valeur par defaut permissive)', () => {
  const reglages = { 'julien-agency': {} };
  assert.throws(() => validerCanalPublicationReel('julien-agency', reglages), /canal de publication reel/);
});
