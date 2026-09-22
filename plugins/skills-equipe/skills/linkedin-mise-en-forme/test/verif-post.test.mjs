import test from "node:test";
import assert from "node:assert/strict";
import { enGras, verifierTexte } from "../scripts/lib.mjs";

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
// mecaniquement les douze criteres. Sert de reference : toute regression sur un
// critere existant doit d'abord casser ce test-la.
const CONFORME = [
  "**Et si votre process de recrutement faisait fuir vos meilleurs candidats sans que vous le voyiez ?**",
  "",
  "\u{1F449} **Le constat**",
  "",
  "Un **process trop lent** coute des candidats avant meme l'offre. Personne ne s'en rend compte a temps.",
  "",
  "\u{26A1} **Trois gestes**",
  "",
  "On evite les **memes questions posees deux fois**. On repond sous 48 heures. On explique chaque etape.",
  "",
  "\u{2705} **Ce qui reste**",
  "",
  "Le **silence total apres l'entretien** cree plus de degats que n'importe quel refus explique. Voici " +
    "Ce post sert uniquement de gabarit de test pour verifier automatiquement les regles de forme. ".repeat(9).trim(),
  "",
  "Les **trois signes a reperer** tiennent en une phrase, et **dix minutes suffisent** pour les corriger.",
].join("\n");

test("fixture conforme : 12/12 criteres passes", () => {
  const { resultats, passes, total } = verifierTexte(CONFORME);
  assert.equal(total, 12);
  assert.equal(passes, 12, resultats.filter((r) => !r.bon).map((r) => `${r.nom}: ${r.detail}`).join("; "));
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
  const corps = CONFORME.replace("**process trop lent**", enGras("process trop lent"));
  const { resultats } = verifierTexte(corps);
  assert.equal(resultats.find((x) => x.nom === "au moins 8 passages en gras").bon, true);
  assert.equal(resultats.find((x) => x.nom === "gras dans la bonne police (Sans-Serif Bold)").bon, true);
});

test("accroche > 140 caracteres refusee", () => {
  const corps = CONFORME.replace(
    /^\*\*.+?\*\*/,
    `**${"Et si votre process de recrutement au sens le plus large et le plus complet qui soit faisait vraiment fuir absolument tous vos meilleurs candidats sans que vous le voyiez jamais ?"}**`
  );
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "accroche <= 140 caracteres");
  assert.equal(r.bon, false);
});

test("accroche qui ne finit pas par un point d'interrogation refusee", () => {
  const corps = CONFORME.replace("le voyiez ?**", "le voyiez.**");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "accroche formulee en question");
  assert.equal(r.bon, false);
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

test("moins de 8 passages en gras refuse", () => {
  const corps = CONFORME.replace(/\*\*(process trop lent)\*\*/, "$1")
    .replace(/\*\*(memes questions posees deux fois)\*\*/, "$1");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "au moins 8 passages en gras");
  assert.equal(r.bon, false);
});

test("un gras accentue est refuse", () => {
  const corps = CONFORME.replace("**process trop lent**", "**procédé trop lent**");
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
  const corps = CONFORME.replace("**process trop lent**", segmentSerif);
  const { resultats } = verifierTexte(corps);
  const gras = resultats.find((x) => x.nom === "au moins 8 passages en gras");
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

test("moins de 3 ou plus de 3 titres de section refuse", () => {
  const corps = CONFORME.replace("\u{2705} **Ce qui reste**\n\n", "");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "trois titres de section en gras");
  assert.equal(r.bon, false);
});

test("moins de 3 emojis refuse", () => {
  const corps = CONFORME
    .replace("\u{1F449} ", "")
    .replace("\u{26A1} ", "")
    .replace("\u{2705} ", "* ");
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "3 a 6 emojis");
  assert.equal(r.bon, false);
});

test("un emoji hors tete de ligne refuse", () => {
  const corps = CONFORME.replace(
    "Un **process trop lent** coute",
    "Un **process trop lent** \u{1F449} coute"
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
test("un titre en gras Unicode contenant une apostrophe est reconnu comme un titre valide", () => {
  const titreConverti = "\u{1F4BC} " + enGras("Ce que j'en retiens");
  const corps = CONFORME.replace("\u{2705} **Ce qui reste**", titreConverti);
  const { resultats } = verifierTexte(corps);
  const r = resultats.find((x) => x.nom === "trois titres de section en gras");
  assert.equal(r.bon, true, r.detail);
  assert.equal(r.detail.split(" / ").length, 3, r.detail);
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
  const r = resultats.find((x) => x.nom === "au moins 8 passages en gras");
  assert.equal(r.detail, "9 trouve(s)", "les apostrophes de texte courant ajoutees ne doivent pas faire monter le compte");
});
