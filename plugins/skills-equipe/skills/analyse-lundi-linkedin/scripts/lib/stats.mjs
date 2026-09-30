// Statistiques du test des formats : tout est calculé ici, en code, jamais « à la main ».
// Aucune dépendance : Node seul.

/** Médiane d'une liste de nombres (null si la liste est vide). */
export function mediane(valeurs) {
  const a = valeurs.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  const n = a.length;
  if (n === 0) return null;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

/** Quantile par interpolation linéaire (q entre 0 et 1). */
export function quantile(valeurs, q) {
  const a = valeurs.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (a.length === 0) return null;
  const pos = (a.length - 1) * q;
  const bas = Math.floor(pos);
  const haut = Math.ceil(pos);
  return a[bas] + (a[haut] - a[bas]) * (pos - bas);
}

/** Générateur pseudo-aléatoire à graine (mulberry32) : deux exécutions donnent le même résultat. */
export function generateur(graine) {
  let s = graine >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Intervalle de confiance bootstrap (percentiles) du rapport médiane(b) / médiane(a).
 * Les tirages où médiane(a) vaut 0 sont écartés (rapport indéfini) et comptés.
 */
export function icRapportMedianes(a, b, { tirages = 10000, niveau = 0.9, graine = 20261005 } = {}) {
  if (a.length === 0 || b.length === 0) return { bas: null, haut: null, ecartes: 0 };
  const alea = generateur(graine);
  const rapports = [];
  let ecartes = 0;
  const tirer = (x) => Array.from({ length: x.length }, () => x[Math.floor(alea() * x.length)]);
  for (let i = 0; i < tirages; i++) {
    const ma = mediane(tirer(a));
    const mb = mediane(tirer(b));
    if (!ma) {
      ecartes++;
      continue;
    }
    rapports.push(mb / ma);
  }
  if (rapports.length === 0) return { bas: null, haut: null, ecartes };
  const marge = (1 - niveau) / 2;
  return { bas: quantile(rapports, marge), haut: quantile(rapports, 1 - marge), ecartes };
}

/** Probabilité exacte P(X = k) pour X ~ Binomiale(n, 1/2). */
function binomiale(n, k) {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c / 2 ** n;
}

/** Test des signes exact, bilatéral : k succès sur n paires décidées. */
export function pSigne(k, n) {
  if (n === 0) return 1;
  const extreme = Math.max(k, n - k);
  let p = 0;
  for (let i = extreme; i <= n; i++) p += binomiale(n, i);
  return Math.min(1, 2 * p);
}

/** Compare des paires [texte, carrousel] : combien favorisent chaque format (égalités écartées). */
export function comparerPaires(paires) {
  let carrousel = 0;
  let texte = 0;
  let egalites = 0;
  for (const [t, c] of paires) {
    if (c > t) carrousel++;
    else if (t > c) texte++;
    else egalites++;
  }
  const decidees = carrousel + texte;
  return { carrousel, texte, egalites, decidees, p: pSigne(carrousel, decidees) };
}
