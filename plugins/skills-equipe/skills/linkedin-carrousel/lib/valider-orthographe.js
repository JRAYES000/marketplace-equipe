'use strict';

/**
 * Garde-fou : mots sans l'accent qu'ils devraient porter. Ajoute le 15/09/2026
 * apres que le meme probleme soit passe trois fois de suite dans ce depot --
 * carrousel deja publie (Point n°8), 5 commentaires de linkedin-commentaires,
 * exemple de linkedin-veille-virale -- tous integralement sans accents, jamais
 * detecte avant une relecture humaine. Le brief est explicite : "l'orthographe
 * reste juste, une faute se lit comme de la negligence".
 *
 * LIMITE ASSUMEE, PAS UNE PREUVE (meme famille que "orthographe irreprochable"
 * dans valider-commentaire.js) : ceci est une liste FERMEE de mots qui portent
 * TOUJOURS un accent en francais standard, quel que soit leur role
 * grammatical -- pas une correction orthographique complete. Volontairement
 * EXCLUS de la liste (ambigus, risque reel de faux positif sur un texte
 * correct) : "a"/"à" (verbe avoir vs preposition -- "il a fini" est correct
 * SANS accent), "ou"/"où" (conjonction "ou bien" vs adverbe de lieu -- les
 * deux sont frequents et corrects), "pilote"/"pilotÉ" et "communique"/
 * "communiquÉ" (verbe conjugue correct sans accent vs participe passe qui en
 * a besoin -- distinction grammaticale, pas lexicale), "marche"/"marché" (la
 * marche = the walk, le marché = the market). Un mot de cette liste fermee
 * qui manque son accent, en revanche, n'a JAMAIS de forme correcte sans
 * accent en francais -- zero faux positif attendu sur ces entrees-la.
 *
 * Verifie reellement sur le carrousel publie le 14/09/2026 (julien-agency,
 * 10 diapos + texte de post) : ~34 occurrences dans les diapos, ~34 dans le
 * texte du post, sur ~484 mots au total -- environ 1 mot sur 7, largement au
 * dessus du seuil "marginal". Inventaire complet dans
 * references/etat-linkedin-20260912.md.
 */

const MOTS_SANS_ACCENT_VERS_CORRECT = {
  ete: 'été',
  deja: 'déjà',
  tres: 'très',
  apres: 'après',
  resultat: 'résultat',
  resultats: 'résultats',
  meme: 'même',
  memes: 'mêmes',
  etape: 'étape',
  etapes: 'étapes',
  reponse: 'réponse',
  reponses: 'réponses',
  repond: 'répond',
  repondu: 'répondu',
  repondra: 'répondra',
  decision: 'décision',
  decisions: 'décisions',
  delai: 'délai',
  delais: 'délais',
  decideur: 'décideur',
  decideurs: 'décideurs',
  reputation: 'réputation',
  etait: 'était',
  ecoule: 'écoulé',
  ecoulee: 'écoulée',
  ecoules: 'écoulés',
  ecoulees: 'écoulées',
  envoye: 'envoyé',
  envoyee: 'envoyée',
  envoyes: 'envoyés',
  envoyees: 'envoyées',
  critere: 'critère',
  criteres: 'critères',
  different: 'différent',
  differente: 'différente',
  differents: 'différents',
  differentes: 'différentes',
  hesite: 'hésite',
  ca: 'ça',
  ecarte: 'écarté',
  ecartee: 'écartée',
  ecartes: 'écartés',
  ecartees: 'écartées',
  voila: 'voilà',
  deces: 'décès',
  evidemment: 'évidemment',
  generalement: 'généralement',
  egalement: 'également',
  idee: 'idée',
  idees: 'idées',
  annee: 'année',
  annees: 'années',
  societe: 'société',
  activite: 'activité',
  qualite: 'qualité',
  securite: 'sécurité',
  interet: 'intérêt',
  interets: 'intérêts',
  probleme: 'problème',
  problemes: 'problèmes',
  systeme: 'système',
  systemes: 'systèmes',
  regle: 'règle',
  regles: 'règles',
  derniere: 'dernière',
  premiere: 'première',
  entiere: 'entière',
  entierement: 'entièrement',
  deliberez: 'délibérez',
  delibere: 'délibère',
  recoit: 'reçoit',
  recu: 'reçu',
  recue: 'reçue',
  recus: 'reçus',
  recues: 'reçues',
  cout: 'coût',
  couts: 'coûts',
  coute: 'coûte',
  coutent: 'coûtent',
  // Ajoutes le 25/09/2026 (retour de Julien sur le carrousel du meme jour,
  // urn:li:ugcPost:7509117168333287425) : "declaratif au reel" dans le texte
  // du post ET "L'IA declarative" dans le documentTitle sont passes tous les
  // deux -- ni l'un ni l'autre n'etait dans cette liste. Voir aussi
  // lib/valider-post.js (convertirGras verifie desormais ces mots DANS un
  // passage en gras, pas seulement dans le texte courant) et
  // lib/publier-zernio.js (documentTitle passe par validerAccents avant tout
  // envoi -- rien ne le verifiait jusqu'ici).
  declaratif: 'déclaratif',
  declaratifs: 'déclaratifs',
  declarative: 'déclarative',
  declaratives: 'déclaratives',
  reel: 'réel',
  reels: 'réels',
  reelle: 'réelle',
  reelles: 'réelles',
};

