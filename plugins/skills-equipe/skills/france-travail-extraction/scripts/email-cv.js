#!/usr/bin/env node
// Lecture de l'email d'un CV (texte pdftotext ou OCR tesseract), et controle de vraisemblance.
//
//   node email-cv.js < texte.txt      imprime l'email retenu, suivi de ses marques
//                                     ([RECOLLE], [RECONSTRUIT]), ou rien.
//   require('./email-cv')             lireEmail(texte), nettoyer(email), douteux(email, profil, texteCv)
//
// v10.3 (08/10/2026) : 4 emails sur ~200 etaient faux, SalesHandy les a classes « bad » et les
// prospects sont restes en « Waiting » sans alerte. Defauts corriges ou signales ici :
//   1. partie locale coupee en fin de ligne (CV en deux colonnes) : « ROSALIE.VANDERMEU » puis
//      « LEN@EXEMPLE.COM » a la ligne suivante -> seul « LEN@… » etait garde. Recollee.
//   2. debut de l'email perdu (« rosine. dubreuill@… ») et « 1 » lu « l ». Le debut separe par
//      une espace est recolle ; le « l » colle au nom est signale, jamais corrige.
//   3. caractere de tete parasite (icone d'enveloppe) : « _maxou-du-29@… ». Retire.
//   4. lettres mal lues : « sCsatelierdubois7@… ». Signale (partie locale sans rien du nom).
// Tests : node --test tests/email-cv.test.js (fichiers texte fictifs, aucune donnee reelle).
'use strict';

const CAR = 'A-Za-z0-9._%+-';
const RE_EMAIL = new RegExp('[' + CAR + ']+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}', 'g');
// Libelles qu'un CV pose juste avant l'email : jamais un debut de partie locale.
const LIBELLES = /^(e-?mail|mail|m[eé]l|courriel|contact|adresse|coordonn[eé]es|t[eé]l|phone)$/i;
const FAI = 'gmail|yahoo|hotmail|outlook|orange|wanadoo|free|laposte|sfr|icloud';

// Retire ce qui precede le premier caractere alphanumerique : « _maxou@… », « .jean@… ».
const nettoyer = e => (e || '').replace(/^[^A-Za-z0-9]+/, '').replace(/\.+$/, '');

// Casse d'un fragment, chiffres et ponctuation ignores : 'haut', 'bas' ou 'mixte'.
const casse = s => { const l = s.replace(/[^A-Za-z]/g, ''); return !l ? 'neutre' : l === l.toUpperCase() ? 'haut' : l === l.toLowerCase() ? 'bas' : 'mixte'; };
const compatibles = (a, b) => { const x = casse(a), y = casse(b); return x === 'neutre' || y === 'neutre' || x === y; };

// Fragment de partie locale juste avant l'email, sur la meme ligne : « rosine. dubreuill@… ».
// Seulement s'il finit par un separateur d'email (. _ -) et n'en est separe que d'une espace : un
// mot ordinaire, ou la colonne voisine, n'est jamais colle.
function prefixeMemeLigne(avant) {
  const m = avant.match(new RegExp('(?:^|\\s)([' + CAR + ']*[A-Za-z0-9][' + CAR + ']*[._-]) $'));
  if (!m || LIBELLES.test(m[1].replace(/[._-]+$/, ''))) return '';
  return m[1];
}

// Fragment en fin de ligne precedente, continue par l'email (CV en colonnes, pdftotext -layout) :
//   « …   ROSALIE.VANDERMEU » / « …   LEN@EXEMPLE.COM ».
// Conditions, toutes requises : dernier mot de la ligne, sans @, pas un libelle ; meme casse que la
// partie locale lue ; aligne sur la meme colonne (±3) ou seul sur sa ligne avec l'email en tete de
// la suivante ; et le fragment porte un separateur ou un chiffre, ou la partie lue est courte
// (< 4) — une coupure laisse un morceau, pas un mot entier.
function prefixeLignePrecedente(prec, ligne, debut, local) {
  if (!prec) return '';
  const m = prec.match(new RegExp('(^|\\s)([' + CAR + ']{2,})\\s*$'));
  if (!m) return '';
  const frag = m[2];
  const colFrag = m.index + m[1].length;
  if (LIBELLES.test(frag) || !compatibles(frag, local)) return '';
  if (/[:;,]$/.test(frag)) return '';
  const aligne = Math.abs(colFrag - debut) <= 3;
  const seuls = !prec.slice(0, colFrag).trim() && !ligne.slice(0, debut).trim();
  if (!aligne && !seuls) return '';
  if (!/[._\-0-9]/.test(frag) && local.length >= 4) return '';
  return frag;
}

