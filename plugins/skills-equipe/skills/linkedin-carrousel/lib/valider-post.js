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

const { validerAccents, MOTS_SANS_ACCENT_VERS_CORRECT } = require('./valider-orthographe');
const { validerAnglicismes } = require('./valider-anglicismes');

const CARACTERES_ACCENTUES = /[àâäéèêëîïôöùûüÿçñÀÂÄÉÈÊËÎÏÔÖÙÛÜŸÇÑ]/;

// Retour de Julien (25/09/2026, carrousel urn:li:ugcPost:7509117168333287425) :
// le texte du post d'un CARROUSEL repetait le carrousel lui-meme -- consigne
// desormais : 5 lignes maximum (accroche, promesse, appel a l'action), sans
// reprendre le detail des diapos. Voir SKILL.md, section "Texte du post".
// Cette regle est SPECIFIQUE au carrousel et prime sur la fourchette
// 1300-1900 caracteres de linkedin-mise-en-forme (qui vaut pour un POST DE
// TEXTE, pas pour la legende courte d'un document) -- LONGUEUR_MIN/MAX sont
// donc des bornes de bon sens (pas de legende vide, pas de derapage vers un
// post-texte complet), pas une reprise de cette fourchette.
const LONGUEUR_MIN = 60;
const LONGUEUR_MAX = 700;
const LIGNES_MAX = 5;
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
 * Faille reelle trouvee et corrigee le 25/09/2026 (retour de Julien,
 * carrousel du meme jour, urn:li:ugcPost:7509117168333287425) :
 * "**Passez du declaratif au reel**" passait le controle existant, car
 * CARACTERES_ACCENTUES ne refuse un segment en gras QUE s'il contient deja
 * un accent -- un mot ecrit SANS l'accent qu'il devrait porter (par
 * contournement volontaire ou involontaire de cette meme regle) n'a aucun
 * caractere accentue a detecter, donc passe. Une fois converti en gras
 * Unicode ("Mathematical Bold"), le mot devient de toute facon invisible a
 * validerAccents (plage de caracteres hors A-Za-zÀ-ÖØ-öø-ÿ) -- aucun filet
 * ne le rattrapait plus loin. Verifie donc ICI, sur le segment brut
 * (pre-conversion), que ses mots ne figurent pas dans la liste fermee des
 * mots toujours accentues -- meme liste que validerAccents
 * (lib/valider-orthographe.js), donc "declaratif"/"reel" y sont desormais
 * couverts sans dupliquer la liste. Voir test/adversarial-25-09.test.js.
 */
function verifierMotsAccentuesEnGras(segment) {
  const regexMot = /[A-Za-zÀ-ÖØ-öø-ÿ']+/gu;
  let correspondance;
  while ((correspondance = regexMot.exec(segment)) !== null) {
    const mot = correspondance[0];
    const clef = mot.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(MOTS_SANS_ACCENT_VERS_CORRECT, clef)) {
      throw new Error(
        `Post refuse : le passage en gras "${segment}" contient "${mot}", qui doit s'ecrire ` +
        `"${MOTS_SANS_ACCENT_VERS_CORRECT[clef]}" -- mais les lettres grasses Unicode n'existent ` +
        `pas accentuees, donc ce mot ne peut pas etre ecrit correctement a l'interieur d'un gras. ` +
        `Sortez-le du passage en gras (ecrivez-le en clair, correctement accentue) ou reformulez.`
      );
    }
  }
}

/**
 * Convertit chaque `**segment**` du brouillon en gras Unicode. Refuse si un
 * segment en gras contient un accent (aucune forme grasse Unicode accentuee
 * n'existe -- la conversion serait silencieusement incorrecte), si un
 * segment en gras contient un mot de la liste fermee des mots toujours
 * accentues mais ecrit sans son accent (meme motif, contourne autrement --
 * voir verifierMotsAccentuesEnGras ci-dessus), ou si aucun segment en gras
 * n'est present du tout (post sans gras = refuse).
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
    verifierMotsAccentuesEnGras(segment);
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

/**
 * Retour de Julien (25/09/2026) : le texte d'un post de carrousel fait 5
 * lignes maximum -- accroche, promesse, appel a l'action -- il ne repete
 * jamais le detail des diapos. Compte les lignes non vides (une ligne
 * blanche separant deux paragraphes ne compte pas comme une ligne).
 */
