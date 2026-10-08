#!/usr/bin/env node
// Prepare la route Playwright d'un lot (v10.0, 2026-10-04 ; purge de l'historique v10.6).
//
// Usage : node playwright.js preparer <connus.json> <cible>
//
// Ecrit quatre fichiers dans <dossier de la session>/.playwright-mcp/, le seul dossier (avec
// celui de la session) que `browser_run_code_unsafe` accepte en `filename`. On les lance par
// leur chemin : `require` n'existe pas dans ce bac a sable, et recopier 17 Ko de script dans
// chaque appel coute des jetons pour rien.
//
//   ft-connexion.js  : branche l'ecouteur de telechargements, ouvre les recherches
//                      sauvegardees et attend que Julien se connecte (4 min au plus) ;
//   ft-extraction.js : ouvre le premier profil, injecte noms connus et extraction-profils.js,
//                      premier tour ;
//   ft-suite.js      : tour suivant, sur les nouveaux profils qui manquent encore ;
//   ft-fin.js        : exporte le journal final (ft-journal.json ; chaque tour l'exporte deja).
//
// Les CV arrivent dans le dossier de telechargements du lot (ci-dessous), nommes comme
// Chrome le faisait : Document.pdf, Document (1).pdf… dans l'ordre reel de telechargement.
// emails-depuis-cv.sh tire le rang de ce numero ; assembler.js rattache par cet ordre.
// Le serveur MCP en garde aussi une copie dans .playwright-mcp/ : nettoyer-cv.sh la vide.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const die = m => { console.error('ERREUR : ' + m); process.exit(1); };
const [cmd, connusF, cibleS] = process.argv.slice(2);
if (cmd !== 'preparer' || !connusF || !cibleS) die('usage : node playwright.js preparer <connus.json> <cible>');
const cible = parseInt(cibleS, 10);
if (!(cible > 0)) die('cible invalide : ' + cibleS);
let connus;
try { connus = JSON.parse(fs.readFileSync(connusF, 'utf8')); } catch (e) { die('connus.json illisible : ' + e.message); }

// Meme racine que secrets.env et ecartes.json.
const racine = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, 'france-travail-extraction')
  : path.join(os.homedir(), '.local', 'state', 'france-travail-extraction');
const dl = path.join(racine, 'telechargements');
const restes = fs.existsSync(dl) ? fs.readdirSync(dl).filter(n => /^(Document.*\.pdf|ft-journal.*\.json)$/i.test(n)) : [];
if (restes.length) die(restes.length + ' fichier(s) d un lot precedent dans ' + dl + ' : lancer nettoyer-cv.sh avant un nouveau lot');
fs.mkdirSync(dl, { recursive: true });

// Purge de l'historique des telechargements du profil Playwright (v10.6). Chrome 154 plantait a
// chaque telechargement une fois cet historique rempli (04/10 et 08/10/2026, annexes.md, Replis).
// Il ne sert a rien ici. Navigateur ouvert (base verrouillee) : purge reportee, sans bloquer le lot.
// SQLite rejoue un History-journal laisse par un plantage a l'ouverture, avant la purge : c'est
// ce journal qui avait annule la premiere purge a la main le 08/10.
const PROFIL = process.env.FT_PROFIL_PLAYWRIGHT || path.join(os.homedir(), '.chromium-claude');
const HISTORY = path.join(PROFIL, 'Default', 'History');
if (fs.existsSync(HISTORY)) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(HISTORY);
    db.exec('PRAGMA busy_timeout = 0');
    const n = db.prepare('SELECT COUNT(*) AS n FROM downloads').get().n;
    if (n) {
      db.exec('BEGIN; DELETE FROM downloads; DELETE FROM downloads_url_chains; DELETE FROM downloads_slices; COMMIT; VACUUM;');
      const reste = db.prepare('SELECT COUNT(*) AS n FROM downloads').get().n;
      console.log('historique des telechargements du profil Playwright : ' + n + ' ligne(s) purgee(s), reste ' + reste);
    }
    db.close();
  } catch (e) {
    console.log('historique des telechargements non purge (' + e.message.split('\n')[0] + ') : navigateur Playwright ouvert ? Le lot continue');
  }
}
const DIR =JSON.stringify(dl.split(path.sep).join('/') + '/');

const sortie = path.join(process.cwd(), '.playwright-mcp');
fs.mkdirSync(sortie, { recursive: true });

// Le dernier appel du script est remplace : il rend le resultat au lieu de le jeter.
let script = fs.readFileSync(path.join(__dirname, 'extraction-profils.js'), 'utf8');
const fin = /await window\.__run\(8\)\s*$/;
if (!fin.test(script)) die('extraction-profils.js ne finit plus par « await window.__run(8) » : adapter playwright.js');
script = '(async () => {\n' + script.replace(fin, 'return await window.__run(' + cible + ');') + '\n})()';

