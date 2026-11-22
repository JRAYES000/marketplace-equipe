import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileDepuisN8n, lignesFichierFile, lignesN8n } from '../../../lib/file-n8n.mjs';
import { lireFileBuffer } from '../scripts/lib/calendrier.mjs';

const ROWS = { rows: [
  { id: 1, compte: 'agency', format: 'carrousel', texte: 'Deux lignes\nsuite', publier_le: '2026-11-25T07:30:00.000Z', statut: 'a_publier' },
  { id: 2, compte: 'partners', format: 'texte', texte: 'Déjà parti', publier_le: '2026-11-20T10:00:00.000Z', statut: 'publie' },
  { id: 3, compte: 'partners', format: 'image', texte: 'Hiver', publier_le: '2026-07-01T10:00:00.000Z', statut: 'a_publier' },
] };

test('file n8n : lignes a_publier seulement, heure de Paris (été/hiver), triées', () => {
  const f = fileDepuisN8n(lignesN8n(ROWS));
  assert.deepEqual(f.map((p) => [p.date, p.heure, p.compte, p.format]), [['2026-07-01', '12:00', 'julien-partners', 'I'], ['2026-11-25', '08:30', 'julien-agency', 'C']]);
  assert.equal(f[1].texte, 'Deux lignes\nsuite');
});

test('file n8n : format écrit relu par verifier-creneaux (aller-retour UTC)', () => {
  const l = lireFileBuffer(lignesFichierFile(fileDepuisN8n(lignesN8n(ROWS))).join('\n'));
  assert.deepEqual(l.map((x) => [x.compte, x.instant]), [['julien-partners', '2026-07-01T10:00:00.000Z'], ['julien-agency', '2026-11-25T07:30:00.000Z']]);
  assert.equal(l[1].note, 'C Deux lignes');
});

test('file n8n : compte inconnu ou date illisible = erreur, jamais ignoré', () => {
  assert.throws(() => fileDepuisN8n([{ id: 9, compte: 'x', publier_le: '2026-11-25T07:30:00Z', statut: 'a_publier' }]), /compte inconnu/);
  assert.throws(() => fileDepuisN8n([{ id: 9, compte: 'agency', publier_le: 'demain', statut: 'a_publier' }]), /publier_le illisible/);
  assert.throws(() => lignesN8n('x'), /illisible/);
});
