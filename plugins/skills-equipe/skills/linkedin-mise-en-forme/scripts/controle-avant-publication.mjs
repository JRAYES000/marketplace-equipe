// Controle avant publication des regles de Julien du 14/10/2026 (voir regles-julien.mjs) :
// regle 1 (2 posts par jour et par compte au plus), 2 (« invente »), 4 (sujet repete sur 30
// jours ou le meme jour sur les deux comptes), 5 (lien dans le corps, precaution), plus les
// formules du moule de la regle 3. La regle 6 et le reste de la 3 se jugent a l'oeil.
//
//   node controle-avant-publication.mjs [options]
//     --file <fichier>        file Buffer relevee (format de la routine 1 :
//                             « AAAA-MM-JJ HH:MM compte # F debut du texte ») ; defaut :
//                             <livrables>/linkedin/test-formats-2026-10/file-attente-buffer.txt
//     --dossier <dossier>     dossier linkedin/ des livrables (sinon LIVRABLES_LINKEDIN_DIR, sinon
//                             ~/OneDrive/Documents/GitHub/livrables-Claude-Agency/linkedin)
//     --annonces <dossier>    textes des annonces de mission (defaut : ../sortants/annonces-missions/v4)
//     --brouillon <fichier>   post a programmer, controle avec la file (exige --date et --heure ;
//                             compte deduit du nom a<N>/p<N>, sinon --compte)
//     --sujet "<libelle>"     sujet du brouillon (sinon registre sujets.csv, sinon frontmatter `sujet:`)
//     --registre <fichier>    registre des sujets (defaut : <dossier>/sujets.csv, « fichier;sujet »)
//     --maintenant <ISO UTC>  les posts deja partis sont ignores ; defaut : horloge UTC du poste.
//                             Pour une comparaison fiable, passer l'UTC lu sur le serveur Buffer
//                             (en-tete Date de https://publish.buffer.com).
//     --json                  sortie JSON (pour un rapport)
//
// Code de sortie : 0 si aucun constat, 1 sinon, 2 si la file est illisible.
// Le texte complet d'un post de la file est retrouve par son debut dans les .final.txt ; un post
// introuvable (post de Julien) n'est controle que sur son debut.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, resolve, relative, sep } from "node:path";
import { lireCorpsFichier, compteDepuisNom } from "./precedent.mjs";
import { controlerTexte, controlerFile, normaliser, JOURS_SANS_REPETITION } from "./regles-julien.mjs";

const brut = process.argv.slice(2);
const opt = {};
for (let i = 0; i < brut.length; i++) {
  if (brut[i] === "--json") opt.json = true;
  else if (brut[i].startsWith("--")) opt[brut[i].slice(2)] = brut[++i];
}
const dossier = resolve(opt.dossier || process.env.LIVRABLES_LINKEDIN_DIR || join(homedir(), "OneDrive", "Documents", "GitHub", "livrables-Claude-Agency", "linkedin"));
const fichierFile = opt.file || join(dossier, "test-formats-2026-10", "file-attente-buffer.txt");
const dossierAnnonces = opt.annonces || join(dossier, "..", "sortants", "annonces-missions", "v4");
const maintenant = opt.maintenant ? Date.parse(opt.maintenant) : Date.now();

