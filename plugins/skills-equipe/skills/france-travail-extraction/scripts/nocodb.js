#!/usr/bin/env node
// Lecture et ecriture de la table NocoDB « Leads France Travail ».
// Remplace le connecteur Notion (v6.0). Aucune valeur secrete n'est jamais affichee.
//
//   node nocodb.js resume                       profils et emails par requete
//   node nocodb.js connus                       JSON ["Prenom NOM", ...] (Phase 1)
//   node nocodb.js dedup <lot.json>             lignes du lot deja presentes en base
//   node nocodb.js ecrire <lot.json> [--sec]    insere le lot (100 par paquet) ; --sec = simulation
//   node nocodb.js verifier <AAAA-MM-JJ> <requete>   compte du lot + fiches a Note vide
//   node nocodb.js notion-pages <ids|--attente>   fiches au format notion-create-pages (miroir Notion)
//   node nocodb.js attente <ids>                  met des Id en attente Notion (limite atteinte)
//   node nocodb.js attente-vider                  vide la file d'attente Notion
//
// Environnement : NOCODB_URL, NOCODB_TOKEN (NOCODB_TABLE_ID facultatif).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL_BASE = (process.env.NOCODB_URL || '').replace(/\/+$/, '');
const TOKEN = process.env.NOCODB_TOKEN || '';
const TABLE = process.env.NOCODB_TABLE_ID || 'mjhwgyhkrukdy5m';
// File d'attente du miroir Notion : la seule ecriture disque du skill hors CV.
const ATTENTE = path.join(os.tmpdir(), 'leads-ft-notion-en-attente.txt');
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
    if (!arg) die('usage : notion-pages <ids separes par des virgules | --attente>');
    const lireIds = t => t.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
    const ids = arg === '--attente'
      ? (fs.existsSync(ATTENTE) ? lireIds(fs.readFileSync(ATTENTE, 'utf8')) : [])
      : lireIds(arg);
    if (!ids.length) die('aucun Id (file d attente vide ?)');
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
  } else if (cmd === 'attente') {
    const ids = (process.argv[3] || '').split(/[\s,]+/).filter(Boolean);
    if (!ids.length || ids.some(x => !/^\d+$/.test(x))) die('usage : attente <ids separes par des virgules>');
    const deja = fs.existsSync(ATTENTE) ? fs.readFileSync(ATTENTE, 'utf8').split(/[\s,]+/).filter(Boolean) : [];
    const tous = [...new Set([...deja, ...ids])];
    fs.writeFileSync(ATTENTE, tous.join(',') + '\n');
    console.log('en attente Notion : ' + tous.length + ' fiche(s)');
  } else if (cmd === 'attente-vider') {
    if (fs.existsSync(ATTENTE)) fs.unlinkSync(ATTENTE);
    console.log('file d attente Notion videe');
  } else {
    die('commande inconnue. Voir l en-tete du script.');
  }
})().catch(e => die(e.message));
