'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { chargerGabarit, injecterDiapo } = require('../generer-pdf');

/**
 * Brief Julien du 10/09/2026 : "fort contraste". Jusqu'ici seulement une
 * intention en commentaire (voir tailles-police.test.js) -- jamais mesure.
 * Ce fichier calcule le vrai ratio de contraste WCAG (luminance relative)
 * a partir des couleurs REELLEMENT rendues par Playwright
 * (`getComputedStyle`, converti en rgb), pas des valeurs lues dans le CSS
 * source (qui pourraient etre ecrasees par une regle plus specifique).
 */

const COMPTES = ['page-claude', 'julien-agency', 'julien-partners'];
const SEUIL_TEXTE_LARGE = 3; // WCAG AA, texte >=24px gras ou >=18.66px -- tous les textes de ce gabarit le sont

function rgbStringToArray(rgbString) {
  const m = rgbString.match(/(\d+),\s*(\d+),\s*(\d+)/);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function luminanceRelative([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratioContraste(rgb1, rgb2) {
  const l1 = luminanceRelative(rgb1);
  const l2 = luminanceRelative(rgb2);
  const [clair, sombre] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (clair + 0.05) / (sombre + 0.05);
}

async function mesurerContrastes(compte) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const diapoContenu = { role: 'contenu', titre: 'Titre de mesure', texte: 'Texte de soutien de mesure.' };
  const html = `${entete}${injecterDiapo(blocDiapo, diapoContenu, 0)}${pied}`;

  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const couleur = async (selecteur, propriete) => {
      const valeur = await page.$eval(selecteur, (el, prop) => getComputedStyle(el)[prop], propriete);
      return rgbStringToArray(valeur);
    };

    const fond = await couleur('.slide', 'backgroundColor');
    const titre = await couleur('.title', 'color');
    const texte = await couleur('.body-text', 'color');
    const numero = await couleur('.pagenum', 'color');

    return {
      titreSurFond: ratioContraste(titre, fond),
      texteSurFond: ratioContraste(texte, fond),
      numeroSurFond: ratioContraste(numero, fond),
    };
  } finally {
    await navigateur.close();
  }
}

for (const compte of COMPTES) {
  test(`${compte} -- contraste titre/fond mesure >= ${SEUIL_TEXTE_LARGE}:1 (WCAG AA texte large)`, async () => {
    const { titreSurFond } = await mesurerContrastes(compte);
    assert.ok(titreSurFond >= SEUIL_TEXTE_LARGE, `contraste titre mesure ${titreSurFond.toFixed(2)}:1 sur ${compte}, attendu >= ${SEUIL_TEXTE_LARGE}:1`);
  });

  test(`${compte} -- contraste texte de soutien/fond mesure >= ${SEUIL_TEXTE_LARGE}:1`, async () => {
    const { texteSurFond } = await mesurerContrastes(compte);
    assert.ok(texteSurFond >= SEUIL_TEXTE_LARGE, `contraste texte mesure ${texteSurFond.toFixed(2)}:1 sur ${compte}, attendu >= ${SEUIL_TEXTE_LARGE}:1`);
  });

  test(`${compte} -- contraste numero de page/fond mesure >= ${SEUIL_TEXTE_LARGE}:1`, async () => {
    const { numeroSurFond } = await mesurerContrastes(compte);
    assert.ok(numeroSurFond >= SEUIL_TEXTE_LARGE, `contraste numero mesure ${numeroSurFond.toFixed(2)}:1 sur ${compte}, attendu >= ${SEUIL_TEXTE_LARGE}:1`);
  });
}
