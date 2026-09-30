import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REGLES, apparier, decider, formatDe, normaliserPost } from '../scripts/lib/analyse.mjs';
import { analyserTout, croiserBuffer, estWeekend, lireCsvBuffer } from '../scripts/lib/lundi.mjs';
import { rendreRapport } from '../scripts/lib/rapport.mjs';
import { genererCalendrier } from '../scripts/lib/calendrier.mjs';

test('format réel : le PDF fait le carrousel, même typé « image »', () => {
  assert.equal(formatDe({ mediaType: 'text', mediaItems: [] }), 'texte');
  assert.equal(formatDe({ mediaType: 'image', mediaItems: [{ url: 'https://x/y.pdf' }] }), 'carrousel');
  assert.equal(formatDe({ mediaType: 'image', mediaItems: [{ url: 'https://x/y.png' }] }), 'image');
  assert.equal(formatDe({ mediaType: 'video', mediaItems: [{ url: 'https://x/y.mp4' }] }), 'video');
});

test('décision : incomplet, carrousel, texte, non concluant', () => {
  const paires = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  assert.equal(decider({ texte: [100, 100], carrousel: [200, 200], paires: [] }).verdict, 'incomplet');

  const texte = [100, 105, 110, 115, 120, 125, 130, 135];
  const carrousel = texte.map((x) => x * 2);
  const ok = paires(8, (i) => [texte[i], carrousel[i]]);
  assert.equal(decider({ texte, carrousel, paires: ok }).verdict, 'carrousel');
  assert.equal(decider({ texte: carrousel, carrousel: texte, paires: ok.map(([t, c]) => [c, t]) }).verdict, 'texte');

  // même médianes favorables mais paires dans le désordre : pas de conclusion
  const melange = paires(8, (i) => (i % 2 ? [texte[i], carrousel[i]] : [carrousel[i], texte[i]]));
  const d = decider({ texte, carrousel, paires: melange });
  assert.equal(d.verdict, 'non_concluant');
  assert.equal(d.defaut, 'texte');

  // différence faible : non concluant
  const proche = texte.map((x) => x * 1.05);
  assert.equal(decider({ texte, carrousel: proche, paires: paires(8, (i) => [texte[i], proche[i]]) }).verdict, 'non_concluant');
  // médiane des textes nulle
  assert.equal(decider({ texte: Array(6).fill(0), carrousel: Array(6).fill(5), paires: [] }).verdict, 'non_concluant');
});

const brut = (id, publie, acc, imp, extra = {}) => ({
  _id: id, publishedAt: publie, status: 'published', mediaType: 'text', mediaItems: [], isExternal: true,
  platformPostUrl: `https://linkedin.example/${id}`, platforms: [{ accountId: acc }],
  analytics: { impressions: imp, reach: imp / 2, likes: 1, comments: 0, shares: 0, clicks: 0, lastUpdated: '2026-10-05 06:00:00' },
  ...extra,
});

test('rapprochement : tolérance de 20 minutes, un post sert une seule fois', () => {
  const c = { id: 'c1', accountId: 'P', utc: '2026-10-06T06:30:00.000Z' };
  const posts = [normaliserPost(brut('a', '2026-10-06T06:41:00Z', 'P', 10)), normaliserPost(brut('b', '2026-10-06T07:30:00Z', 'P', 10))];
  const r = apparier(posts, [c, { ...c, id: 'c2' }]);
  assert.equal(r.apparies.length, 1);
  assert.equal(r.manquants.length, 1);
  assert.equal(r.horsPlan.length, 1);
});

const CONFIG = {
  debut: '2026-10-05',
  comptes: {
    'julien-partners': { accountId: 'P', heure: '08:30', grille: 'A' },
    'julien-agency': { accountId: 'A', heure: '13:00', grille: 'B' },
  },
};

/** Publie tous les créneaux échus : le carrousel fait ×2 sur le texte, avec un léger bruit reproductible. */
function simuler(plan, jusqua) {
  return plan.creneaux.filter((c) => new Date(c.utc) <= jusqua).map((c, i) => {
    const base = 100 + (i % 5) * 7;
    const item = c.format === 'carrousel' ? [{ url: 'https://x/doc.pdf' }] : [];
    return brut(`${c.id}`, c.utc, c.accountId, c.format === 'carrousel' ? base * 2 : base, { mediaType: item.length ? 'image' : 'text', mediaItems: item });
  });
}

