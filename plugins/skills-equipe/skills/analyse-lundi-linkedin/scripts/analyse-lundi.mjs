#!/usr/bin/env node
// L'analyse du lundi, en une seule commande :
//   node analyse-lundi.mjs
// Source unique : les relevés Buffer Insights (releve-buffer-*.csv du dossier du test, references/releve-buffer.md).
// Options : --plan calendrier.json  --buffer releve.csv (un seul relevé au lieu de tous)  --sortie dossier
//           --date AAAA-MM-JJ (analyse du lundi donné, 08:00 Paris ; jamais au-delà de l'heure réelle)
//           --maintenant ISO (heure de référence imposée, si le serveur Buffer ne répond pas)
//           --a-blanc (affiche les posts trouvés et les chiffres lus, n'écrit rien)
// Lecture seule : rien n'est écrit dans Buffer ni ailleurs que dans le dossier de sortie.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parisVersUtc, utcVersParis } from './lib/calendrier.mjs';
import { analyserTout, fusionnerReleves, lireCsvBuffer } from './lib/lundi.mjs';
import { rendreRapport } from './lib/rapport.mjs';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { lireHeureServeur } from './lib/heure.mjs';

const a = lireArguments(process.argv.slice(2));
const fichierPlan = a.plan || join(DOSSIER_TEST, 'calendrier.json');
if (!existsSync(fichierPlan)) {
  console.error(`Plan introuvable : ${fichierPlan}\nGénérer d'abord : node generer-calendrier.mjs`);
  process.exit(2);
}
const plan = JSON.parse(readFileSync(fichierPlan, 'utf8'));

let releves = a.buffer ? [a.buffer] : [];
if (!releves.length && existsSync(DOSSIER_TEST)) {
  releves = readdirSync(DOSSIER_TEST).filter((f) => /^releve-buffer-.*\.csv$/.test(f)).sort().map((f) => join(DOSSIER_TEST, f));
}
if (!releves.length) {
  console.error(`Aucun relevé Buffer (releve-buffer-*.csv) dans ${DOSSIER_TEST}. Le faire d'abord : references/releve-buffer.md.`);
  process.exit(2);
}
const posts = fusionnerReleves(releves.map((f) => lireCsvBuffer(readFileSync(f, 'utf8'), f)));

let serveur;
try {
  serveur = a.maintenant ? new Date(a.maintenant) : await lireHeureServeur();
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
const demande = a.date ? parisVersUtc(a.date, '08:00') : serveur;
const maintenant = demande < serveur ? demande : serveur; // un lundi à venir se lit avec les chiffres d'aujourd'hui

const resultat = analyserTout({ plan, posts, maintenant, jour: a.date || null, releves });

if (a['a-blanc']) {
  const pct = (x) => (x === null || x === undefined ? '–' : `${(x * 100).toFixed(2)} %`);
  console.log(`À BLANC (aucun fichier écrit). Heure de référence ${maintenant.toISOString()} = ${utcVersParis(maintenant).jour} ${utcVersParis(maintenant).date} ${utcVersParis(maintenant).heure} Paris.`);
  console.log(`Relevés lus : ${releves.join(', ')} ; ${posts.length} post(s) après fusion.`);
  console.log(`Semaine du ${resultat.semaine.du} au ${resultat.semaine.au} :`);
  for (const c of resultat.semaine.comptes) {
    console.log(`\n${c.compte} : ${c.n} post(s), dont ${c.recents} de moins de 48 h`);
    for (const p of c.posts) console.log(`  ${p.jour} ${p.date} ${p.heure} Paris | ${p.format.padEnd(9)} | impressions ${p.impressions ?? '–'} | réactions ${p.reactions ?? '–'} | commentaires ${p.commentaires ?? '–'} | engagement ${pct(p.tauxEngagement)} | ${p.mur ? 'mûr' : 'non mûr'} | ${p.url || '–'}`);
    for (const f of c.formats) console.log(`  → ${f.format} : ${f.n} post(s), impressions médianes ${f.impressions.mediane ?? '–'}, réactions méd. ${f.reactions ?? '–'}, commentaires méd. ${f.commentaires ?? '–'}, engagement méd. ${pct(f.tauxEngagement)}`);
  }
  console.log(`\nTest des formats : ${resultat.echus} créneau(x) échu(s) sur ${resultat.total}, ${resultat.apparies} rapproché(s), ${resultat.manquants.length} manquant(s), ${resultat.horsPlan.length} post(s) hors plan en semaine, ${resultat.weekend.posts.length} post(s) de week-end relevés.`);
  for (const c of resultat.comptes) console.log(`  ${c.compte} : verdict ${c.decision.verdict} — ${c.decision.raisons.join(' ; ')}`);
  process.exit(0);
}

const rapport = rendreRapport(resultat);
const dossier = a.sortie || join(DOSSIER_TEST, 'analyses');
mkdirSync(dossier, { recursive: true });
const base = join(dossier, `${resultat.dateAnalyse}-analyse`);
writeFileSync(`${base}.md`, rapport);
writeFileSync(`${base}.json`, JSON.stringify(resultat, null, 2));
console.log(rapport);
console.log(`\nÉcrit : ${base}.md et ${base}.json`);
