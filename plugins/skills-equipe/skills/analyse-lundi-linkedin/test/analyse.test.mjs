import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apparier, decider, resumer } from '../scripts/lib/analyse.mjs';
import { analyserTout, estWeekend, fusionnerReleves, lireCsvBuffer } from '../scripts/lib/lundi.mjs';
import { rendreRapport } from '../scripts/lib/rapport.mjs';
import { genererCalendrier } from '../scripts/lib/calendrier.mjs';
import { lireHeureServeur } from '../scripts/lib/heure.mjs';

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

/** Post tel que lireCsvBuffer le rend. */
const post = (id, publie, compte, imp, extra = {}) => ({
  id, compte, publieLe: publie, format: 'texte', impressions: imp, reactions: 1, commentaires: 0,
  tauxEngagement: 0.01, url: `https://linkedin.example/${id}`, releve: 'r.csv', ...extra,
});

test('rapprochement : même compte, tolérance de 20 minutes, un post sert une seule fois', () => {
  const c = { id: 'c1', compte: 'julien-partners', utc: '2026-10-06T06:30:00.000Z' };
  const posts = [post('a', '2026-10-06T06:41:00Z', 'julien-partners', 10), post('b', '2026-10-06T07:30:00Z', 'julien-partners', 10), post('x', '2026-10-06T06:30:00Z', 'julien-agency', 10)];
  const r = apparier(posts, [c, { ...c, id: 'c2' }]);
  assert.equal(r.apparies.length, 1);
  assert.equal(r.apparies[0].post.id, 'a');
  assert.equal(r.manquants.length, 1);
  assert.equal(r.horsPlan.length, 2);
});

test('indicateurs : seulement impressions, réactions, commentaires et taux d\'engagement Buffer', () => {
  const r = resumer([post('a', 'x', 'p', 100, { tauxEngagement: 0.02 }), post('b', 'x', 'p', 300, { tauxEngagement: null })]);
  assert.deepEqual(Object.keys(r).sort(), ['commentaires', 'impressions', 'n', 'reactions', 'tauxEngagement']);
  assert.equal(r.impressions.mediane, 200);
  assert.equal(r.tauxEngagement, 0.02);
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
    return post(c.id, c.utc, c.compte, c.format === 'carrousel' ? base * 2 : base, { format: c.format });
  });
}

test('analyse complète : final, deux comptes concordants, carrousel retenu', () => {
  const plan = genererCalendrier(CONFIG);
  const maintenant = new Date('2026-11-02T06:00:00Z');
  const r = analyserTout({ plan, posts: simuler(plan, maintenant), maintenant, releves: ['releve-buffer-2026-11-02.csv'] });
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
  assert.match(md, /Source unique : Buffer Insights/);
  assert.doesNotMatch(md, /Zernio|Portée/);
});

