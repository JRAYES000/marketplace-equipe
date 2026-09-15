'use strict';

/**
 * Garde-fou de frequence pour la publication de posts recycles/inspires
 * (SKILL.md, section "Publication") : trois par semaine maximum, jamais deux
 * le meme jour. Refus explicite, pas un avertissement -- meme modele que
 * linkedin-commentaires/lib/planifier-commentaires.js.
 *
 * L'etat ("combien deja publies cette semaine, quels jours") vit dans un
 * "registre" tenu par l'appelant (voir lib/registre.js) -- cette fonction ne
 * lit/ecrit aucun fichier elle-meme, pour rester testable sans effet de bord.
 *
 * Ne baisse jamais le seuil de score pour remplir ce quota : voir
 * `trierPosts`/`calculerScore` dans lib/veille.js -- `seuilScore` vient
 * uniquement de reglage-score.json, jamais ajuste par ce module ni par aucun
 * autre en fonction du nombre de candidats deja retenus. Si aucun post ne
 * franchit le seuil, la reponse est "aucun candidat cette semaine", jamais un
 * candidat plus faible pousse pour combler le quota.
 */

const QUOTA_MAX_PAR_SEMAINE = 3;

function dateJourISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Leve une erreur si publier ce post violerait le quota hebdomadaire (3 par
 * semaine et par compte) ou la regle "jamais deux le meme jour".
 * `entreesSemaine` : sous-ensemble deja filtre du registre pour (compte,
 * semaine) courants -- voir lib/registre.js pour construire ce filtre.
 * `date` : jour ISO ("AAAA-MM-JJ") auquel ce post serait publie/programme.
 */
function validerQuotaHebdomadaire(entreesSemaine, { date }) {
  if (!date) {
    throw new Error('validerQuotaHebdomadaire : date requise (AAAA-MM-JJ).');
  }

  const dejaPublieCeJour = entreesSemaine.some((e) => e.date === date);
  if (dejaPublieCeJour) {
    throw new Error(
      `Post refuse : un post est deja publie/programme le ${date} pour ce compte -- jamais deux le meme jour.`
    );
  }

  if (entreesSemaine.length >= QUOTA_MAX_PAR_SEMAINE) {
    throw new Error(
      `Post refuse : quota hebdomadaire atteint (${entreesSemaine.length}/${QUOTA_MAX_PAR_SEMAINE} deja publies/programmes cette semaine pour ce compte).`
    );
  }
}

module.exports = {
  validerQuotaHebdomadaire,
  dateJourISO,
  QUOTA_MAX_PAR_SEMAINE,
};
