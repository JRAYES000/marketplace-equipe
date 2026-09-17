'use strict';

/**
 * Registre persistant des commentaires reellement publies -- necessaire pour
 * faire respecter "5 par jour maximum" et "jamais deux fois la meme personne
 * le meme jour" (brief section 6) d'un lancement de la skill a l'autre.
 *
 * Stocke dans data/registre-commentaires.json (gitignore, comme le reste de
 * data/ dans ce paquet -- donnees d'usage reel, pas du code). Format :
 *   { "<compte>": [ { "date": "AAAA-MM-JJ", "auteurCible": "...", "postId": "..." }, ... ] }
 */

const fs = require('fs');
const path = require('path');
const { resoudreCompteParUrn } = require('../../../lib/composio-canal');

const CHEMIN_PAR_DEFAUT = path.join(__dirname, '..', 'data', 'registre-commentaires.json');

/**
 * Audit adversarial du 15/09/2026 (sous-agent dédié) : un registre corrompu
 * sur disque faisait planter `chargerRegistre` avec un `SyntaxError` brut
 * (position/ligne JSON, aucune indication du fichier ni de la marche à
 * suivre) -- contraire à la regle "rien ne plante a vide" du brief. Message
 * explicite desormais, comme tout autre garde-fou de ce paquet.
 */
function chargerRegistre(chemin = CHEMIN_PAR_DEFAUT) {
  if (!fs.existsSync(chemin)) return {};
  const brut = fs.readFileSync(chemin, 'utf-8');
  try {
    return JSON.parse(brut);
  } catch (erreur) {
    throw new Error(
      `Registre illisible : "${chemin}" ne contient pas du JSON valide (${erreur.message}). ` +
      'Corrigez ou supprimez ce fichier a la main avant de relancer -- jamais suppose vide ' +
      'silencieusement, un registre corrompu pourrait masquer un quota deja atteint.'
    );
  }
}

function sauvegarderRegistre(registre, chemin = CHEMIN_PAR_DEFAUT) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, JSON.stringify(registre, null, 2), 'utf-8');
}

/**
 * Comptes reellement geres par ce paquet (voir reglages-comptes.json).
 * Audit adversarial du 15/09/2026 : `registre[compte]` etait un acces brut a
 * une cle d'objet JS, sans normalisation -- "julien-agency" vs
 * "Julien-Agency" vs "julien_agency" creaient chacun un historique separe
 * pour le MEME compte reel, permettant de depasser le quota journalier ou de
 * recommenter la meme personne le meme jour en variant simplement la casse
 * ou l'orthographe de `compte` d'un appel a l'autre. `normaliserCompte`
 * refuse desormais tout ce qui n'est pas exactement l'un de ces deux
 * identifiants (apres trim/minuscule) plutot que de creer silencieusement
 * une nouvelle cle.
 */
const COMPTES_VALIDES = ['julien-agency', 'julien-partners'];

function normaliserCompte(compte) {
  const normalise = String(compte || '').trim().toLowerCase();
  if (!COMPTES_VALIDES.includes(normalise)) {
    throw new Error(
      `Registre refuse : compte "${compte}" inconnu, attendu l'un de : ${COMPTES_VALIDES.join(', ')} ` +
      '(comparaison apres trim/minuscule -- variantes de casse ou d\'orthographe refusees explicitement ' +
      'pour ne jamais fragmenter silencieusement le quota d\'un meme compte reel).'
    );
  }
  return normalise;
}

/**
 * Audit adversarial du 15/09/2026 : `e.date === jourISO` etait une egalite
 * de chaines stricte -- une date fournie avec une heure/fuseau
 * ("2026-09-15T18:00:00.000Z") ou un espace ("2026-09-15 18:00") au lieu du
 * format "AAAA-MM-JJ" documente ne matchait JAMAIS une entree existante au
 * meme format, laissant passer un doublon le meme jour. `jourISO` est
 * desormais valide strictement ; toute entree du registre au format
 * different est ignoree plutot que de fausser silencieusement la comparaison
 * (comportement inchange pour un registre ecrit correctement).
 */
