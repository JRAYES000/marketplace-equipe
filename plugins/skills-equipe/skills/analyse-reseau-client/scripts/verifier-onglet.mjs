#!/usr/bin/env node
// Controle d'un onglet « analyse reseau » avant de le pousser dans l'espace client.
//
// Usage :
//   node verifier-onglet.mjs <onglet.md> [--dossier-client <dossier>] [--interdits "mot1,mot2"]
//   node verifier-onglet.mjs --self-check
//
// Sortie 0 = CONFORME, 1 = NON CONFORME, 2 = mauvais usage.
//
// Les regles du site client viennent de `rapport-claude-functions/clients.ts`
// (lu le 24/09/2026) : un .md range dans un sous-dossier du dossier client, hors
// `challenge-N`, devient un onglet ; son nom est le premier titre `#`, coupe au
// tiret long « — » puis a 60 caracteres ; 5 onglets au maximum ; 200 000
// caracteres au maximum par document.

import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const LIMITES = { titre: 60, caracteres: 200000, onglets: 5, sections: 3 };

// Ce qui trahit la cuisine interne. Jamais dans une page que le client lit.
export const INTERDITS_PAR_DEFAUT = [
  "apify",
  "playwright",
  "scraper",
  "claude in chrome",
  "sous-agent",
  "dataset",
  "maxtotalcharge",
  "http://",
];

// Fichiers ecrits par le serveur ou d'ossature : jamais des onglets
// (liste AUTO_FILES de clients.ts, 24/09/2026).
const OSSATURE = new Set([
  "mission.md", "analyse-client.md", "analyse-client.html", "fiche-client.md",
  "lisez-moi.md", "questionnaire.md", "claude.md", "agents.md", "readme.md",
  "guide-collaborateurs.md", "liens.md",
]);

