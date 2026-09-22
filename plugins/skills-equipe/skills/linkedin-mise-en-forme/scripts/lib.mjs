// Coeur de la mesure de forme d'un post LinkedIn de Julien (deux comptes). Extrait de
// verif-post.mjs le 22/09/2026 pour que les regles se testent par import direct plutot
// que par un sous-processus CLI -- aucun test n'existait avant cette date pour cette
// skill (contrairement a linkedin-carrousel et linkedin-veille-virale).
//
// Le brouillon se donne en markdown (**ainsi**) ou deja converti en gras Unicode : les
// deux formes comptent, sur les DEUX polices "gras" Unicode reellement vues en usage --
// voir POLICES ci-dessous, trouve le 22/09/2026 en verifiant les 3 posts de veille deja
// publies (Bernard Marr 18/09, Andrew Ng 21/09) contre les 9 criteres d'origine.

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
];

const dire = (bon, nom, detail) => ({ bon, nom, detail });

/**
 * Mesure les douze criteres sur le corps deja extrait (frontmatter retire). Fonction
 * pure : aucune lecture de fichier, aucun exit -- pour rester testable par import direct.
 * Retourne { resultats, passes, total }.
 */
export function verifierTexte(corps) {
  const lignes = corps.split("\n");
  const resultats = [];

  // En points de code, sans les asterisques du markdown : une lettre en gras Unicode
  // occupe deux unites UTF-16, donc `.length` compterait une accroche de 110 signes
  // pour 193 et la refuserait a tort (mesure du 18/09/2026).
  const accroche = lignes[0].replace(/\*\*/g, "");
  const tailleAccroche = [...accroche].length;
  resultats.push(dire(tailleAccroche <= 140, "accroche <= 140 caracteres", `${tailleAccroche} caracteres`));
  const finAccroche = accroche.trim().replace(/\*\*/g, "").slice(-1);
  resultats.push(dire(finAccroche === "?", "accroche formulee en question", finAccroche === "?" ? "finit par ?" : "pas de point d'interrogation"));

  // Garde-fou anti-degenerescence : ne mesure PAS si le hook est "irresistible" (ca
  // reste un jugement de Julien, voir SKILL.md) -- attrape seulement le cas ou
  // l'accroche est vide ou reduite a un fragment ("?" seul passait les deux controles
  // ci-dessus avant ce critere). Trois mots est un plancher deliberement bas : il ne
  // pretend mesurer aucune force, juste l'absence d'un hook degenere.
  const motsAccroche = accroche.replace(/\*\*/g, "").trim().split(/\s+/).filter(Boolean);
  resultats.push(dire(motsAccroche.length >= 3, "accroche non degeneree (3 mots mini)", `${motsAccroche.length} mot(s)`));

  const nu = [...corps.replace(/\*\*/g, "")].length;
  resultats.push(dire(nu >= 1300 && nu <= 1900, "longueur 1300-1900", `${nu} caracteres`));

  // Deux formes acceptees pour compter un gras : le markdown, et le gras Unicode deja
  // converti -- dans l'une ou l'autre police (voir UNICODE_GRAS plus haut).
  const gras = [...corps.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1])
    .concat((corps.match(UNICODE_GRAS) || []).map((s) => s.trim()).filter(Boolean).filter(contientUnVraiGras));
  resultats.push(dire(gras.length >= 8, "au moins 8 passages en gras", `${gras.length} trouve(s)`));
  const fautifs = gras.filter((g) => ACCENTUE.test(g.replace(EMOJI_G, "").replace(UNICODE_GRAS, "")));
  resultats.push(dire(fautifs.length === 0, "aucun gras accentue", fautifs.length ? fautifs.join(" | ") : "tous sans accent"));

  // Nouveau critere (22/09/2026) : le gras deja converti doit etre dans la police que
  // Julien a choisie (Sans-Serif Bold), pas l'autre (voir SERIF plus haut). Un
  // segment en markdown **ainsi** n'est pas concerne, il n'est pas encore converti.
  const segmentsSerif = (corps.match(UNICODE_GRAS_SERIF_RUN) || []).map((s) => s.trim()).filter(Boolean).filter(contientUnVraiGras);
  resultats.push(dire(
    segmentsSerif.length === 0,
    "gras dans la bonne police (Sans-Serif Bold)",
    segmentsSerif.length ? `Mathematical Bold (avec empattement) trouve : ${segmentsSerif.join(" | ")}` : "aucun gras serif"
  ));

  const titre = new RegExp(`^${EMOJI.source}\\s+(\\*\\*[^*]+\\*\\*|[${PLAGE_SANS_SERIF}${PLAGE_SERIF}${PONCTUATION_RUN}\\u0020]+)\\s*$`, "u");
  const titres = lignes.filter((l) => titre.test(l));
  resultats.push(dire(titres.length === 3, "trois titres de section en gras", titres.length ? titres.join(" / ") : "aucun"));

  const emojis = corps.match(EMOJI_G) || [];
  resultats.push(dire(emojis.length >= 3 && emojis.length <= 6, "3 a 6 emojis", `${emojis.length} trouve(s)`));
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
  const interditTrouve = INTERDITS.find(({ regex }) => regex.test(corps));
  resultats.push(dire(
    !interditTrouve && !compactTrouve,
    "aucune formulation interdite",
    compactTrouve
      ? `${compactTrouve.motif}, meme espacee/ponctuee pour contourner la detection`
      : interditTrouve
        ? `${interditTrouve.motif} -- "${corps.match(interditTrouve.regex)[0]}"`
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

  const passes = resultats.filter((r) => r.bon).length;
  return { resultats, passes, total: resultats.length };
}
