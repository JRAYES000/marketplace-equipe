'use strict';

/**
 * Garde-fous d'ecriture du texte du post (brief Julien du 10/09/2026, section 3).
 * Refus explicite -- jamais un avertissement -- des qu'une regle est violee.
 * Julien ne relit rien : ces controles sont le seul filet avant publication.
 *
 * Usage :
 *   const { validerEtConvertirPost } = require('./lib/valider-post');
 *   const texteFinal = validerEtConvertirPost(brouillonAvecEtoiles);
 *   // texteFinal : gras converti en unicode, pret a publier tel quel.
 *   // Leve une erreur descriptive au premier controle viole.
 *
 * Le brouillon en entree porte le gras entre **deux etoiles** ; la conversion
 * en caracteres Unicode gras se fait ICI, au dernier moment, jamais avant.
 */

const CARACTERES_ACCENTUES = /[àâäéèêëîïôöùûüÿçñÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇÑ]/;

const LONGUEUR_MIN = 1300;
const LONGUEUR_MAX = 1900;
const FENETRE_ACCROCHE = 140;
const EMOJIS_MIN = 3;
const EMOJIS_MAX = 5;
const HASHTAGS_MAX = 2;

// Mathematical Bold (U+1D400 serie) -- pas d'equivalent accentue dans ce bloc
// Unicode, d'ou le refus explicite d'un gras accentue : la conversion serait
// silencieusement fausse (une lettre accentuee n'a pas de forme grasse ici).
const BOLD_MAJ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BOLD_MIN = 'abcdefghijklmnopqrstuvwxyz';
const BOLD_CHIFFRES = '0123456789';

function construireTableBold() {
  const table = new Map();
  for (let i = 0; i < BOLD_MAJ.length; i += 1) {
    table.set(BOLD_MAJ[i], String.fromCodePoint(0x1d400 + i));
  }
  for (let i = 0; i < BOLD_MIN.length; i += 1) {
    table.set(BOLD_MIN[i], String.fromCodePoint(0x1d41a + i));
  }
  for (let i = 0; i < BOLD_CHIFFRES.length; i += 1) {
    table.set(BOLD_CHIFFRES[i], String.fromCodePoint(0x1d7ce + i));
  }
  return table;
}

const TABLE_BOLD = construireTableBold();

function convertirEnGrasUnicode(segment) {
  return [...segment].map((car) => TABLE_BOLD.get(car) || car).join('');
}

/**
 * Convertit chaque `**segment**` du brouillon en gras Unicode. Refuse si un
 * segment en gras contient un accent (aucune forme grasse Unicode accentuee
 * n'existe -- la conversion serait silencieusement incorrecte), ou si aucun
 * segment en gras n'est present du tout (post sans gras = refuse).
 */