// Partage : attend les CV en cours d'enregistrement, exporte le journal (ft-journal.json, ecrase a
// chaque tour : il est cumulatif), puis resume. Exporter a chaque tour garde les profils deja lus
// si la session tombe : la page repart alors sur la connexion et window.__log est perdu.
const BILAN = `
  const exporter = async () => {
    const attendu = page.waitForEvent('download', { timeout: 15000 });
    const msg = await page.evaluate(() => window.__exporter());
    await attendu;
    await Promise.all(ctx.__ftEnCours);
    return msg;
  };
  const bilan = async (ctx, r) => {
    await Promise.all(ctx.__ftEnCours);
    let run = r; try { run = JSON.parse(r); } catch {}
    const journal = await exporter().catch(e => 'EXPORT EN ECHEC : ' + e.message);
    return { run, cv_enregistres: ctx.__ftN, erreurs: ctx.__ftErreurs, journal };
  };`;
const GARDE = `
  const ctx = page.context();
  if (!ctx.__ftHook) return 'ERREUR : ecouteur de telechargements absent (navigateur relance ?) : relancer ft-connexion.js';`;

const fichiers = {
  'ft-connexion.js': `async (page) => {
  const ctx = page.context();
  ctx.__ftDir = ${DIR};
  if (!ctx.__ftHook) {
    ctx.__ftHook = true;
    const brancher = p => p.on('download', d => {
      const nom = d.suggestedFilename();
      let cible;
      if (/^ft-journal/i.test(nom)) cible = ctx.__ftDir + 'ft-journal.json';
      else {
        const k = ctx.__ftN++;
        const ext = (nom.match(/\\.[A-Za-z0-9]+$/) || ['.pdf'])[0];
        cible = ctx.__ftDir + (k ? 'Document (' + k + ')' : 'Document') + ext;
      }
      ctx.__ftEnCours.push(d.saveAs(cible).catch(e => { ctx.__ftErreurs.push(nom + ' : ' + e.message); }));
    });
    ctx.pages().forEach(brancher);
    ctx.on('page', brancher);
  }
  ctx.__ftN = 0; ctx.__ftEnCours = []; ctx.__ftErreurs = [];
  await page.goto('https://pro.francetravail.fr/recherche-profil/recherchessauvegardees');
  const connecte = () => /^https:\\/\\/pro\\.francetravail\\.fr\\/recherche-profil/.test(page.url());
  let attente = 0;
  if (!connecte()) {
    // Fenetre rendue visible pour que Julien tape son mot de passe ; jamais de focus force.
    try {
      const cdp = await ctx.newCDPSession(page);
      const { windowId } = await cdp.send('Browser.getWindowForTarget');
      await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } });
    } catch {}
    const t0 = Date.now();
    while (!connecte() && Date.now() - t0 < 240000) await page.waitForTimeout(1000);
    attente = Math.round((Date.now() - t0) / 1000);
    if (!connecte()) return { connecte: false, attente_s: attente, page: await page.title() };
    await page.goto('https://pro.francetravail.fr/recherche-profil/recherchessauvegardees');
  }
  await page.waitForLoadState('networkidle').catch(() => {});
  const recherches = await page.locator('a').filter({ hasText: /maj \\d+ mois|dispo immediate/i }).allInnerTexts().catch(() => []);
  return { connecte: true, attente_s: attente, telechargements: ctx.__ftDir, recherches };
}
`,
  'ft-extraction.js': `async (page) => {${GARDE}${BILAN}
  // Premier profil ouvert d'un vrai clic : un .click() JavaScript ne l'ouvre pas.
  const panneau = page.locator('div.modal-body', { hasText: /Profil mis à jour le/ }).first();
  if (!(await panneau.isVisible().catch(() => false))) {
    const titre = page.locator('button.lienclic-profil.text-entreprise').first();
    if (!(await titre.count())) return 'ERREUR : aucune liste de resultats a l ecran : lancer la recherche (Phase 2)';
    await titre.click();
    await panneau.waitFor({ timeout: 20000 });
  }
  await page.evaluate(c => { window.__connusBruts = c; }, ${JSON.stringify(connus)});
  const r = await page.evaluate(${JSON.stringify(script)});
  const res = await bilan(ctx, r);
  res.connus = await page.evaluate(() => ({ noms: window.__connus.size, ecartes: window.__ecartes.size }));
  return res;
}
`,
  'ft-suite.js': `async (page) => {${GARDE}${BILAN}
  const reste = ${cible} - await page.evaluate(() => window.__log.filter(r => !r.deja).length);
  if (reste <= 0) return { run: 'cible de ${cible} atteinte', cv_enregistres: ctx.__ftN };
  return bilan(ctx, await page.evaluate(n => window.__run(n), reste));
}
`,
  'ft-fin.js': `async (page) => {${GARDE}${BILAN}
  return { export: await exporter(), cv_enregistres: ctx.__ftN, erreurs: ctx.__ftErreurs };
}
`,
};
for (const [n, c] of Object.entries(fichiers)) fs.writeFileSync(path.join(sortie, n), c);
console.log('telechargements du lot : ' + dl);
console.log('fichiers Playwright : ' + Object.keys(fichiers).map(n => path.join(sortie, n).split(path.sep).join('/')).join(' '));
