#!/usr/bin/env node
// Insere une note datee dans la zone « Notes de l'equipe » du CLAUDE.md d'un
// dossier client, juste avant le repere de fin. Garde les fins de ligne du
// fichier (CRLF ou LF) et refuse d'inserer deux fois la meme note.
//
// Usage :
//   node inserer-note-equipe.mjs <dossier-client>/CLAUDE.md <note.md>
//   node inserer-note-equipe.mjs --self-check
//
// Pourquoi un script : le haut du CLAUDE.md est reecrit par le serveur a chaque
// mise a jour de la fiche client ; seule la zone equipe survit, et elle se
// termine par le repere ci-dessous. Une note ecrite ailleurs est perdue.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPERE = "<!-- NOTES-EQUIPE:FIN -->";

export function insererNote(claudeMd, note) {
  const crlf = claudeMd.includes("\r\n");
  const n = claudeMd.split(REPERE).length - 1;
  if (n !== 1) throw new Error(`repère ${REPERE} trouvé ${n} fois, 1 attendu : insertion refusée`);

  const texte = note.replace(/\r\n/g, "\n").trim();
  const titre = /^#{2,4}\s+(.+)$/m.exec(texte);
  if (!titre || texte.indexOf(titre[0]) !== 0) throw new Error("la note doit commencer par un titre « ### … »");
  if (!/\d{2}\/\d{2}\/\d{4}/.test(titre[1])) throw new Error("le titre de la note doit porter sa date (JJ/MM/AAAA) : chaque constat se date");
  if (claudeMd.replace(/\r\n/g, "\n").includes(titre[0])) throw new Error(`note déjà présente : « ${titre[1]} »`);

  let ajout = texte + "\n\n";
  if (crlf) ajout = ajout.replace(/\n/g, "\r\n");
  return { texte: claudeMd.replace(REPERE, ajout + REPERE), crlf };
}

function selfCheck() {
  const base = "## Notes de l’équipe\n\n### Ancienne note — 22/09/2026\n\nTexte.\n\n" + REPERE + "\n";
  const note = "### Nouvelle note — 24/09/2026\n\nConstat.";
  const cas = [];
  const essai = (nom, f) => { try { f(); cas.push([nom, true]); } catch (e) { cas.push([nom, false, e.message]); } };

  essai("insère avant le repère (LF)", () => {
    const r = insererNote(base, note);
    if (!r.texte.includes("Constat.\n\n" + REPERE) || r.crlf) throw new Error("mauvaise position ou mauvaises fins de ligne");
  });
  essai("garde les fins de ligne CRLF", () => {
    const r = insererNote(base.replace(/\n/g, "\r\n"), note);
    if (!r.crlf || /[^\r]\n/.test(r.texte)) throw new Error("un saut de ligne LF s'est glissé dans un fichier CRLF");
  });
  essai("refuse une note déjà présente", () => {
    const une = insererNote(base, note).texte;
    let refuse = false;
    try { insererNote(une, note); } catch { refuse = true; }
    if (!refuse) throw new Error("doublon accepté");
  });
  essai("refuse un fichier sans repère", () => {
    let refuse = false;
    try { insererNote("## Notes\n", note); } catch { refuse = true; }
    if (!refuse) throw new Error("insertion sans repère acceptée");
  });
  essai("refuse une note sans date", () => {
    let refuse = false;
    try { insererNote(base, "### Note sans date\n\nx"); } catch { refuse = true; }
    if (!refuse) throw new Error("note non datée acceptée");
  });

  let echecs = 0;
  for (const [nom, ok, err] of cas) { if (!ok) echecs++; console.log(`${ok ? "OK  " : "KO  "}${nom}${ok ? "" : " → " + err}`); }
  console.log(echecs ? `self-check : ${echecs} échec(s)` : "self-check OK");
  return echecs ? 1 : 0;
}

function main(argv) {
  if (argv.includes("--self-check")) return selfCheck();
  const [cible, fichierNote] = argv;
  if (!cible || !fichierNote) {
    console.error("usage : node inserer-note-equipe.mjs <dossier-client>/CLAUDE.md <note.md> | --self-check");
    return 2;
  }
  try {
    const r = insererNote(readFileSync(cible, "utf-8"), readFileSync(fichierNote, "utf-8"));
    writeFileSync(cible, r.texte, "utf-8");
    console.log(`note insérée avant ${REPERE} dans ${cible} (fins de ligne ${r.crlf ? "CRLF" : "LF"} conservées)`);
    return 0;
  } catch (e) {
    console.error(`REFUS : ${e.message}`);
    return 1;
  }
}

// Lance main() seulement quand le fichier est execute, pas quand un test l'importe.
const lance = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (lance) process.exitCode = main(process.argv.slice(2));
