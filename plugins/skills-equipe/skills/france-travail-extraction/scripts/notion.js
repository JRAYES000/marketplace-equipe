#!/usr/bin/env node
// Base Notion « Leads France Travail » par l'API publique (jeton d'integration interne), hors
// quota du connecteur Notion MCP. Reference du skill depuis la v9.0. NocoDB n'est plus utilise
// (v10.0, Julien 04/10/2026). Aucune valeur secrete n'est jamais affichee.
//
// Le run n'a besoin que de deux commandes (une lecture de Notion chacune au plus) :
//   node notion.js situer <connus.json>          Phase 1 : comptes par requete + noms connus
//   node notion.js publier <lot.json> [--sec] [--sans-saleshandy]
//                                                Phases 5-6 : reprise de la file, dedup (les
//                                                doublons sont retires et listes), ecriture,
//                                                relecture, import SalesHandy
//   node notion.js saleshandy [--sec]            import SalesHandy seul (fiches « A importer »)
//   node notion.js saleshandy-verifier <AAAA-MM-JJ>
//                                                relit la verification SalesHandy des fiches
//                                                importees extraites ce jour-la (v10.3)
//   node notion.js corriger-email <ancien> <nouveau>
//                                                email mal lu : corrige la fiche Notion, la remet
//                                                « A importer » et la reimporte dans l'etape 1 (v10.3)
// Commandes de detail :
//   node notion.js resume | connus | dedup <lot.json> | ecrire <lot.json> [--sec] | reprendre
//   node notion.js verifier <AAAA-MM-JJ> <requete>
//   node notion.js export <fichier.json>         toute la base en JSON
//   node notion.js archiver-test <requete>       archive les fiches d'une requete « TEST-… »
//
// Codes de sortie : 0 ok ; 1 erreur ; 2 relecture fausse ou Note vide ; 3 fiches en file d'attente ;
// 4 import SalesHandy en echec ou partiel (fiches Notion intactes, restees « A importer ») ;
// 5 email(s) classe(s) bad ou risky par SalesHandy : a relire sur le CV (lignes « EMAIL A RELIRE »).
// Environnement : NOTION_TOKEN_FT ; SALESHANDY_API_KEY
// pour l'import. A defaut, lus dans
// le fichier ecrit par charger-secrets.sh (secrets-env.js).
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
const STATUTS = ['A importer', 'Importe SalesHandy', 'Ecarte'];
// « Type de requete » est une formule Notion : jamais ecrite, jamais recopiee.
// Accroche (v10.2) : phrase tiree de la Note, envoyee a SalesHandy ({{Accroche}} du premier e-mail).
const COLONNES = ['Nom', 'Prenom', 'Email', 'Telephone', 'Fonction', 'Requete',
  'Date extraction', 'Profil mis a jour', 'Statut', 'Note', 'Accroche'];
const TYPES = { Nom: 'title', Prenom: 'rich_text', Email: 'email', Telephone: 'phone_number',
  Fonction: 'rich_text', Requete: 'rich_text', 'Date extraction': 'date',
  'Profil mis a jour': 'date', Statut: 'select', Note: 'rich_text', Accroche: 'rich_text' };
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
  const pages = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      pages.push(lirePage(await notion('POST', '/pages', { parent: { database_id: DB }, properties: versProprietes(rows[i]) })));
      crees++;
    } catch (e) {
      const reste = rows.slice(i);
      ecrireFile([...lireFile(), ...reste]);
      console.log('ECHEC NOTION : ' + e.message);
      console.log('mis en file d attente : ' + reste.length + ' fiche(s) -> reprise par « reprendre » ou au prochain « publier »');
      return { crees, enAttente: reste.length, pages };
    }
  }
  return { crees, enAttente: 0, pages };
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

