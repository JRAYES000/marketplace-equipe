// Chemins par défaut et lecture d'arguments, communs aux commandes de la skill.
import { homedir } from 'node:os';
import { join } from 'node:path';

export const LIVRABLES = process.env.LIVRABLES_DIR || join(homedir(), 'OneDrive', 'Documents', 'GitHub', 'livrables-Claude-Agency');
export const DOSSIER_TEST = join(LIVRABLES, 'linkedin', 'test-formats-2026-10');

/** `--cle valeur` et `--drapeau` → objet. */
export function lireArguments(argv) {
  const sortie = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const cle = argv[i].slice(2);
    const suivant = argv[i + 1];
    if (suivant === undefined || suivant.startsWith('--')) sortie[cle] = true;
    else { sortie[cle] = suivant; i++; }
  }
  return sortie;
}
