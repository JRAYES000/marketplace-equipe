// Lecture seule de l'API Zernio (docs.zernio.com). Aucune écriture, jamais.
// La clé ZERNIO_API_KEY vient de l'environnement, sinon du .env de cette skill, sinon de celui de
// linkedin-carrousel (même clé). Elle n'est jamais affichée.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://zernio.com/api/v1';
const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE_SKILL = join(ICI, '..', '..');

/** Charge ZERNIO_API_KEY sans jamais écraser l'environnement réel. Renvoie l'origine trouvée. */
export function chargerCle(env = process.env) {
  if (env.ZERNIO_API_KEY) return 'environnement';
  const candidats = [join(RACINE_SKILL, '.env'), join(RACINE_SKILL, '..', 'linkedin-carrousel', '.env')];
  for (const f of candidats) {
    if (!existsSync(f)) continue;
    for (const ligne of readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = ligne.match(/^ZERNIO_API_KEY=(.+)$/);
      if (m && m[1].trim()) {
        env.ZERNIO_API_KEY = m[1].trim();
        return f.includes('linkedin-carrousel') ? 'linkedin-carrousel/.env' : '.env de la skill';
      }
    }
  }
  return null;
}

async function lire(chemin, params = {}, { essais = 5, attenteMs = 3000, fetchFn = fetch } = {}) {
  const cle = process.env.ZERNIO_API_KEY;
  if (!cle) throw new Error('ZERNIO_API_KEY absente (voir .env.example).');
  const url = new URL(BASE + chemin);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  for (let i = 0; i < essais; i++) {
    const r = await fetchFn(url, { headers: { Authorization: `Bearer ${cle}` } });
    if (r.status === 202) { // synchronisation en cours : la doc demande de relancer
      await new Promise((ok) => setTimeout(ok, attenteMs));
      continue;
    }
    if (!r.ok) throw new Error(`Zernio ${chemin} : HTTP ${r.status}`);
    return r.json();
  }
  throw new Error(`Zernio ${chemin} : toujours HTTP 202 après ${essais} essais.`);
}

/** Heure du serveur Zernio (en-tête HTTP Date) : l'horloge de la machine n'est jamais la référence. */
export async function lireHeureServeur({ fetchFn = fetch } = {}) {
  const cle = process.env.ZERNIO_API_KEY;
  if (!cle) throw new Error('ZERNIO_API_KEY absente (voir .env.example).');
  const r = await fetchFn(`${BASE}/profiles`, { headers: { Authorization: `Bearer ${cle}` } });
  const d = r.headers.get('date');
  if (!d) throw new Error("Zernio : pas d'en-tête Date.");
  return new Date(d);
}

/** Tous les posts publiés avec leurs chiffres (GET /v1/analytics), toutes pages. */
export async function lireAnalytics({ depuis, jusqua }, options) {
  const posts = [];
  let apercu = null;
  for (let page = 1; page < 50; page++) {
    const j = await lire('/analytics', { fromDate: depuis, toDate: jusqua, limit: 100, page, sortBy: 'date', order: 'asc' }, options);
    apercu = j.overview;
    posts.push(...(j.posts || []));
    if (page >= (j.pagination?.pages || 1)) break;
  }
  return { posts, apercu };
}

/** Tous les posts, tous statuts (GET /v1/posts), pour contrôler les créneaux. */
export async function lireTousLesPosts(options) {
  const posts = [];
  for (let page = 1; page < 50; page++) {
    const j = await lire('/posts', { limit: 100, page }, options);
    posts.push(...(j.posts || []));
    if (page >= (j.pagination?.pages || 1)) break;
  }
  return posts;
}

/** Posts Zernio → forme simple { id, accountId, instant, statut } (un post par plateforme). */
export function aplatirPosts(posts) {
  const sortie = [];
  for (const p of posts) {
    for (const pf of p.platforms || []) {
      const accountId = typeof pf.accountId === 'object' ? pf.accountId?._id : pf.accountId;
      sortie.push({
        id: p._id,
        accountId,
        instant: pf.scheduledFor || p.scheduledFor || p.publishedAt,
        statut: p.status,
      });
    }
  }
  return sortie.filter((x) => x.accountId && x.instant);
}
