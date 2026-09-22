'use strict';

const { executerActionComposio } = require('./composio');
const { convertirGras, validerMiseEnForme } = require('./valider-mise-en-forme');

/**
 * SEUL point d'appel qui publie reellement sur LinkedIn pour cette skill.
 * Isole ici a dessein : c'est la fonction a appeler (et la seule) une fois
 * l'identite du compte confirmee -- rien d'autre dans le module n'a d'effet
 * de bord reseau ecrivant sur LinkedIn.
 *
 * `authorUrn` est un parametre substituable : `urn:li:person:<id>` pour un
 * profil personnel (julien-partners, julien-agency) ou `urn:li:organization:<id>`
 * pour une page entreprise -- la fonction ne suppose rien de plus.
 *
 * Ne PAS resoudre l'URN ici via LINKEDIN_GET_MY_INFO par defaut : l'appelant
 * doit le fournir explicitement (URN deja verifies par Julien pour
 * julien-partners/julien-agency). Fallback documente si besoin :
 * `resoudreAuteurParDefaut()` plus bas, non appele automatiquement.
 *
 * Douze criteres de linkedin-mise-en-forme (source de verite, voir
 * lib/valider-mise-en-forme.js) verifies ici, avant ce seul point d'appel reseau --
 * incident reel du 18/09/2026 : ce module ne validait rien du tout avant publication,
 * et dry-run.js (qui simule le pipeline sans jamais l'importer) ne verifiait que les
 * accents. Les posts deja publies (Codie Sanchez, Jason Feifer, Justin Welsh) n'ont donc
 * jamais pu passer par un controle de forme verifie. Un premier pont a ete branche ce
 * jour-la vers linkedin-carrousel/lib/valider-post (3 criteres sur 12 seulement) ;
 * remplace le 22/09/2026 par un import reel de linkedin-mise-en-forme, la source de
 * verite documentee pour les posts texte (le carrousel garde son propre validateur pour
 * ses propres besoins). Refus explicite (throw), pas un avertissement -- coherent avec
 * le reste du depot.
 */
async function publierPost({ authorUrn, commentary, userId, apiKey }) {
  if (!authorUrn) throw new Error('authorUrn requis (urn:li:person:... ou urn:li:organization:...).');
  if (!commentary) throw new Error('commentary requis (texte du post).');

  const texteGras = await convertirGras(commentary);
  await validerMiseEnForme(texteGras);

  return executerActionComposio('LINKEDIN_CREATE_LINKED_IN_POST', {
    arguments: { author: authorUrn, commentary: texteGras },
    userId,
    apiKey,
  });
}

/**
 * Fallback documente, non appele par defaut : resout l'URN d'un compte via
 * LINKEDIN_GET_MY_INFO plutot que de recevoir l'URN en clair. Utile si un
 * jour l'entity_id est connu mais pas l'URN -- pas le chemin recommande, les
 * URN de julien-partners/julien-agency sont deja verifies et stables.
 */
async function resoudreAuteurParDefaut({ userId, apiKey }) {
  const resultat = await executerActionComposio('LINKEDIN_GET_MY_INFO', {
    arguments: {},
    userId,
    apiKey,
  });
  const id = resultat && resultat.data && resultat.data.id;
  if (!id) throw new Error(`LINKEDIN_GET_MY_INFO n'a pas renvoye d'id exploitable : ${JSON.stringify(resultat)}`);
  return `urn:li:person:${id}`;
}

module.exports = { publierPost, resoudreAuteurParDefaut };
