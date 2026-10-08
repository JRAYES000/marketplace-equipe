import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comparerPaires, icRapportMedianes, mediane, pSigne, quantile } from '../scripts/lib/stats.mjs';
import { GRILLE_A, apparierDeplacements, apparierSujets, genererCalendrier, lireFileBuffer, parisVersUtc, utcVersParis, verifierCreneaux } from '../scripts/lib/calendrier.mjs';

test('médiane et quantile', () => {
  assert.equal(mediane([3, 1, 2]), 2);
  assert.equal(mediane([1, 2, 3, 10]), 2.5);
  assert.equal(mediane([]), null);
  assert.equal(mediane([null, 4, NaN]), 4);
  assert.equal(quantile([0, 10], 0.5), 5);
});

test('test des signes exact', () => {
  assert.equal(pSigne(0, 0), 1);
  assert.ok(Math.abs(pSigne(8, 8) - 2 / 256) < 1e-12);
  assert.ok(Math.abs(pSigne(4, 8) - 1) < 1e-12);
  const r = comparerPaires([[1, 2], [3, 5], [4, 4], [9, 2]]);
  assert.deepEqual([r.carrousel, r.texte, r.egalites, r.decidees], [2, 1, 1, 3]);
});

test('bootstrap reproductible et cohérent', () => {
  const a = [100, 110, 120, 130, 140, 150];
  const b = a.map((x) => x * 2);
  const i1 = icRapportMedianes(a, b);
  const i2 = icRapportMedianes(a, b);
  assert.deepEqual(i1, i2);
  assert.ok(i1.bas > 1.5 && i1.haut < 2.6);
  assert.deepEqual(icRapportMedianes([], b), { bas: null, haut: null, ecartes: 0 });
});

test('Paris ↔ UTC, changement d\'heure du 25/10/2026 compris', () => {
  assert.equal(parisVersUtc('2026-10-06', '08:30').toISOString(), '2026-10-06T06:30:00.000Z');
  assert.equal(parisVersUtc('2026-10-27', '08:30').toISOString(), '2026-10-27T07:30:00.000Z');
  assert.deepEqual(utcVersParis(new Date('2026-10-27T07:30:00Z')), { date: '2026-10-27', heure: '08:30', jour: 'mar' });
});

test('la grille : 2 textes et 2 carrousels par semaine ET par jour', () => {
  for (const ligne of GRILLE_A) assert.equal([...ligne].filter((c) => c === 'T').length, 2);
  for (let k = 0; k < 4; k++) assert.equal(GRILLE_A.filter((l) => l[k] === 'T').length, 2);
});

const CONFIG = {
  debut: '2026-10-05',
  comptes: {
    'julien-partners': { accountId: 'P', heure: '08:30', grille: 'A' },
    'julien-agency': { accountId: 'A', heure: '13:00', grille: 'B' },
  },
};

test('calendrier : 32 créneaux, équilibrés, sujets appariés à 8 jours au moins', () => {
  const c = genererCalendrier(CONFIG);
  assert.equal(c.creneaux.length, 32);
  assert.equal(c.meta.fin, '2026-11-01');
  for (const compte of Object.keys(CONFIG.comptes)) {
    const s = c.creneaux.filter((x) => x.compte === compte);
    assert.equal(s.filter((x) => x.format === 'texte').length, 8);
    assert.equal(s.filter((x) => x.format === 'carrousel').length, 8);
    const sujets = new Map();
    for (const x of s) sujets.set(x.sujet, [...(sujets.get(x.sujet) || []), x]);
    assert.equal(sujets.size, 8);
    let texteDabord = 0;
    for (const [, paire] of sujets) {
      assert.equal(paire.length, 2);
      assert.notEqual(paire[0].format, paire[1].format);
      assert.ok(Math.abs(new Date(paire[0].date) - new Date(paire[1].date)) / 86400000 >= 8);
      const t = paire.find((x) => x.format === 'texte');
      if (t.ordreDansPaire === 1) texteDabord++;
    }
    assert.equal(texteDabord, 4);
  }
  // les deux comptes testent des formats opposés le même jour
  for (const p of c.creneaux.filter((x) => x.compte === 'julien-partners')) {
    const a = c.creneaux.find((x) => x.compte === 'julien-agency' && x.date === p.date);
    assert.notEqual(p.format, a.format);
  }
  assert.ok(c.creneaux.every((x) => ['mar', 'mer', 'jeu', 'ven'].includes(x.jour)));
});

test('calendrier : refuse un début qui n\'est pas un lundi', () => {
  assert.throws(() => genererCalendrier({ ...CONFIG, debut: '2026-10-06' }), /lundi/);
});

test('appariement impossible → null', () => {
  const t = [{ date: '2026-10-06' }, { date: '2026-10-07' }];
  const c = [{ date: '2026-10-08' }, { date: '2026-10-09' }];
  assert.equal(apparierSujets(t, c, 8), null);
});

