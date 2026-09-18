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

const { validerAccents } = require('./valider-orthographe');

const CARACTERES_ACCENTUES = /[àâäéèêëîïôöùûüÿçñÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇÑ]/;

const LONGUEUR_MIN = 1300;
const LONGUEUR_MAX = 1900;
const FENETRE_ACCROCHE = 140;
const EMOJIS_MIN = 3;
const EMOJIS_MAX = 6;
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

/**
 * Regroupe les lignes brutes du texte en "phrases visuelles" : une ligne qui
 * ne se termine PAS par une ponctuation forte (. ! ?) est fusionnee avec la
 * suivante avant toute verification de position. Audit adversarial du
 * 15/09/2026 : sans cette fusion, un simple retour a la ligne artificiel
 * place juste avant/apres un emoji le faisait passer pour "en tete/fin de
 * ligne" alors qu'il coupait grammaticalement une phrase en plein milieu
 * (ex. "Ceci augmente vos couts\n🚀 et complique tout.") -- confirme comme
 * contournement reel.
 */
function construireBlocsEmojis(texte) {
  const lignesBrutes = texte.split('\n');
  const blocs = [];
  let courant = '';
  for (const ligne of lignesBrutes) {
    courant = courant ? `${courant} ${ligne}` : ligne;
    const finDeBloc = /[.!?]\s*$/.test(ligne.trim()) || ligne.trim() === '';
    if (finDeBloc) {
      blocs.push(courant.trim());
      courant = '';
    }
  }
  if (courant.trim()) blocs.push(courant.trim());
  return blocs;
}

