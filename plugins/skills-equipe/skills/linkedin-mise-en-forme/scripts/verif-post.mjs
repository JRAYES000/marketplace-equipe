// Controle de forme d'un post LinkedIn de Julien, deux comptes confondus.
// Reecrit le 2026-09-18 : la version precedente a quitte ~/.claude/skills/ en cours de
// session, et il n'en subsistait qu'une copie dans un dossier de transit que le prochain
// nettoyage effacera (AppData/Local/Temp/skill-stage/). Relue depuis, elle portait deux
// criteres devenus faux — une fourchette de 900-1300 caracteres abandonnee le 09/09 au
// profit de 1300-1900, et un refus du lien dans le corps que la consigne de Julien du
// 03/09 impose au contraire. Les deux sont corriges ici.
//
// Recoupe le 2026-09-22 contre les 3 posts de veille deja publies : la mesure du gras
// deja converti manquait une des deux polices "gras" Unicode reellement en usage dans le
// depot, et trois criteres mecanisables manquaient (police de gras, formulations
// interdites, accroche degeneree) -- voir lib.mjs pour le detail et les mesures. Le
// coeur de la logique vit desormais dans lib.mjs (fonctions pures, testees par
// test/verif-post.test.mjs) ; ce fichier reste le seul point d'entree CLI, chemins et
// usage inchanges.
//
//   node verif-post.mjs gras "Trois mois pour rien"     -> le segment en gras Unicode
//   node verif-post.mjs verif "C:/chemin/brouillon.txt" -> les douze criteres, code 1 si un echoue
//
// Le brouillon se donne en markdown (**ainsi**) ou deja converti en gras Unicode : les
// deux formes comptent. Chemins en C:/... — node ne resout pas la forme /c/Users/...
import { readFileSync } from "node:fs";
import { enGras, ACCENTUE, verifierTexte } from "./lib.mjs";

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

const { resultats, passes, total } = verifierTexte(corps);
for (const r of resultats) console.log(`${r.bon ? "OK   " : "ECHEC"} ${r.nom.padEnd(38)} ${r.detail}`);
console.log(`\n${passes}/${total} criteres passes`);
process.exit(passes === total ? 0 : 1);