/**
 * Repere chaque mot de la liste fermee ci-dessus, sans accent, dans `texte`.
 * Insensible a la casse pour la detection ; renvoie le mot tel qu'ecrit.
 *
 * Ignore le contenu des passages `**en gras**` (bug reel trouve le 22/09/2026, en
 * verifiant linkedin-veille-virale contre un texte reellement bien accente partout
 * SAUF dans son accroche/ses titres -- exemption normale, voir la regle 2 du SKILL.md
 * de linkedin-mise-en-forme : le gras Unicode n'a pas de forme accentuee, donc un mot
 * comme "recoit" ou "ca" a l'interieur d'un `**...**` est volontaire, pas une faute.
 * Une fois le texte CONVERTI en gras Unicode reel, ce probleme n'existe plus (les
 * caracteres Unicode Mathematical Bold ne sont pas dans la plage `A-Za-zÀ-ÖØ-öø-ÿ`
 * ci-dessous, donc invisibles a cette regex) -- linkedin-carrousel/lib/valider-post.js
 * appelle deja validerAccents() APRES convertirGras() pour cette raison, mais
 * linkedin-veille-virale/dry-run.js l'appelait AVANT, sur le markdown brut, d'ou le
 * faux positif. Stripper les `**...**` ici rend la fonction correcte quel que soit
 * l'ordre d'appel, dans les trois paquets qui la dupliquent.
 */
function detecterMotsSansAccent(texte) {
  const trouves = [];
  const texteSansGras = String(texte || '').replace(/\*\*(.+?)\*\*/g, ' ');
  const regexMot = /[A-Za-zÀ-ÖØ-öø-ÿ']+/gu;
  let correspondance;
  while ((correspondance = regexMot.exec(texteSansGras)) !== null) {
    const mot = correspondance[0];
    const clef = mot.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(MOTS_SANS_ACCENT_VERS_CORRECT, clef)) {
      trouves.push({ trouve: mot, attendu: MOTS_SANS_ACCENT_VERS_CORRECT[clef] });
    }
  }
  return trouves;
}

/**
 * Leve une erreur des qu'un mot de la liste fermee apparait sans son accent.
 * Ne renvoie rien en cas de succes (silence = conforme).
 */
function validerAccents(texte) {
  const trouves = detecterMotsSansAccent(texte);
  if (trouves.length > 0) {
    const liste = trouves.map((t) => `"${t.trouve}" (attendu "${t.attendu}")`).join(', ');
    throw new Error(
      `Texte refuse : mot(s) sans l'accent attendu -- ${liste}. Ecrire un francais correctement ` +
      `accentue des la premiere frappe, pas une passe de correction a part.`
    );
  }
}

module.exports = { validerAccents, detecterMotsSansAccent, MOTS_SANS_ACCENT_VERS_CORRECT };
