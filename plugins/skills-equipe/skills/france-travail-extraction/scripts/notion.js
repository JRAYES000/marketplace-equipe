#!/usr/bin/env node
// Base Notion « Leads France Travail » par l'API publique (jeton d'integration interne), hors
// quota du connecteur Notion MCP. Reference du skill depuis la v9.0. NocoDB n'est plus utilise
// (v10.0, Julien 04/10/2026). Aucune valeur secrete n'est jamais affichee.
//
// Le run n'a besoin que de deux commandes (une lecture de Notion chacune au plus) :
//   node notion.js situer <connus.json>          Phase 1 : comptes par requete + noms connus
//   node notion.js publier <lot.json> [--sec]    Phase 5 : reprise de la file, dedup (les
//                                                doublons sont retires et listes), ecriture,
//                                                relecture
// v11.0 (16/11/2026) : plus d'import SalesHandy (Julien n'utilise plus SalesHandy). Le skill
// n'importe dans aucun outil d'envoi.
// Commandes de detail :
//   node notion.js resume | connus | dedup <lot.json> | ecrire <lot.json> [--sec] | reprendre
//   node notion.js verifier <AAAA-MM-JJ> <requete>
//   node notion.js export <fichier.json>         toute la base en JSON
//   node notion.js archiver-test <requete>       archive les fiches d'une requete « TEST-… »
//
// Codes de sortie : 0 ok ; 1 erreur ; 2 relecture fausse ou Note vide ; 3 fiches en file d'attente.
// Environnement : NOTION_TOKEN_FT. A defaut, lu dans le fichier ecrit par charger-secrets.sh
// (secrets-env.js).
// File d'attente : %LOCALAPPDATA%/france-travail-extraction/notion-attente.json (donnees de
// candidats : locale, jamais versionnee). Meme dossier : ecartes.json (voir assembler.js).
'use strict';
const fs = require('fs');
const path = require('path');
const { DOSSIER: DOSSIER_FILE } = require('./secrets-env');

const TOKEN = process.env.NOTION_TOKEN_FT || '';
const DB = process.env.NOTION_DB_FT || '1cfd41a205fc44f797b39e4e8e1d6978';
const NOTION_VERSION = '2022-06-28';
const DELAI_MS = 30000; // par requete : sans lui, une connexion muette bloque ~5 min par essai
// « Importe SalesHandy » reste lisible sur les fiches anciennes, mais ne s'ecrit plus (v11.0).
const STATUTS = ['A importer', 'Ecarte'];
// « Type de requete » est une formule Notion : jamais ecrite, jamais recopiee.
// La colonne Notion « Accroche » (premier e-mail SalesHandy, v10.2) n'est plus ni lue ni ecrite.
const COLONNES = ['Nom', 'Prenom', 'Email', 'Telephone', 'Fonction', 'Requete',
  'Date extraction', 'Profil mis a jour', 'Statut', 'Note'];
const TYPES = { Nom: 'title', Prenom: 'rich_text', Email: 'email', Telephone: 'phone_number',
  Fonction: 'rich_text', Requete: 'rich_text', 'Date extraction': 'date',
  'Profil mis a jour': 'date', Statut: 'select', Note: 'rich_text' };
const FILE = path.join(DOSSIER_FILE, 'notion-attente.json');
const ECARTES = path.join(DOSSIER_FILE, 'ecartes.json');

function die(msg) { console.error('ERREUR : ' + msg); process.exit(1); }
if (!TOKEN) die('NOTION_TOKEN_FT absent de l environnement : lancer charger-secrets.sh');
const pause = ms => new Promise(r => setTimeout(r, ms));

