'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { publierCarrouselViaImage } = require('../lib/publier');

test('publierCarrouselViaImage refuse un modeRepli absent ou invalide', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', cheminsImages: ['a.png'], commentary: 'texte' }),
    /modeRepli requis/
  );
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', modeRepli: 'pdf', cheminsImages: ['a.png'], commentary: 'texte' }),
    /modeRepli requis/
  );
});

test('publierCarrouselViaImage exige exactement une image en mode "couverture"', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({
      authorUrn: 'urn:li:person:x',
      modeRepli: 'couverture',
      cheminsImages: ['a.png', 'b.png'],
      commentary: 'texte',
    }),
    /exactement une image/
  );
});

test('publierCarrouselViaImage exige cheminsImages non vide', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', modeRepli: 'par-diapo', cheminsImages: [], commentary: 'texte' }),
    /cheminsImages requis/
  );
});

test('publierCarrouselViaImage exige authorUrn et commentary', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({ modeRepli: 'couverture', cheminsImages: ['a.png'], commentary: 'texte' }),
    /authorUrn requis/
  );
  await assert.rejects(
    () => publierCarrouselViaImage({ authorUrn: 'urn:li:person:x', modeRepli: 'couverture', cheminsImages: ['a.png'] }),
    /commentary requis/
  );
});

test('publierCarrouselViaImage n\'est jamais appelee depuis generer-pdf.js, generer-images.js ou lib/composio.js', () => {
  const racine = path.join(__dirname, '..');
  for (const relatif of ['generer-pdf.js', 'generer-images.js', 'lib/composio.js']) {
    const source = fs.readFileSync(path.join(racine, relatif), 'utf8');
    assert.ok(
      !source.includes('publierCarrouselViaImage'),
      `${relatif} mentionne publierCarrouselViaImage -- elle doit rester inerte tant que Julien n'a pas tranche`
    );
  }
});

test('dans lib/publier.js, publierCarrouselViaImage n\'est jamais appelee (seulement documentee, definie et exportee)', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'lib', 'publier.js'), 'utf8');
  const lignesAvecAppel = source
    .split('\n')
    .filter((ligne) => ligne.includes('publierCarrouselViaImage') && ligne.includes('('))
    .filter((ligne) => !ligne.trimStart().startsWith('*'))
    .filter((ligne) => !/^async function publierCarrouselViaImage/.test(ligne.trim()))
    .filter((ligne) => !ligne.includes('module.exports'));

  assert.deepEqual(lignesAvecAppel, [], 'aucune ligne ne doit appeler publierCarrouselViaImage() dans ce fichier');
});
