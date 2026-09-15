'use strict';

/**
 * Garde-fous de contenu du commentaire (brief Julien du 10/09/2026, section 6
 * + regles d'ecriture generales de la section 3). Refus explicite -- jamais
 * un simple avertissement -- des qu'une regle est violee.
 *
 * Limite assumee, pour ne rien inventer : "un mot parlé en tete, un fragment
 * sans verbe" (le rythme humain voulu par le brief) reste une qualite de
 * REDACTION, pas une forme verifiable par une regle mecanique -- aucun
 * controle automatique ne l'impose ici. "Orthographe irreprochable", en
 * revanche, a desormais un controle PARTIEL (voir `validerAccents` plus bas
 * et `lib/valider-orthographe.js`) depuis que les 5 premiers commentaires
 * reels de ce paquet se sont reveles integralement sans accents le
 * 14/09/2026 -- controle imparfait (liste fermee de mots), mais mieux
 * qu'aucun. Ce qui EST verifie automatiquement : la longueur (2-4 phrases),
 * l'absence de puces/emoji/lien, l'absence de formulation vide connue, la
 * coherence du genre declare avec le contenu (chiffre present pour
 * "information_chiffree", question reelle pour "vraie_question"), l'absence
 * d'experience personnelle non sourcee, et desormais les accents manquants
 * les plus frequents.
 */

const { validerAccents } = require('./valider-orthographe');

const PHRASES_MIN = 2;
const PHRASES_MAX = 4;

const GENRES = ['information_chiffree', 'desaccord_argumente', 'histoire_vecue', 'vraie_question'];

const REGEX_EMOJI = /\p{Extended_Pictographic}/gu;
const REGEX_LIEN = /(https?:\/\/|www\.|lnkd\.in)/i;
const REGEX_PUCE = /(^|\n)\s*[-*•‣▪]\s|(^|\n)\s*\d+[.)]\s/;

// Commentaires vides explicitement cites par le brief, plus les variantes les
// plus courantes du meme registre ("ca ne rapporte rien et ca se voit").
// Ancres (^...$) : ne matchent que si c'est TOUT le commentaire, pas un
// fragment noye dans un commentaire plus long.
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

/**
 * Ajoute le 15/09/2026 (audit adversarial, sous-agent dedie) : "Interessant
 * comme approche, ca resonne avec ce qu'on observe en ce moment. Ca me parle
 * vraiment." passe la barre des 2-4 phrases ET aucune phrase individuelle ne
 * matche COMMENTAIRES_VIDES (ancre sur le texte ENTIER) -- confirme comme
 * contournement reel. Ces fragments-ci sont volontairement NON ancres
 * (matchent une PHRASE, pas tout le texte) et utilises uniquement par
 * `validerNonVideParPhrase` ci-dessous : un commentaire ou CHAQUE phrase est
 * un de ces fragments creux est refuse, mais une seule phrase-ouverture
 * creuse suivie d'un vrai contenu substantiel reste acceptee (le but reste
 * de bloquer le vide integral, pas de punir une accroche informelle).
 */
