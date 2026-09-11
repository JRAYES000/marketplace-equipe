#!/usr/bin/env node
'use strict';

/**
 * Rendu LOCAL (Playwright, aucun appel Composio) des deux options de repli
 * image documentees dans lib/publier.js et SKILL.md -- pour verifier
 * resolution/qualite avant de brancher quoi que ce soit cote publication.
 *
 * Reutilise exactement le meme gabarit/injection que generer-pdf.js
 * (chargerGabarit, injecterDiapo) : le rendu d'une diapo en PNG ne doit
 * jamais diverger visuellement du rendu de la meme diapo en PDF.
 *
 * Deux fonctions, correspondant aux deux options du "modeRepli" documente
 * dans lib/publier.js :
 *   - genererImagesParDiapo  : une image PNG par diapo (mode "par-diapo").
 *   - genererImageCouverture : une seule image PNG, la diapo hook (ou la
 *     premiere) (mode "couverture").
 *
 * Usage CLI :
 *   node generer-images.js par-diapo   <compte> <fichier-diapos.json> [dossier-sortie]
 *   node generer-images.js couverture  <compte> <fichier-diapos.json> [sortie.png]
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const {
  chargerGabarit,
  injecterDiapo,
  slugDepuisDiapos,
  dateISODuJour,
} = require('./generer-pdf');

const SKILL_DIR = __dirname;
const SORTANTS_DIR = path.join(SKILL_DIR, 'sortants');

const LARGEUR_PX = 1080;
const HAUTEUR_PX = 1350;

function construireDocumentUneDiapo(compte, diapo, index) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  return `${entete}${injecterDiapo(blocDiapo, diapo, index)}${pied}`;
}

/**
 * Rendu bas niveau : une diapo -> un fichier PNG, via une page Playwright
 * dediee au viewport exact 1080x1350 (meme dimensions que la page PDF, donc
 * meme mise en page CSS -- aucun readapting de gabarit necessaire).
 */
async function rendreDiapoEnPng({ navigateur, compte, diapo, index, cheminSortie }) {
  const html = construireDocumentUneDiapo(compte, diapo, index);
  const page = await navigateur.newPage({ viewport: { width: LARGEUR_PX, height: HAUTEUR_PX } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.dirname(cheminSortie), { recursive: true });
    await page.screenshot({ path: cheminSortie, type: 'png' });
    return cheminSortie;
  } finally {
    await page.close();
  }
}

function dossierSortieParDefaut(compte, diapos, date = new Date()) {
  const base = `${dateISODuJour(date)}-${slugDepuisDiapos(diapos)}`;
  return path.join(SORTANTS_DIR, compte, `${base}--images-par-diapo`);
}

function cheminCouvertureParDefaut(compte, diapos, date = new Date()) {
  const base = `${dateISODuJour(date)}-${slugDepuisDiapos(diapos)}`;
  return path.join(SORTANTS_DIR, compte, `${base}--couverture.png`);
}

/**
 * Mode "par-diapo" : une image PNG par diapo, numerotees comme dans le PDF
 * (01, 02, ...). Correspond a l'option (a) documentee dans lib/publier.js --
 * en publication reelle, chaque fichier serait televerse separement via
 * LINKEDIN_REGISTER_IMAGE_UPLOAD puis passe dans `images` de
 * LINKEDIN_CREATE_LINKED_IN_POST. Ce script ne fait QUE le rendu local, zero
 * appel reseau Composio.
 */
async function genererImagesParDiapo({ compte, diapos, dossierSortie }) {
  if (!Array.isArray(diapos) || diapos.length === 0) {
    throw new Error('La liste de diapos est vide.');
  }
  const dossier = dossierSortie || dossierSortieParDefaut(compte, diapos);
  fs.mkdirSync(dossier, { recursive: true });

  const navigateur = await chromium.launch();
  try {
    const chemins = [];
    for (let index = 0; index < diapos.length; index += 1) {
      const numero = String(index + 1).padStart(2, '0');
      const cheminSortie = path.join(dossier, `diapo-${numero}.png`);
      chemins.push(await rendreDiapoEnPng({ navigateur, compte, diapo: diapos[index], index, cheminSortie }));
    }
    return { dossier, chemins, nombreImages: chemins.length };
  } finally {
    await navigateur.close();
  }
}

/**
 * Mode "couverture" : une seule image PNG, la diapo "hook" si presente sinon
 * la premiere diapo de la liste. Correspond a l'option (b) documentee dans
 * lib/publier.js -- perd le format feuilletable, mais une seule image a
 * televerser en publication reelle.
 */
async function genererImageCouverture({ compte, diapos, sortie }) {
  if (!Array.isArray(diapos) || diapos.length === 0) {
    throw new Error('La liste de diapos est vide.');
  }
  const indexHook = diapos.findIndex((d) => d.role === 'hook');
  const index = indexHook === -1 ? 0 : indexHook;
  const cheminSortie = sortie || cheminCouvertureParDefaut(compte, diapos);

  const navigateur = await chromium.launch();
  try {
    await rendreDiapoEnPng({ navigateur, compte, diapo: diapos[index], index, cheminSortie });
    return { cheminSortie, indexDiapoUtilisee: index };
  } finally {
    await navigateur.close();
  }
}

/**
 * Lit les dimensions d'un PNG directement depuis son chunk IHDR (8 octets de
 * signature + 4 octets de longueur + "IHDR" + largeur/hauteur sur 4 octets
 * chacun, big-endian) -- pas de dependance externe pour un controle qualite
 * aussi simple.
 */
function lireDimensionsPng(cheminFichier) {
  const buffer = fs.readFileSync(cheminFichier);
  const signatureAttendue = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signatureAttendue)) {
    throw new Error(`${cheminFichier} n'est pas un PNG valide (signature absente).`);
  }
  return {
    largeur: buffer.readUInt32BE(16),
    hauteur: buffer.readUInt32BE(20),
    tailleOctets: buffer.length,
  };
}

async function main() {
  const [, , mode, compte, cheminDiapos, sortie] = process.argv;
  if (!mode || !compte || !cheminDiapos || !['par-diapo', 'couverture'].includes(mode)) {
    console.error('Usage : node generer-images.js <par-diapo|couverture> <compte> <fichier-diapos.json> [sortie]');
    process.exitCode = 1;
    return;
  }
  const diapos = JSON.parse(fs.readFileSync(cheminDiapos, 'utf-8'));

  if (mode === 'par-diapo') {
    const resultat = await genererImagesParDiapo({ compte, diapos, dossierSortie: sortie });
    for (const chemin of resultat.chemins) {
      const { largeur, hauteur, tailleOctets } = lireDimensionsPng(chemin);
      console.log(`${chemin} -- ${largeur}x${hauteur}px, ${tailleOctets} octets`);
    }
  } else {
    const resultat = await genererImageCouverture({ compte, diapos, sortie });
    const { largeur, hauteur, tailleOctets } = lireDimensionsPng(resultat.cheminSortie);
    console.log(`${resultat.cheminSortie} -- ${largeur}x${hauteur}px, ${tailleOctets} octets`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = {
  genererImagesParDiapo,
  genererImageCouverture,
  lireDimensionsPng,
  dossierSortieParDefaut,
  cheminCouvertureParDefaut,
};
