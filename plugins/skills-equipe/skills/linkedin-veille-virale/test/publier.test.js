'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { publierPost } = require('../lib/publier');

/**
 * Incident du 18/09/2026 : `publierPost` ne validait rien du tout avant
 * d'appeler Composio -- les trois posts deja publies (Codie Sanchez, Jason
 * Feifer, Justin Welsh) n'ont jamais pu passer par un hook/gras/emoji
 * verifie. Ces tests verifient que le refus arrive AVANT tout appel reseau :
 * aucun COMPOSIO_API_KEY n'est fourni ici, et le message d'erreur attendu
 * est celui du garde-fou de contenu (linkedin-carrousel/lib/valider-post),
 * jamais celui de `executerActionComposio` ("COMPOSIO_API_KEY manquant"),
 * qui ne peut apparaitre que si le garde-fou avait laisse passer le texte.
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

test('publierPost refuse un commentary avec gras mais sans hook (pas de "?" dans les 140 premiers caracteres)', async () => {
  await assert.rejects(
    () => publierPost({
      authorUrn: 'urn:li:person:test',
      commentary: 'Une affirmation qui ouvre le post sans jamais poser de question. **Un point cle** ressort quand meme du texte. 🚀',
    }),
    /point d'interrogation/
  );
});

test('publierPost refuse un commentary conforme au hook/gras mais hors de la fourchette d\'emojis', async () => {
  await assert.rejects(
    () => publierPost({
      authorUrn: 'urn:li:person:test',
      commentary: 'Pourquoi si peu de posts tiennent-ils leurs promesses ? **Un vrai constat** change la donne.',
    }),
    /emoji\(s\) trouve\(s\)/
  );
});
