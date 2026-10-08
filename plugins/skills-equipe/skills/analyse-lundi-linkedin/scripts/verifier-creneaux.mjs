#!/usr/bin/env node
// Vérifie chaque créneau du calendrier contre la file Buffer, seule référence des posts programmés.
//   node verifier-creneaux.mjs [--plan calendrier.json] [--buffer file-attente-buffer.txt] [--ecart 3] [--maintenant ISO]
// La file se relève dans Buffer (Publish > Queue, references/releve-buffer.md), une ligne par post
// « AAAA-MM-JJ HH:MM compte » en heure de Paris ; l'UTC est calculé ici.
// Lecture seule. Code de sortie 1 s'il reste un conflit.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { lireFileBuffer, verifierCreneaux } from './lib/calendrier.mjs';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { lireHeureServeur } from './lib/heure.mjs';

const a = lireArguments(process.argv.slice(2));
const plan = JSON.parse(readFileSync(a.plan || join(DOSSIER_TEST, 'calendrier.json'), 'utf8'));
const fichierBuffer = a.buffer || join(DOSSIER_TEST, 'file-attente-buffer.txt');
if (!existsSync(fichierBuffer)) {
  console.error(`File Buffer introuvable : ${fichierBuffer}. La relever d'abord (references/releve-buffer.md) : sans elle, aucun créneau n'est contrôlé.`);
  process.exit(2);
}
let maintenant;
try {
  maintenant = a.maintenant ? new Date(a.maintenant) : await lireHeureServeur();
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const buffer = lireFileBuffer(readFileSync(fichierBuffer, 'utf8'));
const ecart = Number(a.ecart || 3);
const resultats = verifierCreneaux(plan.creneaux, { maintenant, ecartMinHeures: ecart, buffer });

console.log(`Heure serveur Buffer : ${maintenant.toISOString()} ; entrées de la file Buffer : ${buffer.length} (${fichierBuffer})`);
let ko = 0;
for (const r of resultats) {
  const c = plan.creneaux.find((x) => x.id === r.id);
  if (!r.ok) ko++;
  console.log(`${r.ok ? 'OK ' : 'KO '} ${r.id.padEnd(14)} ${c.date} ${c.jour} ${c.heureParis} Paris = ${c.utc}${r.ok ? '' : ' :: ' + r.problemes.join(' | ')}`);
}
console.log(`\n${resultats.length - ko}/${resultats.length} créneaux libres et sans conflit (écart minimum ${ecart} h entre deux posts d'un même compte).`);
process.exit(ko ? 1 : 0);
