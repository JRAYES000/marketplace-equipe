#!/usr/bin/env node
// Lecture seule de la table NocoDB « Leads France Travail ».
// Depuis la v9.0, Notion fait foi : NocoDB n'est ecrit que par « notion.js publier » ou
// « notion.js miroir-nocodb ». Les commandes d'ecriture de la v8.0 (ecrire, notion-pages,
// reconcilier --importer) ont ete retirees en v9.1 : elles contournaient Notion et le miroir
// suivant les effacait. Aucune valeur secrete n'est jamais affichee.
//
//   node nocodb.js resume                              profils et emails par requete
//   node nocodb.js reconcilier <export-notion.csv|.json>   ecarts NocoDB <-> Notion (controle)
//
// Environnement : NOCODB_URL, NOCODB_TOKEN (NOCODB_TABLE_ID facultatif).
'use strict';
const fs = require('fs');
require('./secrets-env');

const URL_BASE = (process.env.NOCODB_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.NOCODB_TOKEN || '';
const TABLE = process.env.NOCODB_TABLE_ID || 'mjhwgyhkrukdy5m';
const COLONNES = ['Nom', 'Prenom', 'Email', 'Telephone', 'Fonction', 'Requete',
  'Date extraction', 'Profil mis a jour', 'Statut', 'Note'];

function die(msg) { console.error('ERREUR : ' + msg); process.exit(1); }
if (!URL_BASE || !TOKEN) die('NOCODB_URL et NOCODB_TOKEN absents de l environnement : lancer charger-secrets.sh');

async function api(method, path) {
  const r = await fetch(URL_BASE + '/api/v2/tables/' + TABLE + path, {
    method, headers: { 'xc-token': TOKEN }, signal: AbortSignal.timeout(30000),
  });
  const txt = await r.text();
  if (!r.ok) die('NocoDB ' + method + ' ' + path.split('?')[0] + ' -> HTTP ' + r.status + ' ' + txt.slice(0, 300));
  return txt ? JSON.parse(txt) : {};
}

// Toutes les lignes, par pages de 1000 (la pagination est verifiee, pas supposee).
async function toutes() {
  const champs = ['Id', ...COLONNES].map(encodeURIComponent).join(',');
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const d = await api('GET', '/records?limit=1000&offset=' + offset + '&fields=' + champs);
    out.push(...d.list);
    if (d.pageInfo.isLastPage) break;
  }
  return out;
}

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function parseCSV(txt) {
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [h, ...body] = rows.filter(r => r.length > 1 || (r[0] || '').trim() !== '');
  const cles = h.map(x => x.trim());
  return body.map(r => Object.fromEntries(cles.map((k, i) => [k, (r[i] || '').trim()])));
}

const cmd = process.argv[2];
(async () => {
  if (cmd === 'resume') {
    const rows = await toutes();
    const g = {};
    for (const r of rows) {
      const k = r.Requete || '(vide)';
      g[k] = g[k] || { profils: 0, avec_email: 0 };
      g[k].profils++;
      if (r.Email) g[k].avec_email++;
    }
    console.log('total=' + rows.length);
    Object.entries(g).sort((a, b) => b[1].profils - a[1].profils)
      .forEach(([k, v]) => console.log(v.profils + '\t' + v.avec_email + '\t' + k));
  } else if (cmd === 'reconcilier') {
    const f = process.argv[3];
    if (!f) die('usage : reconcilier <export-notion.csv|.json>');
    if (process.argv.includes('--importer')) die('--importer retire en v9.1 : NocoDB ne s ecrit que par notion.js miroir-nocodb');
    const brut = fs.readFileSync(f, 'utf8');
    const notion = f.toLowerCase().endsWith('.json') ? JSON.parse(brut) : parseCSV(brut);
    if (!notion.length || !('Nom' in notion[0]) || !('Requete' in notion[0])) die('export Notion illisible : colonnes Nom et Requete attendues');
    const noco = await toutes();
    const cleNom = r => [norm(r.Nom), norm(r.Prenom), norm(r.Requete)].join('|');
    const pris = new Set(), prisN = new Set();
    const passe = cle => {
      const idx = new Map();
      notion.forEach((r, j) => { if (prisN.has(j)) return; const k = cle(r); if (!k) return; if (!idx.has(k)) idx.set(k, []); idx.get(k).push(j); });
      noco.forEach((r, i) => { if (pris.has(i)) return; const k = cle(r); const l = k && idx.get(k); if (l && l.length) { prisN.add(l.shift()); pris.add(i); } });
    };
    passe(r => norm(r.Email));
    passe(cleNom);
    const nocoSeul = noco.filter((_, i) => !pris.has(i));
    const notionSeul = notion.filter((r, i) => !prisN.has(i) && norm(r.Statut) !== 'ecarte');
    console.log('NocoDB=' + noco.length + ' Notion=' + notion.length + ' communs=' + pris.size);
    console.log('dans NocoDB, pas dans Notion : ' + nocoSeul.length + ' ; dans Notion (hors Ecarte), pas dans NocoDB : ' + notionSeul.length);
    console.log('(un ecart se corrige par « notion.js miroir-nocodb », jamais a la main dans NocoDB)');
    process.exit(nocoSeul.length || notionSeul.length ? 2 : 0);
  } else {
    die('commande inconnue. Voir l en-tete du script.');
  }
})().catch(e => die(e.message));