function validerNombreLignes(texte) {
  const lignes = texte.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lignes.length > LIGNES_MAX) {
    throw new Error(
      `Post refuse : ${lignes.length} lignes de texte, maximum ${LIGNES_MAX} pour un post de ` +
      `carrousel (accroche, promesse, appel a l'action) -- ne repetez pas le detail des diapos.`
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

// Bug reel trouve par test adversarial le 22/09/2026 : le caractere fullwidth "＃"
// (U+FF03, visuellement identique au diese ASCII, parfois utilise par un clavier ou un
// copier-coller) n'etait pas reconnu du tout -- "＃un ＃deux ＃trois" passait sans
// declencher la limite de 2. Les deux caracteres sont desormais equivalents ici.
const CARACTERE_DIESE = '[#＃]';

function validerHashtags(texte) {
  const texteSansFin = texte.trimEnd();
  const REGEX_BLOC_FINAL = new RegExp(`(?:^|\\s)((?:${CARACTERE_DIESE}[^\\s#＃]+\\s*){1,})$`);
  const correspondanceFinale = texteSansFin.match(REGEX_BLOC_FINAL);
  const hashtagsFinaux = correspondanceFinale ? correspondanceFinale[1].trim().split(/\s+/) : [];

  const totalHashtags = (texte.match(new RegExp(`${CARACTERE_DIESE}[^\\s#＃]+`, 'g')) || []).length;
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

// Bug reel trouve par test adversarial le 22/09/2026 : "commentez\s+oui" et "partagez\s+si"
// n'attrapent le separateur qu'en espace(s) simple(s) -- "C O M M E N T E Z   O U I"
// (une lettre par groupe), "commentez-oui" (tiret) et "commentez : oui" (ponctuation)
// passaient tous les trois sans etre detectes, alors que ce sont la meme demande
// d'engagement que la regle interdit deja. Verifie sur une version du texte NORMALISEE
// (lettres minuscules uniquement, tout separateur retire) en plus des regex ci-dessus --
// cette normalisation ne s'applique qu'a ces deux motifs precis, pas a toute la banque
// (les autres motifs dependent d'un ordre de mots ou d'une syntaxe qui perdrait son sens
// une fois compactee).
const MOTIFS_COMPACTS = [
  { motif: 'demande d\'engagement ("commentez OUI")', compact: /commentezoui/ },
  { motif: 'demande d\'engagement ("partagez si...")', compact: /partagezsi/ },
];

function validerInterdits(texte) {
  const compact = texte
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z]/g, ''); // ne garde que les lettres : espaces, tirets, ponctuation disparaissent
  for (const { motif, compact: regexCompact } of MOTIFS_COMPACTS) {
    if (regexCompact.test(compact)) {
      throw new Error(
        `Post refuse : formulation interdite detectee (${motif}), meme espacee/ponctuee pour ` +
        `contourner la detection.`
      );
    }
  }
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
  const sourceFinale = contientLigneSourceFinale(texte);
  let correspondance;
  while ((correspondance = REGEX_CHIFFRE.exec(texte)) !== null) {
    const debutFenetre = Math.max(0, correspondance.index - 80);
    const finFenetre = correspondance.index + correspondance[0].length + 60;
    const fenetre = texte.slice(debutFenetre, finFenetre);
    if (!/\(\s*source\s*:/i.test(fenetre)) {
      if (sourceFinale && estDetailAnecdote(texte, correspondance)) continue;
      throw new Error(
        `Post refuse : le chiffre "${correspondance[0]}" n'a pas de source attachee ` +
        `(attendu : "(source : ...)" juste avant ou apres). Contexte : "${fenetre}".`
      );
    }
    verifierSourceNonVague(fenetre, correspondance[0]);
  }
}

/**
 * Affinement du 21/09/2026 (demande de Nomena, post de veille Allie K. Miller) : une source
 * collee "(source : ...)" n'est exigee que pour un chiffre qui sert de PREUVE (pourcentage,
 * volume/comptage, classement, montant, donnee d'etude). Un chiffre qui n'est qu'un DETAIL
 * DESCRIPTIF d'anecdote (age, annee/date, duree, nombre de personnes) est dispense de la
 * parenthese collee A CONDITION que le post porte une ligne "Source : ..." unique (non vague)
 * qui couvre l'ensemble de l'anecdote. Liste FERMEE de motifs : tout chiffre qui n'y entre pas
 * reste soumis a la regle stricte, donc un oubli de la liste ne dispense jamais. Garde-fou :
 * "N personnes"/"N ans" dans une fenetre de sondage/etude/enquete ("1 000 personnes
 * interrogees") est une donnee d'etude, jamais un detail d'anecdote.
 */
function contientLigneSourceFinale(texte) {
  const correspondance = texte.match(/^[ \t]*Source[ \t]*:[ \t]*(.+)$/im);
  if (!correspondance) return false;
  const contenu = correspondance[1].trim();
  return contenu.length > 0 && !SOURCES_VAGUES.some((regex) => regex.test(contenu));
}

function versAscii(fragment) {
  // Gras Unicode ("Mathematical Bold") -> ASCII, pour lire "𝟕𝟗 𝐚𝐧𝐬" comme "79 ans".
  return [...fragment].map((c) => {
    const cp = c.codePointAt(0);
    if (cp >= 0x1D7CE && cp <= 0x1D7D7) return String.fromCharCode(48 + cp - 0x1D7CE);
    if (cp >= 0x1D400 && cp <= 0x1D419) return String.fromCharCode(65 + cp - 0x1D400);
    if (cp >= 0x1D41A && cp <= 0x1D433) return String.fromCharCode(97 + cp - 0x1D41A);
    return c;
  }).join('');
}

const MOTS_ETUDE = /(sondage|[eé]tudes?|enqu[eê]te|barom[eè]tre|interrog|selon|rapport|classement|index)/i;

function estDetailAnecdote(texte, correspondance) {
  const chiffre = versAscii(correspondance[0]);
  const debut = correspondance.index;
  const fin = debut + correspondance[0].length;
  const apres = versAscii(texte.slice(fin, fin + 30));
  const avant = versAscii(texte.slice(Math.max(0, debut - 12), debut));
  const fenetreLarge = versAscii(texte.slice(Math.max(0, debut - 80), fin + 60));

  // Date jj/mm(/aaaa) : le chiffre fait partie d'une date.
  if (/\d{1,2}\/\d{1,2}(\/\d{2,4})?/.test(versAscii(texte.slice(Math.max(0, debut - 6), fin + 6)))) return true;
  // Annee isolee (ni suivie de %, ni collee a un autre chiffre).
  if (/^(19|20)\d{2}$/.test(chiffre) && !/^\s*%/.test(apres) && !/[\d.,]$/.test(avant.trimEnd())) return true;

  // Un signe de preuve a cote (pourcentage, monnaie, +/-) n'est jamais un detail d'anecdote.
  if (/^\s*(%|€|\$|euros?)/i.test(apres) || /[+\-€$]\s*$/.test(avant)) return false;

  if (/^\s*(h|heures?|minutes?|min|secondes?|jours?|semaines?|mois)\b/i.test(apres)) return true;
  if (/^\s*(ans?|ann[eé]es?|personnes?|participants?|salari[eé]s?|collaborateurs?|invit[eé]s?|convives?)\b/i.test(apres)) {
    return !MOTS_ETUDE.test(fenetreLarge);
  }
  return false;
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
  // Verifie sur le BROUILLON brut (avant conversion du gras) : un anglicisme
  // ecrit a l'interieur d'un passage **en gras** deviendrait invisible a une
  // regex ASCII une fois converti en gras Unicode (meme raison que
  // verifierMotsAccentuesEnGras plus haut) -- ecrit ici pour couvrir les deux
  // cas sans dupliquer la logique de detection.
  validerAnglicismes(brouillon, 'texte du post');
  const texteFinal = convertirGras(brouillon);
  validerLongueur(texteFinal);
  validerNombreLignes(texteFinal);
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
  validerNombreLignes,
  validerAccroche,
  validerEmojis,
  validerHashtags,
  validerInterdits,
  validerChiffreSource,
  validerAccents,
  validerAnglicismes,
  LONGUEUR_MIN,
  LONGUEUR_MAX,
  LIGNES_MAX,
  FENETRE_ACCROCHE,
  EMOJIS_MIN,
  EMOJIS_MAX,
  HASHTAGS_MAX,
};
