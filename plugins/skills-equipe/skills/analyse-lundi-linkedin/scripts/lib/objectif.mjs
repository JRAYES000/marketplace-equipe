// Point d'objectif de Julien (mail du 14/10/2026) : médiane des impressions d'un compte sur les posts
// publiés pendant une période, comparée à une référence et à un seuil. Fonction pure, testée par
// test/objectif.test.mjs. Même méthode que l'analyse du lundi : posts lus dans les relevés Buffer
// Insights (fusionnés par id_buffer), date de publication en heure de Paris, maturité à 48 h.
import { estMur, REGLES } from './analyse.mjs';
import { utcVersParis } from './calendrier.mjs';
import { mediane } from './stats.mjs';

/**
 * posts : sortie de fusionnerReleves(). du/au : dates de Paris incluses (« AAAA-MM-JJ »).
 * Retourne la médiane sur tous les posts de la période et sur les seuls posts mûrs (48 h), le verdict
 * contre le seuil (sur les posts mûrs, seul chiffre stable), et l'écart à la référence.
 */
export function calculerObjectif({ posts, compte, du, au, maintenant, reference, seuil, maturiteHeures = REGLES.maturiteHeures }) {
  const periode = posts
    .filter((p) => p.compte === compte)
    .map((p) => ({ ...p, paris: utcVersParis(new Date(p.publieLe)) }))
    .filter((p) => p.paris.date >= du && p.paris.date <= au)
    .map((p) => ({ ...p, mur: estMur(p, maintenant, maturiteHeures) }));
  const imp = (liste) => liste.map((p) => p.impressions).filter(Number.isFinite);
  const murs = periode.filter((p) => p.mur);
  const medTous = mediane(imp(periode));
  const medMurs = mediane(imp(murs));
  const sansChiffre = periode.filter((p) => !Number.isFinite(p.impressions));
  return {
    compte, du, au, maintenant: new Date(maintenant).toISOString(), reference, seuil,
    nPosts: periode.length, nMurs: murs.length, nSansChiffre: sansChiffre.length,
    medianeTous: medTous, medianeMurs: medMurs,
    atteint: medMurs === null ? null : medMurs > seuil,
    rapportReference: medMurs === null || !reference ? null : medMurs / reference,
    posts: periode.sort((a, b) => a.publieLe.localeCompare(b.publieLe)),
  };
}

const nb = (x) => (x === null ? "inconnu" : Number.isInteger(x) ? x.toLocaleString("fr-FR") : x.toLocaleString("fr-FR", { maximumFractionDigits: 1 }));

/** Rapport Markdown de forme constante. */
export function rendreObjectif(r, { releves = [], sourceReference = "" } = {}) {
  const l = [];
  l.push(`# Objectif de Julien : médiane ${r.compte} du ${r.du} au ${r.au}`, "");
  l.push(`Calculé le ${r.maintenant} (UTC, heure du serveur Buffer sauf mention contraire). Source unique : relevés Buffer Insights (${releves.length} fichier(s) : ${releves.join(", ") || "aucun"}). Calcul en code : \`analyse-lundi-linkedin/scripts/objectif-julien.mjs\`.`, "");
  l.push("## À retenir", "");
  l.push(`- Posts publiés sur la période : **${r.nPosts}**, dont **${r.nMurs}** mûrs (48 h ou plus au moment du calcul)${r.nSansChiffre ? `, dont ${r.nSansChiffre} sans chiffre dans Insights` : ""}.`);
  l.push(`- Médiane des impressions, posts mûrs : **${nb(r.medianeMurs)}** (tous posts, y compris non mûrs : ${nb(r.medianeTous)}).`);
  l.push(`- Seuil de Julien : au-dessus de ${nb(r.seuil)} → **${r.atteint === null ? "non mesurable (aucun post mûr)" : r.atteint ? "ATTEINT" : "NON ATTEINT"}**.`);
  l.push(`- Référence : ${nb(r.reference)}${sourceReference ? ` (${sourceReference})` : ""} → rapport ${r.rapportReference === null ? "inconnu" : `× ${nb(r.rapportReference)}`}.`);
  l.push("", "## Posts de la période", "", "| Date (Paris) | Heure | Format | Impressions | Réactions | Commentaires | Mûr | Lien |", "|---|---|---|---|---|---|---|---|");
  for (const p of r.posts) l.push(`| ${p.paris.date} | ${p.paris.heure} | ${p.format} | ${nb(p.impressions)} | ${nb(p.reactions)} | ${nb(p.commentaires)} | ${p.mur ? "oui" : "non"} | ${p.url || ""} |`);
  l.push("", "## Limites", "");
  l.push("- Les posts publiés moins de 48 h avant le calcul ne sont pas mûrs : leur chiffre monte encore, ils sont listés mais hors du verdict.");
  l.push("- Insights se met à jour avec retard : un post envoyé mais absent du relevé n'est pas compté ; le comparer à Publish > Sent avant de conclure.");
  l.push("- Une médiane sur une dizaine de posts bouge avec un seul post très vu ou à zéro.");
  return l.join("\n") + "\n";
}
