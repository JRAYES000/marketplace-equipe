#!/usr/bin/env node
// L'analyse du lundi, en une seule commande :
//   node analyse-lundi.mjs
// Options : --plan calendrier.json  --buffer releve-buffer.csv  --sortie dossier  --date AAAA-MM-JJ
//           --hors-ligne analytics.json (rejoue une analyse sans réseau)
// Sans --buffer, le relevé le plus récent du dossier du test (releve-buffer-*.csv) est utilisé s'il existe.
// Lecture seule : rien n'est écrit dans Zernio ni ailleurs que dans le dossier de sortie.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ajouterJours, parisVersUtc, utcVersParis } from './lib/calendrier.mjs';
import { analyserTout, lireCsvBuffer } from './lib/lundi.mjs';
import { rendreRapport } from './lib/rapport.mjs';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { chargerCle, lireAnalytics, lireHeureServeur } from './lib/zernio.mjs';

const a = lireArguments(process.argv.slice(2));
const fichierPlan = a.plan || join(DOSSIER_TEST, 'calendrier.json');
if (!existsSync(fichierPlan)) {
  console.error(`Plan introuvable : ${fichierPlan}\nGénérer d'abord : node generer-calendrier.mjs`);
  process.exit(2);
}
const plan = JSON.parse(readFileSync(fichierPlan, 'utf8'));

let analytics;
let apercu = null;
let maintenant;
if (a['hors-ligne']) {
  const j = JSON.parse(readFileSync(a['hors-ligne'], 'utf8'));
  analytics = j.posts;
  apercu = j.overview || null;
  maintenant = a.date ? parisVersUtc(a.date, '08:00') : new Date(j.maintenant);
} else {
  const origine = chargerCle();
  if (!origine) {
    console.error('ZERNIO_API_KEY introuvable (environnement, .env de la skill ou de linkedin-carrousel).');
    process.exit(2);
  }
  const serveur = await lireHeureServeur();
  maintenant = a.date ? parisVersUtc(a.date, '08:00') : serveur;
  const aujourdhui = utcVersParis(serveur).date;
  const depuis = [plan.meta.debut, ajouterJours(aujourdhui, -35)].sort()[0];
  const jusqua = [plan.meta.fin, aujourdhui].sort().reverse()[0];
  const lu = await lireAnalytics({ depuis, jusqua });
  analytics = lu.posts;
  apercu = lu.apercu;
}

let fichierBuffer = a.buffer || null;
if (!fichierBuffer && existsSync(DOSSIER_TEST)) {
  const releves = readdirSync(DOSSIER_TEST).filter((f) => /^releve-buffer-.*\.csv$/.test(f)).sort();
  if (releves.length) fichierBuffer = join(DOSSIER_TEST, releves[releves.length - 1]);
}
const bufferLignes = fichierBuffer ? lireCsvBuffer(readFileSync(fichierBuffer, 'utf8')) : null;
const resultat = analyserTout({ plan, analytics, apercu, maintenant, bufferLignes, bufferFichier: fichierBuffer });
const rapport = rendreRapport(resultat);

const dossier = a.sortie || join(DOSSIER_TEST, 'analyses');
mkdirSync(dossier, { recursive: true });
const base = join(dossier, `${resultat.dateAnalyse}-analyse`);
writeFileSync(`${base}.md`, rapport);
writeFileSync(`${base}.json`, JSON.stringify(resultat, null, 2));
console.log(rapport);
console.log(`\nÉcrit : ${base}.md et ${base}.json`);
