// Controle de forme d'un post LinkedIn de Julien, deux comptes confondus.
// Reecrit le 2026-09-18 : la version precedente vivait dans ~/.claude/skills/ et a
// disparu du disque en cours de session. Elle portait deux criteres devenus faux —
// une fourchette de 900-1300 caracteres abandonnee le 09/09 au profit de 1300-1900,
// et un refus du lien dans le corps que la consigne de Julien du 03/09 impose au
// contraire. Les deux sont corriges ici.
//
//   node verif-post.mjs gras "Trois mois pour rien"     -> le segment en gras Unicode
//   node verif-post.mjs verif "C:/chemin/brouillon.txt" -> les huit criteres, code 1 si un echoue
//
// Le brouillon se donne en markdown : le gras s'y ecrit **comme ceci** et c'est l'envoi
// qui le convertit. Ce script mesure le markdown, il ne le convertit pas.
import { readFileSync } from "node:fs";

// Mathematical Sans-Serif Bold. Aucune lettre accentuee n'existe dans ce bloc : c'est
// toute la contrainte de la regle 2.
const BASES = [
  [0x41, 0x5a, 0x1d5d4], // A-Z
  [0x61, 0x7a, 0x1d5ee], // a-z
  [0x30, 0x39, 0x1d7ec], // 0-9
];
const enGras = (s) => [...s].map((c) => {
  const p = c.codePointAt(0);
  const b = BASES.find(([d, f]) => p >= d && p <= f);
  return b ? String.fromCodePoint(b[2] + (p - b[0])) : c;
}).join("");

// Ce que le gras ne sait pas rendre : tout ce qui n'est ni ASCII, ni ponctuation
// courante, ni espace. Les accents en font partie, et c'est le seul cas qui arrive.
const ACCENTUE = /[^\x00-\x7F«»…’—\s]/u;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF\uFE0F]/u;
const EMOJI_G = new RegExp(EMOJI.source, "gu");

const [, , action, arg] = process.argv;

if (action === "gras") {
  if (!arg) { console.error("usage : verif-post.mjs gras \"segment sans accent\""); process.exit(1); }
  const faute = [...arg].find((c) => ACCENTUE.test(c));
  if (faute) {
    console.error(`REFUSE : « ${faute} » est accentue, le gras Unicode n'a pas cette lettre.`);
    console.error("Reformuler le segment jusqu'a en trouver un sans accent.");
    process.exit(1);
  }
  console.log(enGras(arg));
  process.exit(0);
}

if (action !== "verif" || !arg) {
  console.error("usage : verif-post.mjs gras \"segment\" | verif \"chemin/brouillon.txt\"");
  process.exit(1);
}

const texte = readFileSync(arg, "utf8").replace(/\r\n/g, "\n").trim();
// Un brouillon de sortants/ porte un frontmatter : il ne part pas chez le lecteur.
const corps = texte.startsWith("---") ? texte.slice(texte.indexOf("\n---", 3) + 4).trim() : texte;
const lignes = corps.split("\n");

const resultats = [];
const dire = (bon, nom, detail) => resultats.push({ bon, nom, detail });

const accroche = lignes[0];
dire(accroche.length <= 140, "accroche <= 140 caracteres", `${accroche.length} caracteres`);
dire(/\?\s*(\*\*)?\s*$/.test(accroche), "accroche formulee en question", accroche.trim().replace(/\*\*/g, "").slice(-1) === "?" ? "finit par ?" : "pas de point d'interrogation");

const nu = [...corps.replace(/\*\*/g, "")].length;
dire(nu >= 1300 && nu <= 1900, "longueur 1300-1900", `${nu} caracteres`);

const gras = [...corps.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1]);
dire(gras.length >= 8, "au moins 8 passages en gras", `${gras.length} trouve(s)`);
const fautifs = gras.filter((g) => ACCENTUE.test(g.replace(EMOJI_G, "")));
dire(fautifs.length === 0, "aucun gras accentue", fautifs.length ? fautifs.join(" | ") : "tous sans accent");

const titres = lignes.filter((l) => new RegExp(`^${EMOJI.source}\\s+\\*\\*[^*]+\\*\\*\\s*$`, "u").test(l));
dire(titres.length === 3, "trois titres de section en gras", titres.length ? titres.join(" / ") : "aucun");

const emojis = corps.match(EMOJI_G) || [];
dire(emojis.length >= 3 && emojis.length <= 6, "3 a 6 emojis", `${emojis.length} trouve(s)`);
const horsTete = lignes.filter((l) => EMOJI.test(l) && !new RegExp(`^${EMOJI.source}`, "u").test(l));
dire(horsTete.length === 0, "emojis en tete de ligne", horsTete.length ? horsTete[0].slice(0, 50) : "toutes en tete");

const phrases = corps.replace(/\*\*/g, "").replace(/https?:\/\/\S+/g, "lien").split(/(?<=[.!?])\s+/);
const longues = phrases.filter((p) => p.trim().split(/\s+/).length > 20);
dire(longues.length === 0, "aucune phrase > 20 mots", longues.length ? `${longues.length} : ${longues[0].slice(0, 60)}...` : "ok");

for (const r of resultats) console.log(`${r.bon ? "OK   " : "ECHEC"} ${r.nom.padEnd(32)} ${r.detail}`);
const passes = resultats.filter((r) => r.bon).length;
console.log(`\n${passes}/${resultats.length} criteres passes`);
process.exit(passes === resultats.length ? 0 : 1);
