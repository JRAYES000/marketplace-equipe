// Tests de lecture d'email des CV (v10.3). Lancer : node --test tests/email-cv.test.js
// Les fichiers de tests/cas/ sont fictifs : noms inventes, domaine exemple.fr / exemple.com.
// Ne jamais y mettre un CV ni un email reel de candidat.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { lireEmail, douteux } = require('../scripts/email-cv');

const cas = f => fs.readFileSync(path.join(__dirname, 'cas', f), 'utf8');
const profil = (Prenom, Nom) => ({ Prenom, Nom, anonyme: false });

test('cas 1 : partie locale coupee en fin de ligne, CV en deux colonnes', () => {
  const t = cas('cas1-deux-colonnes.txt');
  const r = lireEmail(t);
  assert.strictEqual(r.email, 'ROSALIE.VANDERMEULEN@EXEMPLE.COM');
  assert.deepStrictEqual(r.marques, ['RECOLLE']);
  assert.deepStrictEqual(douteux(r.email, profil('Rosalie', 'VANDERMEULEN'), t), []);
});

test('cas 1 bis : sans recollage, la partie locale de 2 caracteres est signalee', () => {
  assert.deepStrictEqual(douteux('EN@EXEMPLE.COM', profil('Rosalie', 'VANDERMEULEN'), 'Rosalie VANDERMEULEN'),
    ['email douteux (partie locale de moins de 3 caracteres)']);
});

test('cas 2 : debut separe par une espace recolle, 1 lu l signale', () => {
  const t = cas('cas2-debut-perdu-1-lu-l.txt');
  const r = lireEmail(t);
  assert.strictEqual(r.email, 'rosine.dubreuill@exemple.fr');
  assert.deepStrictEqual(r.marques, ['RECOLLE']);
  assert.deepStrictEqual(douteux(r.email, profil('Rosine', 'DUBREUIL'), t), ['email douteux (chiffre 1 lu l ?)']);
});

test('cas 3 : caractere parasite de tete retire', () => {
  const t = cas('cas3-caractere-de-tete.txt');
  const r = lireEmail(t);
  assert.strictEqual(r.email, 'maxou-du-29@exemple.fr');
  assert.deepStrictEqual(r.marques, []);
  assert.deepStrictEqual(douteux(r.email, profil('Maxence', 'LE GOFF'), t), []);
});

test('cas 4 : lettres mal lues, partie locale sans rien du nom signalee', () => {
  const t = cas('cas4-lettres-mal-lues.txt');
  const r = lireEmail(t);
  assert.strictEqual(r.email, 'sCsatelierdubois7@exemple.fr');
  assert.deepStrictEqual(douteux(r.email, profil('Helene', 'MARCHAND'), t), ['email douteux (rien du nom du candidat)']);
});

test('pas de signalement « rien du nom » quand le CV ne porte pas le nom, ou profil anonyme', () => {
  assert.deepStrictEqual(douteux('atelier7@exemple.fr', profil('Helene', 'MARCHAND'), 'Atelier creatif'), []);
  assert.deepStrictEqual(douteux('atelier7@exemple.fr', { Nom: 'Conseillere bien-etre', Prenom: '', anonyme: true }, 'Conseillere bien-etre'), []);
});

test('temoins : jamais de recollage d un libelle, d un mot ordinaire ou d un mot suivi d un point', () => {
  assert.deepStrictEqual(lireEmail(cas('temoin-libelle.txt')), { email: 'jean.dupont@exemple.fr', marques: [] });
  assert.deepStrictEqual(lireEmail(cas('temoin-mot-ordinaire.txt')), { email: 'marie.durand@exemple.fr', marques: [] });
  assert.deepStrictEqual(lireEmail(cas('temoin-meme-ligne.txt')), { email: 'jdupont@exemple.fr', marques: [] });
});

test('temoins : passes 2 et 3 inchangees', () => {
  assert.deepStrictEqual(lireEmail(cas('temoin-domaine-coupe.txt')), { email: 'paul.durand@yahoo.com', marques: [] });
  assert.deepStrictEqual(lireEmail(cas('temoin-arobase-en-e.txt')), { email: 'mdurand@gmail.com', marques: ['RECONSTRUIT'] });
});

test('ligne de commande : format lu par emails-depuis-cv.sh', () => {
  const cli = path.join(__dirname, '..', 'scripts', 'email-cv.js');
  const sortie = execFileSync(process.execPath, [cli], { input: cas('cas1-deux-colonnes.txt') }).toString();
  assert.strictEqual(sortie, 'ROSALIE.VANDERMEULEN@EXEMPLE.COM [RECOLLE]');
});
