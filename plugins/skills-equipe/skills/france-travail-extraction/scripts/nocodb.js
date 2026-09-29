#!/usr/bin/env node
// Lecture et ecriture de la table NocoDB « Leads France Travail ».
// Reference unique du skill depuis la v8.0 : Notion n'est plus ecrit pendant le run, il se
// synchronise en differe (reconcilier + notion-pages). Aucune valeur secrete n'est jamais affichee.
//
//   node nocodb.js resume                       profils et emails par requete
//   node nocodb.js connus                       JSON ["Prenom NOM", ...] (Phase 1)
//   node nocodb.js dedup <lot.json>             lignes du lot deja presentes en base
//   node nocodb.js ecrire <lot.json> [--sec]    insere le lot (100 par paquet) ; --sec = simulation
//   node nocodb.js verifier <AAAA-MM-JJ> <requete>   compte du lot + fiches a Note vide
//   node nocodb.js notion-pages <ids>             fiches au format notion-create-pages (synchro Notion differee)
//   node nocodb.js reconcilier <export-notion.csv|.json> [--importer]   ecarts NocoDB <-> Notion ; --importer ecrit dans NocoDB les fiches Notion absentes
//
// Environnement : NOCODB_URL, NOCODB_TOKEN (NOCODB_TABLE_ID facultatif).
'use strict';
const fs = require('fs');

