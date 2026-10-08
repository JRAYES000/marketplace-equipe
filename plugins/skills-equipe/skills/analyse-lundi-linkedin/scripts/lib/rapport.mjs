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
  `| ${nom} | ${r.n} | **${n0(r.impressions.mediane)}** | ${n0(r.impressions.q1)} à ${n0(r.impressions.q3)} | ${n0(r.impressions.min)} / ${n0(r.impressions.max)} | ${n0(r.reactions)} | ${n0(r.commentaires)} | ${pct(r.tauxEngagement)} |`;
const ENTETE_FORMAT = [
  '| Format | Posts | Impressions médianes | Quartiles (Q1 à Q3) | Min / max | Réactions méd. | Commentaires méd. | Taux d’engagement méd. (Buffer) |',
  '|---|---|---|---|---|---|---|---|',
];

function tableSemaines(compte) {
  const l = ['| Semaine | Texte : n / méd. impressions | Carrousel : n / méd. impressions |', '|---|---|---|'];
  for (const s of compte.semaines) {
    l.push(`| ${s.semaine} | ${s.texte.n} / ${n0(s.texte.impressions.mediane)} | ${s.carrousel.n} / ${n0(s.carrousel.impressions.mediane)} |`);
  }
  return l.join('\n');
}

function tableDetail(compte) {
  const l = ['| Créneau | Date | Format | Sujet | Mûr | Impressions | Réactions | Commentaires | Taux d’engagement | Lien |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const d of compte.detail) {
    l.push(`| ${d.id} | ${d.date} | ${d.format} | ${d.sujet} | ${d.mur ? 'oui' : 'non'} | ${n0(d.impressions)} | ${n0(d.reactions)} | ${n0(d.commentaires)} | ${pct(d.tauxEngagement)} | ${d.url || '–'} |`);
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
  L.push(`Heure de référence : ${r.heureServeur} (en-tête Date du serveur Buffer, pas l'horloge de la machine) — ${parisLong(r.heureServeur)}.`);
  L.push(`Test : ${r.plan.debut} au ${r.plan.fin}, ${r.plan.semaines} semaines, jours ${r.plan.jours.join('/')}. Source unique : Buffer Insights (relevés ${r.releves.map((f) => f.split(/[\/]/).pop()).join(', ') || 'aucun'}). Indicateurs : impressions, réactions, commentaires, taux d’engagement (métriques Buffer, consigne de Julien du 08/10/2026).`);
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
  if (r.sansMesure) alertes.push(`${r.sansMesure} post(s) relevé(s) sans impressions`);
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
    L.push('| Jour | Heure (Paris) | Format | Mûr | Impressions | Réactions | Commentaires | Taux d’engagement | Lien |');
    L.push('|---|---|---|---|---|---|---|---|---|');
    for (const p of c.posts) L.push(`| ${p.jour} ${p.date} | ${p.heure} | ${p.format} | ${p.mur ? 'oui' : 'non'} | ${n0(p.impressions)} | ${n0(p.reactions)} | ${n0(p.commentaires)} | ${pct(p.tauxEngagement)} | ${p.url || '–'} |`);
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
    L.push('Aucun post de week-end dans les relevés Buffer.');
  } else {
    L.push('| Compte | Jour | Heure | Format | Mûr | Impressions | Médiane semaine du compte | Réactions | Commentaires | Lien |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const p of r.weekend.posts) L.push(`| ${p.compte} | ${p.jour} ${p.date} | ${p.heure} | ${p.format} | ${p.mur ? 'oui' : 'non'} | ${n0(p.impressions)} | ${n0(p.medianeSemaine)} | ${n0(p.reactions)} | ${n0(p.commentaires)} | ${p.url || '–'} |`);
  }
  L.push('');
  L.push('Trop peu de posts pour conclure : on les regarde un par un, sans en tirer de règle.');
  L.push('');

  L.push(`## ${num++}. Historique par format (jours de semaine, posts mûrs)`);
  L.push('');
  L.push(`Buffer Insights, tous les posts relevés (${r.historique.du || '–'} au ${r.historique.au || '–'}) :`);
  L.push('');
  for (const h of r.historique.comptes) {
    L.push(`**${h.compte}**`);
    L.push('');
    if (!h.formats.length) { L.push('Aucun post.'); L.push(''); continue; }
    L.push(...ENTETE_FORMAT, ...h.formats.map((f) => LIGNE_FORMAT(f.format, f)));
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
  L.push(`## ${num++}. Limites de lecture`);
  L.push('');
  L.push(`- Peu de posts par format : une médiane sur 8 posts bouge beaucoup avec un seul post viral. La règle de décision exige donc trois signaux concordants (rapport, intervalle, paires de même sujet).`);
  L.push(`- Un post compte dans les médianes ${REGLES.maturiteHeures} h après sa publication ; avant, ses chiffres sont incomplets.`);
  L.push("- Le commentaire quotidien sous les posts d'autres comptes continue pendant le test ; il n'est pas neutralisé, il est constant.");
  L.push('- Buffer Insights se rafraîchit avec retard (« Refreshed … ago » sur le détail du post) : les chiffres de la veille sont encore incomplets.');
  L.push('- Buffer Insights ne donne ni enregistrements ni envois par post : ils ne font pas partie des objectifs (Julien, 08/10/2026).');
  L.push('');
  return L.join('\n');
}
