#!/usr/bin/env node
// Assemble le lot a partir du journal de parcours et des CV lus par OCR (v8.0).
// Remplace l'appariement et la mise en forme faits a la main par l'agent.
//
//   node assembler.js revue <cv.tsv>...
//       tableau court des nouveaux profils : pag, nom, titre, CV rattache ou non,
//       debut de presentation. Sert a choisir les profils a garder.
//   node assembler.js lot --choix <choix.json> --requete "<requete>" --date <AAAA-MM-JJ>
//                         --sortie <lot.json> <cv.tsv>...
//       ecrit le lot au format de notion.js (publier).
//
// Option commune : --journal <ft-journal.json>. Par defaut, le plus recent
// `ft-journal*.json` de Downloads (produit par `window.__exporter()`), refuse s'il a plus de
// 2 h : un export bloque ferait sinon relire, sans le dire, le journal d'un lot precedent.
// Seule la derniere recherche du journal est gardee (--toutes-recherches pour tout garder) :
// deux recherches dans la meme page partagent les numeros de pagination.
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
//
// Hors-cible (v9.2) : « lot » range dans %LOCALAPPDATA%/france-travail-extraction/ecartes.json
// l'empreinte de chaque nouveau profil nomme absent de choix.json. « notion.js situer » la
// transmet a la page, qui saute ces profils au lot suivant sans CV ni OCR. Seule l'empreinte
// (SHA-256 tronque du « prenom nom » normalise) est gardee, 180 jours au plus ; jamais un nom,
// et rien n'apparait dans Notion ni NocoDB. Un profil anonyme n'est jamais range.
//
// CV sur Google Drive (v9.4, demande de Julien du 04/10/2026) : « lot » copie le CV de chaque
// profil garde dans le dossier Drive des CV, renomme « Prenom Nom AAAA-MM-JJ.pdf » (date
// d'extraction, ASCII). Seuls les CV rattaches par nom ou par ordre partent : un CV incertain
// n'a pas de nom sur, il reste hors de Drive. Dossier : --drive, sinon FT_CV_DRIVE, sinon
// « G:/Mon Drive/01 ECOLE NATURO/CV France Travail » (Google Drive pour ordinateur).
// --sans-drive saute cette etape. Un fichier deja present a l'identique n'est pas recopie.
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { DOSSIER } = require('./secrets-env');
const ECARTES = path.join(DOSSIER, 'ecartes.json');
const DUREE_ECARTE_J = 180;
// Meme normalisation que window.__cle dans extraction-profils.js : les deux doivent rester egales.
const cle = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const empreinte = s => crypto.createHash('sha256').update(cle(s)).digest('hex').slice(0, 16);

function die(m) { console.error('ERREUR : ' + m); process.exit(1); }
const args = process.argv.slice(2);
const cmd = args.shift();
const opt = {};
const fichiers = [];
const SANS_VALEUR = ['toutes-recherches', 'sans-drive'];
const DRIVE_DEFAUT = 'G:/Mon Drive/01 ECOLE NATURO/CV France Travail';
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = SANS_VALEUR.includes(k) ? true : args[++i]; }
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
    const age = (Date.now() - fs.statSync(f).mtimeMs) / 60000;
    if (age > 120) die(path.basename(f) + ' a ' + Math.round(age) + ' min : journal d un lot precedent ? Relancer window.__exporter(), ou passer --journal <fichier>');
  }
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(j)) die('journal illisible : tableau attendu');
  const derniere = j.length ? j[j.length - 1].recherche : undefined;
  const garde = opt['toutes-recherches'] || derniere === undefined ? j : j.filter(r => r.recherche === derniere);
  const neufs = garde.filter(r => !r.deja);
  const vus = new Set();
  for (const r of neufs) { if (vus.has(r.pag)) die('pag ' + r.pag + ' en double dans le journal (deux recherches melangees ?) : relancer sans --toutes-recherches'); vus.add(r.pag); }
  console.error('journal : ' + path.basename(f) + ', ' + neufs.length + ' nouveau(x) profil(s)' +
    (garde.length < j.length ? ' (derniere recherche seulement, ' + (j.length - garde.length) + ' ligne(s) plus anciennes ignorees)' : ''));
  return neufs;
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
  // Plus longue suite d'ancres croissante des deux cotes : une ancre fausse en tete ne bloque
  // plus toutes les bonnes qui suivent (l'ancien choix glouton gardait la premiere venue).
  const lg = ancres.map(() => 1), prec = ancres.map(() => -1);
  for (let b = 0; b < ancres.length; b++) {
    for (let a = 0; a < b; a++) {
      if (ancres[a][0] < ancres[b][0] && ancres[a][1] < ancres[b][1] && lg[a] + 1 > lg[b]) { lg[b] = lg[a] + 1; prec[b] = a; }
    }
  }
  const sures = [];
  for (let x = lg.indexOf(Math.max(0, ...lg)); x >= 0 && ancres.length; x = prec[x]) sures.unshift(ancres[x]);
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