// Premier email du texte, en trois passes, de la plus sure a la plus reconstruite.
// Rend { email, marques } ; marques : 'RECOLLE' (morceau recolle), 'RECONSTRUIT' (arobase devinee).
function lireEmail(texte) {
  const lignes = String(texte || '').split(/\r?\n/);

  // 1) tel quel, avec recollage du debut de la partie locale
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i];
    for (const m of l.matchAll(RE_EMAIL)) {
      let email = m[0];
      const marques = [];
      const lu = email.replace(/^[^A-Za-z0-9]+/, '');
      const debut = m.index + (email.length - lu.length);
      email = lu;
      const avant = l.slice(0, m.index);
      // Colle a un mot (« Email:jean@… ») : rien a recoller.
      let p = !avant || /\s$/.test(avant) ? prefixeMemeLigne(avant) : '';
      // Ligne precedente : email en tete de ligne, ou en tete de colonne (au moins 2 espaces avant).
      if (!p && (!avant.trim() || /\s{2,}$/.test(avant))) p = prefixeLignePrecedente(lignes[i - 1], l, debut, email.split('@')[0]);
      if (p) { email = p + email; marques.push('RECOLLE'); }
      email = nettoyer(email);
      if (email.includes('@')) return { email, marques };
    }
  }

  // 2) coupure parasite dans le domaine : « YAHO O.COM », « YAHO\nO.COM ».
  const plat = lignes.join(' ').replace(/@([A-Za-z0-9.-]+)[ ]+([A-Za-z0-9.-]*\.[A-Za-z]{2,})/g, '@$1$2');
  const m2 = plat.match(RE_EMAIL);
  if (m2) return { email: nettoyer(m2[0]), marques: [] };

  // 3) arobase lue comme un e : mdurandegmail.com -> mdurand@gmail.com. Probable, jamais certain.
  const m3 = plat.match(new RegExp('[' + CAR + ']+e(' + FAI + ')\\.[A-Za-z]{2,}', 'i'));
  if (m3) return { email: nettoyer(m3[0].replace(new RegExp('e(' + FAI + ')\\.', 'i'), '@$1.')), marques: ['RECONSTRUIT'] };

  return { email: '', marques: [] };
}

// ---- Vraisemblance -------------------------------------------------------------------------
const lettres = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const mots = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z]+/).filter(w => w.length >= 3);

// La partie locale partage-t-elle quelque chose avec le nom ? Un morceau de 4 lettres de l'un des
// mots du nom ou du prenom suffit (« benj » pour Benjamin), ou le mot entier s'il en a 3, ou les
// 3 premieres lettres du prenom (« maxou » pour Maxence).
function partageNom(local, profil) {
  const l = lettres(local);
  if (mots(profil.Prenom).some(w => l.includes(w.slice(0, 3)))) return true;
  return [...mots(profil.Nom), ...mots(profil.Prenom)].some(w => {
    if (w.length < 4) return l.includes(w);
    for (let k = 0; k + 4 <= w.length; k++) if (l.includes(w.slice(k, k + 4))) return true;
    return false;
  });
}

// Motifs « email douteux » a porter dans la Note. Ne corrige rien : l'agent relit le CV.
//   profil : { Nom, Prenom, anonyme } ; texteCv : texte du CV, pour savoir s'il porte le nom.
function douteux(email, profil, texteCv) {
  const local = (email || '').split('@')[0];
  if (!local) return [];
  const out = [];
  if (local.replace(/[^A-Za-z0-9]/g, '').length < 3) out.push('email douteux (partie locale de moins de 3 caracteres)');
  const p = profil || {};
  const nom = lettres(p.Nom);
  const porteNom = !p.anonyme && nom.length >= 3 && lettres(texteCv).includes(nom);
  if (porteNom && !out.length) {
    if (!partageNom(local, p)) out.push('email douteux (rien du nom du candidat)');
    // « dubreuil1 » lu « dubreuill » : un l ou un I colle au nom, en fin de partie locale.
    else if (new RegExp(nom + '[li]$').test(local.toLowerCase().replace(/[^a-z0-9]/g, ''))) out.push('email douteux (chiffre 1 lu l ?)');
  }
  return out;
}

module.exports = { lireEmail, nettoyer, douteux, RE_EMAIL };

if (require.main === module) {
  let t = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { t += d; });
  process.stdin.on('end', () => {
    const r = lireEmail(t);
    if (r.email) process.stdout.write(r.email + r.marques.map(m => ' [' + m + ']').join(''));
  });
}
