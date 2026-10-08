#!/usr/bin/env node
// Vérifie chaque créneau du calendrier contre la file Buffer, seule référence des posts programmés.
//   node verifier-creneaux.mjs [--plan calendrier.json] [--buffer file-attente-buffer.txt] [--ecart 3] [--maintenant ISO]
// La file se relève dans Buffer (Publish > Queue, references/releve-buffer.md), une ligne par post
// « AAAA-MM-JJ HH:MM compte » en heure de Paris ; l'UTC est calculé ici.
// Lecture seule. Code de sortie 1 s'il reste un conflit.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { apparierDeplacements, lireFileBuffer, utcVersParis, verifierCreneaux } from './lib/calendrier.mjs';
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
const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
const jourAutorises = (plan.meta.jours || ['mar', 'mer', 'jeu', 'ven']).map((j) => JOURS.indexOf(j));
const { creneaux: resultats, horsPlan } = verifierCreneaux(plan.creneaux, { maintenant, ecartMinHeures: ecart, buffer, jourAutorises });

console.log(`Heure serveur Buffer : ${maintenant.toISOString()} ; entrées de la file Buffer : ${buffer.length} (${fichierBuffer})`);
let ko = 0;
let passes = 0;
const manquants = [];
for (const r of resultats) {
  const c = plan.creneaux.find((x) => x.id === r.id);
  if (r.passe) { passes++; if (r.ok) continue; }
  if (!r.ok) ko++;
  if (r.problemes.some((p) => p.startsWith('absent de la file'))) manquants.push(r.id);
  console.log(`${r.ok ? 'OK ' : 'KO '} ${r.id.padEnd(22)} ${c.date} ${c.jour} ${c.heureParis} Paris ${c.compte}${r.ok ? ' (programmé)' : ' :: ' + r.problemes.join(' | ')}`);
}
const aVenir = resultats.length - passes;
const paris = (iso) => { const p = utcVersParis(new Date(iso)); return `${p.jour} ${p.date} ${p.heure} Paris`; };
const bilan = apparierDeplacements(manquants.map((id) => plan.creneaux.find((c) => c.id === id)), horsPlan);
console.log(`
Créneaux : ${resultats.length} au calendrier, ${passes} passé(s) non contrôlé(s), ${aVenir} à venir.`);
for (const d of bilan.deplaces) {
  console.log(`ALERTE déplacé : ${d.ancien.compte} « ${d.ancien.debut} » : ancien créneau ${d.ancien.jour} ${d.ancien.date} ${d.ancien.heureParis} Paris → nouveau créneau ${paris(d.nouveau.instant)}`);
}
for (const c of bilan.manquants) console.log(`ALERTE manquant : ${c.compte} ${c.jour} ${c.date} ${c.heureParis} Paris « ${c.debut || 'texte inconnu'} » : absent de la file`);
for (const b of bilan.horsPlan) console.log(`ALERTE hors plan : ${b.compte} ${paris(b.instant)} « ${b.note || 'texte inconnu'} » : absent du calendrier`);
console.log(`Créneaux manquants (à venir, absents de la file) : ${manquants.length}, dont ${bilan.deplaces.length} déplacé(s)`);
console.log(`Posts hors plan (dans la file, absents du calendrier) : ${horsPlan.length}, dont ${bilan.deplaces.length} déplacé(s)`);
console.log(`${resultats.filter((r) => !r.passe && r.ok).length}/${aVenir} créneaux à venir programmés et sans conflit (écart minimum ${ecart} h entre deux posts d'un même compte).`);
process.exit(ko || horsPlan.length ? 1 : 0);