function convertirGras(brouillon) {
  const REGEX_GRAS = /\*\*(.+?)\*\*/g;
  let trouve = false;

  const texteConverti = brouillon.replace(REGEX_GRAS, (_correspondance, segment) => {
    trouve = true;
    if (CARACTERES_ACCENTUES.test(segment)) {
      throw new Error(
        `Post refuse : le passage en gras "${segment}" contient un accent -- les lettres ` +
        `grasses Unicode n'existent pas accentuees (rendu casse, moitie grasse moitie non). ` +
        `Reformulez ce passage sans accent (ex. un chiffre, un mot court, un constat sec).`
      );
    }
    return convertirEnGrasUnicode(segment);
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
 * Emojis Unicode "image" (pictographes) -- exclut la ponctuation/texte simple.
 */
const REGEX_EMOJI = /\p{Extended_Pictographic}/gu;

function validerEmojis(texte) {
  const toutesCorrespondances = [...texte.matchAll(REGEX_EMOJI)];
  const total = toutesCorrespondances.length;
  if (total < EMOJIS_MIN || total > EMOJIS_MAX) {
    throw new Error(
      `Post refuse : ${total} emoji(s) trouve(s), attendu entre ${EMOJIS_MIN} et ${EMOJIS_MAX}.`
    );
  }

  const lignes = texte.split('\n');
  for (const ligne of lignes) {
    // Verifie d'abord les groupes (deux emojis consecutifs) : un message
    // specifique sur ce cas est plus utile que le message generique "au
    // milieu d'une phrase" que la position du second emoji declencherait
    // sinon en premier.
    const REGEX_GROUPE = new RegExp(`(${REGEX_EMOJI.source})\\s?(${REGEX_EMOJI.source})`, 'u');
    if (REGEX_GROUPE.test(ligne)) {
      throw new Error(
        `Post refuse : deux emojis se suivent sur la ligne "${ligne.trim()}" -- jamais deux a la suite.`
      );
    }

    const emojisDeLaLigne = [...ligne.matchAll(REGEX_EMOJI)];
    for (const correspondance of emojisDeLaLigne) {
      const position = correspondance.index;
      const estDebut = ligne.slice(0, position).trim() === '';
      const finLigne = position + correspondance[0].length;
      const estFin = ligne.slice(finLigne).trim() === '';
      if (!estDebut && !estFin) {
        throw new Error(
          `Post refuse : l'emoji "${correspondance[0]}" apparait au milieu d'une phrase ` +
          `(ligne : "${ligne.trim()}"). Autorise seulement en tete de bloc ou en fin de ligne.`
        );
      }
    }
  }
}

function validerLongueur(texte) {
  const longueur = [...texte].length;
  if (longueur < LONGUEUR_MIN || longueur > LONGUEUR_MAX) {
    throw new Error(
      `Post refuse : ${longueur} caracteres, attendu entre ${LONGUEUR_MIN} et ${LONGUEUR_MAX}.`
    );
  }
}

function validerAccroche(texte) {
  const fenetre = texte.slice(0, FENETRE_ACCROCHE);
  if (!fenetre.includes('?')) {
    throw new Error(
      `Post refuse : aucun point d'interrogation dans les ${FENETRE_ACCROCHE} premiers ` +
      `caracteres ("${fenetre.trim()}"). L'accroche doit poser une question, pas donner la reponse.`
    );
  }
}

function validerHashtags(texte) {
  const texteSansFin = texte.trimEnd();
  const REGEX_BLOC_FINAL = /(?:^|\s)((?:#[^\s#]+\s*){1,})$/;
  const correspondanceFinale = texteSansFin.match(REGEX_BLOC_FINAL);
  const hashtagsFinaux = correspondanceFinale ? correspondanceFinale[1].trim().split(/\s+/) : [];

  const totalHashtags = (texte.match(/#[^\s#]+/g) || []).length;
  if (totalHashtags !== hashtagsFinaux.length) {
    throw new Error(
      'Post refuse : des mots-diese apparaissent ailleurs qu\'en toute fin de post -- ' +
      'autorises uniquement regroupes a la toute fin.'
    );
  }
  if (hashtagsFinaux.length > HASHTAGS_MAX) {
    throw new Error(
      `Post refuse : ${hashtagsFinaux.length} mots-diese en fin de post, maximum ${HASHTAGS_MAX}.`
    );
  }
}

const INTERDITS = [
  { regex: /commentez\s+["']?oui["']?/i, motif: 'demande d\'engagement ("commentez OUI")' },
  { regex: /partagez\s+si/i, motif: 'demande d\'engagement ("partagez si...")' },
  { regex: /!{2,}/, motif: 'exclamations en rafale' },
  { regex: /—|–/, motif: 'tiret long' },
  { regex: /--/, motif: 'tiret long (double tiret)' },
  { regex: /ce\s+n['’]est\s+pas\s+.+?,?\s*c['’]est\s+/i, motif: '"ce n\'est pas X, c\'est Y"' },
  { regex: /ravi(?:e)?\s+de\s+vous\s+annoncer/i, motif: '"ravi de vous annoncer"' },
  { regex: /taguez\s+quelqu['’]un/i, motif: '"taguez quelqu\'un"' },
  { regex: /linkedin\s+(?:est\s+)?(?:nul|pourri|inutile|une\s+plaie|un\s+cirque)/i, motif: 'critique de LinkedIn' },
  // Mot de 5 lettres ou plus tout en majuscules (evite les faux positifs sur
  // des sigles courts legitimes comme IA, PME, RH, SARL).
  { regex: /\b[A-ZÀ-Ý]{5,}\b/, motif: 'mot ecrit tout en majuscules' },
];

function validerInterdits(texte) {
  for (const { regex, motif } of INTERDITS) {
    const correspondance = texte.match(regex);
    if (correspondance) {
      throw new Error(`Post refuse : formulation interdite detectee (${motif}) -- "${correspondance[0]}".`);
    }
  }
}

/**
 * Un chiffre (suite de chiffres) doit etre suivi, dans les ~60 caracteres qui
 * suivent, d'une mention "(source" (insensible a la casse). Un nombre ecrit
 * en toutes lettres ("trois", "dix") n'est jamais un "chiffre" au sens de
 * cette regle -- convention deja en usage dans le contenu existant du depot
 * pour distinguer un compte structurel ("trois signes") d'une statistique.
 */
function validerChiffreSource(texte) {
  const REGEX_CHIFFRE = /\d+/g;
  let correspondance;
  while ((correspondance = REGEX_CHIFFRE.exec(texte)) !== null) {
    const finFenetre = correspondance.index + correspondance[0].length + 60;
    const fenetre = texte.slice(correspondance.index, finFenetre);
    if (!/\(\s*source\s*:/i.test(fenetre)) {
      throw new Error(
        `Post refuse : le chiffre "${correspondance[0]}" n'a pas de source attachee ` +
        `(attendu : "(source : ...)" dans les caracteres qui suivent). Contexte : ` +
        `"${texte.slice(Math.max(0, correspondance.index - 20), finFenetre)}".`
      );
    }
  }
}

/**
 * Point d'entree unique. Convertit le gras puis lance tous les controles sur
 * le texte final (post-conversion, car la longueur/les hashtags/etc. doivent
 * etre mesures sur ce qui sera reellement publie). Leve au premier controle
 * viole -- ne renvoie le texte que si TOUT est conforme.
 */
function validerEtConvertirPost(brouillon) {
  const texteFinal = convertirGras(brouillon);
  validerLongueur(texteFinal);
  validerAccroche(texteFinal);
  validerEmojis(texteFinal);
  validerHashtags(texteFinal);
  validerInterdits(texteFinal);
  validerChiffreSource(texteFinal);
  return texteFinal;
}

module.exports = {
  validerEtConvertirPost,
  convertirGras,
  validerLongueur,
  validerAccroche,
  validerEmojis,
  validerHashtags,
  validerInterdits,
  validerChiffreSource,
  LONGUEUR_MIN,
  LONGUEUR_MAX,
  FENETRE_ACCROCHE,
  EMOJIS_MIN,
  EMOJIS_MAX,
  HASHTAGS_MAX,
};
