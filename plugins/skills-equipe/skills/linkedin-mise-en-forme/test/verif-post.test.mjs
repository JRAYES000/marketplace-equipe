import test from "node:test";
import assert from "node:assert/strict";
import { enGras, verifierTexte, motsAccentManquantCorps, schemaPost, memeSchema, varieteSur } from "../scripts/lib.mjs";

// Fabrique du Mathematical Bold AVEC empattement (bases documentees dans lib.mjs,
// SERIF) -- sert uniquement a construire des fixtures de test pour la mauvaise police,
// jamais utilisee en production (enGras() ne produit que du Sans-Serif Bold).
const BASES_SERIF = [
  [0x41, 0x5a, 0x1d400],
  [0x61, 0x7a, 0x1d41a],
  [0x30, 0x39, 0x1d7ce],
];
const enGrasSerif = (s) => [...s].map((c) => {
  const p = c.codePointAt(0);
  const b = BASES_SERIF.find(([d, f]) => p >= d && p <= f);
  return b ? String.fromCodePoint(b[2] + (p - b[0])) : c;
}).join("");

// Fixture "conforme" : construite pour ce test, pas un vrai post publie -- passe
// mecaniquement tous les criteres. Sert de reference : toute regression sur un critere
// existant doit d'abord casser ce test-la. Depuis le 30/09/2026 : accroche libre (ici une
// question, mais rien ne l'impose), titres de bloc sans gras ni emoji impose, 2 gras au maximum.
const CONFORME = [
  "Et si votre processus de recrutement faisait fuir vos meilleurs candidats sans que vous le voyiez ?",
  "",
  "\u{1F449} Le constat",
  "",
  "Un **processus trop lent** coute des candidats avant meme l'offre. Personne ne s'en rend compte a temps.",
  "",
  "\u{26A1} Trois gestes",
  "",
  "On evite les questions qui reviennent sans cesse. On repond sous deux jours. On explique chaque etape.",
  "",
  "\u{2705} Ce qui reste",
  "",
  "Le **silence total suivant l'entretien** cree plus de degats que n'importe quel refus explique. Voici " +
    "Ce post sert uniquement de gabarit de test pour verifier automatiquement les regles de forme. ".repeat(9).trim(),
  "",
  "Les trois signes utiles tiennent en une phrase, et dix minutes suffisent pour les corriger.",
].join("\n");

const critere = (corps, nom, opts) => verifierTexte(corps, opts).resultats.find((x) => x.nom === nom);

test("fixture conforme : 14/14 criteres passes", () => {
  const { resultats, passes, total } = verifierTexte(CONFORME);
  assert.equal(total, 14);
  assert.equal(passes, 14, resultats.filter((r) => !r.bon).map((r) => `${r.nom}: ${r.detail}`).join("; "));
});

test("enGras fabrique du Sans-Serif Bold, jamais l'autre police -- verifie par point de code", () => {
  // A -> U+1D5D4 (debut du bloc Sans-Serif Bold majuscules), a -> U+1D5EE, 0 -> U+1D7EC :
  // les trois bases documentees dans lib.mjs (SANS_SERIF).
  assert.equal(enGras("A").codePointAt(0), 0x1d5d4);
  assert.equal(enGras("a").codePointAt(0), 0x1d5ee);
  assert.equal(enGras("0").codePointAt(0), 0x1d7ec);
  assert.equal(enGras(" ").codePointAt(0), 0x20);
  // Round-trip : un texte passe en gras puis compte par verifierTexte doit etre reconnu
  // comme un gras existant, dans la BONNE police.
  const corps = CONFORME.replace("**processus trop lent**", enGras("processus trop lent"));
  const { resultats } = verifierTexte(corps);
  const gras = resultats.find((x) => x.nom === "gras : 2 passages au maximum");
  assert.equal(gras.bon, true);
  assert.equal(gras.detail, "2 trouve(s)", "le gras converti est bien compte, comme le markdown");
  assert.equal(resultats.find((x) => x.nom === "gras dans la bonne police (Sans-Serif Bold)").bon, true);
});

test("accroche > 140 caracteres refusee", () => {
  const corps = CONFORME.replace(
    CONFORME.split("\n")[0],
    "Et si votre processus de recrutement au sens le plus large et le plus complet qui soit faisait vraiment fuir absolument tous vos meilleurs candidats sans que vous le voyiez jamais ?"
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "accroche <= 140 caracteres");
  assert.equal(r.bon, false);
});

// Consigne de Julien du 29/09/2026 : l'accroche peut etre une question, une prise de position,
// un chiffre ou une situation concrete -- plus aucun controle sur sa forme.
test("accroche libre : prise de position, chiffre et situation concrete passent, question non imposee", () => {
  const accroches = [
    "Un recrutement lent coute plus cher qu'une mauvaise embauche.",
    "Trois candidats sur quatre attendent une reponse sous deux semaines.",
    "Lundi matin, un candidat a relance mon equipe pour la quatrieme fois.",
  ];
  for (const a of accroches) {
    const corps = CONFORME.replace(CONFORME.split("\n")[0], a);
    const { resultats } = verifierTexte(corps);
    assert.equal(resultats.some((x) => /question/.test(x.nom)), false, "plus de critere 'question'");
    assert.equal(critere(corps, "accroche non degeneree (3 mots mini)").bon, true, a);
    assert.equal(critere(corps, "accroche <= 140 caracteres").bon, true, a);
  }
});

