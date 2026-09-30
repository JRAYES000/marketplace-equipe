#!/usr/bin/env node
// Vérifie chaque créneau du calendrier contre Zernio (tous les posts, tous statuts) et la file Buffer.
//   node verifier-creneaux.mjs [--plan calendrier.json] [--buffer file-attente-buffer.txt] [--ecart 3]
// La file Buffer n'est pas visible depuis Zernio : elle se relève à la main (references/releve-buffer.md),
// une ligne par post « AAAA-MM-JJ HH:MM compte », l'UTC est calculé ici.
// Lecture seule. Code de sortie 1 s'il reste un conflit.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { lireFileBuffer, verifierCreneaux } from './lib/calendrier.mjs';
import { DOSSIER_TEST, lireArguments } from './lib/chemins.mjs';
import { aplatirPosts, chargerCle, lireHeureServeur, lireTousLesPosts } from './lib/zernio.mjs';

const a = lireArguments(process.argv.slice(2));
const plan = JSON.parse(readFileSync(a.plan || join(DOSSIER_TEST, 'calendrier.json'), 'utf8'));
if (!chargerCle()) { console.error('ZERNIO_API_KEY introuvable.'); process.exit(2); }
const maintenant = await lireHeureServeur();
const posts = aplatirPosts(await lireTousLesPosts());
const fichierBuffer = a.buffer || join(DOSSIER_TEST, 'file-attente-buffer.txt');
if (!existsSync(fichierBuffer)) {
  console.error(`File Buffer introuvable : ${fichierBuffer}. La relever d'abord (references/releve-buffer.md) : sans elle, les offres de mission de Julien ne sont pas contrôlées.`);
  process.exit(2);
}
const buffer = lireFileBuffer(readFileSync(fichierBuffer, 'utf8'));
const resultats = verifierCreneaux(plan.creneaux, posts, { maintenant, ecartMinHeures: Number(a.ecart || 3), buffer });

console.log(`Heure serveur Zernio : ${maintenant.toISOString()} ; posts Zernio lus : ${posts.length} ; entrées file Buffer : ${buffer.length} (${fichierBuffer})`);
const fenetre = posts.filter((p) => p.instant >= plan.meta.debut);
console.log(`Posts Zernio à partir du ${plan.meta.debut} : ${fenetre.length}${fenetre.length ? ' → ' + fenetre.map((p) => `${p.id} ${p.instant} ${p.statut}`).join(' ; ') : ''}`);
let ko = 0;
for (const r of resultats) {
  const c = plan.creneaux.find((x) => x.id === r.id);
  if (!r.ok) ko++;
  console.log(`${r.ok ? 'OK ' : 'KO '} ${r.id.padEnd(14)} ${c.date} ${c.jour} ${c.heureParis} Paris = ${c.utc}${r.ok ? '' : ' :: ' + r.problemes.join(' | ')}`);
}
console.log(`\n${resultats.length - ko}/${resultats.length} créneaux libres et sans conflit (écart minimum ${Number(a.ecart || 3)} h entre deux posts d'un même compte).`);
process.exit(ko ? 1 : 0);