test('analyse complète : final, deux comptes concordants, carrousel retenu', () => {
  const plan = genererCalendrier(CONFIG);
  const maintenant = new Date('2026-11-02T06:00:00Z');
  const r = analyserTout({ plan, analytics: simuler(plan, maintenant), apercu: { lastSync: 'x' }, maintenant });
  assert.equal(r.decisionFinale, true);
  assert.equal(r.echus, 32);
  assert.equal(r.apparies, 32);
  assert.equal(r.manquants.length, 0);
  assert.equal(r.anomalies.length, 0);
  assert.deepEqual(r.comptes.map((c) => c.decision.verdict), ['carrousel', 'carrousel']);
  assert.equal(r.synthese, 'carrousel');
  const md = rendreRapport(r);
  assert.match(md, /Décision finale/);
  assert.match(md, /## 3\. Test des formats — julien-partners/);
});

test('avant le test : rapport de référence, sans verdict, avec la semaine écoulée', () => {
  const plan = genererCalendrier(CONFIG);
  const maintenant = new Date('2026-10-05T06:00:00Z'); // lundi 05/10 08:00 Paris
  const posts = [
    brut('s1', '2026-09-29T12:00:00Z', 'P', 300),
    brut('s2', '2026-10-02T11:00:00Z', 'A', 90, { mediaType: 'image', mediaItems: [{ url: 'https://x/a.pdf' }] }),
    brut('w1', '2026-10-04T10:00:00Z', 'A', 370), // dimanche
    brut('trop-vieux', '2026-09-20T10:00:00Z', 'A', 50),
  ];
  const r = analyserTout({ plan, analytics: posts, apercu: null, maintenant });
  assert.equal(r.echus, 0);
  assert.equal(r.decisionFinale, false);
  assert.equal(r.semaine.du, '2026-09-28');
  assert.equal(r.semaine.au, '2026-10-04');
  const p = r.semaine.comptes.find((c) => c.compte === 'julien-partners');
  const a = r.semaine.comptes.find((c) => c.compte === 'julien-agency');
  assert.equal(p.n, 1);
  assert.equal(a.n, 2);
  assert.deepEqual(a.formats.map((f) => f.format).sort(), ['carrousel', 'texte']);
  assert.equal(r.weekend.posts.length, 2); // dimanche 04/10 et dimanche 20/09 : à part, jamais dans la semaine ni le test
  assert.ok(estWeekend('2026-09-20') && !estWeekend('2026-10-05'));
  const md = rendreRapport(r);
  assert.match(md, /Le test n’a pas commencé/);
  assert.doesNotMatch(md, /Test des formats — /);
});

const CSV = [
  'compte,date_paris,heure_paris,format,impressions,portee,reactions,commentaires,taux_eng_buffer_pct',
  'julien-partners,2026-09-25,08:49,T,291,209,2,3,2',
  'julien-partners,2026-09-22,08:00,T,199,124,2,0,1',
  'julien-partners,2026-09-06,12:00,T,370,266,0,0,0',
  'julien-agency,2026-09-21,08:13,I,,,0,0,',
].join('\n');

test('relevé Buffer : lecture, format inconnu et colonne absente refusés', () => {
  const l = lireCsvBuffer(CSV);
  assert.equal(l.length, 4);
  assert.equal(l[0].format, 'texte');
  assert.equal(l[3].impressions, null);
  assert.throws(() => lireCsvBuffer(CSV.replace(',T,291', ',Z,291')), /format « Z » inconnu/);
  assert.throws(() => lireCsvBuffer('compte,date_paris\nx,y'), /colonne/);
});

test('relevé Buffer : le format de Zernio corrige l\'étiquette, référence semaine / week-end', () => {
  const zernio = [normaliserPost(brut('z', '2026-09-25T06:49:00Z', 'P', 291, { mediaType: 'image', mediaItems: [{ url: 'https://x/d.pdf' }] }))];
  const r = croiserBuffer(lireCsvBuffer(CSV), { P: 'julien-partners', A: 'julien-agency' }, zernio, { debut: '2026-10-05' }, 'f.csv');
  assert.deepEqual(r.corrections.map((c) => [c.buffer, c.zernio]), [['texte', 'carrousel']]);
  const semaine = r.reference.filter((x) => x.jours === 'semaine');
  assert.deepEqual(semaine.map((x) => [x.format, x.n]).sort(), [['carrousel', 1], ['texte', 1]]);
  assert.equal(r.reference.find((x) => x.jours === 'week-end').mediane, 370);
  assert.equal(r.reference.some((x) => x.compte === 'julien-agency'), false, 'ligne sans mesure écartée');
});