test('avant le test : rapport de référence, sans verdict, avec la semaine écoulée', () => {
  const plan = genererCalendrier(CONFIG);
  const maintenant = new Date('2026-10-05T06:00:00Z'); // lundi 05/10 08:00 Paris
  const posts = [
    post('s1', '2026-09-29T12:00:00Z', 'julien-partners', 300),
    post('s2', '2026-10-02T11:00:00Z', 'julien-agency', 90, { format: 'carrousel' }),
    post('w1', '2026-10-04T10:00:00Z', 'julien-agency', 370), // dimanche
    post('trop-vieux', '2026-09-20T10:00:00Z', 'julien-agency', 50),
    post('futur', '2026-10-06T10:00:00Z', 'julien-agency', 50), // après l'heure de référence : ignoré
  ];
  const r = analyserTout({ plan, posts, maintenant });
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

test('créneau « comparaison: false » : au calendrier, jamais dans les médianes', () => {
  const plan = genererCalendrier(CONFIG);
  plan.creneaux.forEach((c) => { if (c.compte === 'julien-agency') c.comparaison = false; });
  const maintenant = new Date('2026-11-02T06:00:00Z');
  const r = analyserTout({ plan, posts: simuler(plan, maintenant), maintenant });
  assert.equal(r.manquants.length, 0);
  assert.equal(r.horsPlan.length, 0);
  const a = r.comptes.find((c) => c.compte === 'julien-agency');
  assert.equal(a.murs, 0);
  assert.equal(a.publies, 16);
});

test('lundi à venir (--date) : la semaine visée, lue avec les chiffres du moment', () => {
  const plan = genererCalendrier(CONFIG);
  const r = analyserTout({ plan, posts: [post('m', '2026-10-06T11:00:00Z', 'julien-agency', 80)], maintenant: new Date('2026-10-08T12:00:00Z'), jour: '2026-10-12' });
  assert.equal(r.dateAnalyse, '2026-10-12');
  assert.equal(r.semaine.du, '2026-10-05');
  assert.equal(r.semaine.au, '2026-10-11');
  assert.equal(r.semaine.comptes.find((c) => c.compte === 'julien-agency').n, 1);
});

const CSV_V2 = [
  'compte,publie_le,fuseau_affiche,format,impressions,reactions,commentaires,taux_eng_buffer_pct,id_buffer,lien',
  'julien-partners,2026-09-17 18:00,Europe/Minsk,T,1096,7,8,1.37,6aaac562,https://www.linkedin.com/feed/update/urn:li:share:1/',
  'julien-agency,2026-10-26 14:00,Europe/Minsk,C,,,,,,',
].join('\n');
const CSV_V1 = [
  'compte,date_paris,heure_paris,format,impressions,portee,reactions,commentaires,taux_eng_buffer_pct',
  'julien-partners,2026-09-17,17:00,T,900,600,5,6,1',
  'julien-partners,2026-09-06,12:00,T,370,266,0,0,0',
].join('\n');

test('relevé Buffer : heure affichée (Minsk) convertie en UTC, mesure absente, erreurs nettes', () => {
  const l = lireCsvBuffer(CSV_V2, 'v2.csv');
  assert.equal(l.length, 2);
  assert.equal(l[0].publieLe, '2026-09-17T15:00:00.000Z'); // 18:00 Minsk (UTC+3) = 17:00 Paris
  assert.equal(l[0].tauxEngagement, 0.0137);
  assert.equal(l[0].id, '6aaac562');
  assert.equal(l[1].publieLe, '2026-10-26T11:00:00.000Z'); // Paris passé à l'heure d'hiver, Minsk non
  assert.equal(l[1].format, 'carrousel');
  assert.equal(l[1].impressions, null);
  assert.throws(() => lireCsvBuffer(CSV_V2.replace(',T,1096', ',Z,1096')), /format « Z » inconnu/);
  assert.throws(() => lireCsvBuffer(CSV_V2.replace('Europe/Minsk', 'Mars/Olympus')), /fuseau « Mars\/Olympus » inconnu/);
  assert.throws(() => lireCsvBuffer(CSV_V2.replace('julien-partners', 'julien')), /compte « julien » inconnu/);
  assert.throws(() => lireCsvBuffer('compte,format\nx,T'), /colonne/);
});

test('relevés fusionnés : ancien format accepté, le plus récent l\'emporte pour un même post', () => {
  const fusion = fusionnerReleves([lireCsvBuffer(CSV_V1, 'ancien.csv'), lireCsvBuffer(CSV_V2, 'recent.csv')]);
  assert.equal(fusion.length, 3);
  const meme = fusion.find((p) => p.publieLe === '2026-09-17T15:00:00.000Z');
  assert.equal(meme.impressions, 1096);
  assert.equal(meme.releve, 'recent.csv');
});

test('heure de référence : en-tête Date du serveur Buffer, abandon au bout du délai', async () => {
  const ok = await lireHeureServeur({ fetchFn: async () => ({ status: 200, headers: new Headers({ date: 'Thu, 08 Oct 2026 14:00:00 GMT' }) }) });
  assert.equal(ok.toISOString(), '2026-10-08T14:00:00.000Z');
  const lent = (url, { signal }) => new Promise((_, ko) => signal.addEventListener('abort', () => ko(signal.reason)));
  await assert.rejects(lireHeureServeur({ fetchFn: lent, delaiMs: 50 }), /pas de réponse en 0.05 s/);
});
