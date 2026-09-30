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

test('publierPost refuse un commentary sans gras avant tout appel reseau', async () => {
  await assert.rejects(
    () => publierPost({
      authorUrn: 'urn:li:person:test',
      commentary: 'Un texte sans aucun gras, sans hook, sans emoji.',
    }),
    /aucun passage en gras/
  );
});

// Depuis le 30/09/2026 l'accroche n'est plus forcement une question (consigne de Julien du
// 29/09) : ce texte, qui ouvre par une affirmation, n'est donc plus refuse pour sa forme mais
// parce qu'il est bien trop court.
test('publierPost refuse un commentary trop court, meme avec un gras et une accroche libre', async () => {
  await assert.rejects(
    () => publierPost({
      authorUrn: 'urn:li:person:test',
      commentary: 'Une affirmation qui ouvre le post sans jamais poser de question. **Un point cle** ressort quand meme du texte. 🚀',
    }),
    /longueur 1300-1900/
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
