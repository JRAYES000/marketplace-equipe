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
//   node verif-post.mjs verif "C:/chemin/a6.final.txt" [options]
//       -> les criteres, code 1 si un echoue. Le post precedent du MEME compte est trouve
//          tout seul (voir precedent.mjs : .final.txt le plus recent du compte dans
//          livrables-Claude-Agency/linkedin/, sinon dernier post publie via Zernio). Sans
//          post precedent : un AVERTISSEMENT, jamais un echec (regle du 30/09/2026).
//   options : --precedent <fichier>  post precedent donne a la main (prioritaire)
//             --compte <julien-agency|julien-partners>  sinon deduit du nom a<N>/p<N>.final.txt
//             --dossier <dossier>    dossier des livrables (sinon LIVRABLES_LINKEDIN_DIR, sinon
//                                    ~/OneDrive/Documents/GitHub/livrables-Claude-Agency/linkedin)
//             --sans-precedent       ne mesure pas la regle de variete
//   (un second chemin positionnel reste accepte comme --precedent, comme avant le 30/09)
//
// Le brouillon se donne en markdown (**ainsi**) ou deja converti en gras Unicode : les
// deux formes comptent. Chemins en C:/... — node ne resout pas la forme /c/Users/...
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { enGras, ACCENTUE, verifierTexte } from "./lib.mjs";
import { lireCorpsFichier, resoudrePrecedent } from "./precedent.mjs";

const OPTIONS_AVEC_VALEUR = ["--precedent", "--compte", "--dossier"];
const brut = process.argv.slice(2);
const options = {};
const positionnels = [];
for (let i = 0; i < brut.length; i++) {
  if (OPTIONS_AVEC_VALEUR.includes(brut[i])) options[brut[i].slice(2)] = brut[++i];
  else if (brut[i] === "--sans-precedent") options.sansPrecedent = true;
  else positionnels.push(brut[i]);
}
const [action, arg, precedentPositionnel] = positionnels;

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
  console.error("usage : verif-post.mjs gras \"segment\" | verif \"chemin/brouillon.txt\" [--precedent f] [--compte c] [--dossier d] [--sans-precedent]");
  process.exit(1);
}

// Cle Zernio : environnement d'abord, sinon le .env de linkedin-carrousel (meme mecanisme que
// publier-zernio.js). Lue seulement si le dossier local n'a rien donne ; jamais affichee.
function cleZernio() {
  if (process.env.ZERNIO_API_KEY) return process.env.ZERNIO_API_KEY;
  const env = new URL("../../linkedin-carrousel/.env", import.meta.url);
  if (!existsSync(env)) return undefined;
  for (const ligne of readFileSync(env, "utf8").split(/\r?\n/)) {
    const m = ligne.match(/^ZERNIO_API_KEY=(.*)$/);
    if (m && m[1].trim()) return m[1].trim();
  }
  return undefined;
}

const corps = lireCorpsFichier(arg);

let precedent;
let precedents;
const aLaMain = options.precedent || precedentPositionnel;
if (aLaMain) {
  precedent = lireCorpsFichier(aLaMain);
  console.log(`Post precedent (donne a la main) : ${aLaMain}`);
} else if (!options.sansPrecedent) {
  const r = await resoudrePrecedent({
    brouillon: arg, compte: options.compte, dossier: options.dossier,
    apiKey: cleZernio, // lue seulement si le dossier local n'a rien donne
  });
  if (r.texte !== undefined) {
    precedent = r.texte;
    precedents = r.textes;
    console.log(`Post precedent : ${r.source}`);
    if (r.textes.length > 1) console.log(`Posts compares (${r.textes.length}) : ${r.sources.map((x) => basename(x)).join(", ")}`);
  }
  else console.log(`AVERTISSEMENT : ${r.avertissement}`);
}

const { resultats, passes, total } = verifierTexte(corps, precedent !== undefined ? { precedent, precedents } : {});
for (const r of resultats) console.log(`${r.bon ? "OK   " : "ECHEC"} ${r.nom.padEnd(38)} ${r.detail}`);
console.log(`\n${passes}/${total} criteres passes`);
process.exit(passes === total ? 0 : 1);
