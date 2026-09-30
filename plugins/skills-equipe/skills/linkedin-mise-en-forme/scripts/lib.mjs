// Coeur de la mesure de forme d'un post LinkedIn de Julien (deux comptes). Extrait de
// verif-post.mjs le 22/09/2026 pour que les regles se testent par import direct plutot
// que par un sous-processus CLI -- aucun test n'existait avant cette date pour cette
// skill (contrairement a linkedin-carrousel et linkedin-veille-virale).
//
// Critere "aucun accent manquant dans le gras" ajoute le 28/09/2026 : garde-fou demande
// par Julien apres 3 incidents reels (posts publies avec "dependance", "coute",
// "defaillance" en gras -- des mots qui existent en francais mais UNIQUEMENT sous leur
// forme accentuee, jamais "corriges" en amont car la regle 2 ne verifiait que l'ABSENCE
// d'accent dans le gras, jamais la VALIDITE du mot une fois l'accent retire). Julien : "il
// faut un garde-fou, pas une consigne". Voir plus bas (DICTIONNAIRE, INDEX_SANS_ACCENT,
// motsAccentManquant) pour le mecanisme, et lib.mjs (an-array-of-french-words, ~336k
// mots) pour la source du dictionnaire -- jamais une liste maison, qui aurait fini par
// rater le mot suivant.
//
// Le brouillon se donne en markdown (**ainsi**) ou deja converti en gras Unicode : les
// deux formes comptent, sur les DEUX polices "gras" Unicode reellement vues en usage --
// voir POLICES ci-dessous, trouve le 22/09/2026 en verifiant les 3 posts de veille deja
// publies (Bernard Marr 18/09, Andrew Ng 21/09) contre les 9 criteres d'origine.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Liste d'anglicismes PARTAGEE avec linkedin-carrousel (ajoutee le 29/09/2026, apres un
// "process" passe dans le post A1 du 28/09) : on importe la fonction et la liste du
// carrousel au lieu de les recopier, pour qu'il n'existe jamais deux listes qui divergent.
// Les deux skills vivent dans le meme paquet : le chemin relatif est stable.
const { detecterAnglicismes } = createRequire(import.meta.url)("../../linkedin-carrousel/lib/valider-anglicismes.js");

// Mathematical Sans-Serif Bold -- celle que fabrique enGras() ci-dessous, choisie par
// Julien le 18/09/2026 (SKILL.md, regle 2). Aucune lettre accentuee n'existe dans ce
// bloc : c'est toute la contrainte de cette regle.
const SANS_SERIF = { maj: 0x1d5d4, min: 0x1d5ee, chiffres: 0x1d7ec };

// Mathematical Bold (avec empattement) -- une AUTRE police "gras" Unicode tout aussi
// repandue (generateurs de texte en gras, et c'est celle que produit deja
// linkedin-carrousel/lib/valider-post.js dans ce meme depot, sans lien avec cette
// skill-ci). Trouvee en usage reel le 22/09/2026 : les segments "deux briques" (post
// Andrew Ng, 21/09, verifie sur la page LinkedIn reelle) et "16 541 offres en 2025"
// (post Bernard Marr, 18/09, verifie via Buffer) sont dans CETTE police -- pas celle
// que fabrique enGras(). Avant ce correctif, verif-post.mjs les comptait donc a tort
// comme "0 gras trouve" alors qu'un gras existe bien, juste dans l'autre police. Elle
// n'a pas non plus de forme accentuee (le bloc Mathematical Alphanumeric Symbols
// entier n'en a pour aucune police, quelle qu'elle soit).
const SERIF = { maj: 0x1d400, min: 0x1d41a, chiffres: 0x1d7ce };

// Dictionnaire francais (~336k mots, avec accents) -- charge une seule fois au chargement
// du module. Source : package "an-array-of-french-words" (MIT), installe en dependance
// de cette skill le 28/09/2026 pour ce garde-fou precisement. Jamais de liste maison :
// une liste ecrite a la main aurait couvert les 4 cas connus et rate le 5e.
const CHEMIN_DICTIONNAIRE = new URL("../node_modules/an-array-of-french-words/index.json", import.meta.url);
const DICTIONNAIRE = JSON.parse(readFileSync(CHEMIN_DICTIONNAIRE, "utf8"));
const DICT_SET = new Set(DICTIONNAIRE.map((m) => m.toLowerCase()));

const sansAccent = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Pour chaque mot du dictionnaire qui contient un accent, indexe sa forme sans accent ->
// l'ensemble de ses formes accentuees reelles. Un mot deja sans accent dans le
// dictionnaire (ex. "process") n'est jamais indexe ici : rien ne le signalera donc a
// tort, meme s'il est absent du dictionnaire (anglicismes, noms propres, "Claude
// Partners"...) -- seul un mot dont la forme accentuee EXISTE reellement declenche une
// alerte.
const INDEX_SANS_ACCENT = new Map();
for (const mot of DICTIONNAIRE) {
  const motMin = mot.toLowerCase();
  const norm = sansAccent(motMin);
  if (norm === motMin) continue;
  if (!INDEX_SANS_ACCENT.has(norm)) INDEX_SANS_ACCENT.set(norm, new Set());
  INDEX_SANS_ACCENT.get(norm).add(motMin);
}

