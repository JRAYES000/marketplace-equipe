#!/usr/bin/env node
// Génère calendrier.json (32 créneaux) à partir d'un fichier de configuration.
//   node generer-calendrier.mjs --config plan-config.json [--sortie calendrier.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genererCalendrier } from './lib/calendrier.mjs';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';

const a = lireArguments(process.argv.slice(2));
const config = JSON.parse(readFileSync(a.config || join(DOSSIER_TEST, 'plan-config.json'), 'utf8'));
const calendrier = genererCalendrier(config);
const sortie = a.sortie || join(DOSSIER_TEST, 'calendrier.json');
writeFileSync(sortie, JSON.stringify(calendrier, null, 2) + '\n');
console.log(`${calendrier.creneaux.length} créneaux écrits dans ${sortie}`);
