// Essai a blanc du script de parcours (v11.5). Lancer : node --test tests/extraction-profils.test.js
// Page factice, profils inventes. Il execute vraiment extraction-profils.js : `node --check` ne
// voit pas une fonction avalee par un commentaire (bug du 26/11/2026, « boutonCV is not defined »,
// publie en 11.3 et trouve seulement au lot reel suivant).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'extraction-profils.js'), 'utf8');

// Trois profils : avec CV, sans CV, avec CV et un numero d'outre-mer dans la presentation.
const PROFILS = [
  { nom: 'Camille EXEMPLE', titre: 'Projet de test', cv: true, pres: 'Presentation un.' },
  { nom: 'Sans CVTHEQUE', titre: 'Profil sans CV', cv: false, pres: 'Presentation deux.' },
  { nom: 'Dominique FICTIF', titre: 'Autre projet', cv: true, pres: 'Joignable au +596 696 00 00 00.' },
];

function pageFactice() {
  let i = 0;
  const telecharges = [];
  const texte = () => {
    const p = PROFILS[i];
    return 'Profil mis à jour le 01/11/2026\n\n' + p.nom + '\n' + p.titre + '\nDisponibilité immédiate\n' + p.pres + '\nPoints forts\n';
  };
  // Compteur en tete, comme sur le site : le script prend le premier « n / m » de la modale.
  const modale = { get innerText() { return (i + 1) + ' / ' + PROFILS.length + '\n' + texte(); } };
  const corps = {
    get textContent() { return texte(); },
    get innerText() { return texte(); },
    closest: () => modale,
    querySelectorAll: () => PROFILS[i].cv ? [{ textContent: 'Télécharger le CV', click: () => telecharges.push(PROFILS[i].nom) }] : [],
  };
  const suivant = { offsetParent: {}, textContent: 'Suivant', click: () => { if (i < PROFILS.length - 1) i++; } };
  const document = {
    hidden: false,
    body: { innerText: '3 résultats pour : Essai' },
    querySelectorAll: sel => sel === 'div.modal-body' ? [corps] : [suivant],
  };
  const window = { __pause: () => new Promise(r => setTimeout(r, 1)) };
  return { window, document, telecharges };
}

const lancer = (n, connus) => {
  const { window, document, telecharges } = pageFactice();
  if (connus) window.__connusBruts = connus;
  const fin = /await window\.__run\(8\)\s*$/;
  assert.ok(fin.test(source), 'le script doit finir par « await window.__run(8) »');
  const corps = source.replace(fin, 'return await window.__run(' + n + ');');
  const f = new Function('window', 'document', 'return (async () => {\n' + corps + '\n})()');
  return f(window, document).then(r => ({ run: JSON.parse(r), journal: window.__log, telecharges }));
};

test('un profil sans CV est saute et ne compte pas dans les nouveaux', async () => {
  const { run, journal, telecharges } = await lancer(2);
  assert.strictEqual(run.nouveaux, 2);
  assert.strictEqual(run.sansCV, 1);
  assert.strictEqual(run.nouveauxTotal, 2);
  assert.deepStrictEqual(telecharges, ['Camille EXEMPLE', 'Dominique FICTIF']);
  const sans = journal.find(r => r.sansCV);
  assert.strictEqual(sans.nom, 'Sans CVTHEQUE');
  assert.strictEqual(sans.deja, true);
  assert.deepStrictEqual(journal.filter(r => !r.deja).map(r => r.dlRang), [0, 1]);
});

test('un profil deja en base est saute sans telechargement', async () => {
  const { run, telecharges } = await lancer(1, { noms: ['Camille EXEMPLE'], ecartes: [] });
  assert.strictEqual(run.sautes, 1);
  assert.strictEqual(run.sansCV, 1);
  assert.deepStrictEqual(telecharges, ['Dominique FICTIF']);
});

test('un numero d outre-mer de la presentation est lu', async () => {
  const { journal } = await lancer(2);
  assert.strictEqual(journal.find(r => r.nom === 'Dominique FICTIF').tel, '+596 696 00 00 00');
});
