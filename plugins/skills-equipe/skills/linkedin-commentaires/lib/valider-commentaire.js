'use strict';

/**
 * Garde-fous de contenu du commentaire (brief Julien du 10/09/2026, section 6
 * + regles d'ecriture generales de la section 3). Refus explicite -- jamais
 * un simple avertissement -- des qu'une regle est violee.
 *
 * Limite assumee, pour ne rien inventer : "orthographe irreprochable" et "un
 * mot parlé en tete, un fragment sans verbe" (le rythme humain voulu par le
 * brief) sont des qualites de REDACTION, pas des formes verifiables par une
 * regle mecanique -- aucun controle automatique ne les impose ici. Ce qui EST
 * verifie automatiquement : la longueur (2-4 phrases), l'absence de puces/
 * emoji/lien, l'absence de formulation vide connue, et la coherence du genre
 * declare avec le contenu (chiffre present pour "information_chiffree",
 * question reelle pour "vraie_question").
 */

const PHRASES_MIN = 2;
const PHRASES_MAX = 4;

const GENRES = ['information_chiffree', 'desaccord_argumente', 'histoire_vecue', 'vraie_question'];

const REGEX_EMOJI = /\p{Extended_Pictographic}/gu;
const REGEX_LIEN = /(https?:\/\/|www\.|lnkd\.in)/i;
const REGEX_PUCE = /(^|\n)\s*[-*•‣▪]\s|(^|\n)\s*\d+[.)]\s/;

// Commentaires vides explicitement cites par le brief, plus les variantes les
// plus courantes du meme registre ("ca ne rapporte rien et ca se voit").
const COMMENTAIRES_VIDES = [
  /^\s*super\s+post\s*!?\s*$/i,
  /^\s*tellement\s+vrai\s*!?\s*$/i,
  /^\s*top\s*!?\s*$/i,
  /^\s*excellent\s*!?\s*$/i,
  /^\s*g[eé]nial\s*!?\s*$/i,
  /^\s*bravo\s*!?\s*$/i,
  /^\s*merci\s+(du|pour\s+le)\s+partage\s*!?\s*$/i,
  /^\s*tr[eè]s\s+int[eé]ressant\s*!?\s*$/i,
  /^\s*(\+\s*1|\+1)\s*$/i,
];

function compterPhrases(texte) {
  return texte
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function validerFormeGenerale(texte) {
  // Verifie d'abord les formulations vides connues : un message specifique
  // sur ce cas est plus utile que le refus generique "hors fourchette de
  // phrases" que ces formulations (souvent une seule phrase courte)
  // declencheraient sinon en premier.
  for (const regex of COMMENTAIRES_VIDES) {
    if (regex.test(texte.trim())) {
      throw new Error(
        `Commentaire refuse : formulation vide detectee ("${texte.trim()}") -- ` +
        'ca ne rapporte rien et ca se voit, comme le dit le brief.'
      );
    }
  }

  if (REGEX_EMOJI.test(texte)) {
    throw new Error('Commentaire refuse : aucun emoji autorise.');
  }
  if (REGEX_LIEN.test(texte)) {
    throw new Error('Commentaire refuse : aucun lien autorise.');
  }
  if (REGEX_PUCE.test(texte)) {
    throw new Error('Commentaire refuse : aucune liste a puces/numerotee autorisee.');
  }

  const phrases = compterPhrases(texte);
  if (phrases < PHRASES_MIN || phrases > PHRASES_MAX) {
    throw new Error(
      `Commentaire refuse : ${phrases} phrase(s) detectee(s), attendu entre ${PHRASES_MIN} et ${PHRASES_MAX}.`
    );
  }
}

/**
 * Verifie que le genre declare est coherent avec le contenu. Ne verifie pas
 * la qualite du "desaccord argumente" ni de l'"histoire vecue" -- juger si un
 * argument est solide ou une histoire credible reste hors de portee d'une
 * regle mecanique, assume comme limite.
 */
function validerGenre(texte, genre) {
  if (!GENRES.includes(genre)) {
    throw new Error(
      `Commentaire refuse : genre "${genre}" inconnu. Attendu l'un de : ${GENRES.join(', ')}.`
    );
  }

  if (genre === 'information_chiffree') {
    if (!/\d/.test(texte)) {
      throw new Error(
        'Commentaire refuse : genre "information_chiffree" declare mais aucun chiffre trouve dans le texte.'
      );
    }
  }

  if (genre === 'vraie_question') {
    if (!texte.trim().endsWith('?')) {
      throw new Error(
        'Commentaire refuse : genre "vraie_question" declare mais le commentaire ne se termine pas par "?".'
      );
    }
  }
}

/**
 * Point d'entree unique. `genre` doit etre l'un des 4 genres du brief (un par
 * proposition, jamais melanges). Leve une erreur descriptive au premier
 * controle viole ; ne renvoie rien en cas de succes (silence = conforme).
 */
function validerCommentaire({ texte, genre }) {
  if (!texte || !texte.trim()) {
    throw new Error('Commentaire refuse : texte vide.');
  }
  validerFormeGenerale(texte);
  validerGenre(texte, genre);
}

module.exports = {
  validerCommentaire,
  validerFormeGenerale,
  validerGenre,
  compterPhrases,
  GENRES,
  PHRASES_MIN,
  PHRASES_MAX,
};
