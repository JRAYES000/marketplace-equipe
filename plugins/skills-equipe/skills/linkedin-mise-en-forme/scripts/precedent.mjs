// Post precedent d'un compte, pour la regle de variete du 29/09/2026 (jamais deux posts de suite
// avec la meme accroche, le meme nombre de blocs et la meme fin). Ajoute le 30/09/2026 : avant,
// verif-post.mjs ne comparait que si on lui donnait le second chemin a la main.
//
// Ordre de recherche (consigne de Julien du 29/09/2026, 22h08) :
//   1. le .final.txt le plus recent DU COMPTE dans livrables-Claude-Agency/linkedin/ (chemin
//      configurable : option --dossier, ou variable LIVRABLES_LINKEDIN_DIR) ;
//   2. sinon le dernier post publie via l'API Zernio (GET /v1/posts?status=published, filtre
//      accountId) -- lecture seule, cle ZERNIO_API_KEY lue dans l'environnement, jamais affichee ;
//   3. sinon : un avertissement, jamais un echec.
//
// Compte : "a<N>.final.txt" = julien-agency, "p<N>.final.txt" = julien-partners (convention du
// dossier livrables), ou --compte explicite.
//
// "Le plus recent" = ordre (dossier date, numero du fichier). Si le brouillon est lui-meme dans
// ce dossier, on prend le dernier post STRICTEMENT AVANT lui : comparer un brouillon a lui-meme
// ou a un post programme apres lui n'aurait aucun sens.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename, resolve } from "node:path";

export const DOSSIER_PAR_DEFAUT = join(homedir(), "OneDrive", "Documents", "GitHub", "livrables-Claude-Agency", "linkedin");
const BASE_ZERNIO = "https://zernio.com/api/v1";
const REGLAGES_COMPTES = new URL("../../linkedin-carrousel/reglages-comptes.json", import.meta.url);
const PREFIXES = { a: "julien-agency", p: "julien-partners" };

export function compteDepuisNom(chemin) {
  const m = basename(chemin).match(/^([ap])\d+/i);
  return m ? PREFIXES[m[1].toLowerCase()] : null;
}

const cle = (dossierDate, fichier) => [dossierDate, Number(fichier.match(/(\d+)\.final\.txt$/)[1])];
const compare = (x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]);

// Tous les .final.txt du compte, tries du plus ancien au plus recent. Les dossiers qui ne sont pas
// des dates (a-trier, ...) sont ignores : ce ne sont pas des posts a venir ni publies.
export function postsLocauxDuCompte(dossier, compte) {
  if (!existsSync(dossier)) return [];
  const trouves = [];
  for (const d of readdirSync(dossier)) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(d) || !statSync(join(dossier, d)).isDirectory()) continue;
    for (const f of readdirSync(join(dossier, d))) {
      if (/^[ap]\d+\.final\.txt$/i.test(f) && compteDepuisNom(f) === compte) trouves.push({ chemin: join(dossier, d, f), cle: cle(d, f) });
    }
  }
  return trouves.sort((x, y) => compare(x.cle, y.cle));
}

export function precedentLocal({ dossier, compte, brouillon }) {
  const posts = postsLocauxDuCompte(dossier, compte);
  const moi = brouillon ? posts.find((p) => resolve(p.chemin) === resolve(brouillon)) : null;
  const candidats = moi ? posts.filter((p) => compare(p.cle, moi.cle) < 0) : posts;
  const dernier = candidats[candidats.length - 1];
  return dernier ? { chemin: dernier.chemin, texte: lireCorpsFichier(dernier.chemin) } : null;
}

// Meme lecture que verif-post.mjs : fins de ligne normalisees, frontmatter retire.
export function lireCorpsFichier(chemin) {
  const texte = readFileSync(chemin, "utf8").replace(/\r\n/g, "\n").trim();
  return texte.startsWith("---") ? texte.slice(texte.indexOf("\n---", 3) + 4).trim() : texte;
}

// Dernier post publie du compte, via Zernio. Renvoie { texte } ou { erreur } -- ne leve jamais.
export async function dernierPostZernio({ compte, apiKey, comptes, fetchImpl = fetch }) {
  // apiKey : la cle, ou une fonction qui la lit (appelee seulement ici, donc seulement si le dossier
  // local n'a rien donne -- le .env n'est jamais ouvert pour rien).
  const cle = typeof apiKey === "function" ? apiKey() : apiKey;
  if (!cle) return { erreur: "ZERNIO_API_KEY absente de l'environnement" };
  let accountId;
  try {
    accountId = (comptes || JSON.parse(readFileSync(REGLAGES_COMPTES, "utf8")))[compte]?.zernio_account_id;
  } catch (e) {
    return { erreur: `reglages-comptes.json illisible (${e.message})` };
  }
  if (!accountId) return { erreur: `aucun zernio_account_id pour "${compte}"` };
  try {
    const url = `${BASE_ZERNIO}/posts?status=published&accountId=${encodeURIComponent(accountId)}&sortBy=created-desc&limit=1`;
    const r = await fetchImpl(url, { headers: { Authorization: `Bearer ${cle}` } });
    if (!r.ok) return { erreur: `Zernio a repondu HTTP ${r.status}` };
    const contenu = (await r.json()).posts?.[0]?.content;
    return contenu ? { texte: String(contenu).trim() } : { erreur: "aucun post publie trouve sur Zernio pour ce compte" };
  } catch (e) {
    return { erreur: `appel Zernio impossible (${e.message})` };
  }
}

// Point d'entree : { texte, source } ou { avertissement }. Jamais d'echec.
export async function resoudrePrecedent({ brouillon, compte, dossier, apiKey, comptes, fetchImpl }) {
  const c = compte || (brouillon ? compteDepuisNom(brouillon) : null);
  if (!c) return { avertissement: "compte inconnu (nom de fichier a<N>/p<N>.final.txt ou --compte) : regle de variete non mesuree" };
  const raisons = [];
  const dossierLu = dossier || process.env.LIVRABLES_LINKEDIN_DIR || DOSSIER_PAR_DEFAUT;
  const local = precedentLocal({ dossier: dossierLu, compte: c, brouillon });
  if (local) return { texte: local.texte, source: `${c} : ${local.chemin}` };
  raisons.push(existsSync(dossierLu) ? `aucun .final.txt precedent de ${c} dans ${dossierLu}` : `dossier introuvable : ${dossierLu}`);
  const z = await dernierPostZernio({ compte: c, apiKey, comptes, fetchImpl });
  if (z.texte) return { texte: z.texte, source: `${c} : dernier post publie via Zernio` };
  raisons.push(z.erreur);
  return { avertissement: `aucun post precedent pour ${c} (${raisons.join(" ; ")}) : regle de variete non mesuree` };
}