// ---- API Notion : ~3 requetes/s, reessais sur 429 / 5xx / reseau / delai ----------------------
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
        signal: AbortSignal.timeout(DELAI_MS),
      });
      txt = await r.text();
    } catch (e) {
      if (essai < 5) { await pause(1000 * essai); continue; }
      throw new Error('Notion ' + method + ' ' + p.split('?')[0] + ' -> reseau : ' + e.message);
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
// « Date extraction » porte l'heure depuis la v10.5 (2026-10-08T16:20:00+03:00) ; les fiches plus
// anciennes n'ont que le jour. Le script ne compare que des jours, en heure locale du poste.
const deux = n => String(n).padStart(2, '0');
const jourLocal = s => {
  if (!/T/.test(s || '')) return String(s || '').slice(0, 10);
  const d = new Date(s);
  return d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate());
};
const AVEC_HEURE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/;
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
    else if (v.type === 'date') x = v.date ? jourLocal(v.date.start) : '';
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
    else if (t === 'date') p[k] = { date: { start: AVEC_HEURE.test(v) ? v : v.slice(0, 10) } };
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

// ---- Identite et doublons ----------------------------------------------------------------------
const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const tel10 = s => { const d = (s || '').replace(/\D/g, '').replace(/^33/, '0'); return d.length === 10 ? d : ''; };
// Nom + prenom n'identifie une personne que si le prenom est connu : un profil anonyme
// porte un intitule (« Conseillere en naturopathie ») que d'autres partagent. Mesure du 29/09/2026 :
// un nouvel anonyme etait classe doublon d'un ancien et retire du lot.
const cleIdentite = r => norm(r.Prenom) ? [norm(r.Nom), norm(r.Prenom)].join('|') : '';
function doublons(lot, base) {
  const parEmail = new Map(), parTel = new Map(), parNom = new Map();
  for (const r of base) {
    if (r.Email) parEmail.set(norm(r.Email), r);
    if (tel10(r.Telephone)) parTel.set(tel10(r.Telephone), r);
    if (cleIdentite(r)) parNom.set(cleIdentite(r), r);
  }
  const out = [];
  lot.forEach((c, i) => {
    const hit = (c.Email && parEmail.get(norm(c.Email))) || (tel10(c.Telephone) && parTel.get(tel10(c.Telephone))) ||
      (cleIdentite(c) && parNom.get(cleIdentite(c)));
    if (hit) { out.push({ index: i, Nom: c.Nom, Prenom: c.Prenom, statut: hit._lot ? 'meme lot' : hit.Statut || 'en file d attente' }); return; }
    // v9.2 : une fiche gardee sert de reference aux suivantes : une personne vue deux fois dans
    // la meme recherche ne s'ecrit qu'une fois.
    const r = { ...c, _lot: true };
    if (c.Email) parEmail.set(norm(c.Email), r);
    if (tel10(c.Telephone)) parTel.set(tel10(c.Telephone), r);
    if (cleIdentite(c)) parNom.set(cleIdentite(c), r);
  });
  return out;
}
// Paires lot <-> Notion (reprise de la file d'attente) : email, puis nom + prenom + requete, au
// multi-ensemble. Deux fiches identiques restent deux personnes.
const cleNom = r => [norm(r.Nom), norm(r.Prenom), norm(r.Requete)].join('|');
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
      console.log('mis en file d attente : ' + reste.length + ' fiche(s) -> reprise par « reprendre » ou au prochain « publier »');
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

function resumeDe(rows) {
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
}
// Seulement les lignes avec prenom : un profil anonyme n'est jamais saute pendant le parcours.
const connusDe = rows => rows.filter(r => r.Prenom && r.Prenom.trim()).map(r => r.Prenom.trim() + ' ' + (r.Nom || '').trim());
// Empreintes des hors-cible deja vus, ecrites par « assembler.js lot » (expiration 180 jours).
const lireEcartes = () => { try { return JSON.parse(fs.readFileSync(ECARTES, 'utf8')).map(e => e.h); } catch { return []; } };

