import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertirStatsN8n, ENTETE, lignesDe } from '../scripts/lib/releve-n8n.mjs';
import { lireCsvBuffer } from '../scripts/lib/lundi.mjs';

const ligne = (o) => ({
  releve_le: '2026-11-23T06:30:05.000Z', compte: 'partners', format: 'texte', post_id: 'urn:li:share:1',
  post_url: 'https://www.linkedin.com/feed/update/urn:li:share:1/', publie_le: '2026-11-20T09:15:00.000Z',
  reactions: 12, commentaires: 3, abonnes: 1620, source: 'scrapecreators', ...o,
});

test('aller-retour : le CSV se relit par lireCsvBuffer avec les mêmes chiffres', () => {
  const rows = [
    ligne({}),
    ligne({ compte: 'agency', format: 'carrousel', post_id: 'urn:li:ugcPost:2', post_url: 'https://www.linkedin.com/feed/update/urn:li:ugcPost:2/', publie_le: '2026-11-18T16:40:00.000Z', reactions: 0, commentaires: 0 }),
    ligne({ format: 'image', post_id: 'urn:li:share:3', post_url: 'https://www.linkedin.com/feed/update/urn:li:share:3/', publie_le: '2026-11-21T07:00:00.000Z', reactions: 5, commentaires: 1 }),
  ];
  const { date, csv, n } = convertirStatsN8n(rows);
  assert.equal(date, '2026-11-23');
  assert.equal(n, 3);
  assert.equal(csv.split('\n')[0], ENTETE);
  const posts = lireCsvBuffer(csv, 'test');
  assert.deepEqual(posts.map((p) => [p.compte, p.format, p.publieLe, p.reactions, p.commentaires, p.impressions, p.idBuffer]), [
    ['julien-agency', 'carrousel', '2026-11-18T16:40:00.000Z', 0, 0, null, 'urn:li:ugcPost:2'],
    ['julien-partners', 'texte', '2026-11-20T09:15:00.000Z', 12, 3, null, 'urn:li:share:1'],
    ['julien-partners', 'image', '2026-11-21T07:00:00.000Z', 5, 1, null, 'urn:li:share:3'],
  ]);
});

test('relevé le plus récent par défaut, --date pour un autre, dernière mesure d’un post gardée', () => {
  const rows = [
    ligne({ releve_le: '2026-11-16T06:30:00.000Z', reactions: 4 }),
    ligne({ releve_le: '2026-11-23T06:30:00.000Z', reactions: 9 }),
    ligne({ releve_le: '2026-11-23T08:00:00.000Z', reactions: 11 }),
  ];
  assert.equal(lireCsvBuffer(convertirStatsN8n(rows).csv)[0].reactions, 11);
  const ancien = convertirStatsN8n(rows, { date: '2026-11-16' });
  assert.equal(ancien.date, '2026-11-16');
  assert.equal(lireCsvBuffer(ancien.csv)[0].reactions, 4);
  assert.throws(() => convertirStatsN8n(rows, { date: '2026-11-09' }), /Aucun relevé/);
});

test('entrées refusées : compte inconnu, table vide, virgule dans un champ', () => {
  assert.throws(() => convertirStatsN8n([ligne({ compte: 'autre' })]), /Compte « autre » inconnu/);
  assert.throws(() => convertirStatsN8n([]), /rien à convertir/);
  assert.throws(() => convertirStatsN8n([ligne({ post_url: 'https://x/a,b' })]), /virgule/);
  assert.deepEqual(lignesDe([{ rows: [1] }, { rows: [2] }]), [1, 2]);
  assert.throws(() => lignesDe({}), /illisible/);
});

test('commande : écrit le relevé, puis refuse de l’écraser', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'releve-n8n-'));
  const entree = join(dossier, 'stats.json');
  writeFileSync(entree, JSON.stringify({ rows: [ligne({})], count: 1 }));
  const script = fileURLToPath(new URL('../scripts/releve-depuis-n8n.mjs', import.meta.url));
  execFileSync(process.execPath, [script, '--entree', entree, '--sortie', dossier]);
  const csv = readFileSync(join(dossier, 'releve-buffer-2026-11-23.csv'), 'utf8');
  assert.equal(lireCsvBuffer(csv).length, 1);
  const r = spawnSync(process.execPath, [script, '--entree', entree, '--sortie', dossier], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /existe déjà/);
});

test('dossier des livrables : LIVRABLES_DIR, puis le premier emplacement existant, sinon le premier', async () => {
  const { dossierLivrables } = await import('../../../lib/livrables.mjs');
  const home = join('H');
  assert.equal(dossierLivrables({ env: { LIVRABLES_DIR: 'X' }, home, existe: () => false }), 'X');
  assert.equal(dossierLivrables({ env: {}, home, existe: (d) => d.includes('PERSO') }), join('H', 'OneDrive', 'PERSO', 'GitHub', 'livrables-Claude-Agency'));
  assert.equal(dossierLivrables({ env: {}, home, existe: () => false }), join('H', 'OneDrive', 'Documents', 'GitHub', 'livrables-Claude-Agency'));
});
