// Heure de référence de l'analyse : l'en-tête HTTP Date du serveur n8n du VPS, jamais l'horloge de la machine
// (réglée sur Madagascar, UTC+3). Aucune clé, aucune donnée envoyée : une simple requête HEAD.
const URL_SERVEUR = 'https://n8n.claudeagency.fr/';

/** Instant UTC lu sur le serveur n8n. Abandon au bout de `delaiMs` (20 s par défaut). */
export async function lireHeureServeur({ fetchFn = fetch, delaiMs = 20000 } = {}) {
  let r;
  try {
    r = await fetchFn(URL_SERVEUR, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(delaiMs) });
  } catch (e) {
    const cause = e.name === 'TimeoutError' ? `pas de réponse en ${delaiMs / 1000} s` : e.message;
    throw new Error(`Heure du serveur n8n illisible (${cause}). Relancer, ou passer --maintenant AAAA-MM-JJTHH:MM:SSZ lu sur une source fiable.`);
  }
  const d = r.headers.get('date');
  if (!d || Number.isNaN(new Date(d).getTime())) throw new Error(`Serveur n8n : pas d'en-tête Date exploitable (HTTP ${r.status}).`);
  return new Date(d);
}
