// Rendu Markdown de l'analyse du lundi : toujours la même forme, pour comparer d'un lundi à l'autre.
import { utcVersParis } from './calendrier.mjs';
import { REGLES } from './analyse.mjs';

const n0 = (x) => (x === null || x === undefined ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(1).replace('.', ','));
const pct = (x) => (x === null || x === undefined ? '–' : `${(x * 100).toFixed(1).replace('.', ',')} %`);
const fois = (x) => (x === null || x === undefined ? '–' : `×${x.toFixed(2).replace('.', ',')}`);
const parisLong = (iso) => {
  const p = utcVersParis(new Date(iso));
  return `${p.jour} ${p.date} ${p.heure} Paris`;
};

const LIBELLES = {
  carrousel: 'Le carrousel fait mieux : format retenu.',
  texte: 'Le texte fait mieux : format retenu.',
  non_concluant: `Différence non démontrée. Par défaut, on garde le format le moins coûteux (${REGLES.defautSiNonConcluant}), sauf décision contraire de Julien.`,
  incomplet: 'Pas assez de posts mûrs pour conclure : lecture provisoire.',
};

const LIGNE_FORMAT = (nom, r) =>
  `| ${nom} | ${r.n} | **${n0(r.impressions.mediane)}** | ${n0(r.impressions.q1)} à ${n0(r.impressions.q3)} | ${n0(r.impressions.min)} / ${n0(r.impressions.max)} | ${n0(r.portee)} | ${n0(r.reactions)} | ${n0(r.commentaires)} | ${pct(r.tauxEngagement)} |`;
const ENTETE_FORMAT = [
  '| Format | Posts | Impressions médianes | Quartiles (Q1 à Q3) | Min / max | Portée médiane | Réactions méd. | Commentaires méd. | Engagement méd. |',
  '|---|---|---|---|---|---|---|---|---|',
];

function tableSemaines(compte) {
  const l = ['| Semaine | Texte : n / méd. impressions | Carrousel : n / méd. impressions |', '|---|---|---|'];
  for (const s of compte.semaines) {
    l.push(`| ${s.semaine} | ${s.texte.n} / ${n0(s.texte.impressions.mediane)} | ${s.carrousel.n} / ${n0(s.carrousel.impressions.mediane)} |`);
  }
  return l.join('\n');
}

function tableDetail(compte) {
  const l = ['| Créneau | Date | Format | Sujet | Mûr | Impressions | Portée | Réactions | Commentaires | Lien |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const d of compte.detail) {
    l.push(`| ${d.id} | ${d.date} | ${d.format} | ${d.sujet} | ${d.mur ? 'oui' : 'non'} | ${n0(d.impressions)} | ${n0(d.portee)} | ${d.reactions} | ${d.commentaires} | ${d.url || '–'} |`);
  }
  return l.join('\n');
}

function resumeSynthese(r) {
  const final = r.decisionFinale;
  if (r.echus === 0) return 'Le test n’a pas commencé : cette analyse sert de référence de départ.';
  const parCompte = r.comptes.map((c) => `${c.compte} : ${c.decision.verdict}`).join(' ; ');
  if (r.synthese === 'divergent') return `${final ? 'Décision finale' : 'Lecture provisoire'} : les deux comptes ne concluent pas pareil (${parCompte}). Décision par compte, à valider par Julien.`;
  return `${final ? 'Décision finale' : 'Lecture provisoire'} : ${LIBELLES[r.synthese].replace(/\.$/, '')} (${parCompte}).`;
}

