'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { retrouverEntreeParTitre, mettreAJourStatistiques7j } = require('../lib/notion');

// Regle 3 du brief (lecture des chiffres par capture d'ecran) : meme
// principe que linkedin-commentaires -- aucun OCR ici, la session Claude
// lit l'image, ces fonctions ecrivent juste ce qui a ete lu. Testable sans
// reseau : NOTION_TOKEN absent leve avant tout appel HTTP.

test('retrouverEntreeParTitre refuse sans NOTION_TOKEN, message explicite', async () => {
  await assert.rejects(
    () => retrouverEntreeParTitre({ dataSourceId: 'peu-importe', titre: 'Un titre' }),
    /NOTION_TOKEN manquant/
  );
});

test('retrouverEntreeParTitre refuse sans titre', async () => {
  await assert.rejects(
    () => retrouverEntreeParTitre({ dataSourceId: 'peu-importe' }),
    /titre requis/
  );
});

test('mettreAJourStatistiques7j refuse sans NOTION_TOKEN, message explicite', async () => {
  await assert.rejects(
    () => mettreAJourStatistiques7j({ dataSourceId: 'peu-importe', titre: 'Un titre', vues7j: 100 }),
    /NOTION_TOKEN manquant/
  );
});