// ---- Commandes ---------------------------------------------------------------------------------
const cmd = process.argv[2];
const drapeau = d => process.argv.includes(d);
const sec = drapeau('--sec');
(async () => {
  if (cmd === 'situer') {
    const f = process.argv[3];
    if (!f) die('usage : situer <connus.json>');
    const rows = [...await toutes(), ...lireFile()];
    resumeDe(rows);
    const connus = connusDe(rows);
    const ecartes = lireEcartes();
    // v9.2 : { noms, ecartes }. extraction-profils.js accepte encore l'ancien tableau de noms.
    // v11.6 : empreinte du texte de presentation de chaque fiche (debut de la Note, avant les
    // motifs). La page s'en sert pour sauter un profil anonyme deja en base, qu'aucun nom ne
    // designe. Meme calcul que dans extraction-profils.js ; jamais le texte en clair.
    const cle = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const empreinte = s => require('crypto').createHash('sha256').update(cle(s)).digest('hex').slice(0, 16);
    const presentations = [...new Set(rows.map(r => cle((r.Note || '').split(' — ')[0]).slice(0, 120))
      .filter(k => k.length >= 40 && k !== cle('Pas de texte de presentation')).map(empreinte))];
    fs.writeFileSync(f, JSON.stringify({ noms: connus, ecartes, presentations }));
    console.log('connus : ' + connus.length + ' nom(s), ' + ecartes.length + ' hors-cible deja vu(s), ' +
      presentations.length + ' presentation(s) -> ' + f);
  } else if (cmd === 'publier') {
    const propres = valider(lireLot(process.argv[3]));
    let code = 0;
    if (!sec) {
      const f = await reprendre();
      if (f.crees || f.dejaLa || f.enAttente) console.log('file d attente reprise : ' + f.crees + ' creee(s), ' + f.dejaLa + ' deja dans Notion, ' + f.enAttente + ' encore en attente');
      if (f.enAttente) { ecrireFile([...lireFile(), ...propres]); console.log('NOTION INDISPONIBLE : lot mis en file d attente sans essai (' + propres.length + ' fiche(s))'); process.exit(3); }
    }
    const base = await toutes();
    const d = doublons(propres, [...base, ...lireFile()]);
    d.forEach(x => console.log('  doublon retire : ' + [x.Nom, x.Prenom].filter(Boolean).join(' ') + (x.statut === 'meme lot' ? ' (deux fois dans le lot)' : ' (deja en base, ' + x.statut + ')')));
    const exclus = new Set(d.map(x => x.index));
    const nouveaux = propres.filter((_, i) => !exclus.has(i));
    console.log('lot=' + propres.length + ' doublons=' + d.length + ' a ecrire=' + nouveaux.length);
    if (sec) return console.log('simulation : rien ecrit');
    const r = await creer(nouveaux);
    console.log('ecrites dans Notion : ' + r.crees + ' / ' + nouveaux.length);
    if (r.enAttente) code = 3;
    // Relecture par (date, requete) : attendu = ce que la base avait deja + ce qui vient d'etre cree.
    const groupes = new Map();
    nouveaux.slice(0, r.crees).forEach(x => { const k = jourLocal(x['Date extraction']) + '\u0000' + x.Requete; groupes.set(k, (groupes.get(k) || 0) + 1); });
    for (const [k, n] of groupes) {
      const [date, requete] = k.split('\u0000');
      const parRequete = { property: 'Requete', rich_text: { equals: requete } };
      // Jour filtre ici, pas par Notion : une fiche avec heure et une fiche sans heure se comparent pareil.
      const relus = (await toutes(parRequete)).filter(x => !date || x['Date extraction'] === date);
      const vides = relus.filter(x => !x.Note || !x.Note.trim()).length;
      // Sans date, le filtre ramene toute la requete : pas de compte attendu fiable.
      const attendu = date ? base.filter(b => b['Date extraction'] === date && b.Requete === requete).length + n : null;
      console.log('relecture ' + (date || '(sans date)') + ' « ' + requete + ' » : relu=' + relus.length + (attendu === null ? '' : ' attendu=' + attendu) + ' notes_vides=' + vides);
      if ((attendu !== null && relus.length !== attendu) || vides) code = code || 2;
    }
    process.exit(code);
  } else if (cmd === 'resume') {
    resumeDe(await toutes());
  } else if (cmd === 'connus') {
    console.log(JSON.stringify(connusDe([...await toutes(), ...lireFile()])));
  } else if (cmd === 'dedup') {
    const lot = lireLot(process.argv[3]);
    const d = doublons(lot, [...await toutes(), ...lireFile()]);
    console.log(JSON.stringify({ lot: lot.length, doublons: d.length, detail: d }));
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
    const rows = (await toutes({ property: 'Requete', rich_text: { equals: requete } }))
      .filter(r => r['Date extraction'] === date);
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