// Controle des accents manquants dans le gras -- refait le 29/09/2026 apres un cas reel :
// la 1re ligne de A4, "Confier l'IA a un seul salarie de l'equipe est-il un risque
// sous-estime ?", tout en gras sans accent, avait obtenu 14/14. Diagnostic : TROIS trous
// cumules dans l'ancien controle, qui lisait chaque segment de gras isole, mot a mot :
//   1. l'elision : "l'equipe" restait UN seul mot (le motif acceptait l'apostrophe), donc
//      "l'equipe" n'etait ni au dictionnaire ni dans l'index -> jamais signale ;
//   2. les homographes : "salarie", "estime", "sous-estime" existent AUSSI sans accent
//      (autre forme du verbe), donc le dictionnaire les jugeait valides ;
//   3. "a" (1 lettre) etait ignore d'office, alors que "a" pour "à" est la faute la plus
//      courante ; et le gras Unicode, coupe a chaque "?", "-" ou virgule, faisait perdre
//      tout contexte (l'accroche arrivait en trois morceaux).
// Le controle lit donc maintenant la LIGNE ENTIERE (le contexte), decoupe l'elision, et ne
// juge que les mots effectivement en gras. Un homographe n'est signale que si le CONTEXTE
// impose la forme accentuee -- jamais sur le seul mot ("risque", "projet", "il a" restent
// valides). Limite connue : un homographe nom/verbe sans indice de contexte (ex. "un seul
// salarie") ne se voit pas sans frequence d'usage ; un autre mot de la phrase doit le reveler.
const AUXILIAIRES = new Set(("est sont etait etaient sera seront serait seraient soit soient fut furent ete etre " +
  "suis es sommes etes semble semblent reste restent parait paraissent devient deviennent " +
  "a ont avait avaient aura auront aurait auraient ai as avons avez avoir eu").split(" "));
// Noms et adjectifs courants qui suivent etre/avoir sans etre un participe ("a envie", "a charge
// de", "est vide", "est calme") alors qu'une forme en -e accentue existe : jamais signales.
const PAS_UN_PARTICIPE = new Set(("envie charge classe cote place vide calme libre sobre large juste rare riche faible " +
  "utile simple stable sage sale lisse fixe pire pure propre claire").split(" "));
// Mots apres lesquels un mot en -e n'est pas un participe : determinants, prepositions,
// pronoms sujets, conjonctions, adverbes courts. Sert a la regle "compose a prefixe en fin de propos".
const PAS_UN_NOM = new Set(("le la l les un une des ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos " +
  "leur leurs du de d au aux en dans sur sous pour par avec sans chez entre vers ne n me m te t se s nous vous il elle on " +
  "ils elles je j tu qui que qu et ou mais donc car ni si tres plus moins aussi trop bien mal tout toute tous toutes quel " +
  "quelle chaque plusieurs quelques y c ca cela ceci").split(" "));
// Mots qui ferment une proposition : apres eux, un infinitif precedent n'a plus de lien avec "a".
const COUPE_PROPOSITION = new Set(("il elle on ils elles je j tu nous vous qui que qu quand lorsque si ou mais car donc ni " +
  "ce c ca cela ceci pourquoi comment y").split(" "));
const PREFIXES_TIRET = /^(sous|sur|mal|bien|non|re|pre|semi|mi|co|auto|contre)-/;
const INFINITIF = /(?:er|ir|oir|ndre|rdre|ttre|uire|aire|indre|ire)$/;

const estCharGras = (cp) =>
  (cp >= SANS_SERIF.maj && cp <= SANS_SERIF.maj + 25) || (cp >= SANS_SERIF.min && cp <= SANS_SERIF.min + 25) ||
  (cp >= SERIF.maj && cp <= SERIF.maj + 25) || (cp >= SERIF.min && cp <= SERIF.min + 25);

// Une ligne -> { ascii, gras[] } : ascii = texte ramene en lettres ordinaires (les ** retires),
// gras[i] = le caractere i est en gras (markdown ou Unicode, les deux polices).
function ligneAvecGras(ligne) {
  let ascii = "";
  const gras = [];
  let dansMarkdown = false;
  const chars = [...ligne];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "*" && chars[i + 1] === "*") { dansMarkdown = !dansMarkdown; i++; continue; }
    const cp = chars[i].codePointAt(0);
    const c = versAscii(chars[i]);
    ascii += c;
    for (let k = 0; k < c.length; k++) gras.push(dansMarkdown || estCharGras(cp));
  }
  return { ascii, gras };
}

