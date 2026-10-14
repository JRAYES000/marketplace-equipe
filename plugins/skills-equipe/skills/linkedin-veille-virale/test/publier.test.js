'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { publierPost } = require('../lib/publier');

/**
 * Incident du 18/09/2026 : `publierPost` ne validait rien du tout avant
 * d'appeler Composio -- les trois posts deja publies (Codie Sanchez, Jason
 * Feifer, Justin Welsh) n'ont jamais pu passer par un controle de forme
 * verifie. Ces tests verifient que le refus arrive AVANT tout appel reseau :
 * aucun COMPOSIO_API_KEY n'est fourni ici, et le message d'erreur attendu
 * est celui du garde-fou de contenu (douze criteres de linkedin-mise-en-forme,
 * voir lib/valider-mise-en-forme.js -- remplace le 22/09/2026 le pont vers
 * linkedin-carrousel/lib/valider-post, qui n'en verifiait que 3), jamais
 * celui de `executerActionComposio` ("COMPOSIO_API_KEY manquant"), qui ne
 * peut apparaitre que si le garde-fou avait laisse passer le texte.
 */

// Depuis le 14/10/2026 (regles de Julien) : ni le gras ni une longueur de 1300-1900 ne sont plus
// exiges ; un exemple invente (regle 2) ou un lien dans le corps (regle 5) sont refuses, toujours
// avant tout appel reseau.
test('publierPost refuse un exemple invente avant tout appel reseau (regle 2 du 14/10/2026)', async () => {
  await assert.rejects(
    () => publierPost({
      authorUrn: 'urn:li:person:test',
      commentary: 'Un texte sans aucun gras.\n\nExemple inventé pour l\'illustration : un organisme hésite.',
    }),
    /regle 2/
  );
});

test('publierPost refuse un lien dans le corps avant tout appel reseau (regle 5 du 14/10/2026)', async () => {
  await assert.rejects(
    () => publierPost({
      authorUrn: 'urn:li:person:test',
      commentary: 'Une affirmation qui ouvre le post. **Un point cle** ressort du texte.\n\nLe lien : claudeagency.fr/diagnostic',
    }),
    /regle 5/
  );
});

test("publierPost refuse un commentary conforme aux onze autres criteres mais hors de la fourchette d'emojis", async () => {
  // Fixture d'origine verifiee le 22/09/2026 ; depuis le 30/09/2026 (gras limite a 2 par post,
  // plafond de 6 emojis), le refus se lit sur "6 emojis au maximum" (7 trouves), parmi d'autres
  // criteres que cette fixture ne cherche plus a isoler -- isole ce seul critere pour ne pas
  // rendre ce test fragile aux dix autres, contrairement a l'ancienne fixture (3 mots),
  // qui echouait simultanement sur la longueur, le gras et les titres et ne testait donc
  // plus vraiment "la fourchette d'emojis" depuis le passage aux douze criteres.
  const commentary = [
    "**Et si votre process de recrutement faisait fuir vos meilleurs candidats sans que vous le voyiez ?**",
    "",
    "\u{1F449} **Le constat**",
    "",
    "Un **process trop lent** coute des candidats avant meme l'offre. Personne ne s'en rend compte a temps.",
    "\u{1F440} Un repere de plus, en tete de ligne, uniquement pour faire monter le compte d'emojis au-dela du plafond.",
    "\u{1F4CC} Encore un, toujours en tete de ligne, jamais au milieu d'une phrase.",
    "\u{1F50D} Un troisieme ajout, toujours en tete de ligne, pour depasser franchement le plafond de six.",
    "",
    "\u{26A1} **Trois gestes**",
    "",
    "On evite les **memes questions posees deux fois**. On repond sous 48 heures. On explique chaque etape.",
    "\u{1F4A1} Un quatrieme repere ajoute, toujours en tete de ligne, pour depasser volontairement six emojis.",
    "",
    "\u{2705} **Ce qui reste**",
    "",
    "Le **silence total apres l'entretien** cree plus de degats que n'importe quel refus explique. " +
      "Ce post sert uniquement de gabarit de test pour verifier automatiquement les regles de forme. ".repeat(9).trim(),
    "",
    "Les **trois signes a reperer** tiennent en une phrase, et **dix minutes suffisent** pour les corriger.",
  ].join("\n");

  await assert.rejects(
    () => publierPost({ authorUrn: 'urn:li:person:test', commentary }),
    /6 emojis au maximum \(7 trouve\(s\)\)/
  );
});