test('file Buffer : lecture, commentaires, UTC calculé, ligne invalide refusée', () => {
  const f = lireFileBuffer('# x\n\n2026-10-05 13:00 julien-partners\r\n2026-10-27 13:00 julien-agency');
  assert.deepEqual(f, [
    { compte: 'julien-partners', instant: '2026-10-05T11:00:00.000Z' },
    { compte: 'julien-agency', instant: '2026-10-27T12:00:00.000Z' },
  ]);
  assert.throws(() => lireFileBuffer('lundi 5 octobre'), /ne suit pas/);
});

test('vérification des créneaux : programmé, manquant, hors plan, conflit, passé, jour', () => {
  const plan = genererCalendrier(CONFIG).creneaux;
  const maintenant = new Date('2026-09-30T08:00:00Z');
  const file = (date, heure, compte = 'julien-partners') => ({ compte, instant: parisVersUtc(date, heure).toISOString() });
  const toute = plan.map((c) => ({ compte: c.compte, instant: c.utc }));
  const r0 = verifierCreneaux(plan, { maintenant, buffer: toute });
  assert.ok(r0.creneaux.every((r) => r.ok), 'chaque créneau a son post dans la file : programmé');
  assert.equal(r0.horsPlan.length, 0);
  assert.throws(() => verifierCreneaux(plan, {}), /heure de référence absente/);

  const p1 = plan.find((c) => c.id === 'P-sem1-jeu'); // jeudi 08/10 08:30 Paris
  const sansP1 = toute.filter((b) => b.instant !== p1.utc || b.compte !== p1.compte);
  const manque = verifierCreneaux(plan, { maintenant, buffer: sansP1 });
  assert.match(manque.creneaux.find((x) => x.id === p1.id).problemes[0], /absent de la file Buffer \(manquant\)/);

  const enTrop = verifierCreneaux(plan, { maintenant, buffer: [...toute, file('2026-10-08', '10:30')] });
  assert.equal(enTrop.horsPlan.length, 1);
  assert.match(enTrop.creneaux.find((x) => x.id === p1.id).problemes[0], /post hors calendrier à 120 min/);
  // un post hors plan d'un autre compte ne gêne pas le créneau
  assert.ok(verifierCreneaux(plan, { maintenant, buffer: [...toute, file('2026-10-08', '10:30', 'julien-agency')] }).creneaux.find((x) => x.id === p1.id).ok);

  const passe = verifierCreneaux(plan, { maintenant: new Date('2026-10-06T07:00:00Z'), buffer: [] });
  const mar = passe.creneaux.find((x) => x.id === 'P-sem1-mar');
  assert.ok(mar.passe && mar.ok, "un créneau passé n'est pas contrôlé contre la file");
  const samedi = verifierCreneaux([{ ...p1, id: 'x', date: '2026-10-10', jour: 'sam', utc: '2026-10-10T06:30:00.000Z' }], { maintenant, buffer: [file('2026-10-10', '08:30')] });
  assert.match(samedi.creneaux[0].problemes.join(), /jour non autorisé/);
  assert.ok(verifierCreneaux([{ ...p1, id: 'x', date: '2026-10-10', jour: 'sam', utc: '2026-10-10T06:30:00.000Z' }], { maintenant, buffer: [file('2026-10-10', '08:30')], jourAutorises: [0, 1, 2, 3, 4, 5, 6] }).creneaux[0].ok);
});

test('file Buffer : début du texte gardé ; déplacement reconnu par compte et début de texte', () => {
  const f = lireFileBuffer('2026-10-14 13:00 julien-partners # T Exemple : une consultante IA envoie');
  assert.equal(f[0].note, 'T Exemple : une consultante IA envoie');
  const ancien = { id: 'P-10-06-1300', compte: 'julien-partners', date: '2026-10-06', heureParis: '13:00', debut: 'Exemple : une consultante IA envoie le même message' };
  const autre = { id: 'P-10-07-0830', compte: 'julien-partners', date: '2026-10-07', heureParis: '08:30', debut: 'Un autre texte' };
  const r = apparierDeplacements([ancien, autre], [...f, { compte: 'julien-agency', instant: 'x', note: 'T Exemple : une consultante IA envoie' }]);
  assert.equal(r.deplaces.length, 1);
  assert.equal(r.deplaces[0].ancien.id, 'P-10-06-1300');
  assert.equal(r.deplaces[0].nouveau.instant, '2026-10-14T11:00:00.000Z');
  assert.deepEqual(r.manquants.map((c) => c.id), ['P-10-07-0830']);
  assert.equal(r.horsPlan.length, 1, 'même texte sur un autre compte : pas un déplacement');
});
