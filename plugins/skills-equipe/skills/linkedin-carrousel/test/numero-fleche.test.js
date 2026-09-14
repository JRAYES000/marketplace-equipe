'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { chargerGabarit, injecterDiapo } = require('../generer-pdf');

/**
 * Brief Julien du 10/09/2026 : "Un numero sur chaque diapo, une fleche sur
 * la premiere." Verifie sur un rendu Playwright reel, pas sur une lecture de
 * la feuille de style ou du HTML source.
 */

const COMPTES = ['page-claude', 'julien-agency', 'julien-partners'];

async function rendre(compte, diapo, index) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, index)}${pied}`;
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const numero = await page.$eval('.pagenum', (el) => el.textContent.trim()).catch(() => null);
    const flecheVisible = await page.$eval('.swipe-hint', (el) => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).catch(() => false);
    return { numero, flecheVisible };
  } finally {
    await navigateur.close();
  }
}

for (const compte of COMPTES) {
  test(`${compte} -- numero present sur une diapo "hook" (01) et fleche visible`, async () => {
    const { numero, flecheVisible } = await rendre(compte, { role: 'hook', titre: 'Test' }, 0);
    assert.equal(numero, '01', `numero attendu "01", trouve "${numero}"`);
    assert.equal(flecheVisible, true, 'la fleche doit etre visible sur la diapo hook');
  });

  test(`${compte} -- numero present sur une diapo "contenu" (03) et fleche absente`, async () => {
    const { numero, flecheVisible } = await rendre(
      compte,
      { role: 'contenu', titre: 'Test', texte: 'Texte' },
      2
    );
    assert.equal(numero, '03', `numero attendu "03", trouve "${numero}"`);
    assert.equal(flecheVisible, false, 'la fleche ne doit apparaitre que sur la diapo hook');
  });
}
