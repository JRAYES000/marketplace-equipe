// Lecture d'un .docx sans dependance : un .docx est un zip, le texte est dans word/document.xml.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

function lireEntreeZip(buf, nom) {
  // Fin du repertoire central : signature 0x06054b50, cherchee depuis la fin.
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("Fichier non zip : ce n'est pas un .docx.");
  const nb = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  for (let k = 0; k < nb; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("Repertoire central illisible.");
    const methode = buf.readUInt16LE(p + 10);
    const tailleC = buf.readUInt32LE(p + 20);
    const lNom = buf.readUInt16LE(p + 28), lExtra = buf.readUInt16LE(p + 30), lCom = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nomEntree = buf.toString("utf8", p + 46, p + 46 + lNom);
    if (nomEntree === nom) {
      const debut = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const data = buf.subarray(debut, debut + tailleC);
      if (methode === 0) return data;
      if (methode === 8) return inflateRawSync(data);
      throw new Error(`Compression zip non geree : ${methode}.`);
    }
    p += 46 + lNom + lExtra + lCom;
  }
  throw new Error(`${nom} absent : ce n'est pas un .docx.`);
}

const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decoder = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENTITES[e] ?? m));

/** Paragraphes du document, dans l'ordre, un par ligne (vides gardes pour separer les posts). */
export function paragraphesDocx(cheminOuBuffer) {
  const buf = Buffer.isBuffer(cheminOuBuffer) ? cheminOuBuffer : readFileSync(cheminOuBuffer);
  const xml = lireEntreeZip(buf, "word/document.xml").toString("utf8");
  return (xml.match(/<w:p[\s>][\s\S]*?<\/w:p>|<w:p\/>/g) || []).map((p) =>
    decoder(p.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
      .replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, "\u0000$1\u0001")
      .replace(/[^\u0000\u0001]*?\u0000([\s\S]*?)\u0001/g, "$1")
      .replace(/<[^>]*>/g, "")).trim());
}

export const texteDocx = (c) => paragraphesDocx(c).join("\n");

/** Gras Unicode et espaces insecables ramenes au texte simple, pour comparer. */
export const normaliser = (s) => s.normalize("NFKC").replace(/[  ]/g, " ").replace(/[’]/g, "'").replace(/[ \t]+/g, " ");