function validerEmojis(texte) {
  const toutesCorrespondances = [...texte.matchAll(REGEX_EMOJI)];
  const total = toutesCorrespondances.length;
  if (total < EMOJIS_MIN || total > EMOJIS_MAX) {
    throw new Error(
      `Post refuse : ${total} emoji(s) trouve(s), attendu entre ${EMOJIS_MIN} et ${EMOJIS_MAX}.`
    );
  }

  const blocs = construireBlocsEmojis(texte);
  for (const bloc of blocs) {
    // Verifie d'abord les groupes (deux emojis consecutifs) : un message
    // specifique sur ce cas est plus utile que le message generique "au
    // milieu d'une phrase" que la position du second emoji declencherait
    // sinon en premier.
    const REGEX_GROUPE = new RegExp(`(${REGEX_EMOJI.source})\\s?(${REGEX_EMOJI.source})`, 'u');
    if (REGEX_GROUPE.test(bloc)) {
      throw new Error(
        `Post refuse : deux emojis se suivent dans "${bloc}" -- jamais deux a la suite.`
      );
    }

    const emojisDuBloc = [...bloc.matchAll(REGEX_EMOJI)];
    for (const correspondance of emojisDuBloc) {
      const position = correspondance.index;
      const estDebut = bloc.slice(0, position).trim() === '';
      const finBloc = position + correspondance[0].length;
      const estFin = bloc.slice(finBloc).trim() === '';
      if (!estDebut && !estFin) {
        throw new Error(
          `Post refuse : l'emoji "${correspondance[0]}" apparait au milieu d'une phrase ` +
          `(phrase : "${bloc}"). Autorise seulement en tete ou en fin de phrase -- un retour a ` +
          'la ligne artificiel ne compte pas comme une frontiere.'
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
  // Elargi le 15/09/2026 (audit adversarial) : "ce n'est pas X, mais plutot
  // Y" (sans "c'est") contournait la regle initiale, qui n'attrapait que la
  // reformulation exacte "c'est" -- meme figure de style, meme interdiction.
  { regex: /ce\s+n['’]est\s+pas\s+.+?,?\s*(?:c['’]est|mais\s+plut[oô]t|c['’][eé]tait)\s+/i, motif: '"ce n\'est pas X, c\'est/mais plutot Y"' },
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
 * Un chiffre (suite de chiffres) doit avoir une mention "(source" (insensible
 * a la casse) a proximite -- soit juste apres (le cas normal, ex. "26% ...
 * (source : ...)"), soit juste avant (le cas de l'annee ecrite DANS la
 * citation elle-meme, ex. "(source : France Num, 2025)" : le "2025" y est un
 * chiffre comme un autre pour la regex, mais il n'a pas besoin d'une SECONDE
 * source puisqu'il EST deja a l'interieur d'une). D'ou une fenetre qui
 * regarde dans les deux sens (80 caracteres avant, 60 apres) plutot qu'un
 * simple regard en avant, qui bouclait sur ce cas et refusait a tort ses
 * propres citations. Un nombre ecrit en toutes lettres ("trois", "dix")
 * n'est jamais un "chiffre" au sens de cette regle -- convention deja en
 * usage dans le contenu existant du depot pour distinguer un compte
 * structurel ("trois signes") d'une statistique.
 *
 * Limite connue et acceptee : deux chiffres proches d'UNE seule citation
 * (ex. "26% ... (source : X, 2025), contre 13% l'an dernier") valident tous
 * les deux, meme si la citation ne documente que le premier -- cette regle
 * lie une PROXIMITE, pas une reference explicite. Convention a respecter a
 * l'ecriture pour rester honnete : ne jamais faire porter par une seule
 * citation deux chiffres dont un seul est reellement source ; exprimer une
 * comparaison non sourcee en toutes lettres ("deux fois plus"), pas en
 * chiffre.
 *
 * FAILLE REELLE TROUVEE ET CORRIGEE (audit adversarial, 15/09/2026) : cette
 * fonction s'execute sur le texte APRES conversion du gras (voir
 * `validerEtConvertirPost` plus bas), qui transforme les chiffres ASCII en
 * chiffres Unicode "Mathematical Bold" (`convertirEnGrasUnicode`, plage
 * U+1D7CE-U+1D7D7) des qu'ils sont entoures de `**etoiles**` -- un reflexe
 * d'ecriture naturel pour un chiffre choc. `\d+` ne reconnait PAS ces
 * caracteres : `"**40**% ... sans source"` passait entierement inapercu.
 * `REGEX_CHIFFRE` reconnait desormais aussi cette plage.
 */
function validerChiffreSource(texte) {
  const REGEX_CHIFFRE = /[\d\u{1D7CE}-\u{1D7FF}]+/gu;
  let correspondance;
  while ((correspondance = REGEX_CHIFFRE.exec(texte)) !== null) {
    const debutFenetre = Math.max(0, correspondance.index - 80);
    const finFenetre = correspondance.index + correspondance[0].length + 60;
    const fenetre = texte.slice(debutFenetre, finFenetre);
    if (!/\(\s*source\s*:/i.test(fenetre)) {
      throw new Error(
        `Post refuse : le chiffre "${correspondance[0]}" n'a pas de source attachee ` +
        `(attendu : "(source : ...)" juste avant ou apres). Contexte : "${fenetre}".`
      );
    }
    verifierSourceNonVague(fenetre, correspondance[0]);
  }
}

/**
 * Ajoute le 15/09/2026 (audit adversarial) : le code ne peut evidemment pas
 * juger si une source est REELLEMENT exacte (meme limite que
 * `anecdoteSourcee` dans linkedin-commentaires -- seul un humain le peut),
 * mais il peut refuser les remplissages les plus grossiers, confirmes
 * passants : "(source : une etude recente)", "(source : les chiffres)".
 * Liste fermee, meme philosophie que COMMENTAIRES_VIDES -- rattrapage
 * partiel assume, pas une preuve de source reelle.
 */
const SOURCES_VAGUES = [
  /^\s*(une|des|plusieurs)?\s*[eé]tudes?(\s+r[eé]centes?)?\s*$/i,
  /^\s*(les|des)?\s*chiffres?\s*$/i,
  /^\s*(les|des)?\s*donn[eé]es?\s*$/i,
  /^\s*(une)?\s*enqu[eê]te(\s+r[eé]cente)?\s*$/i,
  /^\s*(certaines?|diverses?)\s+sources?\s*$/i,
  /^\s*internet\s*$/i,
];

function verifierSourceNonVague(fenetre, chiffre) {
  const correspondanceSource = fenetre.match(/\(\s*source\s*:\s*([^)]*)\)/i);
  if (!correspondanceSource) return; // parenthese incomplete dans la fenetre -- rien a verifier ici
  const contenuSource = correspondanceSource[1].trim();
  if (SOURCES_VAGUES.some((regex) => regex.test(contenuSource))) {
    throw new Error(
      `Post refuse : la source du chiffre "${chiffre}" est trop vague ("${contenuSource}") -- ` +
      'nommez l\'institution/etude reelle (ex. "Insee, 2025", "Bpifrance Le Lab"), pas un ' +
      'remplissage generique.'
    );
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
  validerAccents(texteFinal);
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
  validerAccents,
  LONGUEUR_MIN,
  LONGUEUR_MAX,
  FENETRE_ACCROCHE,
  EMOJIS_MIN,
  EMOJIS_MAX,
  HASHTAGS_MAX,
};
