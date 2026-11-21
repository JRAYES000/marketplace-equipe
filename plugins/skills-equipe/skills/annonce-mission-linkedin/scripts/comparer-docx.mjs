#!/usr/bin/env node
// Usage : node scripts/comparer-docx.mjs <ancien.docx> <nouveau.docx>
// Liste les paragraphes retires (-) et ajoutes (+) entre deux versions du document de Julien.
import { paragraphesDocx } from "./docx.mjs";

export function comparer(ancien, nouveau) {
  const a = new Set(ancien.filter(Boolean)), n = new Set(nouveau.filter(Boolean));
  return { retires: [...a].filter((p) => !n.has(p)), ajoutes: [...n].filter((p) => !a.has(p)) };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/").replace(/^\//, "")}`) {
  const [x, y] = process.argv.slice(2);
  if (!x || !y) { console.error("Usage : node scripts/comparer-docx.mjs <ancien.docx> <nouveau.docx>"); process.exit(2); }
  const { retires, ajoutes } = comparer(paragraphesDocx(x), paragraphesDocx(y));
  for (const p of retires) console.log(`- ${p}`);
  for (const p of ajoutes) console.log(`+ ${p}`);
  console.log(`${retires.length} retire(s), ${ajoutes.length} ajoute(s).`);
}
