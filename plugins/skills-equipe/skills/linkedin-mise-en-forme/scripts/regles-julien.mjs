// Regles de Julien du 14/10/2026 (mail transmis par Nomena), deux comptes LinkedIn :
//   1. deux posts par jour et par compte, au maximum ;
//   2. chaque post part d'un fait reel : plus aucun exemple invente, ni la mention
//      « exemple invente pour l'illustration » ;
//   3. on casse le moule : pas de « Ma position » systematique, pas de question finale
//      automatique, longueurs, formes et accroches variees ;
//   4. un sujet ne revient pas sur le meme compte avant un mois, et jamais le meme jour sur
//      les deux comptes ;
//   5. le lien va en commentaire, jamais dans le post ; aucune precaution du type « ce texte
//      ne donne pas un avis juridique » ;
//   6. le client vise s'arreterait-il de defiler pour lire ? Sinon, on ne publie pas
//      (jugement, aucun code ne le remplace).
//
// Ce module ne contient que des fonctions pures, testees par test/regles-julien.test.mjs.
// Le contrôle mecanique couvre 1, 2, 4 et 5 (demande du 14/10) et les formules de 3 ; le
// reste de 3 et toute la regle 6 se jugent a l'oeil.
import { versAscii } from "./lib.mjs";

export const MAX_POSTS_PAR_JOUR = 2;
export const JOURS_SANS_REPETITION = 30;

