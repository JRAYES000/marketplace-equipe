#!/usr/bin/env node
// Usage : node scripts/controler-faits.mjs <document.docx> <NN.final.txt> [NN.commentaire.txt] [--fait "texte"]...
// Controle par script que les FAITS d'une annonce sont recopies mot pour mot du .docx :
// - chaque --fait (TJM, duree, lieu, rythme, demarrage, environnement) est dans le .docx ET dans l'annonce ;
// - chaque URL et chaque montant en euros de l'annonce (et du commentaire) existe dans le .docx.
// Sortie 0 si aucun ecart, 1 sinon (un ecart par ligne).
import { readFileSync } from "node:fs";
import { texteDocx, normaliser } from "./docx.mjs";

const URL = /https?:\/\/[^\s)>\]]+/g;
const MONTANT = /\d[\d  .]*\s?€/g;
const sansPonctFinale = (u) => u.replace(/[.,;:!?]+$/, "");
const compact = (s) => s.replace(/\s/g, "");

export function ecarts(docx, annonce, faits = []) {
  const d = normaliser(docx), a = normaliser(annonce), dc = compact(d);
  const out = [];
  for (const f of faits.map(normaliser)) {
    if (!d.includes(f)) out.push(`fait absent du .docx : "${f}"`);
    if (!a.includes(f)) out.push(`fait absent de l'annonce : "${f}"`);
  }
  for (const u of new Set((a.match(URL) || []).map(sansPonctFinale))) if (!d.includes(u)) out.push(`URL absente du .docx : ${u}`);
  for (const m of new Set((a.match(MONTANT) || []).map((x) => compact(x)))) if (!dc.includes(m)) out.push(`montant absent du .docx : ${m}`);
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/").replace(/^\//, "")}`) {
  const args = process.argv.slice(2), faits = [], fichiers = [];
  for (let i = 0; i < args.length; i++) args[i] === "--fait" ? faits.push(args[++i]) : fichiers.push(args[i]);
  const [docx, ...annonces] = fichiers;
  if (!docx || !annonces.length) { console.error("Usage : node scripts/controler-faits.mjs <document.docx> <NN.final.txt> [NN.commentaire.txt] [--fait \"texte\"]..."); process.exit(2); }
  const liste = ecarts(texteDocx(docx), annonces.map((f) => readFileSync(f, "utf8")).join("\n"), faits);
  for (const e of liste) console.log(`ECART ${e}`);
  console.log(liste.length ? `${liste.length} ecart(s).` : "0 ecart.");
  process.exit(liste.length ? 1 : 0);
}
