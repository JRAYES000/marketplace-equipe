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

function chargerRegistre(chemin = CHEMIN_PAR_DEFAUT) {
  if (!fs.existsSync(chemin)) return {};
  return JSON.parse(fs.readFileSync(chemin, 'utf-8'));
}

function sauvegarderRegistre(registre, chemin = CHEMIN_PAR_DEFAUT) {
  fs.mkdirSync(path.dirname(chemin), { recursive: true });
  fs.writeFileSync(chemin, JSON.stringify(registre, null, 2), 'utf-8');
}

/**
 * Lundi 00:00 (ISO, semaine europeenne) de la semaine contenant `jourISO`
 * ("AAAA-MM-JJ"). Calcul en UTC pour rester deterministe quel que soit le
 * fuseau d'execution -- seule la partie date (pas l'heure) importe ici.
 */
function debutSemaineISO(jourISO) {
  const date = new Date(`${jourISO}T00:00:00.000Z`);
  const jourSemaine = date.getUTCDay(); // 0 = dimanche, 1 = lundi, ...
  const decalage = jourSemaine === 0 ? 6 : jourSemaine - 1;
  date.setUTCDate(date.getUTCDate() - decalage);
  return date.toISOString().slice(0, 10);
}

/**
 * Entrees du registre pour `compte` tombant dans la meme semaine (lundi a
 * dimanche) que `jourISO`.
 */
function entreesDeLaSemaine(registre, compte, jourISO) {
  const debut = debutSemaineISO(jourISO);
  const finExclusive = new Date(`${debut}T00:00:00.000Z`);
  finExclusive.setUTCDate(finExclusive.getUTCDate() + 7);
  return (registre[compte] || []).filter((e) => e.date >= debut && e.date < finExclusive.toISOString().slice(0, 10));
}

/**
 * Ajoute une entree au registre et le persiste. A appeler seulement APRES
 * une publication reelle confirmee (programmation Buffer verifiee, ou appel
 * direct publierPost() reussi) -- sinon un brouillon jamais publie
 * compterait a tort dans le quota de la semaine.
 */
function enregistrerPostPublie(compte, { date, postId, auteurOriginal }, chemin = CHEMIN_PAR_DEFAUT) {
  const registre = chargerRegistre(chemin);
  registre[compte] = registre[compte] || [];
  registre[compte].push({ date, postId: postId || null, auteurOriginal: auteurOriginal || null });
  sauvegarderRegistre(registre, chemin);
  return registre;
}

module.exports = {
  chargerRegistre,
  sauvegarderRegistre,
  debutSemaineISO,
  entreesDeLaSemaine,
  enregistrerPostPublie,
  CHEMIN_PAR_DEFAUT,
};
