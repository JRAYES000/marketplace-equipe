#!/usr/bin/env node
// Base Notion « Leads France Travail » par l'API publique (jeton d'integration interne), hors
// quota du connecteur Notion MCP. Reference du skill depuis la v9.0 : le run ecrit ici, puis
// NocoDB est aligne en miroir (miroir-nocodb). Aucune valeur secrete n'est jamais affichee.
//
//   node notion.js resume                        profils et emails par requete
//   node notion.js connus                        JSON ["Prenom NOM", ...] (Phase 1)
//   node notion.js dedup <lot.json>              lignes du lot deja presentes dans Notion
//   node notion.js ecrire <lot.json> [--sec]     reprend la file d'attente, puis cree le lot ; --sec = simulation
//   node notion.js reprendre                     repousse la file d'attente locale vers Notion
//   node notion.js verifier <AAAA-MM-JJ> <requete>   compte du lot + fiches a Note vide
//   node notion.js export <fichier.json>         toute la base en JSON (colonnes NocoDB)
//   node notion.js miroir-nocodb [--sec] [--force]   NocoDB = copie exacte de Notion (hors Ecarte)
//   node notion.js amorcer [--sec]               une fois : cree dans Notion les fiches presentes dans NocoDB seulement
//   node notion.js archiver-test <requete>       archive les fiches d'une requete « TEST-… » (essais)
//
// Environnement : NOTION_TOKEN_FT (secrets.md, section Notion) ; NOCODB_URL et NOCODB_TOKEN pour
// miroir-nocodb et amorcer. File d'attente : %LOCALAPPDATA%/france-travail-extraction/notion-attente.json
// (donnees de candidats : locale, jamais versionnee).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOKEN = process.env.NOTION_TOKEN_FT || '';
const DB = process.env.NOTION_DB_FT || '1cfd41a205fc44f797b39e4e8e1d6978';
const NOTION_VERSION = '2022-06-28';
const STATUTS = ['A importer', 'Importe SalesHandy', 'Ecarte'];
// « Type de requete » est une formule Notion : jamais ecrite, jamais recopiee.
const COLONNES = ['Nom', 'Prenom', 'Email', 'Telephone', 'Commune', 'Fonction', 'Requete',
  'Date extraction', 'Profil mis a jour', 'Statut', 'Note'];
const TYPES = { Nom: 'title', Prenom: 'rich_text', Email: 'email', Telephone: 'phone_number',
  Commune: 'rich_text', Fonction: 'rich_text', Requete: 'rich_text', 'Date extraction': 'date',
  'Profil mis a jour': 'date', Statut: 'select', Note: 'rich_text' };
const DOSSIER_FILE = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'state'), 'france-travail-extraction');
const FILE = path.join(DOSSIER_FILE, 'notion-attente.json');

function die(msg) { console.error('ERREUR : ' + msg); process.exit(1); }
if (!TOKEN) die('NOTION_TOKEN_FT absent de l environnement (secrets.md, section Notion)');
const pause = ms => new Promise(r => setTimeout(r, ms));

