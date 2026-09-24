'use strict';

/**
 * Source unique de verite pour les 6 modeles de page (refonte du 24/09/2026,
 * demande de Julien) : la liste des modeles valides, la resolution du
 * modele reellement rendu pour une diapo donnee, et la liste des champs
 * VISIBLES de ce modele -- partagees entre le rendu (generer-pdf.js) et la
 * validation (lib/valider-diapos.js), pour que les deux s'accordent
 * toujours sur "ce qui s'affiche vraiment" sans dupliquer la logique.
 *
 * Correction du 24/09/2026 (retour de Julien sur le premier carrousel de
 * test) : le compte de mots comptait seulement titre+texte, jamais les
 * champs propres aux nouveaux modeles (chiffre, items, colonnes, citation) --
 * une checklist a items tres longs passait donc la validation en debordant
 * reellement de la diapo. `champsVisibles` ci-dessous liste EXACTEMENT ce
 * que chaque modele affiche a l'ecran, rien de plus (ex. un `titre` fourni
 * sur une diapo "citation" n'est jamais rendu par ce modele -- il ne doit
 * donc pas etre compte non plus).
 */

const MODELES_VALIDES = new Set([
  'accroche',
  'gros-chiffre',
  'comparaison',
  'checklist',
  'citation',
  'cta',
]);

/**
 * Meme regle que le rendu (generer-pdf.js, injecterDiapo) : un `modele`
 * explicite et valide gagne toujours ; sinon "accroche" (rendu historique --
 * hook ou page de contenu generique, tous deux au champ "titre"+"texte").
 */
function resoudreModele(diapo) {
  return MODELES_VALIDES.has(diapo.modele) ? diapo.modele : 'accroche';
}

/**
 * Tableau des CHAINES effectivement affichees a l'ecran pour ce modele --
 * jamais un champ que le gabarit n'utilise pas pour ce modele precis.
 * Valeurs absentes/vides filtrees par l'appelant (voir compterMotsVisibles).
 */
function champsVisibles(diapo, modele = resoudreModele(diapo)) {
  const colonneGauche = diapo.colonneGauche || {};
  const colonneDroite = diapo.colonneDroite || {};

  switch (modele) {
    case 'gros-chiffre':
      return [diapo.titre, diapo.chiffre, diapo.texte];
    case 'comparaison':
      return [
        diapo.titre,
        colonneGauche.titre,
        ...(Array.isArray(colonneGauche.items) ? colonneGauche.items : []),
        colonneDroite.titre,
        ...(Array.isArray(colonneDroite.items) ? colonneDroite.items : []),
      ];
    case 'checklist':
      return [diapo.titre, ...(Array.isArray(diapo.items) ? diapo.items : [])];
    case 'citation':
      return [diapo.citation, diapo.auteur];
    case 'cta':
      return [diapo.titre, diapo.texte, diapo.bouton];
    case 'accroche':
    default:
      return [diapo.titre, diapo.texte];
  }
}

module.exports = { MODELES_VALIDES, resoudreModele, champsVisibles };
