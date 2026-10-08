// Assemblage de l'analyse du lundi : plan + relevés Buffer Insights (source unique) → résultat.
// Tout est calculé ici, en code. Le rendu (rapport.mjs) ne fait que mettre en forme.
import { analyserCompte, anomaliesDeFormat, apparier, estMur, resumer } from './analyse.mjs';
import { ajouterJours, heureLocaleVersUtc, parisVersUtc, utcVersParis } from './calendrier.mjs';
import { mediane } from './stats.mjs';

const FORMATS_BUFFER = { T: 'texte', C: 'carrousel', I: 'image', L: 'lien', S: 'slides', V: 'video', '?': 'inconnu' };
const COMPTES = ['julien-partners', 'julien-agency'];
// Indicateurs fixés par Julien (NOTES.md, 03/10 et 08/10/2026) : impressions, réactions, commentaires,
// taux d'engagement. Toute autre colonne du relevé (portée…) est ignorée.
const COLONNES = ['compte', 'format', 'impressions', 'reactions', 'commentaires'];

/**
 * CSV d'un relevé Buffer Insights (voir references/releve-buffer.md) → posts prêts à analyser.
 * Heure : `publie_le` + `fuseau_affiche` (l'heure telle que Buffer l'affiche, ex. Europe/Minsk),
 * ou, pour les anciens relevés, `date_paris` + `heure_paris`. L'UTC est calculé ici, jamais à la main.
 */
export function lireCsvBuffer(texte, fichier = null) {
  const [entete, ...lignes] = texte.replace(/^﻿/, '').trim().split(/\r?\n/);
  const cols = entete.split(',');
  const manquantes = COLONNES.filter((c) => !cols.includes(c));
  const v2 = cols.includes('publie_le') && cols.includes('fuseau_affiche');
  const v1 = cols.includes('date_paris') && cols.includes('heure_paris');
  if (!v2 && !v1) manquantes.push('publie_le + fuseau_affiche (ou date_paris + heure_paris)');
  if (manquantes.length) throw new Error(`Relevé Buffer${fichier ? ` ${fichier}` : ''} : colonne(s) absente(s) : ${manquantes.join(', ')}`);
  const nombre = (x) => (x === '' || x === undefined ? null : Number(String(x).replace(/\s/g, '')));
  return lignes.filter((l) => l.trim()).map((l, n) => {
    const v = Object.fromEntries(l.split(',').map((x, i) => [cols[i], x.trim()]));
    const ou = `Relevé Buffer${fichier ? ` ${fichier}` : ''}, ligne ${n + 2}`;
    if (!COMPTES.includes(v.compte)) throw new Error(`${ou} : compte « ${v.compte} » inconnu (${COMPTES.join(' ou ')}).`);
    if (!FORMATS_BUFFER[v.format]) throw new Error(`${ou} : format « ${v.format} » inconnu (${Object.keys(FORMATS_BUFFER).join(', ')}).`);
    let instant;
    if (v2) {
      const m = (v.publie_le || '').match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
      if (!m) throw new Error(`${ou} : publie_le « ${v.publie_le} » ne suit pas « AAAA-MM-JJ HH:MM ».`);
      try {
        instant = heureLocaleVersUtc(m[1], m[2], v.fuseau_affiche);
      } catch {
        throw new Error(`${ou} : fuseau « ${v.fuseau_affiche} » inconnu (nom IANA attendu, ex. Europe/Minsk).`);
      }
    } else {
      instant = parisVersUtc(v.date_paris, v.heure_paris);
    }
    const taux = nombre(v.taux_eng_buffer_pct);
    const paris = utcVersParis(instant);
    return {
      id: v.id_buffer || `${v.compte} ${paris.date} ${paris.heure}`,
      compte: v.compte,
      publieLe: instant.toISOString(),
      format: FORMATS_BUFFER[v.format],
      impressions: nombre(v.impressions),
      reactions: nombre(v.reactions),
      commentaires: nombre(v.commentaires),
      tauxEngagement: taux === null ? null : taux / 100,
      url: v.lien || null,
      releve: fichier,
    };
  });
}

/**
 * Plusieurs relevés → une seule liste. Un même post (même compte, même minute de publication)
 * garde les chiffres du relevé le plus récent : passer les listes du plus ancien au plus récent.
 */
