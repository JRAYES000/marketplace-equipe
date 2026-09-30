// Assemblage de l'analyse du lundi : plan + chiffres Zernio (+ relevé Buffer facultatif) → résultat.
// Tout est calculé ici, en code. Le rendu (rapport.mjs) ne fait que mettre en forme.
import { analyserCompte, anomaliesDeFormat, apparier, estMur, normaliserPost, resumer } from './analyse.mjs';
import { ajouterJours, parisVersUtc, utcVersParis } from './calendrier.mjs';
import { mediane } from './stats.mjs';

const FORMATS_BUFFER = { T: 'texte', C: 'carrousel', I: 'image', L: 'lien', S: 'slides', '?': 'inconnu' };
const COLONNES_BUFFER = ['compte', 'date_paris', 'heure_paris', 'format', 'impressions', 'portee', 'reactions', 'commentaires'];

/** CSV du relevé Buffer (voir references/releve-buffer.md) → lignes typées, format en toutes lettres. */
export function lireCsvBuffer(texte) {
  const [entete, ...lignes] = texte.replace(/^﻿/, '').trim().split(/\r?\n/);
  const cols = entete.split(',');
  const manquantes = COLONNES_BUFFER.filter((c) => !cols.includes(c));
  if (manquantes.length) throw new Error(`Relevé Buffer : colonne(s) absente(s) : ${manquantes.join(', ')}`);
  const nombre = (x) => (x === '' || x === undefined ? null : Number(x));
  return lignes.filter(Boolean).map((l, n) => {
    const v = Object.fromEntries(l.split(',').map((x, i) => [cols[i], x]));
    if (!FORMATS_BUFFER[v.format]) throw new Error(`Relevé Buffer, ligne ${n + 2} : format « ${v.format} » inconnu (T, C, I, L, S ou ?).`);
    return {
      compte: v.compte, date: v.date_paris, heure: v.heure_paris, format: FORMATS_BUFFER[v.format],
      impressions: nombre(v.impressions), portee: nombre(v.portee),
      reactions: nombre(v.reactions), commentaires: nombre(v.commentaires),
    };
  });
}

/** 0 = dimanche … 6 = samedi, pour une date « AAAA-MM-JJ ». */
const numeroJour = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const estWeekend = (date) => [0, 6].includes(numeroJour(date));

/**
 * Compare le relevé Buffer aux posts Zernio, puis en tire la référence d'avant le test.
 * Quand Zernio connaît le post (même compte, heure à 30 min près), son format fait foi :
 * c'est lui qui voit le PDF d'un carrousel, l'étiquette saisie à la main peut se tromper.
 */
export function croiserBuffer(lignes, comptesParId, postsZernio, plan, fichier) {
  const trouver = (l) => {
    const t = parisVersUtc(l.date, l.heure).getTime();
    return postsZernio.find((z) => comptesParId[z.accountId] === l.compte && Math.abs(new Date(z.publieLe).getTime() - t) <= 30 * 60000);
  };
  const corrections = [];
  const corrigees = lignes.map((l) => {
    const z = trouver(l);
    if (z && z.format !== l.format) {
      corrections.push({ id: `${l.compte} ${l.date} ${l.heure}`, buffer: l.format, zernio: z.format });
      return { ...l, format: z.format };
    }
    return l;
  });
  const ecarts = [];
  let compares = 0;
  for (const l of corrigees) {
    if (l.date < plan.debut || l.impressions === null) continue;
    const z = trouver(l);
    if (!z || z.impressions === null) continue;
    compares++;
    const d = Math.abs(z.impressions - l.impressions);
    if (d >= 15 && d / Math.max(z.impressions, l.impressions) > 0.15) ecarts.push({ id: `${l.compte} ${l.date} ${l.heure}`, zernio: z.impressions, buffer: l.impressions });
  }
  const groupes = new Map();
  for (const l of corrigees) {
    if (l.date >= plan.debut || l.impressions === null) continue;
    const cle = [l.compte, l.format, estWeekend(l.date) ? 'week-end' : 'semaine'].join('|');
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle).push(l);
  }
  const reference = [...groupes.entries()].map(([cle, ls]) => {
    const [compte, format, jours] = cle.split('|');
    const dates = ls.map((l) => l.date).sort();
    return { compte, format, jours, n: ls.length, mediane: mediane(ls.map((l) => l.impressions)), du: dates[0], au: dates[dates.length - 1] };
  }).sort((a, b) => a.compte.localeCompare(b.compte) || a.jours.localeCompare(b.jours) || b.n - a.n);
  return { fichier, lignes: lignes.length, compares, corrections, ecarts, reference };
}

const parCompte = (posts, comptes) => Object.fromEntries(Object.entries(comptes).map(([nom, c]) => [nom, posts.filter((p) => p.accountId === c.accountId)]));

/** Chiffres par format d'un lot de posts déjà mûrs (tous formats présents, pas seulement texte et carrousel). */
function parFormat(posts) {
  const formats = [...new Set(posts.map((p) => p.format))].sort();
  return formats.map((f) => ({ format: f, ...resumer(posts.filter((p) => p.format === f)) }));
}

