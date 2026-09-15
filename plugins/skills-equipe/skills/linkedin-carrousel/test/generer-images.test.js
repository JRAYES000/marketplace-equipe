'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  genererImagesParDiapo,
  genererImageCouverture,
  lireDimensionsPng,
} = require('../generer-images');
const { genererPdf } = require('../generer-pdf');

const diapos = require('../fixtures/diapos-exemple.json');
const diaposTestJulienPartners = require('../fixtures/diapos-test-julien-partners-ia-pme.json');

function dossierTemporaire() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linkedin-carrousel-test-'));
}

test('genererImagesParDiapo produit une image 1080x1350 par diapo, dans l\'ordre', async () => {
  const dossierSortie = dossierTemporaire();
  try {
    const resultat = await genererImagesParDiapo({ compte: 'julien-partners', diapos, dossierSortie });

    assert.equal(resultat.nombreImages, diapos.length);
    assert.deepEqual(
      resultat.chemins.map((c) => path.basename(c)),
      ['diapo-01.png', 'diapo-02.png', 'diapo-03.png', 'diapo-04.png']
    );

    for (const chemin of resultat.chemins) {
      const { largeur, hauteur, tailleOctets } = lireDimensionsPng(chemin);
      assert.equal(largeur, 1080, `largeur incorrecte pour ${chemin}`);
      assert.equal(hauteur, 1350, `hauteur incorrecte pour ${chemin}`);
      // Repere de qualite minimal : une diapo texte+fond rendue en PNG a ce
      // format ne descend pas sous quelques Ko -- un fichier plus petit
      // signalerait un rendu vide/casse (police non chargee, page blanche).
      assert.ok(tailleOctets > 5000, `fichier suspicieusement petit (${tailleOctets} octets) pour ${chemin}`);
    }
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

test('genererImageCouverture utilise la diapo "hook" quand elle existe', async () => {
  const dossierSortie = dossierTemporaire();
  const cheminCouverture = path.join(dossierSortie, 'couverture.png');
  try {
    const resultat = await genererImageCouverture({ compte: 'julien-partners', diapos, sortie: cheminCouverture });
    assert.equal(resultat.indexDiapoUtilisee, 0);

    const { largeur, hauteur } = lireDimensionsPng(cheminCouverture);
    assert.equal(largeur, 1080);
    assert.equal(hauteur, 1350);
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

test('genererImageCouverture retombe sur la premiere diapo si aucune n\'a le role "hook"', async () => {
  const diaposSansHook = diapos.map((d) => ({ ...d, role: 'contenu' }));
  const dossierSortie = dossierTemporaire();
  const cheminCouverture = path.join(dossierSortie, 'couverture.png');
  try {
    const resultat = await genererImageCouverture({ compte: 'julien-partners', diapos: diaposSansHook, sortie: cheminCouverture });
    assert.equal(resultat.indexDiapoUtilisee, 0);
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

test('le rendu local fonctionne aussi pour julien-agency', async () => {
  const dossierSortie = dossierTemporaire();
  const cheminCouverture = path.join(dossierSortie, 'couverture.png');
  try {
    const resultat = await genererImageCouverture({ compte: 'julien-agency', diapos, sortie: cheminCouverture });
    const { largeur, hauteur, tailleOctets } = lireDimensionsPng(resultat.cheminSortie);
    assert.equal(largeur, 1080);
    assert.equal(hauteur, 1350);
    assert.ok(tailleOctets > 5000, `fichier suspicieusement petit (${tailleOctets} octets)`);
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

/**
 * Audit du 15/09/2026 : aucun carrousel a contenu reel n'avait jamais ete
 * genere pour julien-partners via le pipeline complet (`genererPdf`, pas
 * seulement le rendu image isole) -- seul julien-agency avait des sorties
 * reelles dans sortants/. Ce test genere reellement le PDF (Playwright,
 * meme chemin de code qu'une generation en conditions reelles) a partir du
 * fixture dedie, dans un dossier temporaire (jamais dans sortants/, jamais
 * publie).
 */
test('genererPdf produit un PDF reel et non vide pour le carrousel de test julien-partners', async () => {
  const dossierSortie = dossierTemporaire();
  const cheminSortie = path.join(dossierSortie, 'test-julien-partners.pdf');
  try {
    const resultat = await genererPdf({ compte: 'julien-partners', diapos: diaposTestJulienPartners, sortie: cheminSortie });
    assert.equal(resultat.nombreDiapos, 10);
    assert.ok(fs.existsSync(cheminSortie));
    const tailleOctets = fs.statSync(cheminSortie).size;
    // Un PDF de 10 pages avec polices embarquees ne descend pas sous
    // quelques dizaines de Ko -- un fichier plus petit signalerait un rendu
    // casse (pages vides, polices non chargees).
    assert.ok(tailleOctets > 20000, `PDF suspicieusement petit (${tailleOctets} octets)`);
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

test('couverture et diapo-01 rendent le meme contenu (meme gabarit, meme diapo)', async () => {
  const dossierSortie = dossierTemporaire();
  try {
    const parDiapo = await genererImagesParDiapo({ compte: 'julien-partners', diapos, dossierSortie: path.join(dossierSortie, 'par-diapo') });
    const couverture = await genererImageCouverture({ compte: 'julien-partners', diapos, sortie: path.join(dossierSortie, 'couverture.png') });

    const octetsDiapo01 = fs.readFileSync(parDiapo.chemins[0]);
    const octetsCouverture = fs.readFileSync(couverture.cheminSortie);
    assert.ok(octetsDiapo01.equals(octetsCouverture), 'le rendu de la couverture doit etre identique a celui de diapo-01');
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});
