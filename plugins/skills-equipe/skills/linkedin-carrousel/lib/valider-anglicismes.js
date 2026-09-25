'use strict';

/**
 * Garde-fou : anglicismes courants a la place du mot francais correct. Ajoute
 * le 25/09/2026 (retour de Julien par mail : "processus" et non "process").
 * Meme famille que lib/valider-orthographe.js -- liste FERMEE de mots dont
 * l'equivalent francais est sans ambiguite, pas une detection generale
 * d'anglais. Volontairement exclus : les mots entres dans l'usage courant du
 * francais au point de figurer au Larousse/Robert sans reserve ("email",
 * "planning", "week-end") -- le risque de faux positif depasserait le
 * benefice. La liste ne couvre que les anglicismes de vocabulaire professionnel
 * que Julien a cites ou leur famille directe.
 *
 * Applique aux trois surfaces citees dans le mail de Julien : le texte des
 * diapos (lib/valider-diapos.js), le titre du document (lib/publier-zernio.js)
 * et le texte du post (lib/valider-post.js) -- memes trois surfaces que le
 * controle d'accents (lib/valider-orthographe.js), pour la meme raison : un
 * controle qui ne couvre qu'une seule des trois laisse passer un anglicisme
 * ecrit dans une autre.
 */

const ANGLICISMES_VERS_FRANCAIS = {
  process: 'processus',
  processes: 'processus',
  deadline: 'date limite',
  deadlines: 'dates limites',
  feedback: 'retour',
  feedbacks: 'retours',
  workflow: 'flux de travail',
  workflows: 'flux de travail',
  business: 'activite',
  brief: 'note de cadrage',
  briefs: 'notes de cadrage',
  benchmark: 'comparatif',
  benchmarks: 'comparatifs',
  reporting: 'compte-rendu',
  roadmap: 'feuille de route',
  roadmaps: 'feuilles de route',
  kickoff: 'lancement',
  mindset: 'etat d\'esprit',
  insight: 'enseignement',
  insights: 'enseignements',
  targets: 'objectifs',
  networking: 'reseautage',
};

// Insensible aux accents pour la comparaison (le francais correct porte
// parfois un accent que la cle n'a pas, ex. "activite" -> "activité" : la
// detection porte sur le mot ANGLAIS ecrit tel quel, jamais accentue).
const REGEX_MOT = /[A-Za-z][A-Za-z'-]*/g;

/**
 * Repere chaque occurrence d'un anglicisme de la liste fermee dans `texte`.
 * Insensible a la casse ; renvoie le mot tel qu'ecrit et son equivalent.
 */
function detecterAnglicismes(texte) {
  const trouves = [];
  const source = String(texte || '');
  let correspondance;
  REGEX_MOT.lastIndex = 0;
  while ((correspondance = REGEX_MOT.exec(source)) !== null) {
    const mot = correspondance[0];
    const clef = mot.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(ANGLICISMES_VERS_FRANCAIS, clef)) {
      trouves.push({ trouve: mot, attendu: ANGLICISMES_VERS_FRANCAIS[clef] });
    }
  }
  return trouves;
}

/**
 * Leve une erreur des qu'un anglicisme de la liste fermee est trouve. Ne
 * renvoie rien en cas de succes (silence = conforme) -- meme convention que
 * validerAccents.
 */
function validerAnglicismes(texte, contexte) {
  const trouves = detecterAnglicismes(texte);
  if (trouves.length > 0) {
    const liste = trouves.map((t) => `"${t.trouve}" (dites plutot "${t.attendu}")`).join(', ');
    const ou = contexte ? ` (${contexte})` : '';
    throw new Error(
      `Texte refuse${ou} : anglicisme(s) detecte(s) -- ${liste}. Ecrire en francais des la ` +
      'premiere frappe, pas de repasse de traduction a part.'
    );
  }
}

module.exports = { validerAnglicismes, detecterAnglicismes, ANGLICISMES_VERS_FRANCAIS };