test("accroche degeneree (un seul mot) refusee -- ne mesure pas la force du hook, juste son absence", () => {
  const corps = ["**Vraiment ?**", ...CONFORME.split("\n").slice(1)].join("\n");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "accroche non degeneree (3 mots mini)");
  assert.equal(r.bon, false);
  assert.equal(r.detail, "2 mot(s)");
});

test("longueur hors fourchette 1300-1900 refusee", () => {
  const corpsCourt = "**Et si ce post etait trop court pour convaincre qui que ce soit ?**\n\nTrop court.";
  const { resultats } = verifierTexte(corpsCourt);
  const r = resultats.find((x) => x.nom === "longueur 1300-1900");
  assert.equal(r.bon, false);
});

// Consigne du 29/09/2026 : 1 ou 2 phrases importantes en gras par post au maximum
// (remplace "au moins huit").
test("plus de 2 passages en gras refuse, 1 ou 2 acceptes", () => {
  const troisGras = CONFORME.replace("dix minutes suffisent", "**dix minutes suffisent**");
  const r = critere(troisGras, "gras : 2 passages au maximum");
  assert.equal(r.bon, false);
  assert.equal(r.detail, "3 trouve(s)");
  const unGras = CONFORME.replace("**silence total suivant l'entretien**", "silence total suivant l'entretien");
  assert.equal(critere(unGras, "gras : 2 passages au maximum").bon, true);
  assert.equal(critere(CONFORME, "gras : 2 passages au maximum").bon, true);
});

test("plus de 2 passages en gras refuse aussi quand le gras est deja converti en Unicode", () => {
  const corps = CONFORME
    .replace("**processus trop lent**", enGras("processus trop lent"))
    .replace("**silence total suivant l'entretien**", enGras("silence total suivant l'entretien"))
    .replace("dix minutes suffisent", enGras("dix minutes suffisent"));
  assert.equal(critere(corps, "gras : 2 passages au maximum").bon, false);
});

test("un gras accentue est refuse", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**procédé trop lent**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun gras accentue");
  assert.equal(r.bon, false);
  assert.match(r.detail, /procédé trop lent/);
});

// Bug reel trouve le 22/09/2026 en verifiant les posts Bernard Marr (18/09) et Andrew
// Ng (21/09) deja publies : leur gras est dans Mathematical Bold AVEC empattement
// (celle que produit linkedin-carrousel/lib/valider-post.js), pas dans la Sans-Serif
// Bold que fabrique enGras() ici -- verif-post.mjs les comptait comme "0 gras trouve"
// avant ce correctif. Voir lib.mjs (SERIF) pour le detail des deux blocs Unicode.
test("un gras dans l'autre police (Mathematical Bold avec empattement) est repere, pas confondu avec un accent", () => {
  // "deux briques", exactement le segment reel du post Andrew Ng (21/09/2026),
  // Mathematical Bold avec empattement (U+1D400), pas Sans-Serif Bold.
  const segmentSerif = enGrasSerif("deux briques");
  const corps = CONFORME.replace("**processus trop lent**", segmentSerif);
  const { resultats } = verifierTexte(corps);
  const gras = resultats.find((x) => x.nom === "gras : 2 passages au maximum");
  const accent = resultats.find((x) => x.nom === "aucun gras accentue");
  const police = resultats.find((x) => x.nom === "gras dans la bonne police (Sans-Serif Bold)");
  assert.equal(gras.bon, true, "le gras serif compte bien comme un gras existant");
  assert.equal(accent.bon, true, "le gras serif n'est pas confondu avec un accent");
  assert.equal(police.bon, false, "mais la mauvaise police est signalee");
  assert.match(police.detail, /empattement/);
});

test("les deux vrais posts de veille deja publies restent sous le seuil (regression, mesure du 22/09/2026)", () => {
  // Textes reels, lus sur LinkedIn (Andrew Ng) et via Buffer (Bernard Marr) le
  // 21-22/09/2026 -- avant l'existence de cette skill de mise en forme (creee le
  // 18/09/2026 mais jamais chargee par le pipeline de veille, voir le rapport). Fige
  // ici pour ne pas regresser sur le correctif "police de gras" ci-dessus.
  const andrewNg = [
    "Qui audite le logiciel qui entoure votre modèle d'IA ? \u{1F9D0}",
    "",
    "Andrew Ng vient de publier une nouvelle version d'OpenWorker, un agent open source qui ne se contente pas de discuter : il exécute des tâches directement sur votre ordinateur.",
    "",
    `Selon lui, faire tourner un agent IA demande ${enGrasSerif("deux briques")} : un modele, et le logiciel qui l'entoure.`,
  ].join("\n");
  const { resultats } = verifierTexte(andrewNg);
  const police = resultats.find((x) => x.nom === "gras dans la bonne police (Sans-Serif Bold)");
  assert.equal(police.bon, false);
  assert.match(police.detail, /deux briques|empattement/);
});

