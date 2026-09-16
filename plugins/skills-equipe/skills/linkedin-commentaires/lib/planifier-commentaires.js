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
 * Plafond dur de fraicheur (ajoute le 16/09/2026, incident reel : un post
 * vieux de 5 mois avait ete propose dans le lot du jour, faute de tout garde-
 * fou empechant ce cas -- la fenetre de 4h n'etait qu'une PRIORITE de tri,
 * jamais une limite qui refuse). 48h choisi comme plafond raisonnable : au-
 * dela, un commentaire ne sera plus vu par personne (le post a deja fini son
 * cycle de visibilite du fil), et poster dessus quand meme donne l'image de
 * quelqu'un qui racle le fil pour remplir un quota -- contraire a la raison
 * d'etre de la regle de fraicheur, pas seulement a sa lettre. Consequence
 * assumee : si aucun post n'est ni frais (<4h) ni acceptable (<48h) sur un
 * compte donne, le bon comportement est desormais de ne RIEN proposer pour ce
 * compte ce jour-la (repli vide), plutot que l'ancien repli "poster le plus
 * recent en le signalant" -- ce repli-la n'a plus de sens des qu'un plafond
 * dur existe.
 */
const FRAICHEUR_MAX_HEURES = 48;

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

/**
 * Leve une erreur si `post` depasse le plafond dur FRAICHEUR_MAX_HEURES --
 * appele explicitement avant tout commentaire sur un post hors de la fenetre
 * des 4h (le repli documente), jamais un simple avertissement. `maintenant`
 * injectable pour des tests deterministes, comme filtrerPostsFrais.
 */
function validerFraicheurMaximale(post, maintenant = new Date()) {
  if (!post || !post.postedAt) {
    throw new Error('Commentaire refuse : post sans date de publication (postedAt), fraicheur non verifiable.');
  }
  const ageMs = maintenant.getTime() - new Date(post.postedAt).getTime();
  const ageHeures = ageMs / (60 * 60 * 1000);
  if (ageHeures > FRAICHEUR_MAX_HEURES) {
    throw new Error(
      `Commentaire refuse : post publie il y a ${ageHeures.toFixed(1)}h, au-dela du plafond de ` +
      `${FRAICHEUR_MAX_HEURES}h -- ce post ne sera plus vu par personne, le commenter donnerait ` +
      "l'image de quelqu'un qui racle le fil pour remplir un quota."
    );
  }
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
  validerFraicheurMaximale,
  dateJourISO,
  FENETRE_FRAICHEUR_HEURES,
  QUOTA_MAX_PAR_JOUR,
  FRAICHEUR_MAX_HEURES,
};