// ---- SalesHandy : les fiches « A importer » avec email entrent dans la sequence ----------------
// Demande de Julien, 29/09/2026 : chaque personne ecrite dans Notion entre aussi, sans geste de sa
// part, dans la sequence « Leads France Travail — reconversion (Ecole Naturo) » (URL
// my.saleshandy.com/sequence/960252 ; l'API ne connait que l'identifiant hache). Etape 1 : les
// e-mails partent selon le planning de la sequence. Une fiche importee passe « Importe SalesHandy »
// dans Notion.
// Pas importees : sans email ; requete absente de SH_REQUETES. Elles restent « A importer ».
// Infirmiere liberale incluse (Julien, 29/09 : souvent en reconversion vers la naturopathie).
// Profil sans prenom importe aussi (Julien, 29/09 : « Bonjour , » n'est pas dramatique) : ni prenom
// ni nom envoyes, son « Nom » est l'intitule du profil.
const SH_KEY = process.env.SALESHANDY_API_KEY || '';
const SH_SEQUENCE = process.env.SALESHANDY_SEQUENCE_FT || 'dlPyooE6zL';
const SH_ETAPE = process.env.SALESHANDY_STEP_FT || '2AwrBNv3wQ';
const SH_REQUETES = ['Formation naturopathie', 'Naturopathie', 'Reconversion bien-être', 'Infirmiere liberale'];
// Profils animaliers importes dans la meme sequence que les autres (Julien, 04/10/2026, v10.1).
// Limite de debit (v10.3) : 20 appels par fenetre sur /v1/prospects (en-tetes x-ratelimit-*).
// Fenetre epuisee : on attend sa fin avant l'appel suivant ; 429 : on attend retry-after.
let shLibre = 0;
async function sh(method, p, body) {
  for (let essai = 1; ; essai++) {
    if (shLibre > Date.now()) await pause(shLibre - Date.now());
    const r = await fetch('https://open-api.saleshandy.com/v1' + p, {
      method, headers: { 'x-api-key': SH_KEY, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(DELAI_MS),
    });
    const reset = Date.parse(r.headers.get('x-ratelimit-reset') || '');
    if (r.headers.get('x-ratelimit-remaining') === '0' && reset) shLibre = reset + 500;
    const txt = await r.text();
    if (r.status === 429 && essai < 6) {
      const s = Number(r.headers.get('retry-after'));
      shLibre = Date.now() + (s ? s * 1000 : reset ? Math.max(reset - Date.now(), 0) + 500 : 10000 * essai);
      continue;
    }
    if (!r.ok) throw new Error('SalesHandy ' + method + ' ' + p.split('?')[0] + ' -> HTTP ' + r.status + ' ' + txt.slice(0, 300));
    return txt ? JSON.parse(txt) : {};
  }
}

// Verification des emails importes (v10.3). Le 08/10/2026, 4 emails mal lus sur ~200 ont ete
// classes « bad » par SalesHandy : les prospects sont restes en « Waiting », jamais contactes, sans
// alerte. Apres l'import, on relit verificationStatus (inProgress -> valid / bad / risky en moins
// d'une minute) ; un « bad » ou « risky » est ecrit dans la Note Notion et liste en sortie.
const SH_A_RELIRE = ['bad', 'risky'];
async function statutVerification(email) {
  const d = await sh('GET', '/prospects?search=' + encodeURIComponent(email));
  const p = (Array.isArray(d.payload) ? d.payload : []).find(x => (x.email || '').toLowerCase() === email);
  return p ? p.verificationStatus || '' : '';
}
async function verifierEmails(importees) {
  const reste = new Map(importees.map(r => [r.Email.trim().toLowerCase(), r]));
  const statuts = new Map();
  const fin = Date.now() + 180000;
  await pause(30000);
  while (reste.size) {
    for (const [email, r] of [...reste]) {
      const st = await statutVerification(email);
      if (st && st !== 'inProgress') { statuts.set(email, st); reste.delete(email); }
      else statuts.set(email, st || 'introuvable');
    }
    if (!reste.size || Date.now() > fin) break;
    await pause(20000);
  }
  const aRelire = importees.filter(r => SH_A_RELIRE.includes(statuts.get(r.Email.trim().toLowerCase())));
  for (const r of aRelire) {
    const st = statuts.get(r.Email.trim().toLowerCase());
    const ajout = 'SalesHandy : email ' + st + ', prospect jamais contacte — relire l email sur le CV (notion.js corriger-email)';
    r.Note = (r.Note || '').includes(ajout) ? r.Note : [r.Note, ajout].filter(Boolean).join(' — ');
    await notion('PATCH', '/pages/' + r._page, { properties: versProprietes({ Note: r.Note }) });
  }
  const compte = {};
  statuts.forEach(v => { compte[v] = (compte[v] || 0) + 1; });
  console.log('verification SalesHandy : ' + Object.entries(compte).map(([k, n]) => k + ' ' + n).join(', ') +
    (reste.size ? ' (' + reste.size + ' non tranche(s) apres 3 min, a revoir par « notion.js saleshandy-verifier »)' : ''));
  aRelire.forEach(r => console.log('EMAIL A RELIRE (' + statuts.get(r.Email.trim().toLowerCase()) + ') : ' +
    [r.Prenom, r.Nom].filter(Boolean).join(' ') + ' <' + r.Email + '> — Note Notion completee'));
  return aRelire;
}
// Colonnes Notion -> champs SalesHandy (libelles exacts de list_fields).
const versProspect = r => {
  const o = { Email: r.Email.trim().toLowerCase() };
  if (norm(r.Prenom)) { o['First Name'] = r.Prenom; o['Last Name'] = r.Nom; }
  if (r.Telephone) o['Phone Number'] = r.Telephone;
  if (r.Fonction) o['Job Title'] = r.Fonction;
  // Sans Accroche, SalesHandy met son texte de repli (champ « Accroche », reglages des champs).
  if (r.Accroche) o.Accroche = r.Accroche;
  return o;
};
async function saleshandy({ sec, tousNotion }) {
  tousNotion = tousNotion || await toutes();
  const attente = tousNotion.filter(r => r.Statut === 'A importer' && (r.Email || '').includes('@'));
  const aImporter = attente.filter(r => SH_REQUETES.includes(r.Requete));
  const hors = attente.length - aImporter.length;
  const parReq = {};
  aImporter.forEach(r => { parReq[r.Requete] = (parReq[r.Requete] || 0) + 1; });
  console.log('saleshandy : ' + aImporter.length + ' fiche(s) a importer' + (Object.keys(parReq).length ? ' (' + Object.entries(parReq).map(([k, n]) => k + ' ' + n).join(', ') + ')' : '') +
    (hors ? ' ; ' + hors + ' laissee(s) « A importer » (requete hors sequence)' : ''));
  if (!aImporter.length) return { ok: true, importees: [] };
  if (sec) { console.log('saleshandy : simulation, rien importe'); return { ok: true, importees: [] }; }
  if (!SH_KEY) { console.log('SALESHANDY : SALESHANDY_API_KEY absente (charger-secrets.sh), import saute'); return { ok: false, importees: [] }; }
  const dep = await sh('POST', '/sequences/prospects/import-with-field-name', {
    stepId: SH_ETAPE, prospectList: aImporter.map(versProspect),
    verifyProspects: true, conflictAction: 'addMissingFields', tags: ['France Travail'],
  });
  const id = dep.payload && dep.payload.requestId;
  if (!id) throw new Error('SalesHandy : pas de requestId dans la reponse d import');
  let st = {};
  for (let i = 0; i < 40 && !st.isCompleted; i++) { await pause(3000); st = (await sh('GET', '/prospects/import-status/' + id)).payload || {}; }
  if (!st.isCompleted) { console.log('SALESHANDY : import ' + id + ' non termine apres 2 min, statuts Notion inchanges'); return { ok: false, importees: [] }; }
  // Le rapport d'echec (CSV) liste les prospects refuses : ils restent « A importer ».
  const rapport = st.reportURL || st.failedProspectsURL;
  let refuses = new Set();
  if (rapport) {
    const csv = await (await fetch(rapport, { signal: AbortSignal.timeout(DELAI_MS) })).text();
    refuses = new Set((csv.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) || []).map(e => e.toLowerCase()));
    console.log('saleshandy : ' + refuses.size + ' prospect(s) refuse(s), laisses « A importer »');
  }
  const importees = aImporter.filter(r => !refuses.has(r.Email.trim().toLowerCase()));
  for (const r of importees) { await notion('PATCH', '/pages/' + r._page, { properties: versProprietes({ Statut: 'Importe SalesHandy' }) }); r.Statut = 'Importe SalesHandy'; }
  console.log('saleshandy : ' + importees.length + ' importee(s) dans la sequence (etape 1), Statut Notion -> Importe SalesHandy');
  const aRelire = importees.length ? await verifierEmails(importees) : [];
  return { ok: !refuses.size, importees, aRelire };
}

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
    fs.writeFileSync(f, JSON.stringify({ noms: connus, ecartes }));
    console.log('connus : ' + connus.length + ' nom(s), ' + ecartes.length + ' hors-cible deja vu(s) -> ' + f);
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
    // SalesHandy part de la base deja lue + des pages rendues par Notion a la creation.
    const tousNotion = [...base, ...r.pages];
    if (r.enAttente) code = 3;
    // Relecture par (date, requete) : attendu = ce que la base avait deja + ce qui vient d'etre cree.
    const groupes = new Map();
    nouveaux.slice(0, r.crees).forEach(x => { const k = String(x['Date extraction'] || '').slice(0, 10) + '\u0000' + x.Requete; groupes.set(k, (groupes.get(k) || 0) + 1); });
    for (const [k, n] of groupes) {
      const [date, requete] = k.split('\u0000');
      const parRequete = { property: 'Requete', rich_text: { equals: requete } };
      const relus = await toutes(date ? { and: [{ property: 'Date extraction', date: { equals: date } }, parRequete] } : parRequete);
      const vides = relus.filter(x => !x.Note || !x.Note.trim()).length;
      // Sans date, le filtre ramene toute la requete : pas de compte attendu fiable.
      const attendu = date ? base.filter(b => b['Date extraction'] === date && b.Requete === requete).length + n : null;
      console.log('relecture ' + (date || '(sans date)') + ' « ' + requete + ' » : relu=' + relus.length + (attendu === null ? '' : ' attendu=' + attendu) + ' notes_vides=' + vides);
      if ((attendu !== null && relus.length !== attendu) || vides) code = code || 2;
    }
    // Un echec SalesHandy ne touche pas aux fiches Notion (code 4).
    if (!drapeau('--sans-saleshandy')) {
      try {
        const s = await saleshandy({ sec: false, tousNotion });
        if (!s.ok) code = code || 4;
        if ((s.aRelire || []).length) code = code || 5;
      } catch (e) { console.log('SALESHANDY : ' + e.message); code = code || 4; }
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
  } else if (cmd === 'saleshandy') {
    const tousNotion = await toutes();
    let code = 0;
    try {
      const s = await saleshandy({ sec, tousNotion });
      if (!s.ok) code = 4; else if ((s.aRelire || []).length) code = 5;
    } catch (e) { console.log('SALESHANDY : ' + e.message); code = 4; }
    process.exit(code);
  } else if (cmd === 'saleshandy-verifier') {
    const date = process.argv[3];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) die('usage : saleshandy-verifier <AAAA-MM-JJ> (date d extraction)');
    if (!SH_KEY) die('SALESHANDY_API_KEY absente : lancer charger-secrets.sh');
    const rows = (await toutes({ and: [{ property: 'Date extraction', date: { equals: date } },
      { property: 'Statut', select: { equals: 'Importe SalesHandy' } }] })).filter(r => (r.Email || '').includes('@'));
    console.log('fiches importees extraites le ' + date + ' : ' + rows.length);
    const aRelire = rows.length ? await verifierEmails(rows) : [];
    process.exit(aRelire.length ? 5 : 0);
  } else if (cmd === 'corriger-email') {
    // SalesHandy refuse de modifier l'email d'un prospect existant (« Field is not updatable ») :
    // la correction passe par un nouvel import dans l'etape 1. L'ancien prospect, classe bad, reste
    // dans la sequence sans jamais recevoir d'e-mail.
    const [ancien, nouveau] = [process.argv[3], process.argv[4]].map(e => (e || '').trim().toLowerCase());
    if (!ancien.includes('@') || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(nouveau)) die('usage : corriger-email <ancien> <nouveau>');
    const rows = await toutes({ property: 'Email', email: { equals: ancien } });
    if (rows.length !== 1) die(rows.length + ' fiche(s) Notion avec l email ' + ancien + ' (1 attendue)');
    const r = rows[0];
    const ajout = 'email corrige le ' + new Date().toISOString().slice(0, 10) + ' (ancien : ' + ancien + ')';
    await notion('PATCH', '/pages/' + r._page, { properties: versProprietes({ Email: nouveau, Statut: 'A importer', Note: [r.Note, ajout].filter(Boolean).join(' — ') }) });
    console.log('fiche ' + [r.Prenom, r.Nom].filter(Boolean).join(' ') + ' : email corrige, Statut -> A importer');
    let code = 0;
    try {
      const s = await saleshandy({ sec, tousNotion: await toutes() });
      if (!s.ok) code = 4; else if ((s.aRelire || []).length) code = 5;
    } catch (e) { console.log('SALESHANDY : ' + e.message); code = 4; }
    process.exit(code);
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