// Consigne du 29/09/2026 : 1, 2, 3 ou 4 blocs, avec ou sans titre, plus d'emojis imposes.
test("un post sans aucun titre et sans emoji est accepte (1 bloc)", () => {
  const corps = CONFORME.replace(/^[\u{1F449}\u{26A1}\u{2705}] [^\n]+\n\n/gmu, "");
  const { resultats } = verifierTexte(corps);
  assert.equal(critere(corps, "4 blocs a titre au maximum").bon, true);
  assert.equal(critere(corps, "6 emojis au maximum").detail, "0 trouve(s)");
  assert.equal(schemaPost(corps).blocs, 1);
});

test("plus de 4 titres de bloc en gras refuse, 4 acceptes", () => {
  const titre = (t) => `\u{1F449} ${enGras(t)}\n\nUne phrase courte.\n\n`;
  const avec = (n) => "Une accroche de trois mots ou plus ?\n\n" + [...Array(n).keys()].map((i) => titre(`Bloc ${i + 1}`)).join("");
  assert.equal(critere(avec(4), "4 blocs a titre au maximum").bon, true);
  assert.equal(schemaPost(avec(4)).blocs, 4);
  assert.equal(critere(avec(5), "4 blocs a titre au maximum").bon, false);
});

test("plus de 6 emojis refuse, 3 emojis ou moins acceptes", () => {
  const corps = CONFORME.replace(
    "Les trois signes utiles",
    ["\u{1F449}", "\u{26A1}", "\u{2705}", "\u{1F4A1}"].map((e) => `${e} Un point.\n\n`).join("") + "Les trois signes utiles"
  );
  const r = critere(corps, "6 emojis au maximum");
  assert.equal(r.bon, false);
  assert.equal(r.detail, "7 trouve(s)");
  assert.equal(critere(CONFORME, "6 emojis au maximum").bon, true);
});

test("un emoji hors tete de ligne refuse", () => {
  const corps = CONFORME.replace(
    "Un **processus trop lent** coute",
    "Un **processus trop lent** \u{1F449} coute"
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "emojis en tete de ligne");
  assert.equal(r.bon, false);
});