// emails-depuis-cv.sh garde le PREMIER email du CV, qui peut etre celui d'un employeur ou d'un
// referent. Si un autre email du CV porte le nom ou le prenom du candidat, c'est lui qu'on prend.
const RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
function emailAuNom(p, cv) {
  if (p.anonyme) return '';
  const tous = [...new Set([cv.email.replace(/\s*\[RECONSTRUIT\]/, ''), ...(cv.texte.match(RE_EMAIL) || [])].filter(Boolean))];
  const cles = [norm(p.Nom), norm(p.Prenom.split(/[\s-]/)[0])].map(s => s.replace(/ /g, '')).filter(s => s.length >= 3);
  const porte = e => { const local = norm(e.split('@')[0]).replace(/ /g, ''); return cles.some(c => local.includes(c)); };
  if (tous.length < 2 || porte(tous[0])) return '';  // rien a choisir, ou le premier est deja le bon
  return tous.find(porte) || '';
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
      const auNom = emailAuNom(p, a.cv);
      if (auNom) email = auNom;
      else if (/\[RECONSTRUIT\]/.test(a.cv.email)) { email = a.cv.email.replace(/\s*\[RECONSTRUIT\]/, ''); motifs.push('email reconstruit'); }
      else email = a.cv.email;
      if (!email) motifs.push(a.cv.texte.trim() ? 'email non trouve' : 'PDF illisible');
    }
    if (p.anonyme) motifs.push('profil anonyme');
    return { p, a, email, tel: formatTel(telCv || p.tel || ''), motifs };
  });
}

// ---- CV sur Google Drive -------------------------------------------------------------------
// Le cv.tsv ne garde que le nom du fichier : il est dans le dossier de son tour
// (ocr-par-tour.sh), ou encore dans Downloads (emails-depuis-cv.sh seul, petit lot).
function cheminCv(cv) {
  const dl = [path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Téléchargements')].find(d => fs.existsSync(d)) || '';
  return [path.join(dl, '_cv-lot100', 'tour-' + cv.tour, 'Downloads', cv.fichier), path.join(dl, cv.fichier)].find(f => fs.existsSync(f));
}

// « Jean-Pierre », « DUPONT » -> « Jean-Pierre Dupont ». ASCII : pas d'accent dans un nom de fichier.
const casse = s => (s || '').toLowerCase().replace(/(^|[\s'-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
const nomFichier = (prenom, nom, date) => {
  const n = (casse(prenom) + ' ' + casse(nom)).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
  return n ? n + ' ' + date + '.pdf' : '';
};

function deposerSurDrive(liste, date) {
  const dossier = opt.drive || process.env.FT_CV_DRIVE || DRIVE_DEFAUT;
  if (!fs.existsSync(path.dirname(dossier))) {
    console.log('ATTENTION : CV non deposes sur Drive, ' + path.dirname(dossier) + ' introuvable (Google Drive pour ordinateur arrete ?). Relancer « lot » une fois Drive monte : rien n est ecrit deux fois.');
    return;
  }
  fs.mkdirSync(dossier, { recursive: true });
  let copies = 0, deja = 0;
  const manques = [];
  for (const { cv, Nom, Prenom } of liste) {
    const src = cheminCv(cv);
    // Sans prenom, le « Nom » est l'intitule du profil : pas un nom de personne.
    const base = Prenom ? nomFichier(Prenom, Nom, date) : '';
    if (!src || !base) { manques.push((Prenom + ' ' + Nom).trim() + (src ? ' (profil anonyme)' : ' (fichier ' + cv.fichier + ' introuvable)')); continue; }
    const taille = fs.statSync(src).size;
    let cible = path.join(dossier, base), k = 2, identique = false;
    while (fs.existsSync(cible)) {
      if (fs.statSync(cible).size === taille) { identique = true; break; }
      cible = path.join(dossier, base.replace(/\.pdf$/, ' (' + k++ + ').pdf'));
    }
    if (identique) { deja++; continue; }
    fs.copyFileSync(src, cible);
    copies++;
  }
  console.log('CV deposes sur Drive : ' + copies + (deja ? ', deja presents : ' + deja : '') + ' -> ' + dossier);
  if (manques.length) console.log('CV non deposes : ' + manques.join(' ; '));
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
  const pourDrive = [];
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
    if (x.a.cv) pourDrive.push({ cv: x.a.cv, Nom: o.Nom, Prenom: o.Prenom || '' });
    return o;
  });
  fs.writeFileSync(opt.sortie, JSON.stringify(lot, null, 1));
  console.log('lot ecrit : ' + lot.length + ' fiche(s), dont ' + lot.filter(o => o.Email).length + ' avec email et ' +
    lot.filter(o => o.Telephone).length + ' avec telephone -> ' + opt.sortie);
  if (!opt['sans-drive']) deposerSurDrive(pourDrive, opt.date);

  // Hors-cible : empreintes ajoutees ; un profil garde cette fois en est retire (choix corrige).
  const garde = new Set(Object.keys(choix));
  const nommes = r.filter(x => !x.p.anonyme);
  const aRetirer = new Set(nommes.filter(x => garde.has(String(x.p.pag))).map(x => empreinte(x.p.nom)));
  const aAjouter = nommes.filter(x => !garde.has(String(x.p.pag))).map(x => empreinte(x.p.nom));
  let liste = [];
  try { liste = JSON.parse(fs.readFileSync(ECARTES, 'utf8')); } catch {}
  const limite = Date.now() - DUREE_ECARTE_J * 864e5;
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const parH = new Map(liste.filter(e => Date.parse(e.d) >= limite && !aRetirer.has(e.h)).map(e => [e.h, e]));
  aAjouter.forEach(h => parH.set(h, { h, d: aujourdhui }));
  fs.mkdirSync(DOSSIER, { recursive: true });
  fs.writeFileSync(ECARTES, JSON.stringify([...parH.values()]));
  console.log('hors-cible ranges : ' + aAjouter.length + ' (anonymes jamais ranges : ' + r.filter(x => x.p.anonyme && !garde.has(String(x.p.pag))).length +
    ') ; liste : ' + parH.size + ' empreinte(s), ' + DUREE_ECARTE_J + ' jours au plus');
} else {
  die('commande inconnue. Voir l en-tete du script.');
}
