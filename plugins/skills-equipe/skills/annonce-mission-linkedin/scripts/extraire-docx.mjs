#!/usr/bin/env node
// Usage : node scripts/extraire-docx.mjs <document.docx> [sortie.txt]
// Ecrit le texte du .docx, un paragraphe par ligne (stdout sans sortie).
import { writeFileSync } from "node:fs";
import { texteDocx } from "./docx.mjs";

const [docx, sortie] = process.argv.slice(2);
if (!docx) { console.error("Usage : node scripts/extraire-docx.mjs <document.docx> [sortie.txt]"); process.exit(2); }
const texte = texteDocx(docx) + "\n";
if (sortie) { writeFileSync(sortie, texte); console.log(`Ecrit : ${sortie}`); } else process.stdout.write(texte);
