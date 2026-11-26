#!/usr/bin/env node
// Import Warmbly de fin de lot (v11.2, Julien 26/11/2026) : charge dans un espace Warmbly les
// fiches Notion « A importer » qui ont un e-mail, puis les passe en « Importe Warmbly ».
// Aucun e-mail ne part d'ici : ce script ne touche ni campagne, ni sequence, ni envoi.
//
//   node warmbly.js importer [--sec]     --sec : compte, n'ecrit rien (ni Warmbly ni Notion)
//
// Reserve a un projet declare. Trois variables, toutes obligatoires :
//   FT_PROJET          nom court du projet (ex. mdc) : dossier local a part (secrets-env.js)
//   FT_WARMBLY_ESPACE  nom exact de l'espace Warmbly attendu (ex. « Mes droits chômage »)
//   FT_WARMBLY_CLE     fichier qui contient la cle d'API de cet espace (hors depot, ex. ~/.ssh/…)
// Plus NOTION_DB_FT (base du projet) et NOTION_TOKEN_FT, comme notion.js.
//
// Trois garde-fous, chacun arrete le script avant toute ecriture :
//   1. la cle ouvre bien l'espace FT_WARMBLY_ESPACE (sinon : mauvais espace) ;
//   2. la base Notion a l'option de Statut « Importe Warmbly » (la base de l'Ecole ne l'a pas) ;
//   3. NOTION_DB_FT est defini (jamais la base par defaut).
// Codes de sortie : 0 ok ; 1 erreur ou garde-fou ; 2 au moins un contact en echec (la fiche
// reste « A importer », le prochain import la reprend).
// La cle n'est jamais affichee : elle passe a la CLI warmbly par la variable WARMBLY_TOKEN.
'use strict';
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { PROJET } = require('./secrets-env');

const A_IMPORTER = 'A importer';
const IMPORTE = 'Importe Warmbly';
const TOKEN = process.env.NOTION_TOKEN_FT || '';
const DB = process.env.NOTION_DB_FT || '';
const ESPACE = process.env.FT_WARMBLY_ESPACE || '';
// Git Bash donne « /c/Users/… » dans $HOME : node sous Windows ne le lit pas (vu le 26/11/2026).
const CLE_F = (process.env.FT_WARMBLY_CLE || '').replace(/^~(?=[\\/])/, os.homedir())
  .replace(/^\/([a-zA-Z])\//, (_, l) => l.toUpperCase() + ':/');

function die(msg) { console.error('ERREUR : ' + msg); process.exit(1); }
const pause = ms => new Promise(r => setTimeout(r, ms));
const norm = s => (s || '').normalize('NFC').trim().toLowerCase();

// ---- Warmbly, par sa CLI ------------------------------------------------------------------------
let cle = '';
function warmbly(args, entree) {
  try {
    const out = execFileSync('warmbly', [...args, '--json'], {
      env: { ...process.env, WARMBLY_TOKEN: cle, MSYS_NO_PATHCONV: '1' },
      input: entree, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000,
    });
    return { ok: true, data: out.trim() ? JSON.parse(out) : {} };
  } catch (e) {
    const err = String((e.stderr || '') + (e.stdout || '') || e.message).replace(/\s+/g, ' ').slice(0, 300);
    return { ok: false, err, absent: /HTTP 404/.test(err) };
  }
}

// ---- Notion -------------------------------------------------------------------------------------
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
        headers: { Authorization: 'Bearer ' + TOKEN, 'Notion-Version': '2022-06-28', 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
      txt = await r.text();
    } catch (e) {
      if (essai < 5) { await pause(1000 * essai); continue; }
      throw new Error('Notion ' + method + ' ' + p + ' -> reseau : ' + e.message);
    }
    if (r.ok) return txt ? JSON.parse(txt) : {};
    if ((r.status === 429 || r.status >= 500) && essai < 5) { await pause(1000 * essai); continue; }
    throw new Error('Notion ' + method + ' ' + p + ' -> HTTP ' + r.status + ' ' + txt.slice(0, 200));
  }
}
const texte = arr => (arr || []).map(t => t.plain_text).join('');
function fiche(pg) {
  const p = pg.properties;
  return {
    page: pg.id,
    nom: texte(p.Nom && p.Nom.title),
    prenom: texte(p.Prenom && p.Prenom.rich_text),
    email: (p.Email && p.Email.email) || '',
    telephone: (p.Telephone && p.Telephone.phone_number) || '',
    fonction: texte(p.Fonction && p.Fonction.rich_text),
    requete: texte(p.Requete && p.Requete.rich_text),
  };
}
async function aImporter() {
  const out = [];
  let curseur;
  do {
    const body = { page_size: 100, filter: { and: [
      { property: 'Statut', select: { equals: A_IMPORTER } },
      { property: 'Email', email: { is_not_empty: true } },
    ] } };
    if (curseur) body.start_cursor = curseur;
    const d = await notion('POST', '/databases/' + DB + '/query', body);
    d.results.forEach(pg => out.push(fiche(pg)));
    curseur = d.has_more ? d.next_cursor : null;
  } while (curseur);
  return out;
}
// Casse lisible pour Warmbly : la base garde le NOM en majuscules, un e-mail « Bonjour DUPONT » non.
const casse = s => s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

