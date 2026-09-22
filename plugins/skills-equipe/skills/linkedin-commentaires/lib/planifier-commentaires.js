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
 *
 * Bug reel trouve par test adversarial le 22/09/2026 : une date de
 * publication FUTURE ou manifestement invalide (chaine non parsable)
 * passait ce garde-fou SANS ERREUR. Cause : `ageHeures > FRAICHEUR_MAX_HEURES`
 * est `false` a la fois pour un age negatif (post future : `new Date(...)`
 * dans le futur donne un `ageMs` negatif) et pour un age `NaN` (date
 * invalide : `new Date('n-importe-quoi').getTime()` vaut `NaN`, et toute
 * comparaison avec `NaN` est `false` en JavaScript) -- l'absence de rejet
 * etait silencieusement interpretee comme "assez frais". Contrairement a
 * `filtrerPostsFrais` (simple tri/filtre pour la fenetre de 4h, ou l'age
 * negatif est deja exclu via `age >= 0`), cette fonction-ci est le
 * VERITABLE garde-fou dur avant publication -- son role est justement de ne
 * jamais laisser passer une donnee suspecte sans le dire. Les deux cas
 * levent desormais une erreur explicite, distincte du cas "trop vieux".
 */
function validerFraicheurMaximale(post, maintenant = new Date()) {
  if (!post || !post.postedAt) {
    throw new Error('Commentaire refuse : post sans date de publication (postedAt), fraicheur non verifiable.');
  }
  const datePublication = new Date(post.postedAt);
  const ageMs = maintenant.getTime() - datePublication.getTime();
  if (Number.isNaN(ageMs)) {
    throw new Error(
      `Commentaire refuse : date de publication "${post.postedAt}" invalide (non parsable), ` +
      'fraicheur non verifiable -- jamais suppose "assez frais" faute de pouvoir calculer un age.'
    );
  }
  if (ageMs < 0) {
    throw new Error(
      `Commentaire refuse : post avec une date de publication future ("${post.postedAt}"), ` +
      'manifestement invalide -- un post ne peut pas avoir ete publie apres maintenant.'
    );
  }
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
/**
 * Meme faille que celle trouvee par l'audit adversarial du 15/09/2026 sur
 * `compte` (voir `normaliserCompte`, lib/registre.js) : `e.auteurCible ===
 * auteurCible` etait une egalite de chaines stricte. Cas reel trouve le
 * 17/09/2026 : "Theophile Burnet" et "Theophile Burnet ⚡️" (nom exact
 * renvoye par Apify pour la meme personne, avec emoji de fin) sont deux
 * chaines differentes pour l'egalite stricte -- la regle "jamais deux fois
 * la meme personne le meme jour" tomberait silencieusement.
 *
 * Normalisation volontairement CONSERVATRICE : casse, espaces de debut/fin,
 * espaces INTERNES multiples, et emojis/symboles de fin de nom uniquement.
 * Les accents sont preserves (deux vraies personnes ne doivent jamais
 * fusionner), tout comme le contenu du nom lui-meme -- seule la mise en
 * forme (espaces, decoration de fin) est ignoree.
 *
 * Bug reel trouve par test adversarial le 22/09/2026 : avant l'ajout du
 * `.replace(/\s+/g, ' ')` ci-dessous, "Theophile Burnet" et
 * "Theophile  Burnet" (double espace entre prenom et nom -- variation
 * plausible d'une extraction Apify ou d'une frappe manuelle) restaient deux
 * chaines DIFFERENTES apres normalisation, malgre `.trim()` : celui-ci ne
 * touche que les extremites, jamais l'interieur. La regle "jamais deux fois
 * la meme personne le meme jour" tombait donc silencieusement pour la MEME
 * personne reelle, exactement comme la casse ou la decoration de fin avant
 * elles. `\s` en JavaScript capture aussi l'espace insecable (U+00A0),
 * couvert par le meme remplacement sans configuration supplementaire.
 */
const REGEX_DECORATION_FIN_NOM = /[\s‍️\p{Extended_Pictographic}]+$/u;

function normaliserAuteurCible(auteurCible) {
  return String(auteurCible == null ? '' : auteurCible)
    .trim()
    .replace(REGEX_DECORATION_FIN_NOM, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function validerQuotaJournalier(entreesDuJour, { auteurCible }) {
  if (entreesDuJour.length >= QUOTA_MAX_PAR_JOUR) {
    throw new Error(
      `Commentaire refuse : quota journalier atteint (${entreesDuJour.length}/${QUOTA_MAX_PAR_JOUR} deja publies aujourd'hui pour ce compte).`
    );
  }
  const cibleNormalisee = normaliserAuteurCible(auteurCible);
  const dejaCommenteAujourdhui = entreesDuJour.some((e) => normaliserAuteurCible(e.auteurCible) === cibleNormalisee);
  if (dejaCommenteAujourdhui) {
    throw new Error(
      `Commentaire refuse : "${auteurCible}" a deja recu un commentaire aujourd'hui pour ce compte -- jamais deux fois la meme personne le meme jour.`
    );
  }
}

/**
 * Seuil au-dela duquel un compte cible est signale comme candidat au
 * remplacement (ajoute le 16/09/2026). 28 jours (4 semaines) choisi
 * directement a partir du constat reel du 16/09 sur les 8 comptes
 * julien-agency : le compte le PLUS actif publie tous les 4 jours (Jean
 * ZENDJI), le second tous les 7 jours (Georges Solutions) -- tous les autres
 * sont a plusieurs semaines ou mois. 28 jours separe donc reellement "encore
 * exploitable de temps en temps" de "mort pour l'usage de cette skill", sur
 * les donnees observees, pas un chiffre arbitraire.
 */
const SEUIL_INACTIVITE_JOURS = 28;

/**
 * Repli reel pour le cas "aucun post ne passe le plafond de fraicheur" --
 * ajoute le 16/09/2026 apres le 3e passage consecutif a zero candidat.
 * Avant cette fonction, la skill s'arretait a "zero candidat" sans jamais
 * dire POURQUOI ni proposer d'action -- exactement ce que le brief interdit
 * ("jamais les mains vides : si elle ne trouve rien, elle propose un
 * repli"). `ciblesAvecDernierPost` : `[{ compte, nom, url, postedAt }]`, un
 * item par compte cible, `postedAt` etant la date du post le PLUS RECENT
 * trouve sur ce compte (`null` si aucun post exploitable trouve du tout).
 * Ne leve jamais d'erreur : cette fonction PROPOSE, elle ne refuse rien --
 * le refus reste `validerFraicheurMaximale`/`validerCanalPublicationReel`,
 * appeles en amont sur chaque candidat individuel.
 */
function genererRepliAucunCandidat(ciblesAvecDernierPost, maintenant = new Date()) {
  const avecAge = ciblesAvecDernierPost.map((cible) => {
    const ageJours = cible.postedAt
      ? (maintenant.getTime() - new Date(cible.postedAt).getTime()) / (24 * 60 * 60 * 1000)
      : null;
    return { ...cible, ageJours };
  });

  const tries = [...avecAge].sort((a, b) => {
    if (a.ageJours === null) return 1;
    if (b.ageJours === null) return -1;
    return a.ageJours - b.ageJours;
  });

  const comptesInactifs = avecAge.filter(
    (c) => c.ageJours === null || c.ageJours > SEUIL_INACTIVITE_JOURS
  );

  const plusActif = tries[0];
  const resume = tries.map((c) => {
    const age = c.ageJours === null ? 'aucun post trouve' : `${c.ageJours.toFixed(1)}j`;
    return `${c.nom} (${age})`;
  });

  const message =
    `Aucun candidat : les ${ciblesAvecDernierPost.length} comptes cibles n'ont aucun post sous ` +
    `le plafond de fraicheur. Le plus recent est ${plusActif.nom} a ` +
    `${plusActif.ageJours === null ? 'aucun post trouve' : `${plusActif.ageJours.toFixed(1)} jours`}. ` +
    `Detail par compte, du plus recent au plus ancien : ${resume.join(', ')}.`;

  const recommandation =
    comptesInactifs.length > 0
      ? `${comptesInactifs.length}/${ciblesAvecDernierPost.length} comptes n'ont rien publie ` +
        `depuis plus de ${SEUIL_INACTIVITE_JOURS} jours (${comptesInactifs.map((c) => c.nom).join(', ')}) ` +
        '-- a remplacer dans comptes_cibles par des profils plus actifs plutot que de continuer a ' +
        'les revisiter passage apres passage pour rien.'
      : `Aucun compte au-dela de ${SEUIL_INACTIVITE_JOURS} jours d'inactivite -- l'absence de ` +
        'candidat aujourd\'hui est ponctuelle, pas structurelle.';

  return { message, comptes: tries, comptesInactifs, recommandation };
}

/**
 * Leve une erreur si `compte` n'a pas de canal de publication reel pour les
 * commentaires (ajoute le 16/09/2026, deuxieme incident identique : un lot
 * entier de commentaires prepare pour julien-partners le 15/09/2026 PUIS a
 * nouveau le 16/09/2026, alors que ce compte n'est pas connecte a Composio
 * pour publier des commentaires -- 4 echecs 403 reels le 15/09, refait a
 * l'identique le 16/09 faute de garde-fou. Buffer ne peut pas servir de
 * repli : Buffer publie des posts programmes, jamais un commentaire sous le
 * post d'un tiers. `reglagesComptes` = le contenu de reglages-comptes.json ;
 * le champ requis est `canal_publication_reel` (booleen explicite, jamais
 * devine -- pas de valeur par defaut permissive).
 */
function validerCanalPublicationReel(compte, reglagesComptes) {
  const reglages = reglagesComptes && reglagesComptes[compte];
  if (!reglages || reglages.canal_publication_reel !== true) {
    throw new Error(
      `Commentaire refuse : le compte "${compte}" n'a pas de canal de publication reel pour les ` +
      "commentaires (canal_publication_reel absent ou false dans reglages-comptes.json) -- " +
      'Composio ne connait pas ce compte et Buffer ne sait publier que des posts, jamais des ' +
      "commentaires sous celui d'un tiers. Ne pas preparer de commentaire pour ce compte."
    );
  }
}

module.exports = {
  filtrerPostsFrais,
  validerQuotaJournalier,
  validerFraicheurMaximale,
  validerCanalPublicationReel,
  genererRepliAucunCandidat,
  normaliserAuteurCible,
  dateJourISO,
  FENETRE_FRAICHEUR_HEURES,
  QUOTA_MAX_PAR_JOUR,
  FRAICHEUR_MAX_HEURES,
  SEUIL_INACTIVITE_JOURS,
};
