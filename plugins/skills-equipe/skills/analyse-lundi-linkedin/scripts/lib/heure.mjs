// Heure de référence de l'analyse : l'en-tête HTTP Date du serveur Buffer, jamais l'horloge de la machine
// (réglée sur Madagascar, UTC+3). Aucune clé, aucune donnée envoyée : une simple requête HEAD.
const URL_BUFFER = 'https://publish.buffer.com/';

/** Instant UTC lu sur le serveur Buffer. Abandon au bout de `delaiMs` (20 s par défaut). */
export async function lireHeureServeur({ fetchFn = fetch, delaiMs = 20000 } = {}) {
  let r;
  try {
    r = await fetchFn(URL_BUFFER, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(delaiMs) });
  } catch (e) {
    const cause = e.name === 'TimeoutError' ? `pas de réponse en ${delaiMs / 1000} s` : e.message;
    throw new Error(`Heure du serveur Buffer illisible (${cause}). Relancer, ou passer --maintenant AAAA-MM-JJTHH:MM:SSZ lu sur une source fiable.`);
  }
  const d = r.headers.get('date');
  if (!d || Number.isNaN(new Date(d).getTime())) throw new Error(`Serveur Buffer : pas d'en-tête Date exploitable (HTTP ${r.status}).`);
  return new Date(d);
}
