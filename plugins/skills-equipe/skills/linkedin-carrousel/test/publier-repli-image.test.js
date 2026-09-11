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

test('publierCarrouselViaImage refuse avec des parametres valides -- confirme casse le 12/09/2026 (LINKEDIN_CREATE_LINKED_IN_POST.images exige un FileUploadable, pas une URN simple)', async () => {
  await assert.rejects(
    () => publierCarrouselViaImage({
      authorUrn: 'urn:li:person:aFqu-W7ClW',
      modeRepli: 'couverture',
      cheminsImages: ['a.png'],
      commentary: 'texte',
    }),
    /FileUploadable/
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
  // Un "appel" a la forme precise "publierCarrouselViaImage(" -- le nom
  // immediatement suivi d'une parenthese ouvrante. La definition
  // (`async function publierCarrouselViaImage(`) et les mentions en
  // commentaire/message d'erreur ("Repli image (publierCarrouselViaImage)",
  // sans parenthese collee juste apres) ne matchent pas ce motif.
  const lignesAvecAppel = source
    .split('\n')
    .filter((ligne) => /publierCarrouselViaImage\(/.test(ligne))
    .filter((ligne) => !/^async function publierCarrouselViaImage\(/.test(ligne.trim()));

  assert.deepEqual(lignesAvecAppel, [], 'aucune ligne ne doit appeler publierCarrouselViaImage() dans ce fichier');
});