/** `r` = résultat de analyserTout (voir analyse-lundi.mjs). */
export function rendreRapport(r) {
  const L = [];
  L.push(`# Analyse du lundi ${r.dateAnalyse} — test des formats LinkedIn`);
  L.push('');
  L.push(`Heure de référence : ${r.heureServeur} (heure du serveur Zernio, pas l'horloge de la machine) — ${parisLong(r.heureServeur)}. Dernière synchronisation LinkedIn côté Zernio : ${r.derniereSync || 'inconnue'}.`);
  L.push(`Test : ${r.plan.debut} au ${r.plan.fin}, ${r.plan.semaines} semaines, jours ${r.plan.jours.join('/')}. Sources : Zernio (GET /v1/analytics)${r.buffer ? ` et relevé Buffer ${r.buffer.fichier}` : ''}.`);
  L.push('');
  L.push('## 1. À retenir');
  L.push('');
  L.push(`- **${resumeSynthese(r)}**`);
  L.push(`- Avancement : ${r.echus} créneau(x) échu(s) sur ${r.total}, ${r.apparies} publié(s) et rapproché(s) du plan, ${r.manquants.length} manquant(s).`);
  for (const c of r.semaine.comptes) {
    const imp = c.formats.map((f) => `${f.format} ${f.n} (méd. ${n0(f.impressions.mediane)})`).join(', ') || 'aucun post';
    L.push(`- Semaine du ${r.semaine.du} au ${r.semaine.au}, ${c.compte} : ${c.n} post(s) — ${imp}.`);
  }
  const alertes = [];
  if (r.manquants.length) alertes.push(`créneaux manquants : ${r.manquants.map((c) => c.id).join(', ')}`);
  if (r.anomalies.length) alertes.push(`anomalies de format : ${r.anomalies.length}`);
  if (r.chiffresAnciens) alertes.push(`chiffres Zernio anciens (${r.chiffresAnciens})`);
  if (r.buffer?.ecarts.length) alertes.push(`${r.buffer.ecarts.length} écart(s) Zernio / Buffer de plus de 15 %`);
  L.push(`- Alertes : ${alertes.length ? alertes.join(' ; ') : 'aucune'}.`);
  L.push('');

  L.push(`## 2. Semaine écoulée (${r.semaine.du} au ${r.semaine.au}, tous formats)`);
  L.push('');
  for (const c of r.semaine.comptes) {
    L.push(`### ${c.compte}`);
    L.push('');
    if (!c.posts.length) { L.push('Aucun post publié.'); L.push(''); continue; }
    L.push(`${c.n} post(s), dont ${c.recents} de moins de ${REGLES.maturiteHeures} h (chiffres encore incomplets).`);
    L.push('');
    L.push('| Jour | Heure | Format | Mûr | Impressions | Portée | Réactions | Commentaires | Lien |');
    L.push('|---|---|---|---|---|---|---|---|---|');
    for (const p of c.posts) L.push(`| ${p.jour} ${p.date} | ${p.heure} | ${p.format} | ${p.mur ? 'oui' : 'non'} | ${n0(p.impressions)} | ${n0(p.portee)} | ${p.reactions} | ${p.commentaires} | ${p.url || '–'} |`);
    L.push('');
  }

  let num = 3;
  if (r.echus > 0) {
    for (const c of r.comptes) {
      const d = c.decision;
      L.push(`## ${num++}. Test des formats — ${c.compte}`);
      L.push('');
      L.push(`${c.publies} posts du plan publiés, ${c.murs} mûrs, ${c.trop_recents} trop récents.`);
      L.push('');
      L.push(...ENTETE_FORMAT, LIGNE_FORMAT('Texte', c.texte), LIGNE_FORMAT('Carrousel', c.carrousel));
      L.push('');
      L.push(`**Verdict : ${LIBELLES[d.verdict]}**`);
      L.push('');
      for (const x of d.raisons) L.push(`- ${x}`);
      L.push(`- Rapport carrousel / texte : ${fois(d.ratio)}.`);
      L.push('');
      L.push('Par semaine (posts mûrs) :');
      L.push('');
      L.push(tableSemaines(c));
      L.push('');
    }
  }

  L.push(`## ${num++}. Week-end (suivi à part, jamais dans les médianes du test)`);
  L.push('');
  if (!r.weekend.posts.length) {
    L.push('Aucun post de week-end relevé par Zernio.');
  } else {
    L.push('| Compte | Jour | Heure | Format | Mûr | Impressions | Médiane semaine du compte | Réactions | Commentaires | Lien |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const p of r.weekend.posts) L.push(`| ${p.compte} | ${p.jour} ${p.date} | ${p.heure} | ${p.format} | ${p.mur ? 'oui' : 'non'} | ${n0(p.impressions)} | ${n0(p.medianeSemaine)} | ${p.reactions} | ${p.commentaires} | ${p.url || '–'} |`);
  }
  L.push('');
  L.push('Trop peu de posts pour conclure : on les regarde un par un, sans en tirer de règle.');
  L.push('');

  L.push(`## ${num++}. Historique par format (jours de semaine, posts mûrs)`);
  L.push('');
  L.push('Zernio (depuis ses premières données, le 25/09/2026) :');
  L.push('');
  for (const h of r.historiqueZernio) {
    L.push(`**${h.compte}**`);
    L.push('');
    if (!h.formats.length) { L.push('Aucun post.'); L.push(''); continue; }
    L.push(...ENTETE_FORMAT, ...h.formats.map((f) => LIGNE_FORMAT(f.format, f)));
    L.push('');
  }
  if (r.buffer?.reference?.length) {
    L.push('Buffer, avant le test (relevé, format corrigé d’après Zernio quand Zernio connaît le post) :');
    L.push('');
    L.push('| Compte | Format | Jours | Posts mesurés | Médiane d’impressions | Période |');
    L.push('|---|---|---|---|---|---|');
    for (const x of r.buffer.reference) L.push(`| ${x.compte} | ${x.format} | ${x.jours} | ${x.n} | ${n0(x.mediane)} | ${x.du} au ${x.au} |`);
    L.push('');
  }

  if (r.echus > 0) {
    L.push(`## ${num++}. Détail des posts du test`);
    L.push('');
    for (const c of r.comptes) {
      L.push(`### ${c.compte}`);
      L.push('');
      L.push(tableDetail(c));
      L.push('');
    }
  }
  if (r.horsPlan.length) {
    L.push(`## ${num++}. Posts hors plan (exclus des médianes)`);
    L.push('');
    L.push('Offres de mission de Julien (Buffer) ou posts imprévus, jours de semaine :');
    L.push('');
    for (const p of r.horsPlan) L.push(`- ${p.url || p.id}`);
    L.push('');
  }
  if (r.manquants.length || r.anomalies.length) {
    L.push(`## ${num++}. Écarts au plan`);
    L.push('');
    for (const c of r.manquants) L.push(`- **Manquant** : ${c.id} (${c.date} ${c.heureParis} Paris, ${c.format}).`);
    for (const a of r.anomalies) L.push(`- **Anomalie de format** : ${a}.`);
    L.push('');
  }
  if (r.buffer) {
    L.push(`## ${num++}. Contrôle croisé avec le relevé Buffer`);
    L.push('');
    L.push(`Fichier : ${r.buffer.fichier} (${r.buffer.lignes} lignes). Posts du test comparés : ${r.buffer.compares}. Écart d'impressions supérieur à 15 % : ${r.buffer.ecarts.length}. Étiquettes de format corrigées d'après Zernio : ${r.buffer.corrections.length}.`);
    for (const e of r.buffer.ecarts) L.push(`- ${e.id} : Zernio ${e.zernio}, Buffer ${e.buffer}.`);
    for (const c of r.buffer.corrections) L.push(`- ${c.id} : Buffer « ${c.buffer} », Zernio « ${c.zernio} » (Zernio retenu).`);
    L.push('');
  }
  L.push(`## ${num++}. Limites de lecture`);
  L.push('');
  L.push(`- Peu de posts par format : une médiane sur 8 posts bouge beaucoup avec un seul post viral. La règle de décision exige donc trois signaux concordants (rapport, intervalle, paires de même sujet).`);
  L.push(`- Un post compte dans les médianes ${REGLES.maturiteHeures} h après sa publication ; avant, ses chiffres sont incomplets.`);
  L.push("- Le commentaire quotidien sous les posts d'autres comptes continue pendant le test ; il n'est pas neutralisé, il est constant.");
  L.push('- Zernio synchronise LinkedIn une fois par jour : lire les chiffres du lundi matin, jamais ceux du jour même.');
  L.push('');
  return L.join('\n');
}
