'use strict';

/**
 * Pont vers linkedin-mise-en-forme/scripts/lib.mjs -- SOURCE DE VERITE des regles de
 * forme d'un post LinkedIn de Julien (accroche, gras, titres de section, emojis,
 * formulations interdites : douze criteres au total, voir ce fichier). Ce module ne
 * duplique AUCUNE regle : il importe reellement lib.mjs et adapte son API (rapport sur
 * tous les criteres, jamais un throw) au style deja en usage dans ce paquet-ci (throw
 * explicite au premier defaut, jamais un avertissement -- meme convention que
 * lib/valider-orthographe.js et l'ancien pont vers linkedin-carrousel/lib/valider-post).
 *
 * Cree le 22/09/2026 pour remplacer l'import de linkedin-carrousel/lib/valider-post
 * (convertirGras/validerAccroche/validerEmojis) dans dry-run.js et lib/publier.js :
 * ce paquet-la ne verifiait que 3 des douze criteres de linkedin-mise-en-forme (pas les
 * trois titres de section, pas la police de gras, pas les formulations interdites) --
 * ecart trouve en auditant les trois skills LinkedIn le 22/09/2026. linkedin-carrousel
 * garde son propre valider-post.js pour ses propres besoins (diapos, hashtags) : rien
 * n'y change.
 *
 * Interop ESM/CommonJS : ce paquet est en CommonJS (`type: "commonjs"`, voir
 * package.json), linkedin-mise-en-forme/scripts/lib.mjs est un module ES. Un
 * `require()` direct d'un fichier .mjs echoue (ERR_REQUIRE_ESM) -- l'import dynamique
 * `import()` est le mecanisme documente par Node pour ce cas precis, utilisable depuis
 * un module CommonJS. D'ou les fonctions ci-dessous en `async`, et un cache local pour
 * ne charger le module qu'une fois par processus.
 */

let modulePromis = null;
function chargerLib() {
  if (!modulePromis) {
    // Chemin relatif : deux skills soeurs sous plugins/skills-equipe/skills/.
    modulePromis = import('../../linkedin-mise-en-forme/scripts/lib.mjs');
  }
  return modulePromis;
}

/**
 * Convertit chaque `**segment**` du brouillon en gras Unicode Sans-Serif Bold (celle
 * que choisit linkedin-mise-en-forme, voir son SKILL.md). Refuse (throw) un segment
 * accentue -- meme regle que convertirGras() de linkedin-carrousel, portee ici via un
 * import reel plutot que recopiee.
 */
async function convertirGras(brouillon) {
  const { enGras, ACCENTUE } = await chargerLib();
  const REGEX_GRAS = /\*\*(.+?)\*\*/g;
  let trouve = false;
  const texteConverti = brouillon.replace(REGEX_GRAS, (_correspondance, segment) => {
    trouve = true;
    if (ACCENTUE.test(segment)) {
      throw new Error(
        `Post refuse : le passage en gras "${segment}" contient un accent -- les lettres ` +
        `grasses Unicode n'existent pas accentuees (rendu casse, moitie grasse moitie non). ` +
        `Reformulez ce passage sans accent (ex. un chiffre, un mot court, un constat sec).`
      );
    }
    return enGras(segment);
  });
  if (!trouve) {
    throw new Error(
      'Post refuse : aucun passage en gras (**...**) trouve dans le brouillon. ' +
      'Un post sans aucun gras est refuse par le brief -- ajoutez au moins un passage.'
    );
  }
  return texteConverti;
}

/**
 * Mesure les douze criteres de linkedin-mise-en-forme sur un texte deja converti en
 * gras Unicode. Ne throw jamais -- retourne le rapport brut de verifierTexte()
 * ({ resultats, passes, total }). Sert aux tests de regression et a tout appelant qui
 * veut afficher le detail plutot qu'un simple refus.
 */
async function analyserPost(texteGras) {
  const { verifierTexte } = await chargerLib();
  return verifierTexte(texteGras);
}

/**
 * Meme usage que l'ancien validerAccroche(texteGras) + validerEmojis(texteGras) de
 * linkedin-carrousel, mais sur les douze criteres de linkedin-mise-en-forme plutot que
 * sur 2 d'entre eux. Throw une seule erreur descriptive listant CHAQUE critere en echec
 * (pas seulement le premier) si un ou plusieurs echouent -- coherent avec la regle du
 * depot « refus explicite, jamais un avertissement », et plus utile qu'un throw au
 * premier defaut quand plusieurs regles sont violees a la fois.
 */
async function validerMiseEnForme(texteGras) {
  const { resultats, passes, total } = await analyserPost(texteGras);
  if (passes !== total) {
    const echecs = resultats.filter((r) => !r.bon).map((r) => `${r.nom} (${r.detail})`);
    throw new Error(
      `Post refuse : ${total - passes}/${total} critere(s) de mise en forme en echec -- ` +
      echecs.join(' ; ')
    );
  }
}

module.exports = { convertirGras, analyserPost, validerMiseEnForme };