// ---- Commande -----------------------------------------------------------------------------------
const sec = process.argv.includes('--sec');
(async () => {
  if (process.argv[2] !== 'importer') die('usage : node warmbly.js importer [--sec]');
  if (!PROJET) die('FT_PROJET absent : l import Warmbly est reserve a un projet declare (voir SKILL.md, « Profils »)');
  if (!DB) die('NOTION_DB_FT absent : jamais d import depuis la base par defaut');
  if (!TOKEN) die('NOTION_TOKEN_FT absent de l environnement : lancer charger-secrets.sh');
  if (!ESPACE) die('FT_WARMBLY_ESPACE absent (nom exact de l espace Warmbly attendu)');
  if (!CLE_F) die('FT_WARMBLY_CLE absent (fichier de la cle d API de l espace)');
  try { cle = fs.readFileSync(CLE_F, 'utf8').trim(); } catch { die('cle Warmbly illisible : ' + CLE_F); }
  if (!cle) die('cle Warmbly vide : ' + CLE_F);

  const org = warmbly(['org', 'view']);
  if (!org.ok) die('Warmbly injoignable ou cle refusee : ' + org.err);
  if (norm(org.data.organization_name) !== norm(ESPACE)) {
    die('mauvais espace Warmbly : la cle ouvre « ' + org.data.organization_name + ' », attendu « ' + ESPACE + ' ». Rien importe.');
  }
  const base = await notion('GET', '/databases/' + DB);
  const options = ((base.properties.Statut || {}).select || {}).options || [];
  if (!options.some(o => o.name === IMPORTE)) die('la base Notion n a pas l option de Statut « ' + IMPORTE + ' » : ce n est pas une base a import Warmbly. Rien importe.');

  const fiches = await aImporter();
  console.log('espace Warmbly : ' + org.data.organization_name + ' ; fiches « ' + A_IMPORTER + ' » avec e-mail : ' + fiches.length);
  if (sec) return console.log('simulation : rien ecrit');

  let importes = 0, deja = 0, echecs = 0;
  for (const f of fiches) {
    const qui = [f.prenom, f.nom].filter(Boolean).join(' ');
    const vu = warmbly(['contact', 'lookup', '--email', f.email]);
    if (!vu.ok && !vu.absent) { echecs++; console.log('  echec (recherche) : ' + qui + ' -> ' + vu.err); continue; }
    // Reponse de lookup, relevee le 26/11/2026 : { contact: {…} | null, match }.
    if (vu.ok && vu.data.contact && vu.data.contact.id) {
      deja++;
    } else {
      const corps = { email: f.email, custom_fields: { source: 'France Travail' } };
      // Profil anonyme (pas de prenom) : le « Nom » est un intitule, pas un nom de famille.
      if (f.prenom) { corps.first_name = casse(f.prenom); corps.last_name = casse(f.nom); }
      if (f.telephone) corps.phone = f.telephone;
      if (f.fonction) corps.custom_fields.fonction = f.fonction;
      if (f.requete) corps.custom_fields.requete = f.requete;
      const cr = warmbly(['contact', 'create', '--input', '-', '--idempotency-key', 'ft-' + f.page], JSON.stringify(corps));
      if (!cr.ok) { echecs++; console.log('  echec (creation) : ' + qui + ' -> ' + cr.err); continue; }
      importes++;
    }
    // Notion seulement apres Warmbly : une fiche « Importe Warmbly » est toujours dans Warmbly.
    try {
      await notion('PATCH', '/pages/' + f.page, { properties: { Statut: { select: { name: IMPORTE } } } });
    } catch (e) { echecs++; console.log('  echec (statut Notion) : ' + qui + ' -> ' + e.message); }
  }
  const reste = (await aImporter()).length;
  console.log('importes=' + importes + ' deja_dans_warmbly=' + deja + ' echecs=' + echecs + ' restent_a_importer=' + reste);
  process.exit(echecs || reste ? 2 : 0);
})().catch(e => die(e.message));