export function fusionnerReleves(listes) {
  const parCle = new Map();
  for (const posts of listes) for (const p of posts) parCle.set(`${p.compte}|${p.publieLe.slice(0, 16)}`, p);
  return [...parCle.values()].sort((a, b) => a.publieLe.localeCompare(b.publieLe));
}

/** 0 = dimanche … 6 = samedi, pour une date « AAAA-MM-JJ ». */
const numeroJour = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();
export const estWeekend = (date) => [0, 6].includes(numeroJour(date));

const parCompte = (posts, comptes) => Object.fromEntries(Object.keys(comptes).map((nom) => [nom, posts.filter((p) => p.compte === nom)]));

/** Chiffres par format d'un lot de posts déjà mûrs (tous formats présents, pas seulement texte et carrousel). */
function parFormat(posts) {
  const formats = [...new Set(posts.map((p) => p.format))].sort();
  return formats.map((f) => ({ format: f, ...resumer(posts.filter((p) => p.format === f)) }));
}

/**
 * @param plan        calendrier.json ({ meta, creneaux })
 * @param posts       posts des relevés Buffer Insights (lireCsvBuffer puis fusionnerReleves)
 * @param maintenant  instant de référence (heure du serveur Buffer)
 * @param jour        lundi analysé (AAAA-MM-JJ), par défaut le jour de Paris de `maintenant`
 * @param releves     fichiers lus, du plus ancien au plus récent (pour le rapport)
 */
export function analyserTout({ plan, posts, maintenant, jour = null, releves = [], regles }) {
  const now = new Date(maintenant);
  const tous = posts.filter((p) => p.publieLe && new Date(p.publieLe) <= now);
  const comptes = plan.meta.comptes;
  const jourAnalyse = jour || utcVersParis(now).date; // « --date » d'un lundi à venir : semaine visée, chiffres du moment
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

  // 2. La semaine écoulée : les 7 jours pleins avant le jour de l'analyse, tous formats.
  const debutSemaine = ajouterJours(jourAnalyse, -7);
  const postsSemaine = tous.filter((p) => {
    const d = parisDe(p).date;
    return d >= debutSemaine && d < jourAnalyse;
  });
  const ligne = (p) => ({
    date: parisDe(p).date, heure: parisDe(p).heure, jour: parisDe(p).jour, format: p.format,
    impressions: p.impressions, reactions: p.reactions, commentaires: p.commentaires, tauxEngagement: p.tauxEngagement,
    mur: estMur(p, now, regles?.maturiteHeures), url: p.url,
  });
  const semaine = {
    du: debutSemaine,
    au: ajouterJours(jourAnalyse, -1),
    comptes: Object.entries(parCompte(postsSemaine, comptes)).map(([compte, ps]) => ({
      compte,
      n: ps.length,
      recents: ps.filter((p) => !estMur(p, now, regles?.maturiteHeures)).length,
      formats: parFormat(ps),
      posts: ps.map(ligne),
    })),
  };

  // 3. Historique par format : tous les posts relevés, jours de semaine, posts mûrs (hors week-end).
  const murs = tous.filter((p) => estMur(p, now, regles?.maturiteHeures));
  const mursSemaine = murs.filter((p) => !estWeekend(parisDe(p).date));
  const dates = tous.map((p) => parisDe(p).date).sort();
  const historique = {
    du: dates[0] || null,
    au: dates[dates.length - 1] || null,
    comptes: Object.entries(parCompte(mursSemaine, comptes)).map(([compte, ps]) => ({ compte, formats: parFormat(ps) })),
  };

  // 4. Le week-end, à part : jamais dans les médianes du test.
  const weekend = {
    posts: tous.filter((p) => estWeekend(parisDe(p).date)).map((p) => ({
      compte: p.compte, ...ligne(p),
      medianeSemaine: mediane(mursSemaine.filter((z) => z.compte === p.compte).map((z) => z.impressions)),
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
    releves,
    decisionFinale: finale,
    total: plan.creneaux.length,
    echus: creneaux.length,
    apparies: apparies.length,
    manquants,
    horsPlan: horsPlanSemaine,
    anomalies: anomaliesDeFormat(apparies),
    sansMesure: tous.filter((p) => p.impressions === null).length,
    comptes: analyses,
    synthese,
    semaine,
    historique,
    weekend,
  };
}
