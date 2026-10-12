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

// ---------------------------------------------------------------------------------------------------------------
// Méthode du test d'octobre 2026 (linkedin/test-formats-2026-10/methode-comparaison.md, 05/10/2026) : texte, image
// et carrousel, comparés sur les seuls créneaux « comparaison ». Indicateur principal : le taux d'engagement
// (réactions + commentaires) / impressions, calculé ici ; impressions médianes et part de posts à zéro pour départager.
// Remplace, pour ce test, la règle à trois signaux de `decider` (protocole du 30/09).
export const FORMATS_OCTOBRE = ['texte', 'image', 'carrousel'];

/** (réactions + commentaires) / impressions ; null sans impressions. */
export const tauxCalcule = (p) =>
  Number.isFinite(p.impressions) && p.impressions > 0 ? ((p.reactions || 0) + (p.commentaires || 0)) / p.impressions : null;

/** `resumer` + taux calculé (médiane, min, max) et posts à zéro (ni réaction ni commentaire). */
export function resumerFormat(posts) {
  const taux = posts.map(tauxCalcule).filter(Number.isFinite);
  const aZero = posts.filter((p) => (p.reactions || 0) + (p.commentaires || 0) === 0).length;
  return {
    ...resumer(posts),
    taux: { mediane: mediane(taux), min: taux.length ? Math.min(...taux) : null, max: taux.length ? Math.max(...taux) : null, n: taux.length },
    aZero,
    partZero: posts.length ? aZero / posts.length : null,
  };
}

/**
 * Lecture prudente (méthode, § « Calcul final ») : un format bat le texte seulement si son taux médian, ses
 * impressions médianes ET sa part de posts à zéro sont meilleurs. Avant la fin du test : « provisoire ».
 * @param formats { texte, image, carrousel } issus de resumerFormat
 */
export function deciderFormats(formats, { final = false } = {}) {
  const t = formats.texte;
  const raisons = [];
  const ecarts = {};
  const gagnants = [];
  for (const f of FORMATS_OCTOBRE.filter((x) => x !== 'texte')) {
    const x = formats[f];
    if (!x.taux.n || !t.taux.n) {
      ecarts[f] = null;
      raisons.push(`${f} : comparaison impossible (${x.taux.n} ${f} et ${t.taux.n} texte avec impressions)`);
      continue;
    }
    ecarts[f] = x.taux.mediane - t.taux.mediane;
    const taux = x.taux.mediane > t.taux.mediane;
    const imp = x.impressions.mediane > t.impressions.mediane;
    const zero = x.partZero < t.partZero;
    raisons.push(`${f} contre texte : taux médian ${taux ? 'meilleur' : 'pas meilleur'} (écart ${(ecarts[f] * 100).toFixed(2).replace('.', ',')} point(s)), impressions médianes ${imp ? 'meilleures' : 'pas meilleures'}, part de posts à zéro ${zero ? 'plus faible' : 'pas plus faible'}`);
    if (taux && imp && zero) gagnants.push(f);
  }
  gagnants.sort((a, b) => ecarts[b] - ecarts[a]);
  const verdict = !final ? 'provisoire' : gagnants.length ? gagnants[0] : 'non_concluant';
  return { verdict, indication: gagnants, ecarts, raisons, defaut: 'texte' };
}

/** Analyse d'un compte selon la méthode d'octobre (créneaux « comparaison » mûrs, trois formats). */
export function analyserCompteFormats(apparies, compte, maintenant, regles = REGLES, { final = false } = {}) {
  const siens = apparies.filter((a) => a.creneau.compte === compte);
  const comparaison = siens.filter((a) => a.creneau.comparaison !== false);
  const murs = comparaison.filter((a) => estMur(a.post, maintenant, regles.maturiteHeures));
  const parFormat = (lot, f) => resumerFormat(lot.filter((a) => a.creneau.format === f).map((a) => a.post));
  const formats = Object.fromEntries(FORMATS_OCTOBRE.map((f) => [f, parFormat(murs, f)]));
  const semaines = [...new Set(siens.map((a) => a.creneau.semaine))].sort().map((s) => {
    const lot = murs.filter((a) => a.creneau.semaine === s);
    return { semaine: s, ...Object.fromEntries(FORMATS_OCTOBRE.map((f) => [f, parFormat(lot, f)])) };
  });
  return {
    compte,
    methode: 'formats',
    publies: siens.length,
    comparaison: comparaison.length,
    murs: murs.length,
    trop_recents: comparaison.length - murs.length,
    formats,
    decision: deciderFormats(formats, { final }),
    semaines,
    detail: siens.map((a) => ({
      id: a.creneau.id, date: a.creneau.date, format: a.creneau.format, sujet: a.creneau.sujet,
      comparaison: a.creneau.comparaison !== false,
      mur: estMur(a.post, maintenant, regles.maturiteHeures), impressions: a.post.impressions,
      reactions: a.post.reactions, commentaires: a.post.commentaires, tauxEngagement: a.post.tauxEngagement, url: a.post.url,
    })),
  };
}
