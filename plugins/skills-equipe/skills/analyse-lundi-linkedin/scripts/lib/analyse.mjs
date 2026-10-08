// Cœur de l'analyse du lundi : appariement posts ↔ créneaux, agrégats par format, règle de décision.
import { comparerPaires, icRapportMedianes, mediane, quantile } from './stats.mjs';

// Règles du protocole (linkedin/test-formats-2026-10/PROTOCOLE.md). Les changer = changer le protocole.
export const REGLES = {
  seuilRapport: 1.25,        // médiane carrousel / médiane texte : +25 % au moins (ou 0,80 au plus, dans l'autre sens)
  niveauIC: 0.9,             // intervalle bootstrap à 90 %
  seuilPaires: 0.75,         // part des paires de même sujet qui doivent aller dans le même sens
  pairesDecideesMin: 5,      // en dessous, on ne conclut pas sur les paires
  nMin: 6,                   // posts mûrs minimum par format et par compte pour une décision
  maturiteHeures: 48,        // un post compte dans la médiane 48 h après sa publication
  toleranceMinutes: 20,      // écart accepté entre l'heure prévue et l'heure de publication
  defautSiNonConcluant: 'texte',
};

/** Rapproche chaque créneau du plan d'un post publié (même compte, heure à ±tolérance). */
export function apparier(posts, creneaux, { toleranceMinutes = REGLES.toleranceMinutes } = {}) {
  const tol = toleranceMinutes * 60000;
  const libres = new Set(posts.map((_, i) => i));
  const apparies = [];
  const manquants = [];
  for (const c of creneaux) {
    let meilleur = -1;
    let ecart = Infinity;
    for (const i of libres) {
      const p = posts[i];
      if (p.compte !== c.compte) continue;
      const e = Math.abs(new Date(p.publieLe).getTime() - new Date(c.utc).getTime());
      if (e <= tol && e < ecart) { meilleur = i; ecart = e; }
    }
    if (meilleur >= 0) {
      libres.delete(meilleur);
      apparies.push({ creneau: c, post: posts[meilleur] });
    } else {
      manquants.push(c);
    }
  }
  return { apparies, manquants, horsPlan: [...libres].map((i) => posts[i]) };
}

/** Le format annoncé au plan doit être cohérent avec ce que LinkedIn a réellement publié. */
export function anomaliesDeFormat(apparies) {
  const anomalies = [];
  for (const { creneau, post } of apparies) {
    if (post.format !== 'inconnu' && creneau.format !== post.format) anomalies.push(`${creneau.id} : prévu ${creneau.format}, publié ${post.format}`);
  }
  return anomalies;
}

export const estMur = (post, maintenant, heures = REGLES.maturiteHeures) =>
  (new Date(maintenant).getTime() - new Date(post.publieLe).getTime()) / 3600000 >= heures;

/** Chiffres d'un lot de posts (un format, un compte) : les seuls indicateurs fixés par Julien. */
export function resumer(posts) {
  const imp = posts.map((p) => p.impressions).filter(Number.isFinite);
  return {
    n: posts.length,
    impressions: {
      mediane: mediane(imp), q1: quantile(imp, 0.25), q3: quantile(imp, 0.75),
      min: imp.length ? Math.min(...imp) : null, max: imp.length ? Math.max(...imp) : null,
    },
    reactions: mediane(posts.map((p) => p.reactions)),
    commentaires: mediane(posts.map((p) => p.commentaires)),
    tauxEngagement: mediane(posts.map((p) => p.tauxEngagement)),
  };
}

/**
 * Règle de décision du protocole, pour un compte.
 * `texte` / `carrousel` : impressions des posts mûrs. `paires` : [[imp texte, imp carrousel], ...].
 */