function motsAccentManquantLigne(ligne) {
  const { ascii, gras } = ligneAvecGras(ligne);
  const jetons = [...ascii.matchAll(/\p{L}+(?:-\p{L}+)*/gu)].map((m) => ({
    mot: m[0], bas: m[0].toLowerCase(), cle: sansAccent(m[0].toLowerCase()),
    debut: m.index, fin: m.index + m[0].length, gras: gras[m.index] === true,
  }));
  const fautifs = [];
  let dernierInfinitif = -1;
  jetons.forEach((j, i) => {
    const avant = jetons[i - 1];
    const ecart = ascii.slice(avant ? avant.fin : 0, j.debut);
    if (/[,;:.!?()«»]/.test(ecart)) dernierInfinitif = -1;
    const apostropheAvant = /['’]$/.test(ecart);
    const precedent = avant && !/[.!?]/.test(ecart) ? avant : null;
    const compose = j.mot.includes("-");
    const suite = ascii.slice(j.fin).replace(/^\s+/, "");
    const finDePropos = suite === "" || /^[,;:.!?)»]/.test(suite);
    const debutDePhrase = /(^|[.!?:])$/.test(ascii.slice(0, j.debut).replace(/[\s\p{Extended_Pictographic}️]+$/u, ""));
    const signaler = (attendu) => fautifs.push(`"${j.mot}" (accente attendu : "${attendu}")`);

    if (j.gras) {
      const candidats = INDEX_SANS_ACCENT.get(j.bas);
      let signale = false;
      // Regle de base : mot absent du dictionnaire mais dont une forme accentuee existe.
      // Un compose ("peut-etre") est teste en entier, puis partie par partie.
      if (!DICT_SET.has(j.bas) && candidats && candidats.size > 0) {
        signaler([...candidats].join('" ou "')); signale = true;
      } else if (compose && !DICT_SET.has(j.bas)) {
        for (const partie of j.bas.split("-")) {
          const c = INDEX_SANS_ACCENT.get(partie);
          if (partie.length > 1 && !DICT_SET.has(partie) && c && c.size > 0) { signaler([...c].join('" ou "')); signale = true; }
        }
      }
      // "a" seul pour "à" : devant un infinitif, en debut de phrase, ou apres un infinitif de la
      // meme proposition sans sujet entre les deux ("Confier l'IA a ..."). Jamais "a-t-il"
      // (compose), "l'a" (elision), "A4" (colle a un chiffre) ni "il a".
      if (!signale && j.bas === "a" && !apostropheAvant && /^(\s|$)/.test(ascii.slice(j.fin))) {
        const suivant = jetons[i + 1];
        const devantInfinitif = suivant && !/[,;:.!?()]/.test(ascii.slice(j.fin, suivant.debut)) &&
          INFINITIF.test(suivant.bas) && DICT_SET.has(suivant.bas);
        const infinitifProche = dernierInfinitif >= 0 && i - dernierInfinitif <= 4;
        if (debutDePhrase || devantInfinitif || infinitifProche) { signaler("à"); signale = true; }
      }
      // Mot en -e dont la forme en -é existe : seulement si le contexte impose le participe
      // (apres etre/avoir, ou compose a prefixe -- "sous-estime" -- en fin de propos).
      if (!signale && j.bas.endsWith("e") && !j.bas.endsWith("ee") && DICT_SET.has(j.bas)) {
        const forme = j.bas.slice(0, -1) + "é";
        if (candidats && candidats.has(forme)) {
          const apresAuxiliaire = precedent && !apostropheAvant && AUXILIAIRES.has(precedent.cle) && !PAS_UN_PARTICIPE.has(j.bas) &&
            j.bas.length >= 4 && !PAS_UN_NOM.has(j.bas);
          const prefixe = PREFIXES_TIRET.test(j.bas) && finDePropos && precedent && !PAS_UN_NOM.has(precedent.cle);
          if (apresAuxiliaire || prefixe) signaler(forme);
        }
      }
    }
    // Suivi de l'infinitif pour la regle "a" (tous les jetons non composes, gras ou non).
    if (COUPE_PROPOSITION.has(j.cle)) dernierInfinitif = -1;
    else if (!compose && INFINITIF.test(j.bas) && DICT_SET.has(j.bas)) dernierInfinitif = i;
  });
  return fautifs;
}

// Tous les mots en gras d'un texte dont l'accent manque (voir le bloc ci-dessus).
export function motsAccentManquantCorps(corps) {
  return corps.split("\n").flatMap(motsAccentManquantLigne);
}

const BASES_ECRITURE = [
  [0x41, 0x5a, SANS_SERIF.maj],
  [0x61, 0x7a, SANS_SERIF.min],
  [0x30, 0x39, SANS_SERIF.chiffres],
];

// Fabrique le gras Unicode a partir d'un segment ASCII sans accent -- toujours en
// Sans-Serif Bold, jamais l'autre police (regle de Julien du 18/09/2026 : c'est celle-la
// qu'on ecrit, meme si l'autre circule aussi dans le corpus reel -- voir POLICE_SERIF_RE
// plus bas pour la detecter en LECTURE, sans jamais la produire en ECRITURE).
export const enGras = (s) => [...s].map((c) => {
  const p = c.codePointAt(0);
  const b = BASES_ECRITURE.find(([d, f]) => p >= d && p <= f);
  return b ? String.fromCodePoint(b[2] + (p - b[0])) : c;
}).join("");

// Ce que le gras ne sait rendre dans AUCUNE des deux polices : tout ce qui n'est ni
// ASCII, ni ponctuation courante, ni espace. Les accents en font partie.
export const ACCENTUE = /[^\x00-\x7F«»…’—\s]/u;
export const EMOJI = /[\u{1F300}-\u{1FAFF}☀-➿⬀-⯿️]/u;
export const EMOJI_G = new RegExp(EMOJI.source, "gu");