// Forme comparable : gras Unicode -> ASCII, sans accent, minuscules, lettres et chiffres seuls.
export const normaliser = (s) => versAscii(s).normalize("NFD").replace(/\p{M}/gu, "")
  .toLowerCase().replace(/[’']/g, " ").replace(/[^a-z0-9.\/:@-]+/g, " ").replace(/\s+/g, " ").trim();

// Regle 2. « invente(e)(s) » sous toutes ses formes accordees, y compris « exemple invente pour
// l'illustration ». Le verbe conjugue (« il invente ») est attrape aussi : a relire, c'est voulu.
const INVENTE = /\binvent(?:e|ee|es|ees|er)\b/;
// Ouverture typique d'un cas fabrique : « Exemple : une consultante... ». Signalee pour relecture,
// car un vrai cas client peut aussi s'ouvrir ainsi.
const EXEMPLE_EN_TETE = /^(?:exemple|imaginons|prenons (?:un|une|le cas))\b/;

// Regle 3 : formules du moule.
const FORMULES_MOULE = [
  { regex: /\bma position\b/, motif: "« Ma position »" },
  { regex: /\bje prends position\b/, motif: "« Je prends position »" },
];

// Regle 5 : precautions.
const PRECAUTIONS = [
  /\bne (?:constitue|donne|remplace|vaut|forme) (?:pas|en aucun cas) (?:un |une |d )?(?:avis|conseil|consultation)s? (?:juridique|fiscal|medical|professionnel|personnalise)/,
  /\bpas un (?:avis|conseil) (?:juridique|fiscal|medical|professionnel)/,
  /\ba titre (?:purement )?(?:informatif|indicatif)\b/,
  /\brapprochez[- ]vous d un (?:avocat|expert[- ]comptable|professionnel)\b/,
  /\bne remplace pas (?:un |une )?(?:audit|avis|diagnostic|conseil|expert)/,
];

// Regle 5 : un lien dans le corps (URL, www., ou domaine nu du type claudeagency.fr).
const LIEN = /(?:https?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:fr|com|io|ai|net|org|eu|co|app|ly|gl)\b(?:\/\S*)?)/i;

/**
 * Controles sur le texte d'un seul post (regles 2, 3 formules, 5). Retourne une liste de
 * { regle, motif, preuve } : preuve = la phrase citee telle qu'elle est dans le post.
 */
export function controlerTexte(texte) {
  const constats = [];
  const lignes = texte.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  const phrases = lignes.flatMap((l) => l.split(/(?<=[.!?])\s+/));
  const chercher = (regex) => phrases.find((p) => regex.test(normaliser(p)));

  const invente = chercher(INVENTE);
  if (invente) constats.push({ regle: 2, motif: "mot « inventé »", preuve: invente.trim() });
  const exemple = lignes.find((l) => EXEMPLE_EN_TETE.test(normaliser(l)) && !INVENTE.test(normaliser(l)));
  if (exemple) constats.push({ regle: 2, motif: "cas présenté comme un exemple (fait réel à vérifier)", preuve: exemple.trim().slice(0, 160) });

  for (const { regex, motif } of FORMULES_MOULE) {
    const p = chercher(regex);
    if (p) constats.push({ regle: 3, motif, preuve: p.trim() });
  }
  const precaution = PRECAUTIONS.map(chercher).find(Boolean);
  if (precaution) constats.push({ regle: 5, motif: "précaution juridique ou de principe", preuve: precaution.trim() });

  const ligneLien = lignes.find((l) => LIEN.test(versAscii(l)));
  if (ligneLien) constats.push({ regle: 5, motif: "lien dans le corps du post", preuve: ligneLien.trim().slice(0, 160) });
  return constats;
}

// ---- Regle 4 : sujet repete -------------------------------------------------------------
// Un sujet ne se reconnait pas par code avec certitude. Deux moyens, dans l'ordre :
//   - etiquette explicite (registre linkedin/sujets.csv, ou `sujet:` en frontmatter) : egalite
//     stricte, seul moyen fiable ; un post sans etiquette est signale par le script ;
//   - sinon, recouvrement des mots porteurs (5 lettres et plus, hors mots outils, ramenes a
//     leurs 6 premieres lettres) de l'accroche et du debut du post. Au-dessus du seuil, le script
//     signale un sujet PROBABLEMENT repete, a confirmer a l'oeil (jamais un refus silencieux).
const MOTS_OUTILS = new Set(("avant apres aussi autre autres avoir cette celle celui chaque comme comment contre dans depuis donc elles encore entre etait faire fait faut leurs leur moins notre nous parce pendant peut plus pour pourquoi quand quelle quelles quels quoi sans selon sont sous tous toute toutes tres votre vous vos ainsi alors deja meme memes premier premiere seule seulement souvent jamais rien quelque quelques bien voici voila combien heure heures jour jours mois semaine annee").split(" "));
// Racines presentes dans presque tous les posts des deux comptes (calibre le 14/10/2026 sur la file) :
// elles ne disent rien du sujet et faisaient monter le score de posts sans rapport.
const RACINES_DU_METIER = new Set("format organi freela client missio questi repons propos bonne trois quatre arrive donne montre ligne simple adress utilis demand outil claude image messag respon verifi".split(" "));
export function motsPorteurs(texte, nbCaracteres = 400) {
  const debut = normaliser(texte.slice(0, nbCaracteres)).replace(/[.\/:@-]/g, " ");
  return new Set(debut.split(" ").filter((m) => m.length >= 5 && !MOTS_OUTILS.has(m) && !/^\d+$/.test(m)).map((m) => m.slice(0, 6)).filter((r) => !RACINES_DU_METIER.has(r)));
}
export const SEUIL_SUJET = 0.34;
export function similariteSujet(a, b) {
  const A = motsPorteurs(a), B = motsPorteurs(b);
  if (!A.size || !B.size) return { score: 0, communs: [] };
  const communs = [...A].filter((m) => B.has(m));
  return { score: communs.length / Math.min(A.size, B.size), communs };
}
export function memeSujet(p, q) {
  if (p.sujet && q.sujet) return { certain: true, oui: normaliser(p.sujet) === normaliser(q.sujet), score: null, communs: [] };
  if (!p.texte || !q.texte) return { certain: false, oui: false, score: 0, communs: [] };
  const s = similariteSujet(p.texte, q.texte);
  return { certain: false, oui: s.score >= SEUIL_SUJET && s.communs.length >= 3, ...s };
}

const jours = (d1, d2) => Math.round((Date.parse(d2) - Date.parse(d1)) / 86400000);

/**
 * Controles de la file (regles 1 et 4) sur une liste de posts
 * { id, compte, date: "AAAA-MM-JJ", heure, texte?, sujet? }. `historique` : posts deja publies
 * (meme forme), utilises seulement pour la regle 4 sur 30 jours. Retourne une liste de constats
 * { regle, ids, motif, preuve }.
 */
export function controlerFile(posts, { historique = [] } = {}) {
  const constats = [];
  const parJour = new Map();
  for (const p of posts) {
    const k = `${p.compte} ${p.date}`;
    parJour.set(k, [...(parJour.get(k) || []), p]);
  }
  for (const [k, liste] of parJour) {
    if (liste.length > MAX_POSTS_PAR_JOUR) {
      constats.push({ regle: 1, ids: liste.map((p) => p.id), motif: `${liste.length} posts le même jour (${k})`, preuve: liste.map((p) => `${p.heure} « ${(p.debut || p.texte || "").slice(0, 60)} »`).join(" ; ") });
    }
  }
  const tous = [...historique.map((p) => ({ ...p, publie: true })), ...posts];
  for (let i = 0; i < tous.length; i++) {
    for (let j = i + 1; j < tous.length; j++) {
      const a = tous[i], b = tous[j];
      if (a.publie && b.publie) continue; // l'historique ne se juge pas lui-meme
      const ecart = Math.abs(jours(a.date, b.date));
      const memeCompte = a.compte === b.compte;
      if (!(memeCompte ? ecart < JOURS_SANS_REPETITION : ecart === 0)) continue;
      const m = memeSujet(a, b);
      if (!m.oui) continue;
      const qui = memeCompte ? `même compte, ${ecart} jour(s) d'écart` : "les deux comptes, le même jour";
      const comment = m.certain ? `même étiquette sujet « ${a.sujet} »` : `sujet probablement répété (mots communs : ${m.communs.join(", ")}), à confirmer`;
      constats.push({ regle: 4, ids: [a.id, b.id], motif: `${qui} : ${comment}`, preuve: `${a.date} ${a.compte} « ${(a.debut || a.texte).slice(0, 70)} » / ${b.date} ${b.compte} « ${(b.debut || b.texte).slice(0, 70)} »` });
    }
  }
  return constats;
}
