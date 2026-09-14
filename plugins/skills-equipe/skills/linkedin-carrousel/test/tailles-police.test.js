'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { chargerGabarit, injecterDiapo } = require('../generer-pdf');

/**
 * Brief Julien du 10/09/2026 : "Titres a 64 pixels minimum, texte a 40,
 * fort contraste". Mesure REELLE via getComputedStyle sur un rendu Playwright
 * -- ne se fie pas a la valeur lue dans la feuille de style, qui pourrait
 * etre ecrasee par une regle plus specifique, un heritage, ou un zoom de
 * page non pris en compte par une simple lecture de texte.
 */

const COMPTES = ['page-claude', 'julien-agency', 'julien-partners'];
const TITRE_MIN_PX = 64;
const TEXTE_MIN_PX = 40;

async function mesurerPolices(compte, role) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const diapo = role === 'hook'
    ? { role: 'hook', titre: 'Titre de mesure' }
    : { role: 'contenu', titre: 'Titre de mesure', texte: 'Texte de soutien de mesure.' };
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, 0)}${pied}`;

  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const taillePx = async (selecteur) => {
      const valeur = await page.$eval(selecteur, (el) => getComputedStyle(el).fontSize);
      return parseFloat(valeur);
    };

    return {
      titre: await taillePx('.title'),
      texte: role === 'hook' ? null : await taillePx('.body-text'),
    };
  } finally {
    await navigateur.close();
  }
}

for (const compte of COMPTES) {
  test(`${compte} -- titre "hook" mesure >= ${TITRE_MIN_PX}px`, async () => {
    const { titre } = await mesurerPolices(compte, 'hook');
    assert.ok(titre >= TITRE_MIN_PX, `titre hook mesure ${titre}px sur ${compte}, attendu >= ${TITRE_MIN_PX}px`);
  });

  test(`${compte} -- titre "contenu" mesure >= ${TITRE_MIN_PX}px`, async () => {
    const { titre } = await mesurerPolices(compte, 'contenu');
    assert.ok(titre >= TITRE_MIN_PX, `titre contenu mesure ${titre}px sur ${compte}, attendu >= ${TITRE_MIN_PX}px`);
  });

  test(`${compte} -- texte de soutien mesure >= ${TEXTE_MIN_PX}px`, async () => {
    const { texte } = await mesurerPolices(compte, 'contenu');
    assert.ok(texte >= TEXTE_MIN_PX, `texte mesure ${texte}px sur ${compte}, attendu >= ${TEXTE_MIN_PX}px`);
  });
}
