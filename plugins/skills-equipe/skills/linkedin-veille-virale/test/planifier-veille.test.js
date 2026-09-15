'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerQuotaHebdomadaire, QUOTA_MAX_PAR_SEMAINE } = require('../lib/planifier-veille');
const { debutSemaineISO, entreesDeLaSemaine } = require('../lib/registre');

test('validerQuotaHebdomadaire accepte sous le quota, jour jamais publie cette semaine', () => {
  const entreesSemaine = [
    { date: '2026-09-15' },
    { date: '2026-09-16' },
  ];
  assert.doesNotThrow(() => validerQuotaHebdomadaire(entreesSemaine, { date: '2026-09-17' }));
});

test('refuse au-dela de 3 posts la meme semaine -- cas demande', () => {
  const entreesSemaine = [
    { date: '2026-09-14' },
    { date: '2026-09-15' },
    { date: '2026-09-16' },
  ];
  assert.equal(entreesSemaine.length, QUOTA_MAX_PAR_SEMAINE);
  assert.throws(
    () => validerQuotaHebdomadaire(entreesSemaine, { date: '2026-09-17' }),
    /quota hebdomadaire atteint \(3\/3/
  );
});

test('refuse un second post le meme jour -- cas demande', () => {
  const entreesSemaine = [{ date: '2026-09-15' }];
  assert.throws(
    () => validerQuotaHebdomadaire(entreesSemaine, { date: '2026-09-15' }),
    /jamais deux le meme jour/
  );
});

test('validerQuotaHebdomadaire refuse sans date fournie', () => {
  assert.throws(() => validerQuotaHebdomadaire([], {}), /date requise/);
});

test('debutSemaineISO renvoie le lundi de la semaine, meme pour un dimanche', () => {
  assert.equal(debutSemaineISO('2026-09-16'), '2026-09-14'); // mercredi -> lundi
  assert.equal(debutSemaineISO('2026-09-14'), '2026-09-14'); // lundi -> lui-meme
  assert.equal(debutSemaineISO('2026-09-20'), '2026-09-14'); // dimanche -> lundi de la meme semaine
  assert.equal(debutSemaineISO('2026-09-21'), '2026-09-21'); // lundi suivant
});

test('entreesDeLaSemaine ne garde que les entrees de la semaine courante, pas la semaine precedente/suivante', () => {
  const registre = {
    'julien-agency': [
      { date: '2026-09-13' }, // dimanche, semaine precedente
      { date: '2026-09-14' }, // lundi, semaine courante
      { date: '2026-09-16' }, // mercredi, semaine courante
      { date: '2026-09-21' }, // lundi suivant, semaine suivante
    ],
  };
  const retenues = entreesDeLaSemaine(registre, 'julien-agency', '2026-09-16');
  assert.deepEqual(retenues.map((e) => e.date), ['2026-09-14', '2026-09-16']);
});

test('bout en bout : 3 posts deja programmes dans la meme semaine (registre reel) refusent un 4e -- cas demande explicitement par l\'audit', () => {
  const registre = {
    'julien-agency': [
      { date: '2026-09-15', postId: 'a' },
      { date: '2026-09-16', postId: 'b' },
      { date: '2026-09-17', postId: 'c' },
    ],
  };
  const entreesSemaine = entreesDeLaSemaine(registre, 'julien-agency', '2026-09-18');
  assert.throws(
    () => validerQuotaHebdomadaire(entreesSemaine, { date: '2026-09-18' }),
    /quota hebdomadaire atteint \(3\/3/
  );
});