const URL_BASE = (process.env.NOCODB_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.NOCODB_TOKEN || '';
const TABLE = process.env.NOCODB_TABLE_ID || 'mjhwgyhkrukdy5m';
const STATUTS = ['A importer', 'Importe SalesHandy', 'Ecarte'];
// Seules ces colonnes s'ecrivent ; « Type de requete » n'existe plus (formule Notion).
const COLONNES = ['Nom', 'Prenom', 'Email', 'Telephone', 'Commune', 'Fonction', 'Requete',
  'Date extraction', 'Profil mis a jour', 'Statut', 'Note'];

function die(msg) { console.error('ERREUR : ' + msg); process.exit(1); }
if (!URL_BASE || !TOKEN) die('NOCODB_URL et NOCODB_TOKEN absents de l environnement (secrets.md, section NocoDB)');

async function api(method, path, body) {
  const r = await fetch(URL_BASE + '/api/v2/tables/' + TABLE + path, {
    method,
    headers: { 'xc-token': TOKEN, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) die('NocoDB ' + method + ' ' + path.split('?')[0] + ' -> HTTP ' + r.status + ' ' + txt.slice(0, 300));
  return txt ? JSON.parse(txt) : {};
}

// Toutes les lignes, par pages de 1000 (la pagination est verifiee, pas supposee).
async function toutes(where) {
  const champs = ['Id', ...COLONNES].map(encodeURIComponent).join(',');
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const q = '/records?limit=1000&offset=' + offset + '&fields=' + champs +
      (where ? '&where=' + encodeURIComponent(where) : '');
    const d = await api('GET', q);
    out.push(...d.list);
    if (d.pageInfo.isLastPage) break;
  }
  return out;
}

const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const lireLot = f => {
  if (!f) die('fichier de lot manquant');
  const lot = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(lot)) die('le lot doit etre un tableau JSON');
  return lot;
};


// ---- Reconciliation NocoDB <-> Notion -------------------------------------------------------
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
const MOIS = { janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function versIso(v) {
  v = (v || '').trim(); if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  let m = norm(v).match(/^(\d{1,2}) ([a-z]+) (\d{4})/);
  if (m && MOIS[m[2]]) return m[3] + '-' + String(MOIS[m[2]]).padStart(2, '0') + '-' + m[1].padStart(2, '0');
  m = norm(v).match(/^([a-z]+) (\d{1,2}),? (\d{4})/);
  if (m && MOIS[m[1]]) return m[3] + '-' + String(MOIS[m[1]]).padStart(2, '0') + '-' + m[2].padStart(2, '0');
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return '';
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
  } else if (cmd === 'connus') {
    // Seulement les lignes avec prenom : un profil anonyme n'est jamais saute.
    const rows = (await toutes()).filter(r => r.Prenom && r.Prenom.trim());
    console.log(JSON.stringify(rows.map(r => r.Prenom.trim() + ' ' + (r.Nom || '').trim())));
  } else if (cmd === 'dedup') {
    const lot = lireLot(process.argv[3]);
    const base = await toutes();
    const parEmail = new Map(base.filter(r => r.Email).map(r => [norm(r.Email), r]));
    const cle = r => [norm(r.Nom), norm(r.Prenom), norm(r.Commune)].join('|');
    const parNom = new Map(base.map(r => [cle(r), r]));
    const doublons = [];
    lot.forEach((c, i) => {
      const hit = (c.Email && parEmail.get(norm(c.Email))) || parNom.get(cle(c));
      if (hit) doublons.push({ index: i, Nom: c.Nom, Prenom: c.Prenom, deja_en_base_id: hit.Id, statut: hit.Statut });
    });
    console.log(JSON.stringify({ lot: lot.length, doublons: doublons.length, detail: doublons }));
  } else if (cmd === 'ecrire') {
    const lot = lireLot(process.argv[3]);
    const sec = process.argv.includes('--sec');
    const propres = lot.map((c, i) => {
      const o = {};
      for (const k of Object.keys(c)) {
        if (!COLONNES.includes(k)) die('ligne ' + i + ' : colonne inconnue « ' + k + ' »');
        if (c[k] !== null && c[k] !== undefined && String(c[k]).trim() !== '') o[k] = c[k];
      }
      if (!o.Nom) die('ligne ' + i + ' : Nom absent');
      if (!o.Requete) die('ligne ' + i + ' : Requete absente');
      if (!o.Note) die('ligne ' + i + ' : Note vide (jamais vide, voir SKILL.md Phase 5)');
      o.Statut = o.Statut || 'A importer';
      if (o.Statut === 'Ecarte') die('ligne ' + i + ' : jamais d ecriture en statut Ecarte (voir SKILL.md)');
      if (!STATUTS.includes(o.Statut)) die('ligne ' + i + ' : Statut invalide');
      return o;
    });
    if (sec) return console.log('simulation : ' + propres.length + ' ligne(s) valides, rien ecrit');
    let ecrites = 0;
    const ids = [];
    for (let i = 0; i < propres.length; i += 100) {
      const paquet = propres.slice(i, i + 100);
      const r = await api('POST', '/records', paquet);
      const rep = Array.isArray(r) ? r : [r];
      ecrites += rep.length;
      rep.forEach(x => { if (x && x.Id !== undefined) ids.push(x.Id); });
    }
    console.log('reponses NocoDB : ' + ecrites + ' ligne(s) pour ' + propres.length + ' envoyee(s) (a relire par « verifier »)');
    console.log('ids=' + ids.join(','));
  } else if (cmd === 'verifier') {
    const [date, requete] = [process.argv[3], process.argv[4]];
    if (!date || !requete) die('usage : verifier <AAAA-MM-JJ> <requete>');
    const rows = (await toutes()).filter(r => r['Date extraction'] === date && r.Requete === requete);
    const vides = rows.filter(r => !r.Note || !r.Note.trim());
    console.log('compte=' + rows.length + ' notes_vides=' + vides.length);
    vides.forEach(r => console.log('NOTE VIDE : ' + r.Prenom + ' ' + r.Nom + ' (Id ' + r.Id + ')'));
    process.exit(vides.length ? 2 : 0);
  } else if (cmd === 'notion-pages') {
    // Fiches NocoDB -> format notion-create-pages. `Type de requete` n'est jamais envoye (formule).
    const arg = process.argv[3];
    if (!arg) die('usage : notion-pages <ids separes par des virgules>');
    const ids = arg.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
    if (!ids.length) die('aucun Id');
    if (ids.some(x => !/^\d+$/.test(x))) die('les Id doivent etre des entiers');
    const wanted = new Set(ids.map(Number));
    const rows = (await toutes()).filter(r => wanted.has(r.Id));
    if (rows.length !== wanted.size) die(rows.length + ' fiche(s) trouvee(s) pour ' + wanted.size + ' Id demande(s)');
    const pages = rows.map(r => {
      const p = {};
      for (const k of COLONNES) {
        const v = r[k];
        if (v === null || v === undefined || String(v).trim() === '') continue;
        if (k === 'Date extraction') p['date:Date extraction:start'] = v;
        else if (k === 'Profil mis a jour') p['date:Profil mis a jour:start'] = v;
        else p[k] = v;
      }
      return { properties: p };
    });
    console.log(JSON.stringify(pages));
  } else if (cmd === 'reconcilier') {
    const f = process.argv[3];
    if (!f) die('usage : reconcilier <export-notion.csv|.json> [--importer]');
    const brut = fs.readFileSync(f, 'utf8');
    const notion = (f.toLowerCase().endsWith('.json') ? JSON.parse(brut) : parseCSV(brut)).map(r => ({ ...r }));
    if (!notion.length || !('Nom' in notion[0]) || !('Requete' in notion[0])) die('export Notion illisible : colonnes Nom et Requete attendues');
    const noco = await toutes();
    const cleNom = r => [norm(r.Nom), norm(r.Prenom), norm(r.Commune), norm(r.Requete)].join('|');
    const emailDe = r => norm(r.Email);
    const nocoRest = noco.map((r, i) => ({ r, i })); const notionRest = notion.map((r, i) => ({ r, i }));
    const pris = new Set(); const prisN = new Set();
    // passe 1 : par email
    const parEmail = new Map();
    notionRest.forEach(x => { const e = emailDe(x.r); if (e) { if (!parEmail.has(e)) parEmail.set(e, []); parEmail.get(e).push(x.i); } });
    nocoRest.forEach(x => { const e = emailDe(x.r); const l = e && parEmail.get(e); if (l && l.length) { const j = l.shift(); pris.add(x.i); prisN.add(j); } });
    // passe 2 : par nom + prenom + commune + requete (multiensemble : des intitules identiques sont des personnes differentes)
    const parNom = new Map();
    notionRest.forEach(x => { if (prisN.has(x.i)) return; const k = cleNom(x.r); if (!parNom.has(k)) parNom.set(k, []); parNom.get(k).push(x.i); });
    nocoRest.forEach(x => { if (pris.has(x.i)) return; const l = parNom.get(cleNom(x.r)); if (l && l.length) { const j = l.shift(); pris.add(x.i); prisN.add(j); } });
    const nocoSeul = noco.filter((_, i) => !pris.has(i));
    const notionSeulTous = notion.filter((_, i) => !prisN.has(i));
    const ecartes = notionSeulTous.filter(r => norm(r.Statut) === 'ecarte');
    const notionSeul = notionSeulTous.filter(r => norm(r.Statut) !== 'ecarte');
    console.log('NocoDB=' + noco.length + ' Notion=' + notion.length + ' communs=' + pris.size);
    console.log('dans NocoDB, pas dans Notion : ' + nocoSeul.length + ' (a recopier dans Notion)');
    console.log('dans Notion, pas dans NocoDB : ' + notionSeul.length + ' (a importer) + ' + ecartes.length + ' ecarte(s) ignore(s) (jamais re-ajoutes)');
    if (nocoSeul.length) console.log('ids NocoDB seuls (pour notion-pages) : ' + nocoSeul.map(r => r.Id).join(','));
    notionSeul.slice(0, 60).forEach(r => console.log('  Notion seul : ' + [r.Nom, r.Prenom, r.Email, r.Requete].filter(Boolean).join(' | ')));
    if (process.argv.includes('--importer') && notionSeul.length) {
      const lot = notionSeul.map(r => {
        const o = { Nom: r.Nom, Prenom: r.Prenom, Email: r.Email, Telephone: r.Telephone, Commune: r.Commune, Fonction: r.Fonction, Requete: r.Requete,
          'Date extraction': versIso(r['Date extraction']), 'Profil mis a jour': versIso(r['Profil mis a jour']), Statut: r.Statut || 'A importer', Note: r.Note || 'Importe depuis Notion — pas de note' };
        Object.keys(o).forEach(k => { if (o[k] === '' || o[k] === undefined) delete o[k]; });
        if (o.Statut && !STATUTS.includes(o.Statut)) o.Statut = 'A importer';
        return o;
      });
      let ecrites = 0; const ids = [];
      for (let i = 0; i < lot.length; i += 100) { const r = await api('POST', '/records', lot.slice(i, i + 100)); const rep = Array.isArray(r) ? r : [r]; ecrites += rep.length; rep.forEach(x => x && x.Id !== undefined && ids.push(x.Id)); }
      console.log('importees dans NocoDB : ' + ecrites + ' / ' + lot.length + ' ; ids=' + ids.join(','));
    } else if (notionSeul.length) console.log('(simulation : relancer avec --importer pour ecrire ces fiches dans NocoDB)');
  } else {
    die('commande inconnue. Voir l en-tete du script.');
  }
})().catch(e => die(e.message));
