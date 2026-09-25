'use strict';

/**
 * Verrouille les 5 retours du mail de Julien du 25/09/2026 (voir SKILL.md,
 * section "Retours du mail de Julien du 25/09/2026") :
 *   1. Anglicismes refuses sur les 3 surfaces (diapos, documentTitle, post).
 *   2. Page "Comment..."/"methode" sans exemple concret refusee.
 *   3. Modele "citation" rendu reellement plein (fond contraste, pas une
 *      page qui se lit vide) -- verifie par rendu Playwright reel.
 *   4. Image decorative generique (sujet interdit) refusee, imagePrompt
 *      obligatoire des qu'une image reelle est fournie.
 *   5. Rappel des regles deja en place (5 lignes max pour le post, accents
 *      sur les 3 memes surfaces) -- non-regression.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { validerDiapos } = require('../lib/valider-diapos');
const { validerAnglicismes } = require('../lib/valider-anglicismes');
const { validerEtConvertirPost, LIGNES_MAX } = require('../lib/valider-post');
const { chargerGabarit, injecterDiapo, nomFichierDepuisTitre, retirerPointFinal, titreDepuisDiapos } = require('../generer-pdf');

function diapoHookValide(champs = {}) {
  return {
    role: 'hook',
    titre: 'Pourquoi vos meilleurs candidats disparaissent-ils avant l\'offre ?',
    accent: 'disparaissent-ils',
    ...champs,
  };
}

function carrouselMinimal(diapoSupplementaire) {
  const diapos = [diapoHookValide()];
  for (let i = 0; i < 4; i += 1) {
    diapos.push({ role: 'contenu', titre: `Constat numero ${i + 1}`, texte: 'Texte de soutien correct.' });
  }
  diapos.push(diapoSupplementaire);
  return diapos;
}

// ---------- 1. Anglicismes ----------

test('validerAnglicismes refuse "process" (dites plutot "processus")', () => {
  assert.throws(() => validerAnglicismes('Voici notre process de recrutement.'), /anglicisme/);
});

test('validerAnglicismes n\'accuse pas a tort "processus" (le mot correct contient "process" mais un vrai mot boundary l\'exclut)', () => {
  assert.doesNotThrow(() => validerAnglicismes('Voici notre processus de recrutement.'));
});

test('validerAnglicismes refuse deadline/feedback/workflow/business', () => {
  assert.throws(() => validerAnglicismes('Respectez la deadline.'), /anglicisme/);
  assert.throws(() => validerAnglicismes('Merci pour ce feedback.'), /anglicisme/);
  assert.throws(() => validerAnglicismes('Notre workflow a change.'), /anglicisme/);
  assert.throws(() => validerAnglicismes('Un enjeu business.'), /anglicisme/);
});

test('validerDiapos refuse un anglicisme dans le titre/texte d\'une diapo', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Notre process en trois temps',
    texte: 'Un premier constat simple et direct.',
  });
  assert.throws(() => validerDiapos(diapos), /anglicisme/);
});

test('validerEtConvertirPost refuse un anglicisme, y compris a l\'interieur d\'un passage en gras', () => {
  const brouillon = 'Votre **process** est-il vraiment efficace ? 🚀\n\nUn constat simple. 📌\n\nclaudeagency.fr #recrutement';
  assert.throws(() => validerEtConvertirPost(brouillon), /anglicisme/);
});

test('publierDocumentZernio (via lib/publier-zernio) refuse un anglicisme dans documentTitle', () => {
  const { publierDocumentZernio } = require('../lib/publier-zernio');
  return publierDocumentZernio({
    compte: 'julien-agency',
    content: 'Post valide.',
    publicUrl: 'https://exemple.test/fichier.pdf',
    documentTitle: 'Notre business en pleine croissance',
    apiKey: 'sk_test',
    reglages: { 'julien-agency': { zernio_account_id: 'abc' } },
  }).then(
    () => assert.fail('devait refuser'),
    (erreur) => assert.match(erreur.message, /anglicisme/)
  );
});

// ---------- 2. Page "Comment..."/"methode" sans exemple ----------

test('validerDiapos refuse une page "Comment..." sans aucun exemple concret', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'checklist',
    titre: 'Comment choisir votre premier processus',
    items: ['Identifiez le processus le plus repetitif', 'Mesurez le temps perdu chaque semaine', 'Choisissez un outil simple'],
  });
  assert.throws(() => validerDiapos(diapos), /exemple concret/);
});

test('validerDiapos accepte une page "Comment..." qui contient un exemple explicite', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'checklist',
    titre: 'Comment choisir votre premier processus',
    items: [
      'Identifiez le processus le plus repetitif',
      'Exemple : la relance des devis en retard',
      'Choisissez un outil simple',
    ],
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

test('validerDiapos refuse une page "methode" sans exemple, meme accentuee ("La methode en 3 etapes")', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'La méthode en 3 étapes',
    texte: 'Trois étapes suffisent pour avancer sereinement sur ce sujet.',
  });
  assert.throws(() => validerDiapos(diapos), /exemple concret/);
});

test('validerDiapos n\'exige aucun exemple sur une page qui ne promet ni "Comment..." ni "methode"', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Un constat qui derange',
    texte: 'Aucune promesse de methode ici, aucun exemple exige.',
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

// ---------- 3. Citation qui remplit reellement la page ----------

async function rendreDiapoCitation(compte, diapo) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 8 })}${pied}`;
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const fondSlide = await page.$eval('.slide', (el) => getComputedStyle(el).backgroundColor);
    const fondBody = await page.$eval('body', (el) => getComputedStyle(el).backgroundColor);
    const couleurTexte = await page.$eval('.citation-texte', (el) => getComputedStyle(el).color);
    const tailleMarque = await page.$eval('.citation-marque', (el) => parseFloat(getComputedStyle(el).fontSize));
    return { fondSlide, fondBody, couleurTexte, tailleMarque };
  } finally {
    await navigateur.close();
  }
}

for (const compte of ['julien-agency', 'julien-partners']) {
  test(`${compte} -- la diapo "citation" rend un fond contraste (pas la meme couleur que le fond de page par defaut) meme pour une citation courte`, async () => {
    const diapo = { role: 'contenu', modele: 'citation', citation: 'Vendre, c\'est ecouter.' };
    const { fondSlide, fondBody } = await rendreDiapoCitation(compte, diapo);
    assert.notEqual(fondSlide, fondBody, `fond de la diapo citation (${fondSlide}) identique au fond de page par defaut (${fondBody}) -- la page se lit toujours vide`);
  });

  test(`${compte} -- la diapo "citation" agrandit le guillemet decoratif au-dela de l'ancien format (>=200px)`, async () => {
    const diapo = { role: 'contenu', modele: 'citation', citation: 'Vendre, c\'est ecouter.' };
    const { tailleMarque } = await rendreDiapoCitation(compte, diapo);
    assert.ok(tailleMarque >= 200, `guillemet mesure ${tailleMarque}px, attendu >= 200px (ancien format : 160px)`);
  });
}

// ---------- 4. Images decoratives generiques interdites ----------

test('validerDiapos refuse une image reelle sans "imagePrompt" (tracabilite)', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Un vrai gain mesurable',
    texte: 'Explication complete du gain obtenu.',
    image: 'a-publier/images/exemple.jpg',
  });
  assert.throws(() => validerDiapos(diapos), /imagePrompt/);
});

test('validerDiapos refuse un imagePrompt qui decrit un sujet decoratif interdit (clavier, ecran vide)', () => {
  const diaposClavier = carrouselMinimal({
    role: 'contenu',
    titre: 'Un vrai gain mesurable',
    texte: 'Explication complete du gain obtenu.',
    image: 'a-publier/images/exemple.jpg',
    imagePrompt: 'Photo realiste d\'un clavier d\'ordinateur, plan rapproche',
  });
  assert.throws(() => validerDiapos(diaposClavier), /sujet generique interdit/);

  const diaposEcranVide = carrouselMinimal({
    role: 'contenu',
    titre: 'Un vrai gain mesurable',
    texte: 'Explication complete du gain obtenu.',
    image: 'a-publier/images/exemple.jpg',
    imagePrompt: 'Bureau moderne avec un ecran vide',
  });
  assert.throws(() => validerDiapos(diaposEcranVide), /sujet generique interdit/);
});

test('validerDiapos accepte une image qui illustre reellement l\'idee de la page', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Un vrai gain mesurable',
    texte: 'Explication complete du gain obtenu.',
    image: 'a-publier/images/exemple.jpg',
    imagePrompt: 'Illustration d\'une equipe qui celebre un dossier client signe, style plat, couleurs chaudes',
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

test('validerDiapos n\'exige aucun imagePrompt quand aucune image reelle n\'est fournie (imageEmplacement seul)', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Un vrai gain mesurable',
    texte: 'Explication complete du gain obtenu.',
    imageEmplacement: true,
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

// ---------- 5. Rappel des regles deja en place (non-regression) ----------

test('rappel : le texte du post reste plafonne a 5 lignes (LIGNES_MAX)', () => {
  assert.equal(LIGNES_MAX, 5);
});

test('rappel : les 3 surfaces (diapos, documentTitle, post) sont bien toutes couvertes par validerAccents', () => {
  const { validerAccents } = require('../lib/valider-orthographe');
  assert.throws(() => validerAccents('Ceci est deja fini.'), /accent/);
});

// ---------- 6. Point final en double dans le nom de fichier ----------
// Bug reel trouve le 25/09/2026 en verifiant le carrousel de test : un titre
// de diapo hook qui se termine par une phrase complete (point final) produit
// "...pdf" -- "Titre..pdf", jamais retire avant. Corrige dans
// generer-pdf.js (retirerPointFinal, nomFichierDepuisTitre) et propage a
// lib/publier-zernio.js (documentTitle, meme defaut possible).

test('retirerPointFinal retire un point final unique et les espaces qui suivraient', () => {
  assert.equal(retirerPointFinal('Voici pourquoi.'), 'Voici pourquoi');
  assert.equal(retirerPointFinal('Voici pourquoi. '), 'Voici pourquoi');
  assert.equal(retirerPointFinal('Voici pourquoi'), 'Voici pourquoi');
});

test('retirerPointFinal ne touche pas un point qui n\'est pas final (ex. "M. Dupont")', () => {
  assert.equal(retirerPointFinal('M. Dupont'), 'M. Dupont');
});

test('nomFichierDepuisTitre retire le point final -- ne produit jamais "Titre..pdf" une fois l\'extension ajoutee', () => {
  const nom = nomFichierDepuisTitre('Vos meilleurs candidats disparaissent avant l\'offre. Voici pourquoi.');
  assert.ok(!nom.endsWith('.'), `nom de fichier "${nom}" se termine encore par un point`);
  assert.equal(`${nom}.pdf`.includes('..'), false, `"${nom}.pdf" contient un double point`);
});

test('titreDepuisDiapos (utilise pour le nom de fichier reel) ne renvoie jamais un titre termine par un point', () => {
  const diapos = [{ role: 'hook', titre: 'Vos meilleurs candidats disparaissent avant l\'offre. Voici pourquoi.', accent: 'disparaissent avant l\'offre' }];
  const nom = titreDepuisDiapos(diapos);
  assert.ok(!nom.endsWith('.'), `titre derive "${nom}" se termine encore par un point`);
});

test('publierDocumentZernio nettoie le point final du documentTitle avant tout envoi a Zernio', async () => {
  const { publierDocumentZernio } = require('../lib/publier-zernio');
  const restaurer = mockerFetch(async (url, opts) => {
    if (String(url) === 'https://zernio.com/api/v1/accounts') {
      return reponseJson({ accounts: [{ _id: '6ab50c438d284ffb213b7c55', platform: 'linkedin', isActive: true }] });
    }
    if (String(url) === 'https://zernio.com/api/v1/posts') {
      const corps = JSON.parse(opts.body);
      assert.equal(corps.platforms[0].platformSpecificData.documentTitle, 'Voici pourquoi');
      return reponseJson({ message: 'ok', post: { _id: 'post-test', status: 'published' } }, 201);
    }
    throw new Error(`Mock fetch : requete inattendue -- ${url}`);
  });
  try {
    await publierDocumentZernio({
      compte: 'julien-agency',
      content: 'Texte du post deja valide.',
      publicUrl: 'https://media.zernio.com/temp/carrousel-test.pdf',
      documentTitle: 'Voici pourquoi.',
      apiKey: 'sk_test',
      reglages: { 'julien-agency': { zernio_account_id: '6ab50c438d284ffb213b7c55' } },
    });
  } finally {
    restaurer();
  }
});

function mockerFetch(gestionnaire) {
  const original = global.fetch;
  global.fetch = gestionnaire;
  return () => { global.fetch = original; };
}

function reponseJson(corps, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => corps, text: async () => JSON.stringify(corps) };
}