// Un passage deja converti, dans l'une OU l'autre police : une suite de lettres/chiffres
// des deux blocs gras Unicode, espaces compris (pour ne pas couper "seize mille" en deux
// segments). Sert a COMPTER qu'un gras existe, quelle que soit sa police.
//
// L'apostrophe (droite ' ou courbe ’) est incluse dans la plage : bug reel trouve le
// 22/09/2026 sur un titre "Ce que j'en retiens" -- une fois converti en gras, l'Unicode
// Mathematical Bold ne fabrique aucune forme grasse pour l'apostrophe (elle reste telle
// quelle, comme l'accent, voir enGras() plus haut), ce qui coupait le titre en deux runs
// autour d'elle et le faisait rater le regex "titre" ci-dessous (`^EMOJI run$`, qui exige
// un seul run contigu jusqu'a la fin de ligne). L'apostrophe est de la ponctuation
// courante, pas un accent : l'inclure ici ne relache rien de la regle 2 (aucune LETTRE
// accentuee n'est ajoutee).
const PLAGE_SANS_SERIF = "\\u{1D5D4}-\\u{1D607}\\u{1D7EC}-\\u{1D7F5}";
const PLAGE_SERIF = "\\u{1D400}-\\u{1D433}\\u{1D7CE}-\\u{1D7D7}";
const PONCTUATION_RUN = "'’";
export const UNICODE_GRAS = new RegExp(`[${PLAGE_SANS_SERIF}${PLAGE_SERIF}${PONCTUATION_RUN}\\u0020]+`, "gu");
// Sert a REPERER un usage de l'AUTRE police (serif), non conforme a la regle de Julien.
export const UNICODE_GRAS_SERIF = new RegExp(`[${PLAGE_SERIF}]`, "u");
const UNICODE_GRAS_SERIF_RUN = new RegExp(`[${PLAGE_SERIF}${PONCTUATION_RUN}\\u0020]+`, "gu");
// Un match de UNICODE_GRAS/UNICODE_GRAS_SERIF_RUN peut, apres inclusion de l'apostrophe
// ci-dessus, etre compose UNIQUEMENT d'apostrophes et d'espaces (ex. une simple
// apostrophe de texte courant comme "l'offre", jamais un gras) -- bug reel trouve le
// 22/09/2026 en corrigeant celui du titre avec apostrophe : ce filtre exige qu'un match
// contienne au moins UN vrai caractere gras Unicode pour compter (meme principe que le
// `.trim()+filter(Boolean)` deja en place, qui ecarte deja les matchs tout-espace).
const contientUnVraiGras = (s) => new RegExp(`[${PLAGE_SANS_SERIF}${PLAGE_SERIF}]`, "u").test(s);