test("une phrase de plus de 20 mots refusee", () => {
  const phraseLongue = "On " + "vraiment ".repeat(22) + "explique chaque etape.";
  const corps = CONFORME.replace(
    "On explique chaque etape.",
    phraseLongue
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucune phrase > 20 mots");
  assert.equal(r.bon, false);
});

// Nouveau critere (22/09/2026) : banque reprise telle quelle de
// linkedin-carrousel/lib/valider-post.js (meme motif, meme retour de Julien du
// 10/09/2026) -- voir lib.mjs, INTERDITS. Un seul cas suffit a couvrir le mecanisme ;
// les neuf autres entrees partagent le meme code de detection.
test("une formulation interdite (banque reprise de linkedin-carrousel) est refusee", () => {
  const corps = CONFORME.replace(
    "Personne ne s'en rend compte a temps.",
    "Personne ne s'en rend compte a temps. Commentez OUI si vous etes concerne."
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucune formulation interdite");
  assert.equal(r.bon, false);
  assert.match(r.detail, /engagement/);
});

// Bug reel trouve le 22/09/2026 en rebranchant linkedin-veille-virale sur cette skill :
// un titre "Ce qui a change" passait, mais "Ce que j'en retiens" non -- l'apostrophe,
// une fois le titre converti en gras Unicode, coupait le run en deux et le regex de
// titre (qui exige un seul run contigu jusqu'a la fin de ligne) ne matchait plus rien.
test("un titre en gras Unicode contenant une apostrophe est reconnu comme un titre de bloc", () => {
  const titreConverti = "\u{1F4BC} " + enGras("Ce que j'en retiens");
  const corps = CONFORME.replace("\u{2705} Ce qui reste", titreConverti);
  const r = critere(corps, "4 blocs a titre au maximum");
  assert.equal(r.bon, true, r.detail);
  assert.equal(r.detail, titreConverti, "le titre avec apostrophe est vu comme UN titre, pas coupe en deux");
  assert.equal(schemaPost(corps).blocs, 1);
});

// Meme correctif, envers oppose : une apostrophe de texte COURANT (donc jamais grasse,
// ex. "l'offre" en clair dans le corps) ne doit pas se compter comme un passage en gras
// a elle seule -- regression trouvee en corrigeant le cas ci-dessus (l'apostrophe avait
// ete ajoutee sans filtre a la plage UNICODE_GRAS, gonflant artificiellement le compte).
test("une apostrophe de texte courant, hors de tout gras, ne compte jamais comme un passage en gras", () => {
  const corps = CONFORME.replace(
    "coute des candidats avant meme l'offre",
    "coute des candidats avant meme l'offre, qu'il s'agisse d'un stage ou d'un poste"
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "gras : 2 passages au maximum");
  assert.equal(r.detail, "2 trouve(s)", "les apostrophes de texte courant ajoutees ne doivent pas faire monter le compte");
});

// Nouveau critere (22/09/2026, trouve par test adversarial demande par Nomena) : reprise
// de linkedin-carrousel/lib/valider-post.js (validerChiffreSource). Avant ce critere, un
// chiffre-preuve invente passait les douze criteres existants sans qu'aucun ne verifie le
// sourcage -- verifie reellement avec "40% des recruteurs..., sans aucune source" (passait
// 12/12 avant ce correctif).
test("un chiffre-preuve (pourcentage) sans source est refuse", () => {
  const corps = CONFORME.replace(
    "Personne ne s'en rend compte a temps.",
    "Personne ne s'en rend compte a temps. 40% des recruteurs le confirment."
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun chiffre sans source");
  assert.equal(r.bon, false);
  assert.match(r.detail, /40.*sans source/);
});

test("un chiffre-preuve avec une source collee (source : ...) est accepte", () => {
  const corps = CONFORME.replace(
    "Personne ne s'en rend compte a temps.",
    "Personne ne s'en rend compte a temps. 40% des recruteurs le confirment (source : Bpifrance Le Lab, 2025)."
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun chiffre sans source");
  assert.equal(r.bon, true, r.detail);
});

// Bug reel trouve PENDANT le portage de ce critere (22/09/2026) : reutiliser les plages
// gras completes (qui couvrent aussi les LETTRES) pour reperer un "chiffre" faisait
// matcher des mots entiers en gras ("offres", "en") comme des chiffres -- corrige avec
// une plage chiffres-seuls dediee (PLAGE_CHIFFRES).
test("un mot en gras n'est jamais confondu avec un chiffre", () => {
  const corps = CONFORME.replace(
    "**processus trop lent**",
    "**seize mille cinq cents offres**"
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun chiffre sans source");
  assert.equal(r.bon, true, r.detail);
});

// Bornes exactes de la fourchette de longueur -- jamais testees explicitement avant
// l'audit adversarial du 22/09/2026. Le code (`nu >= 1300 && nu <= 1900`) inclut les deux
// bornes ; verifie ici caractere pres, pas approxime.
test("la fourchette de longueur inclut ses deux bornes (1300 et 1900 passent, 1299 et 1901 refusent)", () => {
  const auBout = (n) => {
    const codepoints = [...CONFORME];
    let corps = codepoints.slice(0, Math.min(n + 20, codepoints.length)).join("");
    let nu = [...corps.replace(/\*\*/g, "")].length;
    while (nu < n) { corps += "x"; nu++; }
    while (nu > n) { corps = corps.slice(0, -1); nu = [...corps.replace(/\*\*/g, "")].length; }
    return corps;
  };
  const attendu = { 1299: false, 1300: true, 1900: true, 1901: false };
  for (const [n, ok] of Object.entries(attendu)) {
    const corps = auBout(Number(n));
    const { resultats } = verifierTexte(corps);
    const r = resultats.find((x) => x.nom === "longueur 1300-1900");
    assert.equal(r.bon, ok, `attendu a ${n} caracteres : ${ok}, obtenu : ${r.bon} (${r.detail})`);
  }
});

// Confirme un comportement VOULU, pas un bug : le controle "accroche formulee en question"
// est mecanique et ne restreint aucune langue -- verifie a la demande de l'audit
// adversarial du 22/09/2026 ("une accroche en anglais passe-t-elle a tort ?"). Reponse :
// elle passe, et c'est le comportement prevu (aucune regle de langue dans le SKILL.md).
// Bug reel trouve par test adversarial le 22/09/2026 (meme trou trouve et corrige le
// meme jour dans linkedin-carrousel, source de cette banque) : le separateur entre
// "commentez" et "oui" n'etait reconnu qu'en espace(s) simple(s).
test("\"commentez OUI\" espacee lettre par lettre, ou separee par un tiret/de la ponctuation, reste refusee", () => {
  const cas = [
    "C O M M E N T E Z   O U I si concerne.",
    "commentez-oui si concerne.",
    "commentez : oui si concerne.",
  ];
  for (const variante of cas) {
    const corps = CONFORME.replace(
      "Personne ne s'en rend compte a temps.",
      `Personne ne s'en rend compte a temps. ${variante}`
    );
    const { resultats } = verifierTexte(corps);
    const r = resultats.find((x) => x.nom === "aucune formulation interdite");
    assert.equal(r.bon, false, `variante non detectee : "${variante}"`);
  }
});

test("un texte qui contient reellement \"commentez\" et \"oui\" sans lien entre eux n'est pas refuse a tort", () => {
  const corps = CONFORME.replace(
    "Personne ne s'en rend compte a temps.",
    "Personne ne s'en rend compte a temps. Vous pouvez commentez si vous le souhaitez, ou repondre oui plus tard."
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucune formulation interdite");
  assert.equal(r.bon, true, r.detail);
});

// Nouveau critere (28/09/2026) : garde-fou demande par Julien apres 3 incidents reels sur
// des posts publies avec un accent retire dans le gras pour un mot qui n'existe QUE sous
// sa forme accentuee ("dependance", "coute", "defaillance"), plus "declarent" trouve dans
// la meme relecture. Les 4 cas sont rejoues ici mot pour mot, jamais paraphrases.
test("un gras contenant \"dependance\" (mot valide seulement accentue : dependance) est refuse", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**la dependance au meme outil**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, false);
  assert.match(r.detail, /dependance/);
  assert.match(r.detail, /d[ée]pendance/);
});

test("un gras contenant \"coute\" (mot valide seulement accentue : coute) est refuse", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**ca coute cher**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, false);
  assert.match(r.detail, /"coute"/);
  assert.match(r.detail, /co[uû]te/);
});

test("un gras contenant \"defaillance\" (mot valide seulement accentue : defaillance) est refuse", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**un point de defaillance**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, false);
  assert.match(r.detail, /defaillance/);
  assert.match(r.detail, /d[ée]faillance/);
});

