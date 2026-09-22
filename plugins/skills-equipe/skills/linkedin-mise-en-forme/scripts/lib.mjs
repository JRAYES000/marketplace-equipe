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
const PLAGE_SANS_SERIF = "\\u{1D5D4}-\\u{1D607}\\u{1D7EC}-\\u{1D7F5}";
const PLAGE_SERIF = "\\u{1D400}-\\u{1D433}\\u{1D7CE}-\\u{1D7D7}";
export const UNICODE_GRAS = new RegExp(`[${PLAGE_SANS_SERIF}${PLAGE_SERIF}\\u0020]+`, "gu");
// Sert a REPERER un usage de l'AUTRE police (serif), non conforme a la regle de Julien.
export const UNICODE_GRAS_SERIF = new RegExp(`[${PLAGE_SERIF}]`, "u");
const UNICODE_GRAS_SERIF_RUN = new RegExp(`[${PLAGE_SERIF}\\u0020]+`, "gu");

// Formulations interdites -- reprises telles quelles de
// linkedin-carrousel/lib/valider-post.js (meme motif, meme retour de Julien du
// 10/09/2026 section 3) : pas de code partage entre skills dans ce depot (convention
// deja en usage, voir valider-orthographe.js duplique dans les 3 paquets), donc
// dupliquees ici plutot qu'importees. Aucune formulation nouvelle inventee pour cette
// skill : seules celles deja eprouvees par Julien sur linkedin-carrousel.
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
    .concat((corps.match(UNICODE_GRAS) || []).map((s) => s.trim()).filter(Boolean));
  resultats.push(dire(gras.length >= 8, "au moins 8 passages en gras", `${gras.length} trouve(s)`));
  const fautifs = gras.filter((g) => ACCENTUE.test(g.replace(EMOJI_G, "").replace(UNICODE_GRAS, "")));
  resultats.push(dire(fautifs.length === 0, "aucun gras accentue", fautifs.length ? fautifs.join(" | ") : "tous sans accent"));

  // Nouveau critere (22/09/2026) : le gras deja converti doit etre dans la police que
  // Julien a choisie (Sans-Serif Bold), pas l'autre (voir SERIF plus haut). Un
  // segment en markdown **ainsi** n'est pas concerne, il n'est pas encore converti.
  const segmentsSerif = (corps.match(UNICODE_GRAS_SERIF_RUN) || []).map((s) => s.trim()).filter(Boolean);
  resultats.push(dire(
    segmentsSerif.length === 0,
    "gras dans la bonne police (Sans-Serif Bold)",
    segmentsSerif.length ? `Mathematical Bold (avec empattement) trouve : ${segmentsSerif.join(" | ")}` : "aucun gras serif"
  ));

  const titre = new RegExp(`^${EMOJI.source}\\s+(\\*\\*[^*]+\\*\\*|[${PLAGE_SANS_SERIF}${PLAGE_SERIF}\\u0020]+)\\s*$`, "u");
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
  const interditTrouve = INTERDITS.find(({ regex }) => regex.test(corps));
  resultats.push(dire(
    !interditTrouve,
    "aucune formulation interdite",
    interditTrouve ? `${interditTrouve.motif} -- "${corps.match(interditTrouve.regex)[0]}"` : "aucune trouvee"
  ));

  const passes = resultats.filter((r) => r.bon).length;
  return { resultats, passes, total: resultats.length };
}