// ---- API Notion : ~3 requetes/s, reessais sur 429 / 5xx / reseau ------------------------------
let dernier = 0;
async function notion(method, p, body) {
  for (let essai = 1; ; essai++) {
    const attente = dernier + 350 - Date.now();
    if (attente > 0) await pause(attente);
    dernier = Date.now();
    let r, txt;
    try {
      r = await fetch('https://api.notion.com/v1' + p, {
        method,
        headers: { Authorization: 'Bearer ' + TOKEN, 'Notion-Version': NOTION_VERSION, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      txt = await r.text();
    } catch (e) {
      if (essai < 5) { await pause(1000 * essai); continue; }
      throw new Error('Notion ' + method + ' ' + p + ' -> reseau : ' + e.message);
    }
    if (r.ok) return txt ? JSON.parse(txt) : {};
    if ((r.status === 429 || r.status >= 500) && essai < 5) {
      await pause(r.status === 429 ? 1000 * (Number(r.headers.get('retry-after')) || essai) : 1000 * essai);
      continue;
    }
    throw new Error('Notion ' + method + ' ' + p.split('?')[0] + ' -> HTTP ' + r.status + ' ' + txt.slice(0, 300));
  }
}

const texte = arr => (arr || []).map(t => t.plain_text).join('');
function lirePage(pg) {
  const o = { _page: pg.id };
  for (const k of COLONNES) {
    const v = pg.properties[k];
    if (!v) continue;
    let x = '';
    if (v.type === 'title') x = texte(v.title);
    else if (v.type === 'rich_text') x = texte(v.rich_text);
    else if (v.type === 'email') x = v.email || '';
    else if (v.type === 'phone_number') x = v.phone_number || '';
    else if (v.type === 'select') x = v.select ? v.select.name : '';
    else if (v.type === 'date') x = v.date ? v.date.start.slice(0, 10) : '';
    o[k] = x;
  }
  return o;
}
// Un bloc de texte Notion plafonne a 2000 caracteres.
const blocs = s => { const out = []; for (let i = 0; i < s.length && out.length < 100; i += 2000) out.push({ type: 'text', text: { content: s.slice(i, i + 2000) } }); return out; };
function versProprietes(c) {
  const p = {};
  for (const k of COLONNES) {
    const v = c[k] === undefined || c[k] === null ? '' : String(c[k]).trim();
    if (!v) continue;
    const t = TYPES[k];
    if (t === 'title') p[k] = { title: blocs(v) };
    else if (t === 'rich_text') p[k] = { rich_text: blocs(v) };
    else if (t === 'email') p[k] = { email: v };
    else if (t === 'phone_number') p[k] = { phone_number: v };
    else if (t === 'select') p[k] = { select: { name: v } };
    else if (t === 'date') p[k] = { date: { start: v.slice(0, 10) } };
  }
  return p;
}

async function toutes(filtre) {
  const out = [];
  let curseur;
  do {
    const body = { page_size: 100 };
    if (curseur) body.start_cursor = curseur;
    if (filtre) body.filter = filtre;
    const d = await notion('POST', '/databases/' + DB + '/query', body);
    d.results.forEach(pg => out.push(lirePage(pg)));
    curseur = d.has_more ? d.next_cursor : null;
  } while (curseur);
  return out;
}

// ---- Appariement (repris de nocodb.js reconcilier) --------------------------------------------
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const cleNom = r => [norm(r.Nom), norm(r.Prenom), norm(r.Commune), norm(r.Requete)].join('|');
// Paires (a, b) : par email d'abord, puis nom + prenom + commune + requete, au multi-ensemble.
function apparier(A, B) {
  const prisA = new Set(), prisB = new Set(), paires = [];
  const passe = cle => {
    const idx = new Map();
    B.forEach((r, j) => { if (prisB.has(j)) return; const k = cle(r); if (!k) return; if (!idx.has(k)) idx.set(k, []); idx.get(k).push(j); });
    A.forEach((r, i) => { if (prisA.has(i)) return; const k = cle(r); const l = k && idx.get(k); if (l && l.length) { const j = l.shift(); prisA.add(i); prisB.add(j); paires.push([i, j]); } });
  };
  passe(r => norm(r.Email));
  passe(cleNom);
  return { paires, seulsA: A.filter((_, i) => !prisA.has(i)), seulsB: B.filter((_, j) => !prisB.has(j)) };
}

// ---- Lot et file d'attente --------------------------------------------------------------------
const lireLot = f => {
  if (!f) die('fichier de lot manquant');
  const lot = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (!Array.isArray(lot)) die('le lot doit etre un tableau JSON');
  return lot;
};
function valider(lot) {
  return lot.map((c, i) => {
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
}
const lireFile = () => { try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; } };
function ecrireFile(rows) {
  if (!rows.length) { try { fs.unlinkSync(FILE); } catch {} return; }
  fs.mkdirSync(DOSSIER_FILE, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(rows));
}

// Cree les fiches une par une ; au premier echec definitif, le reste part dans la file.
async function creer(rows) {
  let crees = 0;
  for (let i = 0; i < rows.length; i++) {
    try {
      await notion('POST', '/pages', { parent: { database_id: DB }, properties: versProprietes(rows[i]) });
      crees++;
    } catch (e) {
      const reste = rows.slice(i);
      ecrireFile([...lireFile(), ...reste]);
      console.log('ECHEC NOTION : ' + e.message);
      console.log('mis en file d attente : ' + reste.length + ' fiche(s) -> reprise par « reprendre » ou au prochain « ecrire »');
      return { crees, enAttente: reste.length };
    }
  }
  return { crees, enAttente: 0 };
}

// Repousse la file, sans recreer ce qu'un essai precedent aurait deja ecrit.
async function reprendre() {
  const file = lireFile();
  if (!file.length) return { crees: 0, enAttente: 0, dejaLa: 0 };
  ecrireFile([]);
  const { seulsA } = apparier(file, await toutes());
  const r = await creer(seulsA);
  return { ...r, dejaLa: file.length - seulsA.length };
}

// ---- NocoDB (miroir et amorcage) ---------------------------------------------------------------
const NOCO_URL = (process.env.NOCODB_URL || '').replace(/\/+$/, '');
const NOCO_TOKEN = process.env.NOCODB_TOKEN || '';
const NOCO_TABLE = process.env.NOCODB_TABLE_ID || 'mjhwgyhkrukdy5m';
async function noco(method, p, body) {
  if (!NOCO_URL || !NOCO_TOKEN) die('NOCODB_URL et NOCODB_TOKEN absents de l environnement (secrets.md, section NocoDB)');
  const r = await fetch(NOCO_URL + '/api/v2/tables/' + NOCO_TABLE + p, {
    method, headers: { 'xc-token': NOCO_TOKEN, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const txt = await r.text();
  if (!r.ok) die('NocoDB ' + method + ' ' + p.split('?')[0] + ' -> HTTP ' + r.status + ' ' + txt.slice(0, 300));
  return txt ? JSON.parse(txt) : {};
}
async function nocoToutes() {
  const champs = ['Id', ...COLONNES].map(encodeURIComponent).join(',');
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const d = await noco('GET', '/records?limit=1000&offset=' + offset + '&fields=' + champs);
    out.push(...d.list);
    if (d.pageInfo.isLastPage) break;
  }
  return out;
}
const valeur = v => (v === null || v === undefined ? '' : String(v).trim());
const nocoVal = (k, v) => (TYPES[k] === 'date' ? valeur(v).slice(0, 10) : valeur(v));
const sansVide = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ''));
async function nocoParPaquets(method, rows) {
  let n = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const r = await noco(method, '/records', rows.slice(i, i + 100));
    n += Array.isArray(r) ? r.length : 1;
  }
  return n;
}

// ---- Commandes ---------------------------------------------------------------------------------
const cmd = process.argv[2];
const sec = process.argv.includes('--sec');
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
    console.log('total=' + rows.length + ' file_attente=' + lireFile().length);
    Object.entries(g).sort((a, b) => b[1].profils - a[1].profils)
      .forEach(([k, v]) => console.log(v.profils + '\t' + v.avec_email + '\t' + k));
  } else if (cmd === 'connus') {
    // Notion + file d'attente ; seulement les lignes avec prenom : un profil anonyme n'est jamais saute.
    const rows = [...await toutes(), ...lireFile()].filter(r => r.Prenom && r.Prenom.trim());
    console.log(JSON.stringify(rows.map(r => r.Prenom.trim() + ' ' + (r.Nom || '').trim())));
  } else if (cmd === 'dedup') {
    const lot = lireLot(process.argv[3]);
    const base = [...await toutes(), ...lireFile()];
    const parEmail = new Map(base.filter(r => r.Email).map(r => [norm(r.Email), r]));
    const cle = r => [norm(r.Nom), norm(r.Prenom), norm(r.Commune)].join('|');
    const parNom = new Map(base.map(r => [cle(r), r]));
    const doublons = [];
    lot.forEach((c, i) => {
      const hit = (c.Email && parEmail.get(norm(c.Email))) || parNom.get(cle(c));
      if (hit) doublons.push({ index: i, Nom: c.Nom, Prenom: c.Prenom, statut: hit.Statut || 'en file d attente' });
    });
    console.log(JSON.stringify({ lot: lot.length, doublons: doublons.length, detail: doublons }));
  } else if (cmd === 'ecrire') {
    const propres = valider(lireLot(process.argv[3]));
    if (sec) return console.log('simulation : ' + propres.length + ' ligne(s) valides, file d attente=' + lireFile().length + ', rien ecrit');
    const f = await reprendre();
    if (f.crees || f.dejaLa || f.enAttente) console.log('file d attente reprise : ' + f.crees + ' creee(s), ' + f.dejaLa + ' deja dans Notion, ' + f.enAttente + ' encore en attente');
    if (f.enAttente) { ecrireFile([...lireFile(), ...propres]); console.log('lot mis en file d attente sans essai : ' + propres.length + ' fiche(s)'); process.exit(3); }
    const r = await creer(propres);
    console.log('reponses Notion : ' + r.crees + ' creee(s) pour ' + propres.length + ' envoyee(s) (a relire par « verifier »)');
    if (r.enAttente) process.exit(3);
  } else if (cmd === 'reprendre') {
    const f = await reprendre();
    console.log('file d attente : ' + f.crees + ' creee(s), ' + f.dejaLa + ' deja dans Notion, ' + f.enAttente + ' encore en attente');
    if (f.enAttente) process.exit(3);
  } else if (cmd === 'verifier') {
    const [date, requete] = [process.argv[3], process.argv[4]];
    if (!date || !requete) die('usage : verifier <AAAA-MM-JJ> <requete>');
    const rows = await toutes({ and: [
      { property: 'Date extraction', date: { equals: date } },
      { property: 'Requete', rich_text: { equals: requete } }] });
    const vides = rows.filter(r => !r.Note || !r.Note.trim());
    console.log('compte=' + rows.length + ' notes_vides=' + vides.length + ' file_attente=' + lireFile().length);
    vides.forEach(r => console.log('NOTE VIDE : ' + r.Prenom + ' ' + r.Nom));
    process.exit(vides.length ? 2 : 0);
  } else if (cmd === 'export') {
    const f = process.argv[3];
    if (!f) die('usage : export <fichier.json>');
    const rows = (await toutes()).map(({ _page, ...r }) => r);
    fs.writeFileSync(f, JSON.stringify(rows));
    console.log('exporte : ' + rows.length + ' fiche(s) -> ' + f + ' (donnees de candidats : a supprimer apres usage)');
  } else if (cmd === 'miroir-nocodb') {
    // Notion fait foi. Les fiches Ecarte de Notion n'ont pas leur place dans NocoDB.
    const tousNotion = await toutes();
    const notionRows = tousNotion.filter(r => r.Statut !== 'Ecarte');
    const nocoRows = await nocoToutes();
    const { paires, seulsA: aCreer, seulsB: aSupprimer } = apparier(notionRows, nocoRows);
    const aModifier = [];
    for (const [i, j] of paires) {
      const n = notionRows[i], c = nocoRows[j], diff = { Id: c.Id };
      for (const k of COLONNES) if (valeur(n[k]) !== nocoVal(k, c[k])) diff[k] = valeur(n[k]) || null;
      if (Object.keys(diff).length > 1) { aModifier.push(diff); console.log('  a modifier : ' + [c.Nom, c.Prenom].filter(Boolean).join(' ') + ' -> ' + Object.keys(diff).slice(1).join(', ')); }
    }
    console.log('Notion=' + tousNotion.length + ' (dont ' + (tousNotion.length - notionRows.length) + ' Ecarte ignorees) NocoDB=' + nocoRows.length);
    console.log('a creer dans NocoDB=' + aCreer.length + ' a modifier=' + aModifier.length + ' a supprimer=' + aSupprimer.length);
    // Garde-fou : une lecture Notion tronquee viderait NocoDB.
    if (aSupprimer.length > Math.max(20, nocoRows.length * 0.2) && !process.argv.includes('--force')) {
      aSupprimer.slice(0, 20).forEach(r => console.log('  a supprimer : ' + [r.Nom, r.Prenom, r.Requete].filter(Boolean).join(' | ')));
      die(aSupprimer.length + ' suppressions dans NocoDB : au-dela du garde-fou (20 ou 20 %). Verifier, puis relancer avec --force');
    }
    if (sec) return console.log('simulation : rien ecrit');
    const c = aCreer.length ? await nocoParPaquets('POST', aCreer.map(({ _page, ...r }) => sansVide(r))) : 0;
    const m = aModifier.length ? await nocoParPaquets('PATCH', aModifier) : 0;
    const s = aSupprimer.length ? await nocoParPaquets('DELETE', aSupprimer.map(r => ({ Id: r.Id }))) : 0;
    const apres = await nocoToutes();
    console.log('NocoDB : ' + c + ' creee(s), ' + m + ' modifiee(s), ' + s + ' supprimee(s) ; relu=' + apres.length + ' attendu=' + notionRows.length);
    process.exit(apres.length === notionRows.length ? 0 : 2);
  } else if (cmd === 'amorcer') {
    // Bascule v8 -> v9 : ce que NocoDB a recu pendant la v8.0 et que Notion n'a jamais vu.
    const { seulsB } = apparier(await toutes(), await nocoToutes());
    const aCreer = seulsB.filter(r => r.Statut !== 'Ecarte').map(r => Object.fromEntries(COLONNES.map(k => [k, nocoVal(k, r[k])])));
    console.log('fiches NocoDB absentes de Notion : ' + aCreer.length);
    aCreer.slice(0, 60).forEach(r => console.log('  ' + [r.Nom, r.Prenom, r.Requete, r['Date extraction']].filter(Boolean).join(' | ')));
    if (sec || !aCreer.length) return console.log(sec ? 'simulation : rien ecrit' : 'rien a faire');
    const r = await creer(aCreer);
    console.log('creees dans Notion : ' + r.crees + ' / ' + aCreer.length);
    if (r.enAttente) process.exit(3);
  } else if (cmd === 'archiver-test') {
    const requete = process.argv[3] || '';
    if (!/^TEST-/.test(requete)) die('archiver-test ne touche qu une requete commencant par « TEST- »');
    const rows = await toutes({ property: 'Requete', rich_text: { equals: requete } });
    for (const r of rows) await notion('PATCH', '/pages/' + r._page, { archived: true });
    console.log('archivees : ' + rows.length);
  } else {
    die('commande inconnue. Voir l en-tete du script.');
  }
})().catch(e => die(e.message));
