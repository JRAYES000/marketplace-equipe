'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { retrouverLigneCommentaire, mettreAJourStatistiques } = require('../lib/notion');

// Regle 3 du brief (lecture des chiffres par capture d'ecran) : cette skill
// ne fait pas d'OCR -- la session Claude lit l'image, ces fonctions ecrivent
// juste ce qui a ete lu. Testable sans reseau sur le meme principe que
// notion-erreurs.test.js : NOTION_TOKEN absent leve avant tout appel HTTP.

test('retrouverLigneCommentaire refuse sans NOTION_TOKEN, message explicite', async () => {
  await assert.rejects(
    () => retrouverLigneCommentaire({ dataSourceId: 'peu-importe', auteurCible: 'Jean ZENDJI' }),
    /NOTION_TOKEN manquant/
  );
});

test('retrouverLigneCommentaire refuse sans auteurCible', async () => {
  await assert.rejects(
    () => retrouverLigneCommentaire({ dataSourceId: 'peu-importe' }),
    /auteurCible requis/
  );
});

test('mettreAJourStatistiques refuse sans NOTION_TOKEN, message explicite', async () => {
  await assert.rejects(
    () => mettreAJourStatistiques({ dataSourceId: 'peu-importe', auteurCible: 'Jean ZENDJI', jaime: 3 }),
    /NOTION_TOKEN manquant/
  );
});
