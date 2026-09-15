'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  chargerReleves,
  enregistrerReleveProfil,
  listeReleves,
} = require('../lib/statistiques-profil');

function cheminTemporaire() {
  return path.join(os.tmpdir(), `statistiques-profil-test-${Date.now()}-${Math.random()}.json`);
}

test('enregistrerReleveProfil ecrit un releve, chargerReleves le relit', () => {
  const chemin = cheminTemporaire();
  try {
    enregistrerReleveProfil({ date: '2026-09-18', vuesProfil: 42, demandesContact: 2 }, chemin);
    const releves = chargerReleves(chemin);
    assert.deepEqual(releves['2026-09-18'], { vuesProfil: 42, demandesContact: 2 });
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('un second appel pour la MEME date remplace le premier, ne s\'additionne jamais -- coeur du correctif', () => {
  const chemin = cheminTemporaire();
  try {
    enregistrerReleveProfil({ date: '2026-09-18', vuesProfil: 42, demandesContact: 2 }, chemin);
    enregistrerReleveProfil({ date: '2026-09-18', vuesProfil: 50, demandesContact: 3 }, chemin);
    const releves = chargerReleves(chemin);
    // Si ca s'additionnait (l'ancien bug), on aurait 92 -- ce n'est jamais le cas ici.
    assert.deepEqual(releves['2026-09-18'], { vuesProfil: 50, demandesContact: 3 });
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('appeler enregistrerReleveProfil 5 fois pour la meme date (une fois "par commentaire", par erreur) ne produit toujours qu\'un seul releve', () => {
  const chemin = cheminTemporaire();
  try {
    for (let i = 0; i < 5; i += 1) {
      enregistrerReleveProfil({ date: '2026-09-18', vuesProfil: 100, demandesContact: 4 }, chemin);
    }
    const releves = listeReleves(chemin);
    assert.equal(releves.length, 1);
    assert.equal(releves[0].vuesProfil, 100);
    assert.equal(releves[0].demandesContact, 4);
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('refuse une date hors format AAAA-MM-JJ', () => {
  const chemin = cheminTemporaire();
  try {
    assert.throws(
      () => enregistrerReleveProfil({ date: '2026-09-18T10:00:00Z', vuesProfil: 1 }, chemin),
      /hors du format attendu/
    );
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('refuse si aucun des deux chiffres n\'est fourni', () => {
  const chemin = cheminTemporaire();
  try {
    assert.throws(() => enregistrerReleveProfil({ date: '2026-09-18' }, chemin), /au moins un des deux chiffres/);
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('registre corrompu (JSON invalide sur disque) refuse avec un message explicite, pas un SyntaxError brut', () => {
  const chemin = cheminTemporaire();
  fs.writeFileSync(chemin, '{ ceci n est pas du JSON valide');
  try {
    assert.throws(() => chargerReleves(chemin), /illisibles/);
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('listeReleves trie par date et aplati en tableau, forme attendue par calculerComparaisonHebdomadaire', () => {
  const chemin = cheminTemporaire();
  try {
    enregistrerReleveProfil({ date: '2026-09-18', vuesProfil: 10 }, chemin);
    enregistrerReleveProfil({ date: '2026-09-15', vuesProfil: 5 }, chemin);
    const releves = listeReleves(chemin);
    assert.deepEqual(releves.map((r) => r.date), ['2026-09-15', '2026-09-18']);
  } finally {
    fs.rmSync(chemin, { force: true });
  }
});

test('CLI enregistrer-releve-profil.js refuse sans --date', () => {
  let sortie = '';
  let echoue = false;
  try {
    execFileSync('node', [path.join(__dirname, '..', 'enregistrer-releve-profil.js'), '--vuesProfil', '10'], { encoding: 'utf-8', stdio: 'pipe' });
  } catch (erreur) {
    echoue = true;
    sortie = String(erreur.stderr || '');
  }
  assert.ok(echoue);
  assert.match(sortie, /--date manquant/);
});

test('CLI mettre-a-jour-stats.js refuse explicitement --vuesProfil/--demandesContact, redirige vers le nouveau script', () => {
  let sortie = '';
  let echoue = false;
  try {
    execFileSync('node', [
      path.join(__dirname, '..', 'mettre-a-jour-stats.js'),
      '--auteur', 'Jean ZENDJI', '--date', '2026-09-18', '--vuesProfil', '10',
    ], { encoding: 'utf-8', stdio: 'pipe' });
  } catch (erreur) {
    echoue = true;
    sortie = String(erreur.stderr || '');
  }
  assert.ok(echoue);
  assert.match(sortie, /ne sont plus acceptes ici/);
  assert.match(sortie, /enregistrer-releve-profil\.js/);
});
