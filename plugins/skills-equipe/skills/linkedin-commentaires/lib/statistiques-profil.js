'use strict';

/**
 * Releves QUOTIDIENS des statistiques de PROFIL LinkedIn (vues de profil,
 * demandes de contact) -- brief du 10/09/2026, section 6 : « Vues de profil
 * et demandes de contact sont dans mes statistiques LinkedIn, jour par
 * jour ». Ce sont des mesures de PROFIL datees -- un chiffre par jour, valable
 * quel que soit le nombre de commentaires publies ce jour-la -- jamais une
 * propriete d'un commentaire individuel.
 *
 * FAILLE DE CONCEPTION TROUVEE ET CORRIGEE (15/09/2026, avant toute donnee
 * reelle ecrite -- le suivi a 3 jours n'avait pas encore ete execute) : ces
 * deux chiffres etaient jusque-la stockes comme des colonnes PAR LIGNE DE
 * COMMENTAIRE dans Notion ("Vues de profil (3j)", "Demandes de contact
 * (3j)"), et `calculerComparaisonHebdomadaire` (lib/notion.js) les
 * additionnait par ligne. Consequence reelle qu'aurait eue la procedure du
 * 18/09 telle qu'ecrite initialement : les 5 commentaires publies le meme
 * jour portant chacun le MEME chiffre global (ex. 100 vues, lu une seule
 * fois sur le profil) auraient produit 500 dans le tableau de comparaison
 * hebdomadaire -- "le coeur de la skill" selon le brief -- sans que rien ne
 * le signale. Corrige en deplacant ces deux mesures ici, dans un releve
 * quotidien INDEPENDANT du nombre de commentaires publies ce jour : un
 * releve par jour, jamais multiplie par ailleurs.
 *
 * Stocke dans data/statistiques-profil.json (gitignore, meme regle que
 * data/registre-commentaires.json -- donnees d'usage reel, pas du code).
 * Format : { "<AAAA-MM-JJ>": { "vuesProfil": N, "demandesContact": N } }
 */

const fs = require('fs');
const path = require('path');

const CHEMIN_PAR_DEFAUT = path.join(__dirname, '..', 'data', 'statistiques-profil.json');
const REGEX_JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/;

function chargerReleves(chemin = CHEMIN_PAR_DEFAUT) {
  if (!fs.existsSync(chemin)) return {};
  const brut = fs.readFileSync(chemin, 'utf-8');
  try {
    return JSON.parse(brut);
  } catch (erreur) {
    throw new Error(
      `Releves de profil illisibles : "${chemin}" ne contient pas du JSON valide (${erreur.message}). ` +
      'Corrigez ou supprimez ce fichier a la main avant de relancer -- jamais suppose vide silencieusement.'
    );
  }
}

function sauvegarderReleves(releves, chemin = CHEMIN_PAR_DEFAUT) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, JSON.stringify(releves, null, 2), 'utf-8');
}

/**
 * Enregistre (ou remplace) le releve du jour donne. UN releve par jour,
 * jamais plusieurs : un second appel pour la meme date ECRASE le premier
 * (une lecture corrigee remplace l'ancienne) -- il ne s'additionne jamais a
 * elle. C'est ce qui empeche structurellement la faille du 15/09/2026 de
 * revenir : peu importe combien de fois ce script est appele pour la meme
 * date (une fois par commentaire, par erreur, ou dix fois de suite), le
 * chiffre final reste le dernier lu, jamais une somme.
 */
function enregistrerReleveProfil({ date, vuesProfil, demandesContact }, chemin = CHEMIN_PAR_DEFAUT) {
  if (!REGEX_JOUR_ISO.test(String(date || ''))) {
    throw new Error(`Releve refuse : date "${date}" hors du format attendu "AAAA-MM-JJ".`);
  }
  if (vuesProfil === undefined && demandesContact === undefined) {
    throw new Error('Releve refuse : au moins un des deux chiffres (vuesProfil, demandesContact) est requis.');
  }
  const releves = chargerReleves(chemin);
  const existant = releves[date] || { vuesProfil: 0, demandesContact: 0 };
  releves[date] = {
    vuesProfil: vuesProfil !== undefined ? Number(vuesProfil) : existant.vuesProfil,
    demandesContact: demandesContact !== undefined ? Number(demandesContact) : existant.demandesContact,
  };
  sauvegarderReleves(releves, chemin);
  return releves[date];
}

/**
 * Vue "tableau", triee par date -- forme attendue par
 * `calculerComparaisonHebdomadaire` (lib/notion.js, parametre `relevesProfil`).
 */
function listeReleves(chemin = CHEMIN_PAR_DEFAUT) {
  const releves = chargerReleves(chemin);
  return Object.entries(releves)
    .map(([date, valeurs]) => ({ date, ...valeurs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = {
  chargerReleves,
  sauvegarderReleves,
  enregistrerReleveProfil,
  listeReleves,
  CHEMIN_PAR_DEFAUT,
};
