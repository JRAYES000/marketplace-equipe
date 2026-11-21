// Table n8n `stats_linkedin` (workflow 39, ScrapeCreators) → CSV au format des relevés Buffer
// (references/releve-buffer.md), pour que lireCsvBuffer et l'analyse restent inchangés.
// Pas d'impressions ni de taux d'engagement : aucune source ne les donne (colonnes laissées vides).

const COMPTES = { agency: 'julien-agency', partners: 'julien-partners' };
const FORMATS = { texte: 'T', image: 'I', carrousel: 'C' };
export const ENTETE = 'compte,publie_le,fuseau_affiche,format,impressions,reactions,commentaires,taux_eng_buffer_pct,id_buffer,lien';

/** Réponse de get_data_table_rows ({ rows: [...] }), tableau de lignes, ou plusieurs pages concaténées. */
export function lignesDe(donnees) {
  if (Array.isArray(donnees)) return donnees.flatMap((d) => (d && Array.isArray(d.rows) ? d.rows : [d]));
  if (donnees && Array.isArray(donnees.rows)) return donnees.rows;
  throw new Error('Entrée n8n illisible : tableau de lignes ou objet { rows: [...] } attendu.');
}

const jourUtc = (iso) => new Date(iso).toISOString().slice(0, 10);

/**
 * Lignes stats_linkedin → { date, csv, n }. Garde le relevé du jour `date` (AAAA-MM-JJ, UTC) ou, par défaut,
 * le plus récent ; un même post relevé deux fois ce jour-là garde la dernière mesure.
 */
export function convertirStatsN8n(lignes, { date = null } = {}) {
  const valides = lignes.filter((l) => l && l.releve_le);
  if (!valides.length) throw new Error('Aucune ligne stats_linkedin avec releve_le : rien à convertir.');
  const jour = date || valides.map((l) => jourUtc(l.releve_le)).sort().at(-1);
  const duJour = valides.filter((l) => jourUtc(l.releve_le) === jour);
  if (!duJour.length) throw new Error(`Aucun relevé stats_linkedin le ${jour}.`);

  const parPost = new Map();
  for (const l of duJour.sort((a, b) => String(a.releve_le).localeCompare(String(b.releve_le)))) {
    parPost.set(l.post_id || l.post_url, l);
  }
  const champ = (x, quoi, l) => {
    const s = String(x ?? '');
    if (/[,\r\n"]/.test(s)) throw new Error(`${quoi} « ${s} » (post ${l.post_id || l.post_url}) contient une virgule, un guillemet ou un saut de ligne.`);
    return s;
  };
  const sorties = [...parPost.values()].map((l) => {
    const compte = COMPTES[String(l.compte || '').toLowerCase()];
    if (!compte) throw new Error(`Compte « ${l.compte} » inconnu (agency ou partners), post ${l.post_id || l.post_url}.`);
    if (!l.publie_le) throw new Error(`Post ${l.post_id || l.post_url} sans publie_le.`);
    const t = new Date(l.publie_le).toISOString();
    return {
      tri: t,
      ligne: [
        compte, `${t.slice(0, 10)} ${t.slice(11, 16)}`, 'UTC', FORMATS[String(l.format || '').toLowerCase()] || '?',
        '', l.reactions ?? '', l.commentaires ?? '', '', champ(l.post_id, 'post_id', l), champ(l.post_url, 'post_url', l),
      ].join(','),
    };
  }).sort((a, b) => a.tri.localeCompare(b.tri));
  return { date: jour, csv: `${ENTETE}\n${sorties.map((s) => s.ligne).join('\n')}\n`, n: sorties.length };
}