/**
 * @param plan            calendrier.json ({ meta, creneaux })
 * @param analytics       posts de GET /v1/analytics (bruts)
 * @param maintenant      instant de référence (heure serveur Zernio)
 */
export function analyserTout({ plan, analytics, apercu, maintenant, bufferLignes = null, bufferFichier = null, regles }) {
  const now = new Date(maintenant);
  const tous = analytics.map(normaliserPost).filter((p) => p.publieLe);
  const comptes = plan.meta.comptes;
  const comptesParId = Object.fromEntries(Object.entries(comptes).map(([k, v]) => [v.accountId, k]));
  const nomCompte = (p) => comptesParId[p.accountId] || p.accountId;
  const jourAnalyse = utcVersParis(now).date;
  const parisDe = (p) => utcVersParis(new Date(p.publieLe));

  // 1. Le test : créneaux échus, rapprochés des posts publiés dans la fenêtre. Le week-end n'y entre jamais.
  const debut = parisVersUtc(plan.meta.debut, '00:00').getTime();
  const fin = parisVersUtc(ajouterJours(plan.meta.fin, 1), '00:00').getTime();
  const dansFenetre = tous.filter((p) => {
    const t = new Date(p.publieLe).getTime();
    return t >= debut && t < fin;
  });
  const creneaux = plan.creneaux.filter((c) => new Date(c.utc) <= now);
  const { apparies, manquants, horsPlan } = apparier(dansFenetre, creneaux);
  const weekendTest = horsPlan.filter((p) => estWeekend(parisDe(p).date));
  const horsPlanSemaine = horsPlan.filter((p) => !estWeekend(parisDe(p).date));
  const analyses = Object.keys(comptes).map((c) => analyserCompte(apparies, c, now, regles));
  const finale = jourAnalyse > plan.meta.fin;
  const releves = apparies.map((a) => a.post.releveLe).filter(Boolean).sort();
  const plusAncien = releves[0];
  const ageH = plusAncien ? (now.getTime() - new Date(plusAncien.replace(' ', 'T') + 'Z').getTime()) / 3600000 : null;

  // 2. La semaine écoulée : les 7 jours pleins avant le jour de l'analyse, tous formats.
  const debutSemaine = ajouterJours(jourAnalyse, -7);
  const postsSemaine = tous.filter((p) => {
    const d = parisDe(p).date;
    return d >= debutSemaine && d < jourAnalyse;
  });
  const semaine = {
    du: debutSemaine,
    au: ajouterJours(jourAnalyse, -1),
    comptes: Object.entries(parCompte(postsSemaine, comptes)).map(([compte, posts]) => ({
      compte,
      n: posts.length,
      recents: posts.filter((p) => !estMur(p, now, regles?.maturiteHeures)).length,
      formats: parFormat(posts),
      posts: posts.map((p) => ({ date: parisDe(p).date, heure: parisDe(p).heure, jour: parisDe(p).jour, format: p.format, impressions: p.impressions, portee: p.portee, reactions: p.reactions, commentaires: p.commentaires, mur: estMur(p, now, regles?.maturiteHeures), url: p.url })),
    })),
  };

  // 3. Ce que Zernio a vu, par format, jours de semaine et posts mûrs (référence continue, hors week-end).
  const murs = tous.filter((p) => estMur(p, now, regles?.maturiteHeures));
  const zernioSemaine = murs.filter((p) => !estWeekend(parisDe(p).date));
  const historiqueZernio = Object.entries(parCompte(zernioSemaine, comptes)).map(([compte, posts]) => ({ compte, formats: parFormat(posts) }));

  // 4. Le week-end, à part : jamais dans les médianes du test.
  const weekend = {
    posts: tous.filter((p) => estWeekend(parisDe(p).date)).map((p) => ({
      compte: nomCompte(p), date: parisDe(p).date, heure: parisDe(p).heure, jour: parisDe(p).jour, format: p.format,
      impressions: p.impressions, reactions: p.reactions, commentaires: p.commentaires, mur: estMur(p, now, regles?.maturiteHeures), url: p.url,
      medianeSemaine: mediane(zernioSemaine.filter((z) => z.accountId === p.accountId).map((z) => z.impressions)),
    })),
    dansLeTest: weekendTest.length,
  };

  // 5. Conclusion commune : seulement si les deux comptes disent la même chose.
  const verdicts = analyses.map((c) => c.decision.verdict);
  const synthese = verdicts.every((v) => v === verdicts[0]) ? verdicts[0] : 'divergent';

  return {
    dateAnalyse: jourAnalyse,
    heureServeur: now.toISOString(),
    plan: plan.meta,
    derniereSync: apercu?.lastSync || null,
    decisionFinale: finale,
    total: plan.creneaux.length,
    echus: creneaux.length,
    apparies: apparies.length,
    manquants,
    horsPlan: horsPlanSemaine,
    anomalies: anomaliesDeFormat(apparies),
    chiffresAnciens: ageH !== null && ageH > 36 ? `le relevé le plus ancien date de ${Math.round(ageH)} h (${plusAncien} UTC)` : null,
    comptes: analyses,
    synthese,
    semaine,
    historiqueZernio,
    weekend,
    buffer: bufferLignes ? croiserBuffer(bufferLignes, comptesParId, tous, plan.meta, bufferFichier) : null,
  };
}