const REGEX_JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/;

function validerJourISO(jourISO, contexte) {
  if (!REGEX_JOUR_ISO.test(String(jourISO || ''))) {
    throw new Error(
      `${contexte} refuse : date "${jourISO}" hors du format attendu "AAAA-MM-JJ" -- une date avec ` +
      'heure/fuseau ou un autre format casserait silencieusement la comparaison de quota.'
    );
  }
}

function entreesDuJour(registre, compte, jourISO) {
  const compteNormalise = normaliserCompte(compte);
  validerJourISO(jourISO, 'entreesDuJour');
  return (registre[compteNormalise] || []).filter((e) => REGEX_JOUR_ISO.test(String(e.date || '')) && e.date === jourISO);
}

/**
 * Ajoute une entree au registre et le persiste. A appeler seulement APRES
 * une publication reelle confirmee (pas au moment de la redaction) -- sinon
 * un brouillon jamais publie compterait a tort dans le quota du jour.
 *
 * FAILLE REELLE trouvee le 17/09/2026 (suite), a partir d'une question posee
 * sur l'ecart entre le nombre de commentaires "10" mentionne dans le suivi
 * de mission et les 5 entrees reellement presentes ici pour le 16/09/2026 :
 * `compte` etait jusqu'ici un texte libre, jamais confronte a l'identite
 * LinkedIn REELLEMENT utilisee pour publier. Avant le 17/09/2026 (avant
 * `verifierConnexionAvantPublication`), le canal MCP resolvait tout appel
 * vers la connexion "preferee" (julien-agency/aFqu-W7ClW) quel que soit le
 * compte vise -- un commentaire redige et compte comme "julien-partners"
 * pouvait donc reellement atterrir sur le profil julien-agency SANS que la
 * quota d'agency n'en tienne jamais compte, puisque l'entree etait
 * enregistree sous la cle "julien-partners". La redirection devenait ainsi
 * un moyen silencieux de depasser le quota reel d'un compte.
 *
 * Corrige : si `actorUrn` est fourni, il doit correspondre au `compte`
 * declare (via `resoudreCompteParUrn`, lib/composio-canal.js) -- refuse
 * explicitement sinon, plutot que d'enregistrer une entree sous un compte
 * qui ne correspond pas a l'identite reellement utilisee. `actorUrn` reste
 * optionnel (retro-compatible avec les appels existants qui ne le
 * fournissent pas encore) mais DEVRAIT toujours etre passe desormais --
 * c'est l'URN reellement confirme par `verifierConnexionAvantPublication`
 * juste avant l'appel qui a produit la publication, jamais suppose.
 */
function enregistrerCommentairePublie(compte, { date, auteurCible, postId, actorUrn }, chemin = CHEMIN_PAR_DEFAUT) {
  const compteNormalise = normaliserCompte(compte);
  validerJourISO(date, 'enregistrerCommentairePublie');
  if (actorUrn) {
    const compteReel = resoudreCompteParUrn(actorUrn);
    if (compteReel !== compteNormalise) {
      throw new Error(
        `Registre refuse : le compte declare "${compte}" ne correspond pas au compte reel "${compteReel}" ` +
        `de l'URN "${actorUrn}" -- un commentaire publie sous une identite doit compter dans SON quota, ` +
        'jamais dans celui d\'un autre compte, meme si c\'etait le compte initialement vise.'
      );
    }
  }
  const registre = chargerRegistre(chemin);
  registre[compteNormalise] = registre[compteNormalise] || [];
  registre[compteNormalise].push({ date, auteurCible, postId });
  sauvegarderRegistre(registre, chemin);
  return registre;
}

module.exports = {
  chargerRegistre,
  sauvegarderRegistre,
  entreesDuJour,
  enregistrerCommentairePublie,
  normaliserCompte,
  validerJourISO,
  COMPTES_VALIDES,
  CHEMIN_PAR_DEFAUT,
};
