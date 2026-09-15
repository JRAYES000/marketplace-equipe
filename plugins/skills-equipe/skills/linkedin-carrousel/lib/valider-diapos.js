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

const { validerAccents } = require('./valider-orthographe');

const DIAPOS_MIN = 8;
const DIAPOS_MAX = 12;
const DIAPOS_DEFAUT = 10;
const MOTS_MAX_PAR_DIAPO = 25;
// Audit adversarial du 15/09/2026 : filet de securite en caracteres, en plus
// du compte de "mots" -- voir compterMots ci-dessous pour pourquoi le compte
// de mots seul ne suffit pas. 260 caracteres laisse une marge large au-dessus
// du texte le plus long reellement observe dans un carrousel conforme
// (~140 caracteres, fixtures/diapos-10-conformes.json) tout en bloquant un
// bloc de texte massif.
const CARACTERES_MAX_PAR_DIAPO = 260;
// Caracteres de controle C0 (hors saut de ligne/tabulation, deja ecartes
// ailleurs) : jamais legitimes dans un titre/texte de diapo -- rendu
// imprevisible en HTML/PDF, souvent invisible dans les logs/diffs.
const REGEX_CARACTERE_CONTROLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

/**
 * Audit adversarial du 15/09/2026 : `split(/\s+/)` ne segmente que sur les
 * espaces -- un texte ecrit "un-tres-long-passage-colle-avec-des-tirets"
 * (aucun espace) comptait pour UN SEUL mot, quelle que soit sa longueur
 * reelle. Confirme par rendu Playwright reel : a 80 "vrais" mots ainsi
 * colles, le texte deborde visuellement de la diapo et chevauche le pied de
 * page. Les tirets qui separent des mots pleins sont desormais aussi des
 * frontieres de mot (au prix de sur-compter certains mots composes legitimes
 * comme "peut-etre" ou "trente-cinq" -- direction sans risque : ca ne fait
 * que refuser un peu plus tot, jamais laisser passer un texte trop long).
 */
function compterMots(texte) {
  return String(texte || '')
    .trim()
    .split(/[\s-]+/)
    .filter(Boolean).length;
}

function validerTexteDiapo(texte, contexte) {
  if (REGEX_CARACTERE_CONTROLE.test(String(texte || ''))) {
    throw new Error(`Carrousel refuse : ${contexte} contient un caractere de controle non imprimable.`);
  }
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

  // Audit adversarial du 15/09/2026 : un element `null`/non-objet au milieu
  // du tableau (ex. donnees generees automatiquement, malformees) plantait
  // avec un TypeError brut ("Cannot read properties of null") des le premier
  // acces a `.role`/`.titre` plus bas.
  diapos.forEach((diapo, index) => {
    if (diapo === null || typeof diapo !== 'object' || Array.isArray(diapo)) {
      throw new Error(`Carrousel refuse : diapo n°${index + 1} n'est pas un objet valide (recu : ${JSON.stringify(diapo)}).`);
    }
  });

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
  // Audit adversarial du 15/09/2026 : un `titre` absent/null/vide passait
  // silencieusement -- la diapo se rendait avec un titre blanc, jamais
  // signale, contraire a "rien ne produit un resultat silencieusement faux".
  if (!String(hook.titre || '').trim()) {
    throw new Error('Carrousel refuse : la diapo 1 ("hook") doit avoir un titre non vide.');
  }

  diapos.forEach((diapo, index) => {
    if (index > 0 && !String(diapo.titre || '').trim()) {
      throw new Error(`Carrousel refuse : diapo n°${index + 1} doit avoir un titre non vide.`);
    }
    validerTexteDiapo(diapo.titre, `diapo n°${index + 1} (titre)`);
    validerTexteDiapo(diapo.texte, `diapo n°${index + 1} (texte)`);

    const texteAffiche = index === 0 ? diapo.titre : `${diapo.titre || ''} ${diapo.texte || ''}`;
    const mots = compterMots(texteAffiche);
    const caracteres = String(texteAffiche || '').trim().length;
    if (mots > MOTS_MAX_PAR_DIAPO) {
      throw new Error(
        `Carrousel refuse : diapo n°${index + 1} ("${diapo.titre || ''}") contient ${mots} mots, ` +
        `maximum autorise ${MOTS_MAX_PAR_DIAPO}. Raccourcissez le texte de cette diapo -- la ` +
        `police ne doit jamais etre reduite pour faire rentrer un texte trop long.`
      );
    }
    if (caracteres > CARACTERES_MAX_PAR_DIAPO) {
      throw new Error(
        `Carrousel refuse : diapo n°${index + 1} ("${diapo.titre || ''}") contient ${caracteres} ` +
        `caracteres, maximum autorise ${CARACTERES_MAX_PAR_DIAPO} -- meme si le compte de mots ` +
        'passe (mots colles sans espaces, par exemple), un texte de cette longueur deborde de la diapo.'
      );
    }
    try {
      validerAccents(texteAffiche);
    } catch (erreur) {
      throw new Error(`Carrousel refuse : diapo n°${index + 1} ("${diapo.titre || ''}") -- ${erreur.message}`);
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
  CARACTERES_MAX_PAR_DIAPO,
};
