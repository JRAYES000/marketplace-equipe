#!/usr/bin/env node
// Point d'objectif de Julien (mail du 14/10/2026) : « dans deux semaines (28/10), médiane de Claude Agency
// au-dessus de 500 impressions, avec moins de posts », comparée à 163 (07-12/10).
//   node objectif-julien.mjs
// Options : --compte julien-agency  --du 2026-10-15  --au 2026-10-28  --seuil 500  --reference 163
//           --buffer releve.csv (un seul relevé au lieu de tous)  --maintenant ISO (si le serveur Buffer
//           ne répond pas)  --sortie dossier  --a-blanc (affiche, n'écrit rien)
// Relevé préalable : references/releve-buffer.md (Buffer Insights, toutes les pages, id_buffer par ligne).
// Lecture seule : rien n'est écrit dans Buffer.
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { fusionnerReleves, lireCsvBuffer } from './lib/lundi.mjs';
import { calculerObjectif, rendreObjectif } from './lib/objectif.mjs';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { lireHeureServeur } from './lib/heure.mjs';
import { utcVersParis } from './lib/calendrier.mjs';

const a = lireArguments(process.argv.slice(2));
const compte = a.compte || 'julien-agency';
const du = a.du || '2026-10-15';
const au = a.au || '2026-10-28';
const seuil = Number(a.seuil ?? 500);
const reference = Number(a.reference ?? 163);

let releves = a.buffer ? [a.buffer] : [];
if (!releves.length && existsSync(DOSSIER_TEST)) {
  releves = readdirSync(DOSSIER_TEST).filter((f) => /^releve-buffer-.*\.csv$/.test(f)).sort().map((f) => join(DOSSIER_TEST, f));
}
if (!releves.length) { console.error(`Aucun relevé Buffer dans ${DOSSIER_TEST} (voir references/releve-buffer.md).`); process.exit(2); }
const posts = fusionnerReleves(releves.map((f) => lireCsvBuffer(readFileSync(f, 'utf8'), basename(f))));

let maintenant;
if (a.maintenant) maintenant = new Date(a.maintenant);
else {
  try { maintenant = await lireHeureServeur(); } catch (e) {
    console.error(`Heure du serveur Buffer illisible (${e.message}). Relancer avec --maintenant <UTC lu sur une source fiable>.`);
    process.exit(2);
  }
}

const r = calculerObjectif({ posts, compte, du, au, maintenant, reference, seuil });
const texte = rendreObjectif(r, { releves: releves.map((f) => basename(f)), sourceReference: 'chiffre de Julien, mail du 14/10/2026, période 07-12/10' });
if (a['a-blanc']) { console.log(texte); process.exit(0); }
const sortie = a.sortie || join(DOSSIER_TEST, 'analyses');
mkdirSync(sortie, { recursive: true });
const jour = utcVersParis(maintenant).date;
const fichier = join(sortie, `${jour}-objectif-julien-${compte}.md`);
writeFileSync(fichier, texte);
writeFileSync(fichier.replace(/\.md$/, '.json'), JSON.stringify(r, null, 2));
console.log(texte);
console.log(`Écrit : ${fichier}`);
