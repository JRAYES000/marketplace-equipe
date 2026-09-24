'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { chargerGabarit, injecterDiapo } = require('../generer-pdf');

/**
 * Brief Julien du 10/09/2026 : "Un numero sur chaque diapo, une fleche sur
 * la premiere." Verifie sur un rendu Playwright reel, pas sur une lecture de
 * la feuille de style ou du HTML source.
 *
 * Format du numero mis a jour le 24/09/2026 (retour de Julien sur le premier
 * carrousel de test : "01" cite parmi les defauts du dessin, trop technique/
 * pesant) -- "N/Total" (ex. "3/10") a la place du "01" a deux chiffres
 * fixes. Fonction partagee par les 3 gabarits (injecterDiapo, generer-pdf.js) :
 * page-claude en herite aussi, meme si la refonte des 6 modeles ne le
 * touche pas par ailleurs (compte en pause, voir SKILL.md) -- pas de raison
 * de garder un format juge moins bon sur un gabarit qui partage le meme
 * moteur de rendu.
 */

const COMPTES = ['page-claude', 'julien-agency', 'julien-partners'];
const TOTAL_DIAPOS_TEST = 10;

async function rendre(compte, diapo, index, total = TOTAL_DIAPOS_TEST) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, index, { total })}${pied}`;
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
  test(`${compte} -- numero present sur une diapo "hook" (1/10) et fleche visible`, async () => {
    const { numero, flecheVisible } = await rendre(compte, { role: 'hook', titre: 'Test' }, 0);
    assert.equal(numero, `1/${TOTAL_DIAPOS_TEST}`, `numero attendu "1/${TOTAL_DIAPOS_TEST}", trouve "${numero}"`);
    assert.equal(flecheVisible, true, 'la fleche doit etre visible sur la diapo hook');
  });

  test(`${compte} -- numero present sur une diapo "contenu" (3/10) et fleche absente`, async () => {
    const { numero, flecheVisible } = await rendre(
      compte,
      { role: 'contenu', titre: 'Test', texte: 'Texte' },
      2
    );
    assert.equal(numero, `3/${TOTAL_DIAPOS_TEST}`, `numero attendu "3/${TOTAL_DIAPOS_TEST}", trouve "${numero}"`);
    assert.equal(flecheVisible, false, 'la fleche ne doit apparaitre que sur la diapo hook');
  });

  test(`${compte} -- sans "total" fourni, le numero retombe sur "N/N" (jamais "undefined")`, async () => {
    // Appel direct (pas via le helper "rendre" ci-dessus, dont le parametre
    // par defaut masquerait justement le cas "total absent" qu'on veut tester).
    const { entete, blocDiapo, pied } = chargerGabarit(compte);
    const html = `${entete}${injecterDiapo(blocDiapo, { role: 'contenu', titre: 'Test', texte: 'Texte' }, 4)}${pied}`;
    const navigateur = await chromium.launch();
    try {
      const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const numero = await page.$eval('.pagenum', (el) => el.textContent.trim());
      assert.equal(numero, '5/5', `numero attendu "5/5" (repli sur index+1), trouve "${numero}"`);
    } finally {
      await navigateur.close();
    }
  });
}