// Formulations interdites -- reprises telles quelles de
// linkedin-carrousel/lib/valider-post.js (meme motif, meme retour de Julien du
// 10/09/2026 section 3) : pas de code partage entre skills dans ce depot (convention
// deja en usage, voir valider-orthographe.js duplique dans les 3 paquets), donc
// dupliquees ici plutot qu'importees. Aucune formulation nouvelle inventee pour cette
// skill : seules celles deja eprouvees par Julien sur linkedin-carrousel.
// Chiffre sans source -- reprise telle quelle de linkedin-carrousel/lib/valider-post.js
// (validerChiffreSource, contientLigneSourceFinale, estDetailAnecdote, SOURCES_VAGUES,
// versAscii), meme motif que INTERDITS ci-dessous. Trou reel trouve le 22/09/2026 en
// testant cette skill de facon adversariale : rien ici ne verifiait qu'un chiffre-preuve
// ("40% des recruteurs...") porte une source -- un post pouvait donc citer n'importe
// quel chiffre invente et passer les douze criteres sans encombre. `contenu-linkedin`
// (voir Ordre de travail) est cense fournir des chiffres deja sources en amont, mais
// rien ne le verifiait mecaniquement dans CETTE skill si elle etait utilisee seule.
const MOTS_ETUDE = /(sondage|[eé]tudes?|enqu[eê]te|barom[eè]tre|interrog|selon|rapport|classement|index)/i;
const SOURCES_VAGUES = [
  /^\s*(une|des|plusieurs)?\s*[eé]tudes?(\s+r[eé]centes?)?\s*$/i,
  /^\s*(les|des)?\s*chiffres?\s*$/i,
  /^\s*(les|des)?\s*donn[eé]es?\s*$/i,
  /^\s*(une)?\s*enqu[eê]te(\s+r[eé]cente)?\s*$/i,
  /^\s*(certaines?|diverses?)\s+sources?\s*$/i,
  /^\s*internet\s*$/i,
];
function versAscii(fragment) {
  // Gras Unicode (les deux polices, voir SANS_SERIF/SERIF plus haut) -> ASCII, pour lire
  // "𝟳𝟵 𝗮𝗻𝘀" (Sans-Serif) ou "𝟳𝟵 𝐚𝐧𝐬" (Serif) comme "79 ans".
  return [...fragment].map((c) => {
    const cp = c.codePointAt(0);
    if (cp >= SANS_SERIF.chiffres && cp <= SANS_SERIF.chiffres + 9) return String.fromCharCode(48 + cp - SANS_SERIF.chiffres);
    if (cp >= SERIF.chiffres && cp <= SERIF.chiffres + 9) return String.fromCharCode(48 + cp - SERIF.chiffres);
    if (cp >= SANS_SERIF.maj && cp <= SANS_SERIF.maj + 25) return String.fromCharCode(65 + cp - SANS_SERIF.maj);
    if (cp >= SANS_SERIF.min && cp <= SANS_SERIF.min + 25) return String.fromCharCode(97 + cp - SANS_SERIF.min);
    if (cp >= SERIF.maj && cp <= SERIF.maj + 25) return String.fromCharCode(65 + cp - SERIF.maj);
    if (cp >= SERIF.min && cp <= SERIF.min + 25) return String.fromCharCode(97 + cp - SERIF.min);
    return c;
  }).join("");
}
function contientLigneSourceFinale(texte) {
  const correspondance = texte.match(/^[ \t]*Source[ \t]*:[ \t]*(.+)$/im);
  if (!correspondance) return false;
  const contenu = correspondance[1].trim();
  return contenu.length > 0 && !SOURCES_VAGUES.some((regex) => regex.test(contenu));
}
function estDetailAnecdote(texte, correspondance) {
  const chiffre = versAscii(correspondance[0]);
  const debut = correspondance.index;
  const fin = debut + correspondance[0].length;
  const apres = versAscii(texte.slice(fin, fin + 30));
  const avant = versAscii(texte.slice(Math.max(0, debut - 12), debut));
  const fenetreLarge = versAscii(texte.slice(Math.max(0, debut - 80), fin + 60));
  if (/\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(versAscii(texte.slice(Math.max(0, debut - 6), fin + 6)))) return true;
  if (/^(19|20)\d{2}$/.test(chiffre) && !/^\s*%/.test(apres) && !/[\d.,]$/.test(avant.trimEnd())) return true;
  if (/^\s*(%|€|\$|euros?)/i.test(apres) || /[+\-€$]\s*$/.test(avant)) return false;
  if (/^\s*(h|heures?|minutes?|min|secondes?|jours?|semaines?|mois)\b/i.test(apres)) return true;
  if (/^\s*(ans?|ann[eé]es?|personnes?|participants?|salari[eé]s?|collaborateurs?|invit[eé]s?|convives?)\b/i.test(apres)) {
    return !MOTS_ETUDE.test(fenetreLarge);
  }
  return false;
}
// Version "rapport" (jamais un throw) de validerChiffreSource pour s'integrer au style de
// verifierTexte ci-dessous -- meme logique exacte que linkedin-carrousel.
// Chiffres uniquement (ASCII + les deux polices grasses) -- bug reel trouve et corrige le
// 22/09/2026 pendant le portage : reutiliser PLAGE_SANS_SERIF/PLAGE_SERIF ici (qui couvrent
// aussi les LETTRES, construites pour le comptage du gras) faisait matcher des mots entiers
// ("offres", "en") comme des "chiffres". Plages chiffres seules, distinctes des plages gras.
const PLAGE_CHIFFRES = "\\u{1D7CE}-\\u{1D7D7}\\u{1D7EC}-\\u{1D7F5}";
function chiffresSansSource(texte) {
  const REGEX_CHIFFRE = new RegExp(`[\\d${PLAGE_CHIFFRES}]+`, "gu");
  const sourceFinale = contientLigneSourceFinale(texte);
  const fautifs = [];
  let correspondance;
  while ((correspondance = REGEX_CHIFFRE.exec(texte)) !== null) {
    const debutFenetre = Math.max(0, correspondance.index - 80);
    const finFenetre = correspondance.index + correspondance[0].length + 60;
    const fenetre = texte.slice(debutFenetre, finFenetre);
    if (!/\(\s*source\s*:/i.test(fenetre)) {
      if (sourceFinale && estDetailAnecdote(texte, correspondance)) continue;
      fautifs.push(`"${versAscii(correspondance[0])}" sans source`);
      continue;
    }
    const correspondanceSource = fenetre.match(/\(\s*source\s*:\s*([^)]*)\)/i);
    if (correspondanceSource && SOURCES_VAGUES.some((r) => r.test(correspondanceSource[1].trim()))) {
      fautifs.push(`"${versAscii(correspondance[0])}" avec une source trop vague ("${correspondanceSource[1].trim()}")`);
    }
  }
  return fautifs;
}

// Bug reel trouve par test adversarial le 22/09/2026 (meme trou trouve et corrige le
// meme jour dans linkedin-carrousel, source de cette banque) : "commentez\s+oui" et
// "partagez\s+si" n'attrapent le separateur qu'en espace(s) simple(s) --
// "C O M M E N T E Z   O U I" (une lettre par groupe), "commentez-oui" (tiret) et
// "commentez : oui" (ponctuation) passaient tous les trois. Verifie sur une version du
// texte NORMALISEE (lettres minuscules uniquement, separateurs retires) en plus des
// regex ci-dessous -- seulement pour ces deux motifs precis, les autres dependant d'une
// syntaxe qui perdrait son sens une fois compactee.
const MOTIFS_COMPACTS = [
  { motif: "demande d'engagement (\"commentez OUI\")", compact: /commentezoui/ },
  { motif: "demande d'engagement (\"partagez si...\")", compact: /partagezsi/ },
];
function compacter(texte) {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}

