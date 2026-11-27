// Posts precedents d'un compte, pour la regle de variete du 29/09/2026 (jamais deux posts de suite
// avec la meme accroche, le meme nombre de blocs et la meme fin). Ajoute le 30/09/2026 : avant,
// verif-post.mjs ne comparait que si on lui donnait le second chemin a la main. Etendu le meme jour
// aux 5 derniers posts du compte (NB_POSTS_VARIETE), du plus recent au plus ancien.
//
// Ordre de recherche (consigne de Julien du 29/09/2026, 22h08) :
//   1. les .final.txt les plus recents DU COMPTE (5 au plus) dans livrables-Claude-Agency/linkedin/
//      (chemin configurable : option --dossier, ou variable LIVRABLES_LINKEDIN_DIR) ;
//   2. sinon : un avertissement, jamais un echec. (Le repli sur l'API Zernio est retire le
//      21/11/2026 : Zernio est abandonne depuis le 08/10/2026 et ne voit pas les posts Buffer.)
//
// Compte : "a<N>.final.txt" = julien-agency, "p<N>.final.txt" = julien-partners, "m<N>.final.txt" = julien-mdc (convention du
// dossier livrables), ou --compte explicite.
//
// "Le plus recent" = ordre (dossier date, numero du fichier). Si le brouillon est lui-meme dans
// ce dossier, on prend le dernier post STRICTEMENT AVANT lui : comparer un brouillon a lui-meme
// ou a un post programme apres lui n'aurait aucun sens.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import { dossierLivrables } from "../../../lib/livrables.mjs";

export const DOSSIER_PAR_DEFAUT = join(dossierLivrables(), "linkedin");
export const NB_POSTS_VARIETE = 5;
const PREFIXES = { a: "julien-agency", p: "julien-partners", m: "julien-mdc" };

export function compteDepuisNom(chemin) {
  const m = basename(chemin).match(/^([apm])\d+/i);
  if (m) return PREFIXES[m[1].toLowerCase()];
  // posts-nouveaux/ : « AAAA-MM-JJ-agency-q2.final.txt », « AAAA-MM-JJ-partners-duet.final.txt »
  const n = basename(chemin).match(/^\d{4}-\d{2}-\d{2}-(agency|partners|mdc)-/i);
  return n ? `julien-${n[1].toLowerCase()}` : null;
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
      if (/^[apm]\d+\.final\.txt$/i.test(f) && compteDepuisNom(f) === compte) trouves.push({ chemin: join(dossier, d, f), cle: cle(d, f) });
    }
  }
  return trouves.sort((x, y) => compare(x.cle, y.cle));
}

// Jusqu'a n posts du compte, du plus recent au plus ancien. Si le brouillon est lui-meme dans le
// dossier, seulement ceux STRICTEMENT AVANT lui. Tableau vide si rien (jamais d'exception).
export function precedentsLocaux({ dossier, compte, brouillon, n = NB_POSTS_VARIETE }) {
  const posts = postsLocauxDuCompte(dossier, compte);
  const moi = brouillon ? posts.find((p) => resolve(p.chemin) === resolve(brouillon)) : null;
  const candidats = moi ? posts.filter((p) => compare(p.cle, moi.cle) < 0) : posts;
  return candidats.slice(-n).reverse().map((p) => ({ chemin: p.chemin, texte: lireCorpsFichier(p.chemin) }));
}

export const precedentLocal = (options) => precedentsLocaux({ ...options, n: 1 })[0] ?? null;

// Meme lecture que verif-post.mjs : fins de ligne normalisees, frontmatter retire.
export function lireCorpsFichier(chemin) {
  const texte = readFileSync(chemin, "utf8").replace(/\r\n/g, "\n").trim();
  return texte.startsWith("---") ? texte.slice(texte.indexOf("\n---", 3) + 4).trim() : texte;
}

// Point d'entree : { texte (le plus recent), textes (5 au plus, du plus recent au plus ancien), source,
// sources } ou { avertissement }. Jamais d'echec.
export async function resoudrePrecedent({ brouillon, compte, dossier, n = NB_POSTS_VARIETE }) {
  const c = compte || (brouillon ? compteDepuisNom(brouillon) : null);
  if (!c) return { avertissement: "compte inconnu (nom de fichier a<N>/p<N>.final.txt ou --compte) : regle de variete non mesuree" };
  const raisons = [];
  const dossierLu = dossier || process.env.LIVRABLES_LINKEDIN_DIR || DOSSIER_PAR_DEFAUT;
  const locaux = precedentsLocaux({ dossier: dossierLu, compte: c, brouillon, n });
  if (locaux.length) {
    const sources = locaux.map((p) => `${c} : ${p.chemin}`);
    return { texte: locaux[0].texte, textes: locaux.map((p) => p.texte), source: sources[0], sources };
  }
  raisons.push(existsSync(dossierLu) ? `aucun .final.txt precedent de ${c} dans ${dossierLu}` : `dossier introuvable : ${dossierLu}`);
  return { avertissement: `aucun post precedent pour ${c} (${raisons.join(" ; ")}) : regle de variete non mesuree` };
}
