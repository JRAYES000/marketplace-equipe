// File des posts programmés lue dans la table n8n publications_linkedin (workflow 38), qui remplace la file Buffer.
// Entrée : réponse(s) de get_data_table_rows (MCP n8n) enregistrée(s) telle(s) quelle(s).
// Partagé par linkedin-mise-en-forme (controle-avant-publication.mjs --n8n) et analyse-lundi-linkedin
// (file-depuis-n8n.mjs, qui écrit file-attente-buffer.txt pour verifier-creneaux.mjs).

const FORMATS = { texte: "T", image: "I", carrousel: "C", video: "V" };

/** Réponse de get_data_table_rows ({ rows: [...] }), tableau de lignes, ou plusieurs pages concaténées. */
export function lignesN8n(donnees) {
  if (Array.isArray(donnees)) return donnees.flatMap((d) => (d && Array.isArray(d.rows) ? d.rows : [d]));
  if (donnees && Array.isArray(donnees.rows)) return donnees.rows;
  throw new Error("Entrée n8n illisible : tableau de lignes ou objet { rows: [...] } attendu.");
}

function paris(instant) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .formatToParts(instant).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}

/**
 * Lignes publications_linkedin au statut a_publier → [{ date, heure (Paris), instant (ISO UTC), compte (julien-…), format (T/I/C), texte }],
 * triées par instant. Une ligne sans publier_le valide ou au compte inconnu lève une erreur : rien n'est ignoré en silence.
 */
export function fileDepuisN8n(lignes, { statut = "a_publier" } = {}) {
  return lignes.filter((l) => l && l.statut === statut).map((l) => {
    const t = new Date(l.publier_le);
    if (!l.publier_le || Number.isNaN(t.getTime())) throw new Error(`Ligne ${l.id ?? "?"} : publier_le illisible (${l.publier_le}).`);
    const compte = { agency: "julien-agency", partners: "julien-partners", mdc: "julien-mdc" }[String(l.compte || "").replace(/^julien-/, "")];
    if (!compte) throw new Error(`Ligne ${l.id ?? "?"} : compte inconnu (${l.compte}).`);
    return { ...paris(t), instant: t.toISOString(), compte, format: FORMATS[l.format] || "?", texte: String(l.texte || ""), id: l.id };
  }).sort((a, b) => a.instant.localeCompare(b.instant));
}

/** Format historique de la file : « AAAA-MM-JJ HH:MM compte # F début du texte » (heure de Paris), lu par les deux skills. */
export function lignesFichierFile(file) {
  return file.map((p) => `${p.date} ${p.heure} ${p.compte} # ${p.format} ${p.texte.split("\n")[0].replace(/\s+/g, " ").trim().slice(0, 120)}`);
}
