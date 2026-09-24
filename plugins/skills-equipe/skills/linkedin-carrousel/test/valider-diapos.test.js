'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validerDiapos } = require('../lib/valider-diapos');

const diapos10Conformes = require('../fixtures/diapos-10-conformes.json');
const diaposTestJulienPartners = require('../fixtures/diapos-test-julien-partners-ia-pme.json');

test('accepte un carrousel de 10 diapos conformes', () => {
  assert.doesNotThrow(() => validerDiapos(diapos10Conformes));
});

/**
 * Carrousel de test reel pour julien-partners (audit du 15/09/2026) : ce
 * compte n'avait jamais eu de carrousel a contenu reel genere via le
 * pipeline complet, seulement julien-agency (voir sortants/julien-agency/).
 * Verrouille ici que ce carrousel precis reste conforme (structure, mots,
 * accents) -- le rendu visuel (tailles/contraste/numero/fleche mesures) est
 * deja couvert pour "julien-partners" par test/tailles-police.test.js,
 * test/contraste.test.js et test/numero-fleche.test.js.
 */
test('accepte le carrousel de test reel julien-partners (IA pour les PME, sujet libre)', () => {
  assert.equal(diaposTestJulienPartners.length, 10);
  assert.doesNotThrow(() => validerDiapos(diaposTestJulienPartners));
});

// Bornes mises a jour le 24/09/2026 (retour de Julien apres le premier
// carrousel de test des 6 modeles) : 6 a 10 diapos (avant : 8 a 12).
test('refuse un carrousel de 5 diapos (sous le minimum de 6)', () => {
  const diapos5 = diapos10Conformes.slice(0, 5);
  assert.throws(() => validerDiapos(diapos5), /entre 6 et 10/);
});

test('refuse un carrousel de 11 diapos (au-dessus du maximum de 10)', () => {
  const derniereIdee = diapos10Conformes[diapos10Conformes.length - 2];
  const diapos11 = [
    ...diapos10Conformes.slice(0, -1),
    derniereIdee,
    diapos10Conformes[diapos10Conformes.length - 1],
  ];
  assert.equal(diapos11.length, 11);
  assert.throws(() => validerDiapos(diapos11), /entre 6 et 10/);
});

// Limite relevee le 24/09/2026 (retour de Julien) : 60 mots par page (avant : 25).
test('refuse une diapo depassant 60 mots -- cas demande : une diapo a 67 mots (7 de trop)', () => {
  // Titre "Titre court" = 2 mots + texte de 65 mots = 67 mots au total sur la
  // diapo, soit 7 de plus que le maximum de 60 -- cas exact demande.
  const texte65Mots = Array.from({ length: 65 }, (_, i) => `mot${i + 1}`).join(' ') + '.';
  const diapos = diapos10Conformes.map((d, i) => (i === 3
    ? { role: 'contenu', titre: 'Titre court', texte: texte65Mots }
    : d));
  assert.throws(
    () => validerDiapos(diapos),
    /diapo n°4.*67 mots/s
  );
});

/**
 * Correction du 24/09/2026 (retour de Julien) : avant cette correction, le
 * compte de mots ne lisait que titre+texte -- une checklist a items tres
 * longs (le champ reellement affiche par ce modele, voir lib/modeles.js)
 * passait la validation en debordant reellement de la diapo, puisque ses
 * items n'etaient jamais comptes. Preuve directe : un titre court (7 mots)
 * mais 4 items totalisant 64 mots une fois TOUS comptes -- doit etre refuse.
 */
test('compte TOUS les champs visibles d\'un modele, pas seulement titre+texte -- checklist a items trop longs refusee', () => {
  const diapoChecklistTropLongue = {
    role: 'contenu',
    modele: 'checklist',
    titre: 'Trois points a verifier chaque semaine sans exception',
    items: [
      'Premier point vraiment tres long avec beaucoup de mots pour depasser la limite generale',
      'Deuxieme point egalement tres detaille et long, plein de mots supplementaires ici encore',
      'Troisieme point complet, riche en details, avec encore plus de mots ajoutes pour de bon',
      'Quatrieme point ajoute expres pour depasser largement la nouvelle limite de soixante mots fixee',
    ],
  };
  const diapos = diapos10Conformes.map((d, i) => (i === 3 ? diapoChecklistTropLongue : d));
  assert.throws(
    () => validerDiapos(diapos),
    /diapo n°4.*64 mots \(tous les champs visibles du modele "checklist" compris\)/s
  );
});

/**
 * Meme correction, sens inverse : le modele "citation" n'affiche jamais de
 * "titre" (voir templates/*.html, layout-citation) -- avant cette
 * correction, une diapo "citation" SANS titre etait refusee a tort ("doit
 * avoir un titre non vide"), forcant a fournir un champ jamais rendu rien
 * que pour passer ce controle (voir l'incident documente dans SKILL.md,
 * carrousel de test du 24/09/2026).
 */
test('une diapo "citation" sans "titre" est acceptee -- ce modele ne l\'affiche jamais', () => {
  const diapoCitation = {
    role: 'contenu',
    modele: 'citation',
    citation: 'Un client silencieux n\'est jamais un client tranquille.',
  };
  const diapos = diapos10Conformes.map((d, i) => (i === 3 ? diapoCitation : d));
  assert.doesNotThrow(() => validerDiapos(diapos));
});

test('refuse si la premiere diapo n\'a pas le role "hook"', () => {
  const diapos = diapos10Conformes.map((d, i) => (i === 0 ? { ...d, role: 'contenu' } : d));
  assert.throws(() => validerDiapos(diapos), /role "hook"/);
});

test('refuse si la diapo hook porte un texte de soutien', () => {
  const diapos = diapos10Conformes.map((d, i) => (i === 0 ? { ...d, texte: 'Ne devrait pas etre la.' } : d));
  assert.throws(() => validerDiapos(diapos), /accroche seule, sans texte de soutien/);
});

/**
 * Retour de Julien du 18/09/2026 (3 carrousels de reference : Theophile
 * Burnet, Sebastien Grillot, Benoit Dubos) : un seul mot/chiffre du titre en
 * couleur sur le hook, jamais tout le titre dans la meme teinte. Champ
 * "accent" obligatoire sur le hook -- voir lib/valider-diapos.js.
 */
test('refuse si la diapo hook n\'a pas de champ "accent"', () => {
  const diapos = diapos10Conformes.map((d, i) => {
    if (i !== 0) return d;
    const { accent, ...sansAccent } = d;
    return sansAccent;
  });
  assert.throws(() => validerDiapos(diapos), /champ "accent" non vide/);
});

test('refuse si le champ "accent" du hook n\'est pas une sous-chaine du titre', () => {
  const diapos = diapos10Conformes.map((d, i) => (i === 0 ? { ...d, accent: 'mot invente absent du titre' } : d));
  assert.throws(() => validerDiapos(diapos), /sous-chaine exacte de son "titre"/);
});