test("un gras contenant \"declarent\" (mot valide seulement accentue : declarent) est refuse", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**ils declarent tout**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, false);
  assert.match(r.detail, /declarent/);
  assert.match(r.detail, /d[ée]clarent/);
});

test("un mot sans accent qui n'existe pas en francais accentue (anglicisme, nom propre) n'est pas signale a tort", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**Claude Partners et le processus**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, true, r.detail);
});

test("un mot deja accentue correctement dans le gras (donc deja refuse par \"aucun gras accentue\") n'est pas en plus signale ici", () => {
  const corps = CONFORME.replace("**processus trop lent**", "**la dépendance au même outil**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, true, r.detail);
});

test("une accroche redigee dans une autre langue que le francais passe (comportement voulu, pas une faille)", () => {
  const corps = CONFORME.replace(
    CONFORME.split("\n")[0],
    "Why do your best candidates disappear before the offer even arrives ?"
  );
  assert.equal(critere(corps, "accroche non degeneree (3 mots mini)").bon, true);
  assert.equal(critere(corps, "accroche <= 140 caracteres").bon, true);
});

// Consigne du 29/09/2026 : trois tournures interdites de plus. Rejouees telles quelles, y
// compris converties en gras Unicode (le gras ne doit pas les faire echapper).
test("« Notre lecture : », « Testons-la. » et « Suivons son regard. » sont refuses, en clair comme en gras", () => {
  const cas = [
    ["Notre lecture : le delai tue la confiance.", /Notre lecture/],
    ["Testons-la.", /Testons-la/],
    ["Suivons son regard.", /Suivons son regard/],
    [enGras("Notre lecture") + " : le delai tue la confiance.", /Notre lecture/],
    [enGras("Testons-la") + ".", /Testons-la/],
    [enGras("Suivons son regard") + ".", /Suivons son regard/],
  ];
  for (const [phrase, motif] of cas) {
    const corps = CONFORME.replace("Personne ne s'en rend compte a temps.", `Personne ne s'en rend compte a temps. ${phrase}`);
    const r = critere(corps, "aucune formulation interdite");
    assert.equal(r.bon, false, `non refuse : ${phrase}`);
    assert.match(r.detail, motif);
  }
});

test("les mots de ces tournures, employes autrement, ne sont pas refuses a tort", () => {
  const corps = CONFORME.replace(
    "Personne ne s'en rend compte a temps.",
    "Personne ne s'en rend compte a temps. Nous testons cette lecture avec vous. Ils suivent son regard sur la salle."
  );
  assert.equal(critere(corps, "aucune formulation interdite").bon, true);
});

// Fin libre : « Et vous ? » n'est plus obligatoire, et n'est pas interdit non plus.
test("la fin est libre : ni « Et vous ? » ni question finale ne sont exigees, une question finale passe", () => {
  const sansQuestion = verifierTexte(CONFORME);
  assert.equal(sansQuestion.passes, sansQuestion.total);
  const avecQuestion = verifierTexte(CONFORME + "\n\nEt vous ?");
  assert.equal(avecQuestion.passes, avecQuestion.total, avecQuestion.resultats.filter((r) => !r.bon).map((r) => r.detail).join("; "));
});

// Regle du 29/09/2026 : jamais deux posts de suite sur un compte avec la meme accroche, le
// meme nombre de blocs et la meme fin.
const POST_A = "Un recrutement lent coute plus cher qu'une mauvaise embauche.\n\n\u{1F449} " + enGras("Le constat") + "\n\nTexte.\n\nEt vous ?";

test("schemaPost : type d'accroche, nombre de blocs, type de fin", () => {
  assert.deepEqual(schemaPost(POST_A), { accroche: "affirmation", blocs: 1, fin: "question" });
  assert.deepEqual(schemaPost("Trois candidats sur quatre partent ?\n\nTexte.\n\nSource : Insee, 2026"), { accroche: "question", blocs: 1, fin: "affirmation" });
  assert.deepEqual(schemaPost("Un chiffre : 40 jours.\n\nTexte.\n\nclaudeagency.fr"), { accroche: "chiffre", blocs: 1, fin: "lien" });
});

test("memeSchema : identique seulement si accroche, blocs ET fin sont identiques", () => {
  const b = POST_A.replace("Un recrutement lent coute plus cher qu'une mauvaise embauche.", "Personne ne relance vos candidats.");
  assert.equal(memeSchema(POST_A, b), true, "meme type d'accroche, 1 bloc, meme fin");
  assert.equal(memeSchema(POST_A, b.replace("Personne ne relance vos candidats.", "Qui relance vos candidats ?")), false, "accroche differente");
  assert.equal(memeSchema(POST_A, b.replace("Et vous ?", "Voila.")), false, "fin differente");
  assert.equal(memeSchema(POST_A, b.replace("\u{1F449} " + enGras("Le constat") + "\n\nTexte.", "\u{1F449} " + enGras("Un") + "\n\nA.\n\n\u{26A1} " + enGras("Deux") + "\n\nB.")), false, "nombre de blocs different");
});

test("verifierTexte avec le post precedent : refuse un schema identique, accepte un schema different, ne mesure rien sans precedent", () => {
  const meme = critere(CONFORME, "schema different du post precedent", { precedent: CONFORME });
  assert.equal(meme.bon, false);
  assert.match(meme.detail, /identique au post precedent/);
  const autre = critere(CONFORME, "schema different du post precedent", { precedent: POST_A });
  assert.equal(autre.bon, true, autre.detail);
  assert.equal(verifierTexte(CONFORME).resultats.some((x) => x.nom === "schema different du post precedent"), false);
  assert.equal(verifierTexte(CONFORME, { precedent: CONFORME }).total, 15);
});

// Critere 15 (29/09/2026) : anglicismes, liste PARTAGEE avec linkedin-carrousel.
const anglicisme = (corps) => verifierTexte(corps).resultats.find((x) => x.nom === "aucun anglicisme");

test("anglicismes : « process » refuse, avec le mot fautif et son equivalent francais", () => {
  const r = anglicisme(CONFORME.replace("**processus trop lent**", "**process trop lent**"));
  assert.equal(r.bon, false);
  assert.match(r.detail, /"process" \(dites plutot "processus"\)/);
});

test("anglicismes : « deadline » et « feedback » refuses, equivalents nommes", () => {
  const d = anglicisme(CONFORME.replace("Personne ne s'en rend compte", "La deadline tombe. Personne ne s'en rend compte"));
  assert.equal(d.bon, false);
  assert.match(d.detail, /"deadline" \(dites plutot "date limite"\)/);
  const f = anglicisme(CONFORME.replace("On repond sous deux jours", "On repond au feedback sous deux jours"));
  assert.equal(f.bon, false);
  assert.match(f.detail, /"feedback" \(dites plutot "retour"\)/);
});

test("anglicismes : « process » deja converti en gras Unicode n'echappe pas au controle", () => {
  const r = anglicisme(CONFORME.replace("**processus trop lent**", enGras("process trop lent")));
  assert.equal(r.bon, false);
});

test("anglicismes : « processus » (bon mot) et post propre passent", () => {
  assert.equal(anglicisme(CONFORME).bon, true);
});

test("anglicismes : la liste utilisee est celle du carrousel, pas une copie", async () => {
  const { ANGLICISMES_VERS_FRANCAIS } = (await import("node:module")).createRequire(import.meta.url)("../../linkedin-carrousel/lib/valider-anglicismes.js");
  for (const [mot, attendu] of Object.entries(ANGLICISMES_VERS_FRANCAIS)) {
    const r = anglicisme(`${CONFORME}
Le ${mot} ici.`);
    assert.equal(r.bon, false, mot);
    assert.ok(r.detail.includes(`"${attendu}"`), `${mot} -> ${attendu}`);
  }
});

// Cas reel du 29/09/2026 : la 1re ligne de A4 (linkedin/2026-09-28-30/a4.final.txt du depot
// livrables-Claude-Agency), tout en gras sans accent, avait obtenu 14/14. Trois trous cumules :
// "l'equipe" restait un seul mot (elision), "salarie"/"estime"/"sous-estime" existent aussi
// sans accent (homographes), et "a" (1 lettre) etait ignore. Texte rejoue mot pour mot.
const LIGNE_A4 = enGras("Confier l'IA a un seul salarie de l'equipe est-il un risque sous-estime ?");

test("A4 : la ligne reelle est refusee, avec \"a\", \"equipe\" et \"sous-estime\" nommes", () => {
  const fautifs = motsAccentManquantCorps(LIGNE_A4);
  const texte = fautifs.join(" ; ");
  assert.match(texte, /"a" \(accente attendu : "à"\)/);
  assert.match(texte, /"equipe" \(accente attendu : "équipe"/);
  assert.match(texte, /"sous-estime" \(accente attendu : "sous-estimé"\)/);
  // Et par le critere complet, sur un post par ailleurs conforme.
  const corps = CONFORME.replace(CONFORME.split("\n")[0], LIGNE_A4);
  const r = verifierTexte(corps).resultats.find((x) => x.nom === "aucun accent manquant dans le gras");
  assert.equal(r.bon, false, r.detail);
});

test("A4 : la meme ligne en markdown (**...**) est refusee de la meme facon", () => {
  const md = "**Confier l'IA a un seul salarie de l'equipe est-il un risque sous-estime ?**";
  assert.equal(motsAccentManquantCorps(md).length >= 3, true);
});

test("A4 corrigee (avec accents, hors gras sur les mots accentues) : plus de refus sur les mots autrefois manques", () => {
  const corrigee = enGras("Confier l'IA") + " à " + enGras("un seul") + " salarié de l'équipe, " + enGras("est-il un risque") + " sous-estimé ?";
  assert.deepEqual(motsAccentManquantCorps(corrigee), []);
});

// Accroches reelles de A6 et A7 (linkedin/2026-09-30/) : elles doivent PASSER. "peut-il",
// "a-t-il", "projet", "l'IA" sont les faux positifs a ne jamais produire.
test("A6 et A7 : les accroches reelles passent", () => {
  const a6 = enGras("Un dirigeant qui n'utilise jamais l'IA peut-il piloter un projet IA ?");
  const a7 = enGras("Un formateur qui cache son usage de l'IA a-t-il perdu la confiance de ses stagiaires ?");
  assert.deepEqual(motsAccentManquantCorps(a6), []);
  assert.deepEqual(motsAccentManquantCorps(a7), []);
});

test("pas de faux positifs : \"il a\", \"l'a\", \"a-t-il\", \"A4\", \"projet\", \"risque\" restent valides", () => {
  for (const phrase of [
    "Il a un projet",
    "L'IA a un risque",
    "Qui l'a vu ? Il l'a dit",
    "A-t-il un projet ?",
    "Le format A4 a un risque",
    "Savoir ce qu'elle a fait",
    "Tester un outil qui a de la valeur",
    "Elle a envie de tester",
    "Il a de la valeur",
    "Le tableau est vide",
  ]) {
    assert.deepEqual(motsAccentManquantCorps(enGras(phrase)), [], phrase);
  }
});

test("\"a\" pour \"à\" : devant un infinitif, en debut de phrase, et apres un infinitif sans sujet", () => {
  for (const phrase of ["Il reste a faire", "A quoi sert ce projet ?", "Confier l'IA a un stagiaire", "Le seul a savoir compter"]) {
    assert.equal(motsAccentManquantCorps(enGras(phrase)).length >= 1, true, phrase);
  }
});

test("participe en -e qui existe en -é : apres etre/avoir, et compose a prefixe en fin de propos", () => {
  for (const phrase of ["Le risque est sous-estime ?", "Ce choix est marque", "L'IA a change la donne", "Un risque sous-estime ?"]) {
    assert.equal(motsAccentManquantCorps(enGras(phrase)).length >= 1, true, phrase);
  }
  // Le meme mot, dans un emploi qui ne le rend pas participe, reste valide.
  for (const phrase of ["Un risque marque", "Une marque forte", "Il estime le risque"]) {
    assert.deepEqual(motsAccentManquantCorps(enGras(phrase)), [], phrase);
  }
});

test("mots en e- qui existent en é- : \"equipe\", \"etat\", \"ecole\", y compris apres une elision", () => {
  for (const phrase of ["L'equipe entiere", "Un etat des lieux", "Une ecole de commerce", "peut-etre demain"]) {
    assert.equal(motsAccentManquantCorps(enGras(phrase)).length >= 1, true, phrase);
  }
});

test("le contexte vient de la ligne entiere : un mot hors gras n'est jamais signale, meme sans accent", () => {
  assert.deepEqual(motsAccentManquantCorps("Confier l'IA a un seul salarie de l'equipe " + enGras("est-il un risque") + " ?"), []);
});

// Extension du 30/09/2026 : variete mesuree sur les 5 derniers posts du compte, pas seulement le
// precedent. `precedents` = du plus recent (rang 1) au plus ancien.
const NOM_VARIETE = "variete sur les 5 derniers posts";
// Post distinct a chaque appel : accroche, fin et gras propres a `id`, un seul bloc, pas de titre.
// Les six ids connus (NOMS) ont six schemas differents (accroche question/affirmation/chiffre x fin
// question/affirmation) ; un id inconnu prend le schema du premier. `accroche`, `fin` et `gras`
// remplacent le texte par defaut.
const NOMS = ["un", "deux", "trois", "quatre", "cinq", "six"];
const SCHEMAS = [["q", "q"], ["q", "a"], ["a", "q"], ["c", "q"], ["c", "a"], ["a", "a"]];
const ACCROCHES = {
  q: (id) => `Sujet ${id} : pourquoi personne ne repond aux relances de ${id} ?`,
  a: (id) => `Sujet ${id} : personne ne repond aux relances de ${id}.`,
  c: (id) => `Sujet ${id} : 3 relances sur 4 restent sans reponse chez ${id}.`,
};
const FINS = { q: (id) => `Question finale ${id} : et chez vous ?`, a: (id) => `Conclusion ${id} : voila ce qu'il faut retenir.` };
const distinct = (id, { accroche, fin, gras } = {}) => {
  const [a, f] = SCHEMAS[Math.max(0, NOMS.indexOf(id))];
  return [
    accroche ?? ACCROCHES[a](id),
    "",
    `Un **${gras ?? `point cle numero ${id}`}** change la suite. Le reste du texte est propre au post ${id}.`,
    "",
    fin ?? FINS[f](id),
  ].join("\n");
};
const CINQ = NOMS.slice(0, 5).map((id) => distinct(id));
const types = (v) => v.map((x) => [x.type, x.rang]);

test("varieteSur : cinq posts tous differents -> aucune violation, et aucune sans precedents", () => {
  assert.deepEqual(varieteSur(distinct("six"), CINQ), []);
  assert.deepEqual(varieteSur(distinct("six"), []), []);
});

test("varieteSur : schema identique a un post plus ancien que le precedent (rang 3) est repere avec son rang", () => {
  const lointain = distinct("x", { accroche: "Un constat net sur les relances sans reponse.", fin: "Voila la suite." });
  const cible = distinct("y", { accroche: "Un autre constat sur les delais sans reponse.", fin: "Voila autre chose." });
  const v = varieteSur(cible, [CINQ[0], CINQ[1], lointain, CINQ[3], CINQ[4]]);
  assert.deepEqual(types(v), [["schema", 3]]);
  assert.equal(memeSchema(cible, CINQ[0]), false, "le post precedent (rang 1) ne suffit pas a le voir");
});

test("varieteSur : memes trois premiers mots d'accroche, meme a rang 5, meme avec accents et gras Unicode", () => {
  const ancien = distinct("a", { accroche: "Une mission courte ne suffit pas ?" });
  const cible = distinct("b", { accroche: enGras("Une mission courte") + " change tout." });
  const v = varieteSur(cible, [...CINQ.slice(0, 4), ancien]);
  assert.deepEqual(types(v).filter(([t]) => t === "debut"), [["debut", 5]]);
  assert.equal(varieteSur(distinct("b", { accroche: "Une mission longue change tout." }), [ancien]).length, 0, "deux mots communs seulement : pas de doublon");
});

test("varieteSur : meme derniere ligne mot pour mot (accents et ponctuation ignores), sauf un lien ou une ligne Source", () => {
  const v = varieteSur(distinct("b", { fin: "Et vous, qu'en pensez-vous ?" }), [CINQ[0], distinct("c", { fin: "Et vous, qu’en pensez-vous ?" })]);
  assert.deepEqual(types(v).filter(([t]) => t === "fin"), [["fin", 2]]);
  const lien = distinct("d", { fin: "claudeagency.fr" });
  assert.equal(varieteSur(lien, [distinct("e", { fin: "claudeagency.fr" })]).some((x) => x.type === "fin"), false, "un lien repete n'est pas une phrase repetee");
  const source = distinct("f") + "\n\nSource : Insee, 2026";
  assert.equal(varieteSur(source, [distinct("g") + "\n\nSource : Insee, 2026"]).some((x) => x.type === "fin"), false);
});

test("varieteSur : meme phrase en gras (markdown ou Unicode, accents ignores), 2 mots minimum", () => {
  const ancien = distinct("a", { gras: "La relance qui change tout" });
  const cible = distinct("b", { gras: "La relance qui change tout" }).replace("**La relance qui change tout**", enGras("La relance qui change tout"));
  const v = varieteSur(cible, [CINQ[0], ancien]);
  assert.deepEqual(types(v).filter(([t]) => t === "gras"), [["gras", 2]]);
  assert.match(v.find((x) => x.type === "gras").detail, /relance qui change tout/i);
  assert.equal(varieteSur(distinct("b", { gras: "Jour" }), [distinct("a", { gras: "Jour" })]).some((x) => x.type === "gras"), false, "un seul mot : trop courant pour compter");
});

test("verifierTexte avec `precedents` : critere 16 nomme, le rang 1 nourrit aussi l'ancien critere, [] ne mesure rien", () => {
  const ok = verifierTexte(distinct("six"), { precedents: CINQ });
  const variete = ok.resultats.find((x) => x.nom === NOM_VARIETE);
  assert.equal(variete.bon, true, variete.detail);
  assert.match(variete.detail, /5 posts compares/);
  assert.equal(ok.resultats.some((x) => x.nom === "schema different du post precedent"), true);
  assert.equal(ok.total, verifierTexte(distinct("six")).total + 2);
  const lointain = distinct("x", { accroche: "Un constat net sur les relances sans reponse.", fin: "Voila la suite." });
  const ko = verifierTexte(distinct("y", { accroche: "Un autre constat sur les delais sans reponse.", fin: "Voila autre chose." }), { precedents: [CINQ[0], CINQ[1], lointain] });
  assert.equal(ko.resultats.find((x) => x.nom === "schema different du post precedent").bon, true);
  const v = ko.resultats.find((x) => x.nom === NOM_VARIETE);
  assert.equal(v.bon, false);
  assert.match(v.detail, /schema identique au post n°3/);
  const vide = verifierTexte(distinct("six"), { precedents: [] });
  assert.equal(vide.resultats.some((x) => x.nom === NOM_VARIETE), false);
  assert.equal(vide.total, verifierTexte(distinct("six")).total);
  const seul = verifierTexte(distinct("six"), { precedent: CINQ[0] });
  assert.equal(seul.resultats.some((x) => x.nom === NOM_VARIETE), false, "un seul precedent donne a la main : ancien critere seulement");
});