// Nombre de colonnes d'une ligne de tableau Markdown, sans compter les barres
// echappees (\|) ni celles d'un code en ligne.
export function colonnes(ligne) {
  const sansCode = ligne.replace(/`[^`]*`/g, "");
  const sansEchap = sansCode.replace(/\\\|/g, "");
  const interieur = sansEchap.trim().replace(/^\|/, "").replace(/\|$/, "");
  return interieur.split("|").length;
}

export function verifierOnglet(texte, { interdits = [] } = {}) {
  const erreurs = [];
  const t = texte.replace(/\r\n/g, "\n");
  const lignes = t.split("\n");

  // 1. Le nom de l'onglet.
  const h1 = /^#\s+(.+)$/m.exec(t);
  let titre = null;
  if (!h1) {
    erreurs.push("aucun titre « # » : l'onglet prendrait le nom du fichier");
  } else {
    titre = h1[1].split(" — ")[0].trim();
    if (!h1[1].includes(" — ")) {
      erreurs.push("titre sans tiret long « — » : tout le titre deviendrait le nom de l'onglet");
    }
    if (titre.length > LIMITES.titre) {
      erreurs.push(`nom d'onglet de ${titre.length} caractères : le site le coupe à ${LIMITES.titre}`);
    }
  }

  // 2. La structure commune aux onglets reseau.
  const attendus = [
    [/^> \*\*Dernière mise à jour : \d{2}\/\d{2}\/\d{4}\*\*/m, "la ligne « > **Dernière mise à jour : JJ/MM/AAAA** » en tête"],
    [/^## L['’]essentiel en \d+ points/m, "la section « L'essentiel en N points »"],
    [/^## Annexe A\b/m, "l'annexe A (l'inventaire des publications)"],
    [/^## Historique\b/m, "la section « Historique »"],
  ];
  for (const [re, nom] of attendus) if (!re.test(t)) erreurs.push(`manque ${nom}`);
  const sections = (t.match(/^## \d+\. /gm) || []).length;
  if (sections < LIMITES.sections) {
    erreurs.push(`${sections} section(s) numérotée(s) « ## 1. … » : ${LIMITES.sections} au minimum`);
  }

  // 3. Les tableaux : meme nombre de colonnes sur chaque ligne.
  let bloc = [];
  const fermer = () => {
    if (bloc.length) {
      const n = colonnes(bloc[0].l);
      const ecarts = bloc.filter((x) => colonnes(x.l) !== n);
      if (ecarts.length) {
        erreurs.push(`tableau ligne ${bloc[0].i} : ${n} colonnes attendues, écart ligne(s) ${ecarts.map((x) => x.i).join(", ")}`);
      }
      if (bloc.length < 2 || !/^\|?\s*:?-{3,}/.test(bloc[1].l.trim())) {
        erreurs.push(`tableau ligne ${bloc[0].i} : pas de ligne de séparation « |---| » sous l'en-tête`);
      }
    }
    bloc = [];
  };
  lignes.forEach((l, k) => (l.trim().startsWith("|") ? bloc.push({ i: k + 1, l }) : fermer()));
  fermer();

  // 4. La taille.
  if (t.length > LIMITES.caracteres) {
    erreurs.push(`${t.length} caractères : le site coupe à ${LIMITES.caracteres}`);
  }

  // 5. Les mots interdits.
  const bas = t.toLowerCase();
  const liste = [...INTERDITS_PAR_DEFAUT, ...interdits].map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const mot of new Set(liste)) {
    const n = bas.split(mot).length - 1;
    if (n) erreurs.push(`mot interdit « ${mot} » : ${n} fois`);
  }

  const compte = (re) => (t.match(re) || []).length;
  return {
    erreurs,
    titre,
    lignes: lignes.length,
    caracteres: t.length,
    sections,
    etiquettes: {
      estime: compte(/estimé/gi),
      nonReleve: compte(/non relevé/gi),
      aRelever: compte(/à relever/gi),
      nonVerifie: compte(/non vérifié/gi),
    },
  };
}

// Les onglets qu'affichera l'espace client : les .md des sous-dossiers, hors
// challenge-N et hors ossature. Compte ce qui est sur le disque, pousse ou non.
export function ongletsDuDossier(dossier) {
  const trouves = [];
  const parcourir = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const chemin = join(d, e.name);
      if (e.isDirectory()) { parcourir(chemin); continue; }
      const rel = relative(dossier, chemin).split(sep);
      if (rel.length < 2) continue;                       // racine du dossier client : jamais un onglet
      if (/^challenge-\d+$/.test(rel[0])) continue;       // livrables des challenges
      if (!/\.md$/i.test(e.name)) continue;
      if (e.name.startsWith(".") || OSSATURE.has(e.name.toLowerCase())) continue;
      trouves.push(rel.join("/"));
    }
  };
  parcourir(dossier);
  return trouves.sort();
}

function selfCheck() {
  const bon = [
    "# Votre compte Instagram — analyse et recommandations",
    "",
    "> **Dernière mise à jour : 24/09/2026** — relevé fait sur votre profil.",
    "",
    "## L'essentiel en 6 points",
    "",
    "1. **Un constat.** Des chiffres.",
    "",
    "## 1. Où en est le compte",
    "",
    "| Indicateur | Valeur |",
    "|---|---|",
    "| Abonnés | 1 200 |",
    "| Échappée | a \\| b |",
    "",
    "## 2. Ce qui marche",
    "",
    "## 3. Les stories",
    "",
    "## Annexe A — Les posts",
    "",
    "## Historique",
  ].join("\n");
  const cas = [
    ["onglet conforme", bon, 0],
    ["onglet conforme en CRLF", bon.replace(/\n/g, "\r\n"), 0],
    ["titre sans tiret long", bon.replace(" — analyse", " - analyse"), 1],
    ["mot interne", bon + "\nDonnées collectées avec Apify.", 1],
    ["mot interdit ajouté", bon + "\nVu sur monforum.net.", 1, ["monforum.net"]],
    ["tableau cassé", bon.replace("| Abonnés | 1 200 |", "| Abonnés | 1 200 | trop |"), 1],
    ["deux sections seulement", bon.replace("## 3. Les stories", "## Les stories"), 1],
    ["sans historique", bon.replace("## Historique", "## Journal"), 1],
    ["sans date de mise à jour", bon.replace("24/09/2026", "hier"), 1],
  ];
  let echecs = 0;
  for (const [nom, texte, attendu, extra] of cas) {
    const r = verifierOnglet(texte, { interdits: extra || [] });
    const obtenu = r.erreurs.length ? 1 : 0;
    const ok = obtenu === attendu;
    if (!ok) echecs++;
    console.log(`${ok ? "OK  " : "KO  "}${nom}${ok ? "" : " → " + (r.erreurs.join(" | ") || "aucune erreur")}`);
  }
  // 3 cellules : « a », le code `x|y`, « c \| d ». Les barres internes ne comptent pas.
  if (colonnes("| a | `x|y` | c \\| d |") !== 3) { echecs++; console.log("KO  colonnes() ignore code et échappement"); }
  else console.log("OK  colonnes() ignore code et échappement");
  console.log(echecs ? `self-check : ${echecs} échec(s)` : "self-check OK");
  return echecs ? 1 : 0;
}

function main(argv) {
  if (argv.includes("--self-check")) return selfCheck();
  const fichier = argv.find((a, i) => !a.startsWith("--") && !["--dossier-client", "--interdits"].includes(argv[i - 1]));
  if (!fichier) {
    console.error('usage : node verifier-onglet.mjs <onglet.md> [--dossier-client <dossier>] [--interdits "mot1,mot2"] | --self-check');
    return 2;
  }
  const valeur = (opt) => { const i = argv.indexOf(opt); return i >= 0 ? argv[i + 1] : undefined; };
  const interdits = (valeur("--interdits") || "").split(",");
  const r = verifierOnglet(readFileSync(fichier, "utf-8"), { interdits });

  console.log(`fichier    : ${fichier}`);
  console.log(`onglet     : « ${r.titre ?? "?"} »`);
  console.log(`taille     : ${r.lignes} lignes, ${r.caracteres} caractères (plafond ${LIMITES.caracteres})`);
  console.log(`sections   : ${r.sections} numérotées`);
  console.log(`étiquettes : estimé ${r.etiquettes.estime} · non relevé ${r.etiquettes.nonReleve} · à relever ${r.etiquettes.aRelever} · non vérifié ${r.etiquettes.nonVerifie}`);

  const dossier = valeur("--dossier-client");
  if (dossier) {
    const onglets = ongletsDuDossier(dossier);
    console.log(`onglets    : ${onglets.length} / ${LIMITES.onglets} → ${onglets.join(", ") || "aucun"}`);
    if (onglets.length > LIMITES.onglets) r.erreurs.push(`${onglets.length} onglets : le site n'en affiche que ${LIMITES.onglets}`);
  }

  if (r.erreurs.length) {
    console.log("\nNON CONFORME :");
    for (const e of r.erreurs) console.log(`  - ${e}`);
    return 1;
  }
  console.log("\nCONFORME");
  return 0;
}

// Lance main() seulement quand le fichier est execute, pas quand un test l'importe.
// Comparaison insensible a la casse : sous Windows, « c: » et « C: » designent le meme disque.
const lance = process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (lance) process.exitCode = main(process.argv.slice(2));
