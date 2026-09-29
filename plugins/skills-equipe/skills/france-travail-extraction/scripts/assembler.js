#!/usr/bin/env node
// Assemble le lot a partir du journal de parcours et des CV lus par OCR (v8.0).
// Remplace l'appariement et la mise en forme faits a la main par l'agent.
//
//   node assembler.js revue <cv.tsv>...
//       tableau court des nouveaux profils : pag, nom, titre, CV rattache ou non,
//       debut de presentation. Sert a choisir les profils a garder.
//   node assembler.js lot --choix <choix.json> --requete "<requete>" --date <AAAA-MM-JJ>
//                         --sortie <lot.json> <cv.tsv>...
//       ecrit le lot au format de nocodb.js (dedup / ecrire).
//
// Option commune : --journal <ft-journal.json>. Par defaut, le plus recent
// `ft-journal*.json` de Downloads (produit par `window.__exporter()`).
//
// choix.json : seulement les profils GARDES, par numero de pagination :
//   { "12": "Aspirante naturopathe", "15": { "Fonction": "Sophrologue", "Nom": "DURAND", "Prenom": "Anne" } }
// La valeur est la Fonction condensee, ou un objet qui peut aussi corriger une
// colonne (profil anonyme identifie par nom-du-cv.sh, par exemple).
//
// Appariement CV -> profil :
//   1. ancres : un CV qui contient le NOM et le prenom d'un profil du lot, son
//      telephone, ou un email qui porte son nom, est rattache a ce profil ;
//   2. entre deux ancres, l'ordre de telechargement (dlRang cote page, rang du
//      fichier cote CV) rattache les CV restants, SEULEMENT si les deux comptes
//      sont egaux. Sinon : « appariement incertain », email laisse vide.
// Jamais d'attribution par elimination : un email au mauvais nom est pire
// qu'un email manquant.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');

function die(m) { console.error('ERREUR : ' + m); process.exit(1); }
const args = process.argv.slice(2);
const cmd = args.shift();
const opt = {};
const fichiers = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
  else fichiers.push(args[i]);
}