// Heure de Paris -> instant UTC (gere l'heure d'ete sans dependance).
function parisVersUtc(date, heure) {
  const naif = Date.parse(`${date}T${heure}:00Z`);
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const lu = (t) => { const p = Object.fromEntries(f.formatToParts(t).map((x) => [x.type, x.value])); return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`); };
  return naif - (lu(naif) - naif);
}

function lireFrontmatterSujet(chemin) {
  const t = readFileSync(chemin, "utf8").replace(/\r\n/g, "\n");
  if (!t.startsWith("---")) return undefined;
  const m = t.slice(0, t.indexOf("\n---", 3)).match(/^sujet\s*:\s*(.+)$/m);
  return m ? m[1].trim() : undefined;
}

// Registre des sujets (regle 4) : <dossier>/sujets.csv, une ligne « fichier;sujet », fichier relatif au
// dossier linkedin/ avec des / (ex. « 2026-10-20/p27.final.txt », « ../sortants/annonces-missions/v4/05.final.txt »).
// Le sujet se nomme court et stable (« facture electronique », « juger un prestataire IA ») : deux posts
// au meme libelle ont le meme sujet. Rien n'est ecrit dans les .final.txt, qui se collent dans Buffer.
// Un post sans fichier (post de Julien) s'etiquette par son creneau : « AAAA-MM-JJ HH:MM compte;sujet ».
const fichierRegistre = opt.registre || join(dossier, "sujets.csv");
const relatif = (chemin) => relative(dossier, chemin).split(sep).join("/");
const registre = new Map();
if (existsSync(fichierRegistre)) {
  for (const l of readFileSync(fichierRegistre, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const i = l.indexOf(";");
    if (i > 0 && !l.startsWith("#") && !/^fichier;/i.test(l)) registre.set(l.slice(0, i).trim(), l.slice(i + 1).trim());
  }
}

// Tous les textes connus : .final.txt des dossiers dates + annonces.
function indexerTextes() {
  const textes = [];
  const ajouter = (chemin, date) => textes.push({ chemin, date, texte: lireCorpsFichier(chemin), sujet: registre.get(relatif(chemin)) || lireFrontmatterSujet(chemin) });
  if (existsSync(dossier)) for (const d of readdirSync(dossier)) {
    // Dossiers dates (posts) et dossiers de veille (« veille-AAAA-MM-JJ », posts recycles programmes).
    const date = (d.match(/^(?:veille-)?(\d{4}-\d{2}-\d{2})$/) || [])[1];
    if (!date || !statSync(join(dossier, d)).isDirectory()) continue;
    for (const f of readdirSync(join(dossier, d))) if (/\.final\.txt$/i.test(f)) ajouter(join(dossier, d, f), date);
  }
  if (existsSync(dossierAnnonces)) for (const f of readdirSync(dossierAnnonces)) if (/\.final\.txt$/i.test(f)) ajouter(join(dossierAnnonces, f), null);
  return textes;
}
const cleDebut = (s) => normaliser(s).replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
function retrouver(debut, textes) {
  const c = cleDebut(debut).slice(0, 60);
  if (c.length < 20) return null;
  const candidats = textes.filter((t) => cleDebut(t.texte.split("\n")[0]).startsWith(c) || cleDebut(t.texte.slice(0, 200)).startsWith(c));
  // Plusieurs versions (a30 et a30-court...) : la premiere trouvee, les autres signalees.
  return candidats.length ? { ...candidats[0], autres: candidats.slice(1).map((x) => x.chemin) } : null;
}

if (!existsSync(fichierFile)) { console.error(`ERREUR : file introuvable : ${fichierFile}`); process.exit(2); }
const textes = indexerTextes();
const LIGNE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (julien-partners|julien-agency) # ([TIC]) (.+)$/;
const file = [];
for (const l of readFileSync(fichierFile, "utf8").replace(/\r\n/g, "\n").split("\n")) {
  const m = l.match(LIGNE);
  if (!m) continue;
  const [, date, heure, compte, format, debut] = m;
  if (parisVersUtc(date, heure) <= maintenant) continue; // deja parti
  const trouve = retrouver(debut, textes);
  file.push({ id: `${compte === "julien-agency" ? "A" : "P"} ${date} ${heure}`, compte, date, heure, format, debut,
    texte: trouve ? trouve.texte : debut, sujet: trouve?.sujet || registre.get(`${date} ${heure} ${compte}`), source: trouve ? trouve.chemin : null, autres: trouve?.autres || [] });
}
if (opt.brouillon) {
  if (!opt.date || !opt.heure) { console.error("ERREUR : --brouillon exige --date AAAA-MM-JJ et --heure HH:MM (Paris)"); process.exit(2); }
  const compte = opt.compte || compteDepuisNom(opt.brouillon);
  const texte = lireCorpsFichier(opt.brouillon);
  file.push({ id: `BROUILLON ${basename(opt.brouillon)}`, compte, date: opt.date, heure: opt.heure, format: "?", debut: texte.split("\n")[0], texte,
    sujet: opt.sujet || registre.get(relatif(resolve(opt.brouillon))) || lireFrontmatterSujet(opt.brouillon), source: resolve(opt.brouillon), autres: [] });
}
// Historique : posts des dossiers dates dans les 30 jours avant aujourd'hui, hors posts de la file.
// Limite : un .final.txt retire avant publication y figure aussi ; chaque constat cite son fichier.
const aujourdhui = new Date(maintenant).toISOString().slice(0, 10);
const dansFile = new Set(file.map((p) => p.source).filter(Boolean));
const historique = textes.filter((t) => t.date && t.date < aujourdhui && (Date.parse(aujourdhui) - Date.parse(t.date)) / 86400000 <= JOURS_SANS_REPETITION && !dansFile.has(t.chemin) && compteDepuisNom(t.chemin))
  .map((t) => ({ id: `${basename(t.chemin)} (${t.date}, historique local)`, compte: compteDepuisNom(t.chemin), date: t.date, heure: "", texte: t.texte, sujet: t.sujet, debut: t.texte.split("\n")[0] }));

const parPost = file.map((p) => ({ ...p, constats: controlerTexte(p.texte) }));
// Un brouillon sans etiquette de sujet ne peut pas passer la regle 4 : c'est un constat, pas une info.
for (const p of parPost) if (p.id.startsWith("BROUILLON") && !p.sujet) p.constats.push({ regle: 4, motif: "sujet non étiqueté (option --sujet ou registre sujets.csv) : règle 4 non contrôlable", preuve: p.debut.slice(0, 100) });
const sansSujet = parPost.filter((p) => !p.sujet && !p.id.startsWith("BROUILLON"));
const constatsFile = controlerFile(file, { historique });
const total = parPost.reduce((n, p) => n + p.constats.length, 0) + constatsFile.length;

if (opt.json) {
  console.log(JSON.stringify({ maintenant: new Date(maintenant).toISOString(), file: fichierFile, registre: existsSync(fichierRegistre) ? fichierRegistre : null,
    posts: parPost.map(({ texte, ...r }) => ({ ...r, longueur: [...texte].length, finQuestion: /\?\s*$/.test(texte.trim()) })), constatsFile }, null, 2));
} else {
  console.log(`Contrôle des règles de Julien (14/10/2026) — file : ${fichierFile}`);
  console.log(`Posts à venir après ${new Date(maintenant).toISOString()} : ${file.length} ; historique local sur ${JOURS_SANS_REPETITION} jours : ${historique.length}`);
  for (const p of parPost) {
    const src = p.source ? basename(p.source) : "texte complet introuvable (post de Julien ?) : début seul contrôlé";
    for (const c of p.constats) console.log(`ALERTE règle ${c.regle} : ${p.id} [${src}] ${c.motif} -- « ${c.preuve} »`);
  }
  for (const c of constatsFile) console.log(`ALERTE règle ${c.regle} : ${c.motif} -- ${c.preuve}`);
  if (sansSujet.length) console.log(`INFO règle 4 : ${sansSujet.length} post(s) de la file sans étiquette de sujet (registre ${fichierRegistre}) : contrôlés par similarité de mots seulement, à confirmer à l'oeil.`);
  console.log(`\n${total} constat(s). Règles 3 (hors formules) et 6 : à juger à l'oeil.`);
}
process.exit(total ? 1 : 0);
