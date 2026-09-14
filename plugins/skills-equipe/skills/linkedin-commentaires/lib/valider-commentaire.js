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
 * Pendant exact de la regle "aucun chiffre sans source" (linkedin-carrousel,
 * validerChiffreSource) : une affirmation a la premiere personne sur une
 * experience (client, mission, equipe, resultat obtenu) engage l'identite
 * reelle de Julien, qui ne relit rien avant publication. Une mission ou un
 * client invente est plus grave qu'un chiffre invente, pas moins -- si un
 * lecteur demande un detail, Julien est piege publiquement sur son propre
 * profil (cas reel trouve le 14/09/2026, commentaire "client hotelier" pour
 * genre "histoire_vecue", jamais fourni par Julien).
 *
 * Heuristique, pas une preuve : repere un pronom de premiere personne (on,
 * nous, j'ai, j'avais, notre, nos) combine a du vocabulaire d'experience
 * professionnelle concrete (client, mission, equipe de N, livre/deploye/mis
 * en place/implemente/accompagne, resultat chiffre "chez un client"). Comme
 * pour l'orthographe (voir l'en-tete de ce fichier), aucune regle mecanique
 * ne peut verifier qu'une anecdote est REELLE -- seul un humain (Julien) le
 * peut. D'ou `anecdoteSourcee` : un booleen EXPLICITE, jamais devine, que
 * seule la personne qui redige peut poser a `true` -- et seulement si
 * l'anecdote a ete reellement confirmee par Julien avant redaction (voir
 * "Point n°X -- histoire_vecue" du SKILL.md pour la procedure).
 */
// Tolerantes aux accents des deux cotes (contenu redige avec ou sans, voir la
// correction du 14/09/2026 sur l'orthographe des textes publiables) : "e"
// couvre aussi "é"/"è"/"ê" via une classe de caracteres partout ou un accent
// est susceptible d'apparaitre dans la forme correcte du mot.
//
// PIEGE REEL TROUVE ET CORRIGE (14/09/2026) : `\b` en JavaScript se base sur
// \w, qui ne reconnait PAS les lettres accentuees -- `/\blivr[eé]\b/` echoue
// sur "livré " (le "e" de \b juste apres "é" ne voit aucune frontiere de mot,
// puisque "é" compte deja comme un caractere "non-mot"). D'ou des frontieres
// ecrites a la main avec \p{L}/\p{N} (lookaround Unicode, flag /u) plutot que
// \b -- verifie sur "livré", "équipe", "coupé", "déployé" reellement testes.
const FRONTIERE_AVANT = "(?<![\\p{L}\\p{N}])";
const FRONTIERE_APRES = "(?![\\p{L}\\p{N}])";
const REGEX_PREMIERE_PERSONNE = new RegExp(
  `${FRONTIERE_AVANT}(on|nous|j'ai|j'avais|notre|nos)${FRONTIERE_APRES}`, 'iu'
);
const REGEX_VOCABULAIRE_EXPERIENCE = new RegExp(
  `${FRONTIERE_AVANT}(client|clients|mission|missions|[eé]quipe de\\s*\\d|livr[eé]|livr[eé]es?|` +
  `d[eé]ploy[eé]|d[eé]ploy[eé]es?|mis en place|mise en place|impl[eé]ment[eé]|impl[eé]ment[eé]es?|` +
  `accompagn[eé]|accompagn[eé]es?|r[eé]sultat|coup[eé] le temps|chez (un|notre|une))${FRONTIERE_APRES}`,
  'iu'
);

/**
 * Verifie phrase par phrase, pas sur le texte entier : "on voit ca souvent.
 * Vous le refaites a chaque mission ?" contient bien "on" et "mission", mais
 * dans deux phrases distinctes, sur des sujets differents -- pas la meme
 * affirmation. Ne declenche que si le MEME pronom et le MEME vocabulaire
 * d'experience tombent dans la meme phrase.
 */
function detecterAffirmationExperienceNonSourcee(texte) {
  const phrases = texte.split(/(?<=[.!?])\s+/);
  return phrases.some(
    (phrase) => REGEX_PREMIERE_PERSONNE.test(phrase) && REGEX_VOCABULAIRE_EXPERIENCE.test(phrase)
  );
}

function validerAffirmationExperience(texte, anecdoteSourcee) {
  if (detecterAffirmationExperienceNonSourcee(texte) && anecdoteSourcee !== true) {
    throw new Error(
      'Commentaire refuse : affirmation a la premiere personne sur une experience professionnelle ' +
      '(client/mission/equipe/resultat) sans source declaree. Pendant exact de la regle "aucun ' +
      'chiffre sans source" du brief -- si l\'anecdote est reelle et confirmee par Julien, passez ' +
      'anecdoteSourcee: true ; sinon, ne pas inventer une mission qui n\'a jamais eu lieu.'
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
function validerCommentaire({ texte, genre, anecdoteSourcee = false }) {
  if (!texte || !texte.trim()) {
    throw new Error('Commentaire refuse : texte vide.');
  }
  validerFormeGenerale(texte);
  validerGenre(texte, genre);
  validerAffirmationExperience(texte, anecdoteSourcee);
}

module.exports = {
  validerCommentaire,
  validerFormeGenerale,
  validerGenre,
  validerAffirmationExperience,
  detecterAffirmationExperienceNonSourcee,
  compterPhrases,
  GENRES,
  PHRASES_MIN,
  PHRASES_MAX,
};
