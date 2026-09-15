'use strict';

/**
 * Registre persistant des posts recycles/inspires reellement publies --
 * necessaire pour faire respecter "trois par semaine maximum, jamais deux le
 * meme jour" (SKILL.md, section "Publication") d'un lancement de la skill a
 * l'autre. Meme modele que linkedin-commentaires/lib/registre.js -- audit du
 * 15/09/2026 : la regle etait documentee dans le SKILL.md et le README de
 * a-publier/, mais rien ne la faisait respecter dans le code (voir
 * etat.js avant cette date, qui le disait explicitement : "cette skill ne
 * tient aucun registre de publication reelle").
 *
 * Stocke dans data/registre-veille.json (gitignore, comme le reste de data/
 * dans ce paquet -- donnees d'usage reel, pas du code). Format :
 *   { "<compte>": [ { "date": "AAAA-MM-JJ", "postId": "...", "auteurOriginal": "..." }, ... ] }
 *
 * Limite assumee : ce registre ne se remplit QUE si `enregistrerPostPublie`
 * est reellement appele apres une publication confirmee -- la voie reelle en
 * usage courant (Buffer, programmation via l'interface, voir SKILL.md) n'est
 * pas scriptable depuis ce paquet. C'est a la session Claude qui programme un
 * post dans Buffer d'appeler ensuite ce module (ou le script CLI
 * `enregistrer-publication.js`) avec la date reellement programmee -- jamais
 * en anticipant, jamais devine.
 */

const fs = require('fs');
const path = require('path');

const CHEMIN_PAR_DEFAUT = path.join(__dirname, '..', 'data', 'registre-veille.json');

/**
 * Audit adversarial du 15/09/2026 (sous-agent dedie) : un registre corrompu
 * sur disque faisait planter `chargerRegistre` avec un `SyntaxError` brut --
 * contraire a la regle "rien ne plante a vide" du brief. Message explicite
 * desormais.
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
 * pour le MEME compte reel, permettant de depasser le quota hebdomadaire ou
 * de publier deux fois le meme jour en variant simplement la casse ou
 * l'orthographe de `compte` d'un appel a l'autre.
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

const REGEX_JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/;

function validerJourISO(jourISO, contexte) {
  if (!REGEX_JOUR_ISO.test(String(jourISO || ''))) {
    throw new Error(
      `${contexte} refuse : date "${jourISO}" hors du format attendu "AAAA-MM-JJ" -- une date avec ` +
      'heure/fuseau ou un autre format casserait silencieusement la comparaison "meme jour".'
    );
  }
}

/**
 * Lundi 00:00 (ISO, semaine europeenne) de la semaine contenant `jourISO`
 * ("AAAA-MM-JJ"). Calcul en UTC pour rester deterministe quel que soit le
 * fuseau d'execution -- seule la partie date (pas l'heure) importe ici.
 */
function debutSemaineISO(jourISO) {
  validerJourISO(jourISO, 'debutSemaineISO');
  const date = new Date(`${jourISO}T00:00:00.000Z`);
  const jourSemaine = date.getUTCDay(); // 0 = dimanche, 1 = lundi, ...
  const decalage = jourSemaine === 0 ? 6 : jourSemaine - 1;
  date.setUTCDate(date.getUTCDate() - decalage);
  return date.toISOString().slice(0, 10);
}

/**
 * Entrees du registre pour `compte` tombant dans la meme semaine (lundi a
 * dimanche) que `jourISO`. Audit adversarial du 15/09/2026 : une entree du
 * registre dont `date` n'est pas au format "AAAA-MM-JJ" strict (ex. avec une
 * heure) est desormais ignoree plutot que de fausser silencieusement la
 * comparaison "meme jour" faite ensuite par `validerQuotaHebdomadaire` (qui,
 * elle, compare par egalite stricte -- voir lib/planifier-veille.js).
 */
function entreesDeLaSemaine(registre, compte, jourISO) {
  const compteNormalise = normaliserCompte(compte);
  const debut = debutSemaineISO(jourISO);
  const finExclusive = new Date(`${debut}T00:00:00.000Z`);
  finExclusive.setUTCDate(finExclusive.getUTCDate() + 7);
  const finISO = finExclusive.toISOString().slice(0, 10);
  return (registre[compteNormalise] || []).filter(
    (e) => REGEX_JOUR_ISO.test(String(e.date || '')) && e.date >= debut && e.date < finISO
  );
}

/**
 * Ajoute une entree au registre et le persiste. A appeler seulement APRES
 * une publication reelle confirmee (programmation Buffer verifiee, ou appel
 * direct publierPost() reussi) -- sinon un brouillon jamais publie
 * compterait a tort dans le quota de la semaine.
 */
function enregistrerPostPublie(compte, { date, postId, auteurOriginal }, chemin = CHEMIN_PAR_DEFAUT) {
  const compteNormalise = normaliserCompte(compte);
  validerJourISO(date, 'enregistrerPostPublie');
  const registre = chargerRegistre(chemin);
  registre[compteNormalise] = registre[compteNormalise] || [];
  registre[compteNormalise].push({ date, postId: postId || null, auteurOriginal: auteurOriginal || null });
  sauvegarderRegistre(registre, chemin);
  return registre;
}

module.exports = {
  chargerRegistre,
  sauvegarderRegistre,
  debutSemaineISO,
  entreesDeLaSemaine,
  enregistrerPostPublie,
  normaliserCompte,
  validerJourISO,
  COMPTES_VALIDES,
  CHEMIN_PAR_DEFAUT,
};