const norm = s => ' ' + (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
const chiffres = s => (s || '').replace(/\D/g, '').replace(/^33/, '0');
// Format de la table : 06 XX XX XX XX.
const formatTel = s => { const d = chiffres(s); return d.length === 10 ? d.replace(/(..)(?!$)/g, '$1 ') : (s || ''); };

// ---- Journal -------------------------------------------------------------------------------
function journal() {
  let f = opt.journal;
  if (!f) {
    const dl = [path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Téléchargements')].find(d => fs.existsSync(d));
    if (!dl) die('Downloads introuvable ; passer --journal <fichier>');
    const c = fs.readdirSync(dl).filter(n => /^ft-journal.*\.json$/i.test(n))
      .map(n => path.join(dl, n)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (!c.length) die('aucun ft-journal*.json dans ' + dl + ' : lancer window.__exporter() dans la page');
    f = c[0];
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(j)) die('journal illisible : tableau attendu');
  return j.filter(r => !r.deja);
}

// « Prenom NOM » -> {Nom, Prenom}. Tokens en capitales = nom, les autres = prenom.
// Sans l'un des deux, c'est un intitule a la place du nom : profil anonyme.
function identite(s) {
  const t = (s || '').trim().split(/\s+/).filter(Boolean);
  const maj = t.filter(x => /[A-ZÀ-Ü]{2}/.test(x) && x === x.toUpperCase());
  const autres = t.filter(x => !maj.includes(x));
  if (!maj.length || !autres.length) return { Nom: (s || '').trim(), Prenom: '', anonyme: true };
  return { Nom: maj.join(' '), Prenom: autres.join(' '), anonyme: false };
}

// ---- CV ------------------------------------------------------------------------------------
function cvs() {
  if (!fichiers.length) die('au moins un fichier cv.tsv (sortie de emails-depuis-cv.sh ou ocr-par-tour.sh)');
  const out = [];
  let tour = 0;
  for (const f of fichiers) {
    for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^=== TOUR (\d+) ===/);
      if (m) { tour = +m[1]; continue; }
      const c = l.split('\t');
      if (c.length < 4 || !/^\d+$/.test(c[0])) continue;
      out.push({ tour, rang: +c[0], fichier: c[1], email: c[2] || '', tel: c[3] || '', texte: c[4] || '' });
    }
  }
  return out.sort((a, b) => a.tour - b.tour || a.rang - b.rang);
}

// Le CV porte-t-il l'identite de ce profil ?
function confirme(p, cv) {
  if (p.anonyme) return false;
  const t = norm(cv.texte);
  const nom = norm(p.Nom), pre = norm(p.Prenom.split(/[\s-]/)[0]);
  if (nom.trim().length >= 3 && t.includes(nom) && t.includes(pre)) return true;
  if (p.tel && cv.tel && chiffres(p.tel) === chiffres(cv.tel)) return true;
  const local = norm((cv.email.split('@')[0] || '').replace(/[._-]/g, ' '));
  return nom.trim().length >= 4 && local.replace(/ /g, '').includes(nom.trim().replace(/ /g, ''));
}

function apparier(profils, liste) {
  const tel = profils.filter(p => p.telecharge)
    .sort((a, b) => (a.dlRang ?? 1e9) - (b.dlRang ?? 1e9));
  const res = new Map(); // profil -> {cv, mode}
  // 1. ancres, monotones
  const ancres = [];
  liste.forEach((cv, k) => {
    const qui = tel.map((p, i) => confirme(p, cv) ? i : -1).filter(i => i >= 0);
    if (qui.length === 1) ancres.push([k, qui[0]]);
  });
  const sures = [];
  for (const a of ancres) {
    const prev = sures[sures.length - 1];
    if (!prev || (a[0] > prev[0] && a[1] > prev[1])) sures.push(a);
  }
  sures.forEach(([k, i]) => res.set(tel[i], { cv: liste[k], mode: 'nom' }));
  // 2. segments entre ancres
  const bornes = [[-1, -1], ...sures, [liste.length, tel.length]];
  for (let s = 0; s < bornes.length - 1; s++) {
    const [k0, i0] = bornes[s], [k1, i1] = bornes[s + 1];
    const segCv = liste.slice(k0 + 1, k1), segP = tel.slice(i0 + 1, i1);
    if (segCv.length === segP.length) segP.forEach((p, j) => res.set(p, { cv: segCv[j], mode: 'ordre' }));
    else segP.forEach(p => res.set(p, { cv: null, mode: segCv.length ? 'incertain' : 'non recu' }));
  }
  return res;
}

function construire() {
  const profils = journal().map(r => ({ ...r, ...identite(r.nom) }));
  const liste = cvs();
  const app = apparier(profils, liste);
  return profils.map(p => {
    const a = app.get(p) || { cv: null, mode: p.aCV ? 'non recu' : 'pas de CV' };
    const motifs = [];
    let email = '', telCv = '';
    if (!p.aCV) motifs.push('pas de CV');
    else if (a.mode === 'incertain') motifs.push('appariement incertain');
    else if (a.mode === 'non recu') motifs.push('CV non recu');
    else {
      telCv = a.cv.tel;
      if (/\[RECONSTRUIT\]/.test(a.cv.email)) { email = a.cv.email.replace(/\s*\[RECONSTRUIT\]/, ''); motifs.push('email reconstruit'); }
      else email = a.cv.email;
      if (!email) motifs.push(a.cv.texte.trim() ? 'email non trouve' : 'PDF illisible');
    }
    if (p.anonyme) motifs.push('profil anonyme');
    return { p, a, email, tel: formatTel(telCv || p.tel || ''), motifs };
  });
}

// ---- Commandes -----------------------------------------------------------------------------
if (cmd === 'revue') {
  const r = construire();
  console.log('pag | nom | titre | commune | CV | presentation');
  for (const x of r) {
    const cv = !x.p.aCV ? 'pas de CV' : x.a.cv ? (x.email || '(sans email)') + ' [' + x.a.mode + ' ' + x.a.cv.fichier + ']' : x.a.mode;
    console.log([x.p.pag, x.p.nom, x.p.titre, x.p.commune, cv, (x.p.presentation || '').slice(0, 90)].join(' | '));
  }
  const n = m => r.filter(x => x.a.mode === m).length;
  console.log('--- ' + r.length + ' nouveaux profils ; CV rattaches par nom ' + n('nom') + ', par ordre ' + n('ordre') +
    ', incertains ' + n('incertain') + ', non recus ' + n('non recu') + ', sans CV ' + r.filter(x => !x.p.aCV).length +
    ' ; CV lus ' + cvs().length);
} else if (cmd === 'lot') {
  for (const k of ['choix', 'requete', 'date', 'sortie']) if (!opt[k]) die('--' + k + ' manquant');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opt.date)) die('--date au format AAAA-MM-JJ');
  const choix = JSON.parse(fs.readFileSync(opt.choix, 'utf8'));
  const r = construire();
  const parPag = new Map(r.map(x => [String(x.p.pag), x]));
  const inconnus = Object.keys(choix).filter(k => !parPag.has(k));
  if (inconnus.length) die('pag absents du journal : ' + inconnus.join(','));
  const lot = Object.entries(choix).map(([pag, v]) => {
    const x = parPag.get(pag);
    const surcharge = typeof v === 'string' ? { Fonction: v } : v;
    if (!surcharge.Fonction) die('pag ' + pag + ' : Fonction manquante');
    const pres = (x.p.presentation || '').trim() || 'Pas de texte de presentation';
    // Identite retrouvee (nom-du-cv.sh) : le profil n'est plus anonyme.
    const motifs = surcharge.Prenom ? x.motifs.filter(m => m !== 'profil anonyme') : x.motifs;
    const o = {
      Nom: x.p.Nom, Prenom: x.p.Prenom, Email: x.email, Telephone: x.tel, Commune: x.p.commune,
      Requete: opt.requete, 'Date extraction': opt.date, 'Profil mis a jour': x.p.maj,
      Note: motifs.length ? pres + ' — ' + motifs.join(', ') : pres,
      ...surcharge,
    };
    Object.keys(o).forEach(k => { if (o[k] === undefined || o[k] === null || String(o[k]).trim() === '') delete o[k]; });
    return o;
  });
  fs.writeFileSync(opt.sortie, JSON.stringify(lot, null, 1));
  console.log('lot ecrit : ' + lot.length + ' fiche(s), dont ' + lot.filter(o => o.Email).length + ' avec email et ' +
    lot.filter(o => o.Telephone).length + ' avec telephone -> ' + opt.sortie);
} else {
  die('commande inconnue. Voir l en-tete du script.');
}