export function decider({ texte, carrousel, paires, planifies }, regles = REGLES) {
  const raisons = [];
  const ic = icRapportMedianes(texte, carrousel, { niveau: regles.niveauIC });
  const mT = mediane(texte);
  const mC = mediane(carrousel);
  const ratio = mT ? mC / mT : null;
  const p = comparerPaires(paires);
  const complet = texte.length >= regles.nMin && carrousel.length >= regles.nMin;
  if (!complet) {
    raisons.push(`posts mûrs insuffisants : ${texte.length} texte, ${carrousel.length} carrousel (minimum ${regles.nMin} de chaque)`);
    return { verdict: 'incomplet', ratio, ic, paires: p, raisons };
  }
  if (ratio === null) {
    raisons.push('médiane des textes nulle : rapport indéfini');
    return { verdict: 'non_concluant', ratio, ic, paires: p, raisons, defaut: regles.defautSiNonConcluant };
  }
  const pairesOk = (favorables) => p.decidees >= regles.pairesDecideesMin && favorables / p.decidees >= regles.seuilPaires;
  const inv = 1 / regles.seuilRapport;
  const carrouselGagne = ratio >= regles.seuilRapport && ic.bas > 1 && pairesOk(p.carrousel);
  const texteGagne = ratio <= inv && ic.haut < 1 && pairesOk(p.texte);
  raisons.push(`rapport des médianes ${ratio.toFixed(2)} (seuils ≥ ${regles.seuilRapport} ou ≤ ${inv.toFixed(2)})`);
  raisons.push(`intervalle à ${Math.round(regles.niveauIC * 100)} % : ${ic.bas?.toFixed(2)} à ${ic.haut?.toFixed(2)} (doit exclure 1)`);
  raisons.push(`paires de même sujet : ${p.carrousel} pour le carrousel, ${p.texte} pour le texte, ${p.egalites} égalité(s) (seuil ${Math.round(regles.seuilPaires * 100)} % de ${p.decidees} paires décidées, minimum ${regles.pairesDecideesMin})`);
  if (carrouselGagne) return { verdict: 'carrousel', ratio, ic, paires: p, raisons };
  if (texteGagne) return { verdict: 'texte', ratio, ic, paires: p, raisons };
  return { verdict: 'non_concluant', ratio, ic, paires: p, raisons, defaut: regles.defautSiNonConcluant };
}

/** Analyse complète d'un compte à partir des paires (créneau, post) déjà rapprochées. */
export function analyserCompte(apparies, compte, maintenant, regles = REGLES) {
  const siens = apparies.filter((a) => a.creneau.compte === compte);
  // Annonces, week-end, posts « hors comparaison » : au calendrier (donc ni manquants ni hors plan), jamais dans les médianes.
  const murs = siens.filter((a) => a.creneau.comparaison !== false && estMur(a.post, maintenant, regles.maturiteHeures));
  const parFormat = (f) => murs.filter((a) => a.creneau.format === f).map((a) => a.post);
  const texte = parFormat('texte');
  const carrousel = parFormat('carrousel');
  const parSujet = new Map();
  for (const a of murs) {
    const s = parSujet.get(a.creneau.sujet) || {};
    s[a.creneau.format] = a.post.impressions;
    parSujet.set(a.creneau.sujet, s);
  }
  const paires = [...parSujet.values()].filter((s) => s.texte != null && s.carrousel != null).map((s) => [s.texte, s.carrousel]);
  const decision = decider({
    texte: texte.map((p) => p.impressions).filter(Number.isFinite),
    carrousel: carrousel.map((p) => p.impressions).filter(Number.isFinite),
    paires,
  }, regles);
  const semaines = [...new Set(siens.map((a) => a.creneau.semaine))].sort().map((s) => {
    const dansSemaine = murs.filter((a) => a.creneau.semaine === s);
    return {
      semaine: s,
      texte: resumer(dansSemaine.filter((a) => a.creneau.format === 'texte').map((a) => a.post)),
      carrousel: resumer(dansSemaine.filter((a) => a.creneau.format === 'carrousel').map((a) => a.post)),
    };
  });
  return {
    compte,
    publies: siens.length,
    murs: murs.length,
    trop_recents: siens.length - murs.length,
    texte: resumer(texte),
    carrousel: resumer(carrousel),
    paires: paires.length,
    decision,
    semaines,
    detail: siens.map((a) => ({
      id: a.creneau.id, date: a.creneau.date, format: a.creneau.format, sujet: a.creneau.sujet,
      mur: estMur(a.post, maintenant, regles.maturiteHeures), impressions: a.post.impressions,
      reactions: a.post.reactions, commentaires: a.post.commentaires, tauxEngagement: a.post.tauxEngagement, url: a.post.url,
    })),
  };
}
