'use strict';

/**
 * Garde-fous de frequence et de fraicheur (brief Julien du 10/09/2026,
 * section 6) : priorite aux posts recents, quota journalier, jamais deux
 * fois la meme personne le meme jour. Refus explicite, pas un avertissement.
 *
 * L'etat ("qui a deja ete commente aujourd'hui, combien de fois") vit dans un
 * "registre" tenu par l'appelant (voir lib/registre.js) -- ces fonctions ne
 * lisent/ecrivent aucun fichier elles-memes, pour rester testables sans effet
 * de bord et reutilisables quel que soit le format de persistance choisi.
 */

const FENETRE_FRAICHEUR_HEURES = 4;
const QUOTA_MAX_PAR_JOUR = 5;

/**
 * Ne garde que les posts publies il y a moins de FENETRE_FRAICHEUR_HEURES,
 * tries du plus recent au plus ancien -- "tri par heure de publication, pas
 * par popularite". `maintenant` injectable pour des tests deterministes.
 */
function filtrerPostsFrais(posts, maintenant = new Date()) {
  const limiteMs = FENETRE_FRAICHEUR_HEURES * 60 * 60 * 1000;
  return posts
    .filter((post) => {
      if (!post.postedAt) return false;
      const age = maintenant.getTime() - new Date(post.postedAt).getTime();
      return age >= 0 && age <= limiteMs;
    })
    .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
}

function dateJourISO(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Leve une erreur si publier ce commentaire violerait le quota journalier
 * (5 par jour et par compte) ou la regle "jamais deux fois la meme personne
 * le meme jour". `entreesDuJour` : sous-ensemble deja filtre du registre pour
 * (compte, jour) courants -- voir lib/registre.js pour construire ce filtre.
 */
function validerQuotaJournalier(entreesDuJour, { auteurCible }) {
  if (entreesDuJour.length >= QUOTA_MAX_PAR_JOUR) {
    throw new Error(
      `Commentaire refuse : quota journalier atteint (${entreesDuJour.length}/${QUOTA_MAX_PAR_JOUR} deja publies aujourd'hui pour ce compte).`
    );
  }
  const dejaCommenteAujourdhui = entreesDuJour.some((e) => e.auteurCible === auteurCible);
  if (dejaCommenteAujourdhui) {
    throw new Error(
      `Commentaire refuse : "${auteurCible}" a deja recu un commentaire aujourd'hui pour ce compte -- jamais deux fois la meme personne le meme jour.`
    );
  }
}

module.exports = {
  filtrerPostsFrais,
  validerQuotaJournalier,
  dateJourISO,
  FENETRE_FRAICHEUR_HEURES,
  QUOTA_MAX_PAR_JOUR,
};