const FRAGMENTS_VIDES_PAR_PHRASE = [
  /\bca\s+r[eé]sonne\b/i,
  /\bca\s+me\s+parle\b/i,
  /\bca\s+fait\s+sens\b/i,
  /^\s*int[eé]ressant\s+comme\s+approche\s*\.?\s*$/i,
  /^\s*totalement\s+d['’]accord\s*\.?\s*$/i,
];

function compterPhrases(texte) {
  return texte
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function toutesLesPhrasesSontVides(texte) {
  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return phrases.length > 0 && phrases.every((phrase) => FRAGMENTS_VIDES_PAR_PHRASE.some((regex) => regex.test(phrase)));
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
  if (toutesLesPhrasesSontVides(texte)) {
    throw new Error(
      `Commentaire refuse : formulation vide detectee ("${texte.trim()}") -- reformuler sur ` +
      'plusieurs phrases ("ca resonne", "ca me parle"...) ne rapporte pas plus que la version ' +
      'courte deja refusee par le brief.'
    );
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
// Audit adversarial du 15/09/2026 (sous-agent dedie) : "je" seul, "mon"/"ma"/
// "mes" et "m'a dit que" ont ete reellement testes et passent tous a travers
// cette liste. DELIBEREMENT NON ELargie a ces formes malgre ca : "je"/"mon"/
// "ma"/"mes" sont trop polysemiques (frequents dans une opinion generale --
// "mon avis sur ce type de mission" -- sans aucune experience personnelle
// affirmee) pour rester ici sans faire exploser les faux refus sur du
// contenu legitime. Meme famille de compromis que "a"/"à" exclus des accents
// (voir lib/valider-orthographe.js) : un trou assume plutot qu'un
// elargissement qui casserait des commentaires corrects. Ce qui EST corrige
// ci-dessous (REGEX_VOIX_PASSIVE_EXPERIENCE), c'est la tournure passive
// ("a ete livre", "ont ete deployes") : un signal beaucoup plus specifique,
// sans le meme risque de faux positif, et confirme par le meme audit comme
// contournement reel de la regle "aucune experience non sourcee".
const REGEX_PREMIERE_PERSONNE = new RegExp(
  `${FRONTIERE_AVANT}(on|nous|j'ai|j'avais|notre|nos)${FRONTIERE_APRES}`, 'iu'
);
const REGEX_VOCABULAIRE_EXPERIENCE = new RegExp(
  `${FRONTIERE_AVANT}(client|clients|mission|missions|[eé]quipe de\\s*\\d|livr[eé]|livr[eé]es?|` +
  `d[eé]ploy[eé]|d[eé]ploy[eé]es?|mis en place|mise en place|impl[eé]ment[eé]|impl[eé]ment[eé]es?|` +
  `accompagn[eé]|accompagn[eé]es?|r[eé]sultat|coup[eé] le temps|chez (un|notre|une))${FRONTIERE_APRES}`,
  'iu'
);
// Ajoute le 15/09/2026 (audit adversarial) : une tournure PASSIVE ("un projet
// a ete livre pour une equipe de 12", "la mission a ete menee...") affirme la
// meme experience professionnelle concrete SANS aucun pronom de 1ere
// personne -- le sujet grammatical est l'objet livre, pas "je"/"on"/"nous".
// Detecte independamment de REGEX_PREMIERE_PERSONNE : "a"/"ont" (auxiliaire
// avoir, 3e personne) immediatement suivi (eventuellement via "ete") d'un des
// participes passes du vocabulaire d'experience.
const REGEX_VOIX_PASSIVE_EXPERIENCE = new RegExp(
  `${FRONTIERE_AVANT}(a|ont)${FRONTIERE_APRES}\\s+(?:[eé]t[eé]\\s+)?` +
  `(livr[eé]e?s?|d[eé]ploy[eé]e?s?|mis(?:e)? en place|impl[eé]ment[eé]e?s?|accompagn[eé]e?s?|men[eé]e?s?)`,
  'iu'
);

/**
 * Verifie phrase par phrase, pas sur le texte entier : "on voit ca souvent.
 * Vous le refaites a chaque mission ?" contient bien "on" et "mission", mais
 * dans deux phrases distinctes, sur des sujets differents -- pas la meme
 * affirmation. Declenche si (le MEME pronom de 1ere personne ET le MEME
 * vocabulaire d'experience) OU une construction passive d'experience
 * tombent dans la meme phrase -- les deux chemins couvrent respectivement
 * une affirmation active ("j'ai livre...") et une affirmation passive ("a
 * ete livre...") de la meme experience non sourcee.
 */
function detecterAffirmationExperienceNonSourcee(texte) {
  const phrases = texte.split(/(?<=[.!?])\s+/);
  return phrases.some(
    (phrase) =>
      (REGEX_PREMIERE_PERSONNE.test(phrase) && REGEX_VOCABULAIRE_EXPERIENCE.test(phrase)) ||
      REGEX_VOIX_PASSIVE_EXPERIENCE.test(phrase)
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
  validerAccents(texte);
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
