import { test } from "node:test";
import assert from "node:assert/strict";
import { crc32, deflateRawSync } from "node:zlib";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { paragraphesDocx } from "../scripts/docx.mjs";
import { comparer } from "../scripts/comparer-docx.mjs";
import { ecarts } from "../scripts/controler-faits.mjs";

const scripts = fileURLToPath(new URL("../scripts/", import.meta.url));

// Zip minimal (une entree compressee) : suffit pour un .docx de test.
function docx(paragraphes) {
  const xml = `<?xml version="1.0"?><w:document xmlns:w="x"><w:body>${paragraphes
    .map((p) => `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${p.slice(0, 3)}</w:t></w:r><w:r><w:t>${p.slice(3)}</w:t></w:r></w:p>`)
    .join("")}</w:body></w:document>`;
  const nom = Buffer.from("word/document.xml"), brut = Buffer.from(xml), data = deflateRawSync(brut), c = crc32(brut);
  const loc = Buffer.alloc(30); loc.writeUInt32LE(0x04034b50, 0); loc.writeUInt16LE(20, 4); loc.writeUInt16LE(8, 8);
  loc.writeUInt32LE(c, 14); loc.writeUInt32LE(data.length, 18); loc.writeUInt32LE(brut.length, 22); loc.writeUInt16LE(nom.length, 26);
  const cen = Buffer.alloc(46); cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(8, 10);
  cen.writeUInt32LE(c, 16); cen.writeUInt32LE(data.length, 20); cen.writeUInt32LE(brut.length, 24); cen.writeUInt16LE(nom.length, 28);
  const tailleLocal = 30 + nom.length + data.length;
  const fin = Buffer.alloc(22); fin.writeUInt32LE(0x06054b50, 0); fin.writeUInt16LE(1, 8); fin.writeUInt16LE(1, 10);
  fin.writeUInt32LE(46 + nom.length, 12); fin.writeUInt32LE(tailleLocal, 16);
  return Buffer.concat([loc, nom, data, cen, nom, fin]);
}

const DOC = ["Mission : formateur IA &amp; LLM", "TJM : 800 € HT/jour", "Durée : 6 mois, Paris", "Lien : https://exemple.test/mission"];

test("extrait les paragraphes du .docx, runs recolles et entites decodees", () => {
  assert.deepEqual(paragraphesDocx(docx(DOC)), ["Mission : formateur IA & LLM", "TJM : 800 € HT/jour", "Durée : 6 mois, Paris", "Lien : https://exemple.test/mission"]);
});

test("refuse un fichier qui n'est pas un .docx", () => {
  assert.throws(() => paragraphesDocx(Buffer.from("pas un zip du tout, assez long pour la recherche")), /non zip/);
});

test("comparer liste les paragraphes retires et ajoutes", () => {
  assert.deepEqual(comparer(["a", "b", ""], ["b", "c"]), { retires: ["a"], ajoutes: ["c"] });
});

test("0 ecart quand les faits sont recopies, gras Unicode compris", () => {
  const annonce = "💼 Mission freelance IA : formateur, 6 mois, Paris. 𝟖𝟎𝟎 € 𝐇𝐓/𝐣𝐨𝐮𝐫.\nLe lien est en commentaire.";
  assert.deepEqual(ecarts(paragraphesDocx(docx(DOC)).join("\n"), annonce + "\nhttps://exemple.test/mission", ["6 mois", "800 € HT/jour"]), []);
});

test("signale un TJM, une URL et un fait qui ne viennent pas du .docx", () => {
  const e = ecarts(DOC.join("\n"), "Mission : 850 € HT/jour, 3 mois. https://autre.test/x", ["3 mois"]);
  assert.ok(e.some((x) => x.includes("850€")));
  assert.ok(e.some((x) => x.includes("autre.test")));
  assert.ok(e.some((x) => x.includes('fait absent du .docx : "3 mois"')));
});

test("les deux commandes tournent sur un vrai fichier", () => {
  const dir = mkdtempSync(join(tmpdir(), "docx-")), f = join(dir, "doc.docx"), a = join(dir, "01.final.txt");
  writeFileSync(f, docx(DOC)); writeFileSync(a, "Paris. 800 € HT/jour.");
  assert.match(execFileSync(process.execPath, [join(scripts, "extraire-docx.mjs"), f], { encoding: "utf8" }), /TJM : 800 € HT\/jour/);
  const ok = spawnSync(process.execPath, [join(scripts, "controler-faits.mjs"), f, a, "--fait", "Paris"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  writeFileSync(a, "Lyon. 900 € HT/jour.");
  assert.equal(spawnSync(process.execPath, [join(scripts, "controler-faits.mjs"), f, a, "--fait", "Lyon"]).status, 1);
});
