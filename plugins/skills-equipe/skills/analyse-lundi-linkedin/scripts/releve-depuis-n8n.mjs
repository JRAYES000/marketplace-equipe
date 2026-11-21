#!/usr/bin/env node
// Relevé du lundi : table n8n stats_linkedin (workflow 39) → releve-buffer-AAAA-MM-JJ.csv dans le dossier du test.
//   node releve-depuis-n8n.mjs --entree stats.json [--date AAAA-MM-JJ] [--sortie dossier] [--a-blanc]
// stats.json : réponse(s) de get_data_table_rows (MCP n8n, table stats_linkedin), enregistrée(s) telle(s) quelle(s).
// N'écrase jamais un relevé existant. Pas d'impressions : colonnes vides (aucune source automatique).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { convertirStatsN8n, lignesDe } from './lib/releve-n8n.mjs';

const a = lireArguments(process.argv.slice(2));
if (!a.entree || a.entree === true) {
  console.error('Usage : node releve-depuis-n8n.mjs --entree stats.json [--date AAAA-MM-JJ] [--sortie dossier] [--a-blanc]');
  process.exit(2);
}
try {
  const { date, csv, n } = convertirStatsN8n(lignesDe(JSON.parse(readFileSync(a.entree, 'utf8'))), { date: a.date || null });
  const dossier = a.sortie && a.sortie !== true ? a.sortie : DOSSIER_TEST;
  const fichier = join(dossier, `releve-buffer-${date}.csv`);
  if (a['a-blanc']) {
    process.stdout.write(csv);
    console.error(`${n} post(s), relevé du ${date} → ${fichier} (rien écrit)`);
    process.exit(0);
  }
  if (existsSync(fichier)) {
    console.error(`${fichier} existe déjà : un relevé ne s'écrase jamais. Le renommer à la main ou passer --date.`);
    process.exit(1);
  }
  mkdirSync(dossier, { recursive: true });
  writeFileSync(fichier, csv);
  console.log(`${n} post(s), relevé du ${date} → ${fichier}`);
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
