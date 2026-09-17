'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  filtrerPostsFrais,
  validerQuotaJournalier,
  validerFraicheurMaximale,
  validerCanalPublicationReel,
  genererRepliAucunCandidat,
  normaliserAuteurCible,
  SEUIL_INACTIVITE_JOURS,
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

/**
 * Non-regression 17/09/2026 (suite) -- meme faille que l'audit adversarial
 * du 15/09/2026 sur la casse de `compte` (voir lib/registre.js), mais sur
 * `auteurCible` : cas reel, "Theophile Burnet" et "Theophile Burnet ⚡️"
 * (nom exact renvoye par Apify le 17/09/2026) designent la meme personne.
 */
test('refuse un second commentaire a la meme personne le meme jour, avec ou sans emoji de fin -- cas reel du 17/09/2026', () => {
  const entreesDuJour = [{ date: '2026-09-14', auteurCible: 'Théophile Burnet ⚡️' }];
  assert.throws(
    () => validerQuotaJournalier(entreesDuJour, { auteurCible: 'Théophile Burnet' }),
    /jamais deux fois la meme personne le meme jour/
  );
});

test('refuse un second commentaire malgre une casse ou des espaces differents -- variante du cas reel', () => {
  const entreesDuJour = [{ date: '2026-09-14', auteurCible: '  théophile burnet  ' }];
  assert.throws(
    () => validerQuotaJournalier(entreesDuJour, { auteurCible: 'Théophile Burnet ⚡️' }),
    /jamais deux fois la meme personne le meme jour/
  );
});

test('normaliserAuteurCible ne fusionne jamais deux noms reellement differents -- reste conservateur', () => {
  assert.notEqual(normaliserAuteurCible('Jean Dupont'), normaliserAuteurCible('Jean Dupond'));
  assert.notEqual(normaliserAuteurCible('Émilie Martin'), normaliserAuteurCible('Emilie Martin'));
});

test('normaliserAuteurCible retire uniquement la decoration de fin, jamais un emoji au milieu du nom', () => {
  assert.equal(normaliserAuteurCible('Théophile Burnet ⚡️'), normaliserAuteurCible('Théophile Burnet'));
  assert.notEqual(normaliserAuteurCible('Théophile ⚡️ Burnet'), normaliserAuteurCible('Théophile Burnet'));
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

test('genererRepliAucunCandidat -- cas reel du 16/09/2026, les 8 comptes julien-agency', () => {
  const cibles = [
    { compte: 'julien-agency', nom: 'Jean ZENDJI', postedAt: ilYA(24 * 4) },
    { compte: 'julien-agency', nom: 'Georges Solutions', postedAt: ilYA(24 * 7) },
    { compte: 'julien-agency', nom: 'Romain Charissou', postedAt: ilYA(24 * 30) },
    { compte: 'julien-agency', nom: 'Benjamin Lacroix', postedAt: ilYA(24 * 60) },
    { compte: 'julien-agency', nom: 'Raphael Mizrahi', postedAt: ilYA(24 * 60) },
    { compte: 'julien-agency', nom: 'Mohamed Houmadi Baydama', postedAt: ilYA(24 * 30 * 5) },
    { compte: 'julien-agency', nom: 'Alexandre Touraine', postedAt: ilYA(24 * 30 * 11) },
    { compte: 'julien-agency', nom: 'Pierre-Emmanuel Cochet', postedAt: ilYA(24 * 365 * 3) },
  ];

  const repli = genererRepliAucunCandidat(cibles, MAINTENANT);

  assert.match(repli.message, /Jean ZENDJI/);
  assert.match(repli.message, /4\.0 jours/);
  assert.equal(repli.comptes[0].nom, 'Jean ZENDJI');
  assert.equal(repli.comptes[0].ageJours, 4);
  // Seuil a 28 jours : Jean ZENDJI (4j) et Georges Solutions (7j) restent sous le seuil, les 6
  // autres (30j a plus de 1000j) sont signales comme candidats au remplacement -- reproduit le
  // constat reel de Nomena ("le plus actif publie tous les 4 jours, les autres a des semaines/mois").
  assert.equal(repli.comptesInactifs.length, 6);
  assert.ok(repli.comptesInactifs.every((c) => c.ageJours > SEUIL_INACTIVITE_JOURS));
  assert.match(repli.recommandation, /6\/8 comptes/);
  assert.match(repli.recommandation, /remplacer/);
});

test('genererRepliAucunCandidat gere un compte sans aucun post trouve (postedAt: null)', () => {
  const cibles = [
    { compte: 'julien-agency', nom: 'Compte A', postedAt: ilYA(10) },
    { compte: 'julien-agency', nom: 'Compte B', postedAt: null },
  ];
  const repli = genererRepliAucunCandidat(cibles, MAINTENANT);
  assert.equal(repli.comptes[repli.comptes.length - 1].nom, 'Compte B');
  assert.ok(repli.comptesInactifs.some((c) => c.nom === 'Compte B'));
  assert.match(repli.message, /aucun post trouve/);
});

test('genererRepliAucunCandidat ne signale aucun compte inactif si tous sont recents', () => {
  const cibles = [
    { compte: 'julien-agency', nom: 'Compte A', postedAt: ilYA(24 * 3) },
    { compte: 'julien-agency', nom: 'Compte B', postedAt: ilYA(24 * 5) },
  ];
  const repli = genererRepliAucunCandidat(cibles, MAINTENANT);
  assert.equal(repli.comptesInactifs.length, 0);
  assert.match(repli.recommandation, /ponctuelle, pas structurelle/);
});
