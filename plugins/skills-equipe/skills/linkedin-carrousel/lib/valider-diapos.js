'use strict';

/**
 * Garde-fous de structure du carrousel (brief Julien du 10/09/2026, section 4).
 * Chaque fonction leve une erreur explicite -- jamais un simple avertissement --
 * des qu'une regle est violee. Appele depuis generer-pdf.js AVANT tout rendu :
 * un carrousel hors regles n'est jamais produit, meme partiellement.
 *
 * Limite assumee : "diapo 2 = ce que le lecteur va y gagner", "diapos 3 a 9 =
 * une seule idee chacune" et "derniere = une seule action" sont des exigences
 * de CONTENU (le sens du texte), pas de forme -- aucun code ne peut verifier
 * qu'une phrase exprime bien "une seule idee" ou "un gain" plutot qu'autre
 * chose. Ce qui EST verifie automatiquement, positionnellement : le nombre
 * total de diapos, que la premiere est bien le hook (role "hook", accroche
 * seule sans texte de soutien), et que chaque diapo respecte la limite de
 * mots. Le respect du sens attendu a chaque position reste une discipline
 * d'ecriture, pas un garde-fou automatisable.
 */

const DIAPOS_MIN = 8;
const DIAPOS_MAX = 12;
const DIAPOS_DEFAUT = 10;
const MOTS_MAX_PAR_DIAPO = 25;

function compterMots(texte) {
  return String(texte || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Leve une erreur des que le carrousel viole une regle de structure.
 * Ne renvoie rien en cas de succes (silence = conforme).
 */
function validerDiapos(diapos) {
  if (!Array.isArray(diapos) || diapos.length === 0) {
    throw new Error('Carrousel refuse : la liste de diapos est vide.');
  }

  if (diapos.length < DIAPOS_MIN || diapos.length > DIAPOS_MAX) {
    throw new Error(
      `Carrousel refuse : ${diapos.length} diapo(s) fournies, attendu entre ${DIAPOS_MIN} et ` +
      `${DIAPOS_MAX} (${DIAPOS_DEFAUT} par defaut). Ajoutez ou retirez des diapos pour rentrer ` +
      `dans cette fourchette -- ni la police ni le format ne compensent un ecart de nombre.`
    );
  }

  const hook = diapos[0];
  if (hook.role !== 'hook') {
    throw new Error(
      `Carrousel refuse : la diapo 1 doit porter le role "hook" (accroche seule, sans logo). ` +
      `Role trouve : "${hook.role || '(absent)'}".`
    );
  }
  if (hook.texte && String(hook.texte).trim() !== '') {
    throw new Error(
      `Carrousel refuse : la diapo 1 ("hook") doit etre l'accroche seule, sans texte de soutien. ` +
      `Un champ "texte" a ete fourni : "${hook.texte}". Deplacez ce contenu vers la diapo 2 ` +
      `("ce que le lecteur va y gagner") ou une diapo suivante.`
    );
  }

  diapos.forEach((diapo, index) => {
    const texteAffiche = index === 0 ? diapo.titre : `${diapo.titre || ''} ${diapo.texte || ''}`;
    const mots = compterMots(texteAffiche);
    if (mots > MOTS_MAX_PAR_DIAPO) {
      throw new Error(
        `Carrousel refuse : diapo n°${index + 1} ("${diapo.titre || ''}") contient ${mots} mots, ` +
        `maximum autorise ${MOTS_MAX_PAR_DIAPO}. Raccourcissez le texte de cette diapo -- la ` +
        `police ne doit jamais etre reduite pour faire rentrer un texte trop long.`
      );
    }
  });
}

module.exports = {
  validerDiapos,
  compterMots,
  DIAPOS_MIN,
  DIAPOS_MAX,
  DIAPOS_DEFAUT,
  MOTS_MAX_PAR_DIAPO,
};
