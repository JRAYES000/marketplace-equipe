import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerObjectif, rendreObjectif } from '../scripts/lib/objectif.mjs';
import { lireCsvBuffer, fusionnerReleves } from '../scripts/lib/lundi.mjs';

const CSV = [
  'compte,publie_le,fuseau_affiche,format,impressions,reactions,commentaires,taux_eng_buffer_pct,id_buffer,lien',
  'julien-agency,2026-10-14 13:00,Europe/Paris,T,900,1,0,0.1,a0,',  // avant la période
  'julien-agency,2026-10-15 13:00,Europe/Paris,T,400,1,0,0.2,a1,',
  'julien-agency,2026-10-20 13:00,Europe/Minsk,I,700,3,1,0.5,a2,', // 12:00 Paris
  'julien-agency,2026-10-22 13:00,Europe/Paris,C,600,2,0,0.3,a3,',
  'julien-agency,2026-10-28 13:00,Europe/Paris,T,50,0,0,0,a4,',   // pas mûr au 28/10 18:00
  'julien-agency,2026-10-29 01:30,Europe/Minsk,T,999,0,0,0,a5,',  // 28/10 23:30 Paris : dans la période
  'julien-partners,2026-10-20 08:30,Europe/Paris,T,5000,0,0,0,p1,',
].join('\n');

test('objectif : période en heure de Paris, compte filtré, médiane des seuls posts mûrs pour le verdict', () => {
  const posts = fusionnerReleves([lireCsvBuffer(CSV, 'r.csv')]);
  const r = calculerObjectif({ posts, compte: 'julien-agency', du: '2026-10-15', au: '2026-10-28', maintenant: '2026-10-28T16:00:00Z', reference: 163, seuil: 500 });
  assert.equal(r.nPosts, 5, 'a1, a2, a3, a4 et a5 (23:30 Paris le 28/10) ; a0 et Partners exclus');
  assert.equal(r.nMurs, 3);
  assert.equal(r.medianeMurs, 600);
  assert.equal(r.medianeTous, 600);
  assert.equal(r.atteint, true);
  assert.ok(Math.abs(r.rapportReference - 600 / 163) < 1e-9);
});

test('objectif : seuil non atteint, et aucun post mûr = non mesurable', () => {
  const posts = fusionnerReleves([lireCsvBuffer(CSV, 'r.csv')]);
  const bas = calculerObjectif({ posts, compte: 'julien-agency', du: '2026-10-15', au: '2026-10-28', maintenant: '2026-10-28T16:00:00Z', reference: 163, seuil: 650 });
  assert.equal(bas.atteint, false);
  const vide = calculerObjectif({ posts, compte: 'julien-agency', du: '2026-10-28', au: '2026-10-28', maintenant: '2026-10-28T16:00:00Z', reference: 163, seuil: 500 });
  assert.equal(vide.atteint, null);
  assert.match(rendreObjectif(vide), /non mesurable/);
});
