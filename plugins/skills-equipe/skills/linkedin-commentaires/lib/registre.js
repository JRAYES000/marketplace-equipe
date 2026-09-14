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

const CHEMIN_PAR_DEFAUT = path.join(__dirname, '..', 'data', 'registre-commentaires.json');

function chargerRegistre(chemin = CHEMIN_PAR_DEFAUT) {
  if (!fs.existsSync(chemin)) return {};
  return JSON.parse(fs.readFileSync(chemin, 'utf-8'));
}

function sauvegarderRegistre(registre, chemin = CHEMIN_PAR_DEFAUT) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, JSON.stringify(registre, null, 2), 'utf-8');
}

function entreesDuJour(registre, compte, jourISO) {
  return (registre[compte] || []).filter((e) => e.date === jourISO);
}

/**
 * Ajoute une entree au registre et le persiste. A appeler seulement APRES
 * une publication reelle confirmee (pas au moment de la redaction) -- sinon
 * un brouillon jamais publie compterait a tort dans le quota du jour.
 */
function enregistrerCommentairePublie(compte, { date, auteurCible, postId }, chemin = CHEMIN_PAR_DEFAUT) {
  const registre = chargerRegistre(chemin);
  registre[compte] = registre[compte] || [];
  registre[compte].push({ date, auteurCible, postId });
  sauvegarderRegistre(registre, chemin);
  return registre;
}

module.exports = {
  chargerRegistre,
  sauvegarderRegistre,
  entreesDuJour,
  enregistrerCommentairePublie,
  CHEMIN_PAR_DEFAUT,
};
