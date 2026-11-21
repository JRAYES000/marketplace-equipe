// Dossier du dépôt livrables-Claude-Agency, commun aux skills LinkedIn du plugin.
// Ordre : variable LIVRABLES_DIR, puis le premier emplacement connu qui existe sur le poste
// (OneDrive/Documents/GitHub par défaut, OneDrive/PERSO/GitHub sur le poste de Julien), sinon le premier.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const EMPLACEMENTS = [
  ['OneDrive', 'Documents', 'GitHub'],
  ['OneDrive', 'PERSO', 'GitHub'],
  ['Documents', 'GitHub'],
  ['GitHub'],
];

export function dossierLivrables({ env = process.env, home = homedir(), existe = existsSync } = {}) {
  if (env.LIVRABLES_DIR) return env.LIVRABLES_DIR;
  const candidats = EMPLACEMENTS.map((e) => join(home, ...e, 'livrables-Claude-Agency'));
  return candidats.find((d) => existe(d)) || candidats[0];
}