export const INTERDITS = [
  { regex: /commentez\s+["']?oui["']?/i, motif: "demande d'engagement (\"commentez OUI\")" },
  { regex: /partagez\s+si/i, motif: "demande d'engagement (\"partagez si...\")" },
  { regex: /!{2,}/, motif: "exclamations en rafale" },
  { regex: /—|–/, motif: "tiret long" },
  { regex: /--/, motif: "tiret long (double tiret)" },
  { regex: /ce\s+n['’]est\s+pas\s+.+?,?\s*(?:c['’]est|mais\s+plut[oô]t|c['’][eé]tait)\s+/i, motif: '"ce n\'est pas X, c\'est/mais plutot Y"' },
  { regex: /ravi(?:e)?\s+de\s+vous\s+annoncer/i, motif: '"ravi de vous annoncer"' },
  { regex: /taguez\s+quelqu['’]un/i, motif: '"taguez quelqu\'un"' },
  { regex: /linkedin\s+(?:est\s+)?(?:nul|pourri|inutile|une\s+plaie|un\s+cirque)/i, motif: "critique de LinkedIn" },
  { regex: /\b[A-ZÀ-Ý]{5,}\b/, motif: "mot ecrit tout en majuscules" },
  // Ajoutees le 30/09/2026 (consigne de Julien du 29/09, 22h08). `enGrasAussi` : lues aussi
  // sur le texte ramene en ASCII, pour qu'une tournure deja convertie en gras Unicode n'y
  // echappe pas (les anciennes entrees restent lues sur le texte brut, comportement inchange).
  { regex: /notre\s+lecture\s*:/i, motif: 'tournure interdite "Notre lecture :"', enGrasAussi: true },
  { regex: /testons[-\s]la\b/i, motif: 'tournure interdite "Testons-la."', enGrasAussi: true },
  { regex: /suivons\s+son\s+regard/i, motif: 'tournure interdite "Suivons son regard."', enGrasAussi: true },
];

// Repere une tournure interdite dans le texte, brut puis (si l'entree le demande) en ASCII.
function trouverInterdit(corps) {
  const ascii = versAscii(corps);
  for (const { regex, motif, enGrasAussi } of INTERDITS) {
    const m = corps.match(regex) || (enGrasAussi ? ascii.match(regex) : null);
    if (m) return { motif, extrait: m[0] };
  }
  return null;
}

// Titres de bloc detectables : ligne entierement en gras (markdown ou Unicode), emoji facultatif
// devant, hors accroche (ligne 0). Un bloc sans titre ne laisse aucune trace dans le texte.
const TITRE_BLOC = new RegExp(`^(?:${EMOJI.source}\\s+)?(?:\\*\\*[^*]+\\*\\*|[${PLAGE_SANS_SERIF}${PLAGE_SERIF}${PONCTUATION_RUN}\\u0020]+)\\s*$`, "u");
function titresDeBloc(lignes) {
  return lignes.slice(1).filter((l) => TITRE_BLOC.test(l) && (l.includes("**") || contientUnVraiGras(l)));
}

// Schema d'un post : type d'accroche, nombre de blocs, type de fin. Sert a la regle du
// 30/09/2026 : jamais deux posts de suite sur un compte avec la meme accroche, le meme nombre
// de blocs et la meme fin. "Meme accroche" se lit comme meme TYPE d'accroche (question,
// chiffre, affirmation) : deux textes mot pour mot identiques ne posent pas la question.
const clairLigne = (l) => versAscii(l).replace(/\*\*/g, "").trim();
const typeDeLigne = (l) => (/\?["»)\s]*$/.test(l) ? "question" : /\d/.test(l) ? "chiffre" : "affirmation");
const EST_LIEN = /https?:\/\/|claudeagency\.fr|claudepartners/i;
const lignesDe = (corps) => corps.replace(/\r\n/g, "\n").trim().split("\n");
// Derniere ligne "utile" : ni Source, ni hashtags, ni URL seule. C'est la fin au sens de la regle.
const finDuPost = (corps) => {
  const utiles = lignesDe(corps).map(clairLigne).filter((l) => l && !/^source\s*:/i.test(l) && !/^(#\S+\s*)+$/.test(l) && !/^https?:\/\/\S+$/.test(l));
  return utiles[utiles.length - 1] || "";
};
export function schemaPost(corps) {
  const lignes = lignesDe(corps);
  const fin = finDuPost(corps);
  return {
    accroche: typeDeLigne(clairLigne(lignes[0])),
    blocs: Math.max(1, titresDeBloc(lignes).length),
    fin: EST_LIEN.test(fin) ? "lien" : typeDeLigne(fin),
  };
}
const memesSchemas = (x, y) => x.accroche === y.accroche && x.blocs === y.blocs && x.fin === y.fin;
export const memeSchema = (a, b) => memesSchemas(schemaPost(a), schemaPost(b));

// Segments en gras d'un post : markdown **ainsi** ou gras Unicode deja converti (les deux polices).
const segmentsGras = (corps) => [...corps.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1])
  .concat((corps.match(UNICODE_GRAS) || []).map((s) => s.trim()).filter(Boolean).filter(contientUnVraiGras));

// Forme comparable : gras Unicode -> ASCII, sans accent ni ponctuation, en minuscules.
const cleTexte = (s) => versAscii(s).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const NB_MOTS_DEBUT = 3;
const NB_MOTS_GRAS_MIN = 2;
const debutDuPost = (corps) => cleTexte(lignesDe(corps)[0]).split(" ").slice(0, NB_MOTS_DEBUT).join(" ");

/**
 * Regle de variete etendue (30/09/2026) : le brouillon est compare a chacun des derniers posts du
 * meme compte (`precedents`, du plus recent, rang 1, au plus ancien). Quatre repetitions sont
 * refusees, reperees avec le rang du post en cause :
 *   - schema : meme type d'accroche, meme nombre de blocs ET meme type de fin (voir schemaPost) ;
 *   - debut : les trois premiers mots de l'accroche sont les memes ;
 *   - fin : derniere ligne identique mot pour mot (hors lien, hors ligne Source) ;
 *   - gras : une phrase en gras (2 mots minimum) deja utilisee.
 * Un meme TYPE d'accroche ou de fin repete sur plusieurs posts n'est pas refuse : il n'y a que trois
 * types, l'exiger rendrait la regle intenable (finir sur une vraie question est une consigne
 * permanente). Retourne [{ type, rang, detail }], [] si tout est varie.
 */
export function varieteSur(corps, precedents = []) {
  const moi = schemaPost(corps);
  const debut = debutDuPost(corps);
  const fin = finDuPost(corps);
  const cleFin = EST_LIEN.test(fin) ? "" : cleTexte(fin);
  const gras = new Set(segmentsGras(corps).map(cleTexte).filter((g) => g.split(" ").length >= NB_MOTS_GRAS_MIN));
  const violations = [];
  precedents.forEach((texte, i) => {
    const rang = i + 1;
    if (memesSchemas(moi, schemaPost(texte))) {
      violations.push({ type: "schema", rang, detail: `schema identique au post n°${rang} (accroche ${moi.accroche}, ${moi.blocs} bloc(s), fin ${moi.fin})` });
    }
    if (debut.split(" ").length === NB_MOTS_DEBUT && debut === debutDuPost(texte)) {
      violations.push({ type: "debut", rang, detail: `accroche commencant comme le post n°${rang} (« ${debut} »)` });
    }
    if (cleFin && cleFin === cleTexte(finDuPost(texte))) {
      violations.push({ type: "fin", rang, detail: `meme derniere ligne que le post n°${rang} (« ${fin.slice(0, 50)} »)` });
    }
    for (const g of new Set(segmentsGras(texte).map(cleTexte))) {
      if (gras.has(g)) violations.push({ type: "gras", rang, detail: `meme phrase en gras que le post n°${rang} (« ${g} »)` });
    }
  });
  return violations;
}

const dire = (bon, nom, detail) => ({ bon, nom, detail });

/**
 * Mesure les criteres de forme sur le corps deja extrait (frontmatter retire). Fonction
 * pure : aucune lecture de fichier, aucun exit -- pour rester testable par import direct.
 * `precedent` (facultatif) : texte du post precedent du meme compte, ajoute le critere
 * "schema different du post precedent". `precedents` (facultatif) : les derniers posts du meme
 * compte, du plus recent au plus ancien (5 au plus) ; le premier tient lieu de `precedent`, et le
 * critere "variete sur les 5 derniers posts" s'ajoute. Retourne { resultats, passes, total }.
 */
export function verifierTexte(corps, { precedent, precedents } = {}) {
  const lignes = corps.split("\n");
  const resultats = [];

  // En points de code, sans les asterisques du markdown : une lettre en gras Unicode
  // occupe deux unites UTF-16, donc `.length` compterait une accroche de 110 signes
  // pour 193 et la refuserait a tort (mesure du 18/09/2026).
  const accroche = lignes[0].replace(/\*\*/g, "");
  const tailleAccroche = [...accroche].length;
  resultats.push(dire(tailleAccroche <= 140, "accroche <= 140 caracteres", `${tailleAccroche} caracteres`));

  // Depuis le 30/09/2026 (consigne de Julien du 29/09), l'accroche n'est plus forcement une
  // question : question, prise de position, chiffre ou situation concrete. Plus aucun controle
  // sur sa forme, seulement l'anti-degenerescence ci-dessous : ne mesure PAS si le hook donne
  // envie de cliquer sur "... plus" (jugement de Julien, aucun code ne le remplace), attrape
  // seulement l'accroche vide ou reduite a un fragment ("?" seul).
  const motsAccroche = accroche.trim().split(/\s+/).filter(Boolean);
  resultats.push(dire(motsAccroche.length >= 3, "accroche non degeneree (3 mots mini)", `${motsAccroche.length} mot(s)`));

  const nu = [...corps.replace(/\*\*/g, "")].length;
  resultats.push(dire(nu >= 1300 && nu <= 1900, "longueur 1300-1900", `${nu} caracteres`));

  // Deux formes acceptees pour compter un gras : le markdown, et le gras Unicode deja
  // converti -- dans l'une ou l'autre police (voir UNICODE_GRAS plus haut). Depuis le
  // 30/09/2026 : 2 passages au maximum par post (avant : au moins huit).
  const gras = segmentsGras(corps);
  resultats.push(dire(gras.length <= 2, "gras : 2 passages au maximum", `${gras.length} trouve(s)`));
  const fautifs = gras.filter((g) => ACCENTUE.test(g.replace(EMOJI_G, "").replace(UNICODE_GRAS, "")));
  resultats.push(dire(fautifs.length === 0, "aucun gras accentue", fautifs.length ? fautifs.join(" | ") : "tous sans accent"));

  // Critere du 28/09/2026 : voir l'en-tete de fichier. Chaque segment gras est ramene en
  // ASCII (deja le cas pour le markdown, versAscii() pour l'Unicode deja converti), puis
  // chaque mot est compare au dictionnaire -- voir motsAccentManquant().
  const motsFautifs = motsAccentManquantCorps(corps);
  resultats.push(dire(
    motsFautifs.length === 0,
    "aucun accent manquant dans le gras",
    motsFautifs.length ? motsFautifs.join(" ; ") : "tous les mots verifies au dictionnaire"
  ));

  // Critere du 22/09/2026 : le gras deja converti doit etre dans la police que Julien a
  // choisie (Sans-Serif Bold), pas l'autre (voir SERIF plus haut). Un segment en markdown
  // **ainsi** n'est pas concerne, il n'est pas encore converti.
  const segmentsSerif = (corps.match(UNICODE_GRAS_SERIF_RUN) || []).map((s) => s.trim()).filter(Boolean).filter(contientUnVraiGras);
  resultats.push(dire(
    segmentsSerif.length === 0,
    "gras dans la bonne police (Sans-Serif Bold)",
    segmentsSerif.length ? `Mathematical Bold (avec empattement) trouve : ${segmentsSerif.join(" | ")}` : "aucun gras serif"
  ));

  // Depuis le 30/09/2026 : 1 a 4 blocs, avec ou sans titre, plus d'emojis imposes. Seuls les
  // titres detectables (ligne entierement en gras, emoji facultatif) se comptent : un bloc
  // sans titre ne laisse aucune trace dans le texte.
  const titres = titresDeBloc(lignes);
  resultats.push(dire(titres.length <= 4, "4 blocs a titre au maximum", titres.length ? titres.join(" / ") : "aucun titre en gras"));

  const emojis = corps.match(EMOJI_G) || [];
  resultats.push(dire(emojis.length <= 6, "6 emojis au maximum", `${emojis.length} trouve(s)`));
  const horsTete = lignes.filter((l) => EMOJI.test(l) && !new RegExp(`^${EMOJI.source}`, "u").test(l));
  resultats.push(dire(horsTete.length === 0, "emojis en tete de ligne", horsTete.length ? horsTete[0].slice(0, 50) : "toutes en tete"));

  const phrases = corps.replace(/\*\*/g, "").replace(/https?:\/\/\S+/g, "lien").split(/(?<=[.!?])\s+/);
  const longues = phrases.filter((p) => p.trim().split(/\s+/).length > 20);
  resultats.push(dire(longues.length === 0, "aucune phrase > 20 mots", longues.length ? `${longues.length} : ${longues[0].slice(0, 60)}...` : "ok"));

  // Nouveau critere (22/09/2026) : banque de formulations interdites, reprise de
  // linkedin-carrousel (voir INTERDITS plus haut). Sert directement l'objectif de
  // Julien ("les posts les plus viraux") -- ce sont des formulations qui ont deja fait
  // juger un contenu "fabrique"/"AI slop" ailleurs dans ce meme depot.
  const compact = compacter(corps);
  const compactTrouve = MOTIFS_COMPACTS.find(({ compact: r }) => r.test(compact));
  const interditTrouve = trouverInterdit(corps);
  resultats.push(dire(
    !interditTrouve && !compactTrouve,
    "aucune formulation interdite",
    compactTrouve
      ? `${compactTrouve.motif}, meme espacee/ponctuee pour contourner la detection`
      : interditTrouve
        ? `${interditTrouve.motif} -- "${interditTrouve.extrait}"`
        : "aucune trouvee"
  ));

  // Nouveau critere (22/09/2026, trouve par test adversarial) : aucun chiffre sans
  // source, reprise de linkedin-carrousel (voir chiffresSansSource plus haut). Avant ce
  // critere, un chiffre-preuve invente ("40% des recruteurs...") passait les douze
  // criteres existants sans encombre -- rien ici ne verifiait le sourcage, contrairement
  // a linkedin-carrousel qui le fait depuis le 15/09/2026.
  const chiffresFautifs = chiffresSansSource(corps);
  resultats.push(dire(
    chiffresFautifs.length === 0,
    "aucun chiffre sans source",
    chiffresFautifs.length ? chiffresFautifs.join(" ; ") : "aucun chiffre, ou tous sources"
  ));

  // Nouveau critere (29/09/2026) : aucun anglicisme de la liste fermee de
  // linkedin-carrousel/lib/valider-anglicismes.js (process -> processus, etc.). Lu sur le
  // texte ramene en ASCII : un mot deja converti en gras Unicode ne doit pas y echapper.
  const anglicismes = detecterAnglicismes(versAscii(corps));
  resultats.push(dire(
    anglicismes.length === 0,
    "aucun anglicisme",
    anglicismes.length
      ? anglicismes.map((a) => `"${a.trouve}" (dites plutot "${a.attendu}")`).join(", ")
      : "aucun de la liste"
  ));

  // Regle du 30/09/2026 : jamais deux posts de suite, sur un compte, avec la meme accroche, le
  // meme nombre de blocs et la meme fin. Mesuree seulement si le post precedent est fourni.
  const recents = precedents && precedents.length ? precedents : undefined;
  const dernier = recents ? recents[0] : precedent;
  if (dernier !== undefined) {
    const a = schemaPost(corps), b = schemaPost(dernier);
    const memes = memesSchemas(a, b);
    resultats.push(dire(
      !memes,
      "schema different du post precedent",
      `accroche ${a.accroche}, ${a.blocs} bloc(s), fin ${a.fin}` + (memes ? " : identique au post precedent" : ` (precedent : ${b.accroche}, ${b.blocs}, ${b.fin})`)
    ));
  }
  // Extension du 30/09/2026 : les memes repetitions, cherchees dans les 5 derniers posts du compte.
  if (recents) {
    const violations = varieteSur(corps, recents);
    resultats.push(dire(
      violations.length === 0,
      "variete sur les 5 derniers posts",
      `${recents.length} post${recents.length > 1 ? "s" : ""} compares` + (violations.length ? ` : ${violations.map((v) => v.detail).join(" ; ")}` : " : aucune repetition")
    ));
  }

  const passes = resultats.filter((r) => r.bon).length;
  return { resultats, passes, total: resultats.length };
}
