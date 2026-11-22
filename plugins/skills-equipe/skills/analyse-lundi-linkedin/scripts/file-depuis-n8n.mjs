#!/usr/bin/env node
// File des posts programmés : table n8n publications_linkedin (workflow 38) → file-attente-buffer.txt (nom conservé)
// dans le dossier du test, au format lu par verifier-creneaux.mjs.
//   node file-depuis-n8n.mjs --entree file.json [--sortie dossier] [--a-blanc]
// file.json : réponse(s) de get_data_table_rows (MCP n8n, table GCjlt3vNRlqbBfUB), enregistrée(s) telle(s) quelle(s).
// Garde les lignes a_publier. Remplace la file précédente : elle se réécrit avant chaque contrôle.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { fileDepuisN8n, lignesFichierFile, lignesN8n } from '../../../lib/file-n8n.mjs';

const a = lireArguments(process.argv.slice(2));
if (!a.entree || a.entree === true) {
  console.error('Usage : node file-depuis-n8n.mjs --entree file.json [--sortie dossier] [--a-blanc]');
  process.exit(2);
}
try {
  const file = fileDepuisN8n(lignesN8n(JSON.parse(readFileSync(a.entree, 'utf8'))));
  const texte = [`# publications_linkedin (a_publier), heure de Paris, convertie le ${new Date().toISOString()}`, ...lignesFichierFile(file)].join('\n') + '\n';
  const dossier = a.sortie && a.sortie !== true ? a.sortie : DOSSIER_TEST;
  const fichier = join(dossier, 'file-attente-buffer.txt');
  if (a['a-blanc']) {
    process.stdout.write(texte);
    console.error(`${file.length} post(s) à publier → ${fichier} (rien écrit)`);
    process.exit(0);
  }
  mkdirSync(dossier, { recursive: true });
  writeFileSync(fichier, texte);
  console.log(`${file.length} post(s) à publier → ${fichier}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
