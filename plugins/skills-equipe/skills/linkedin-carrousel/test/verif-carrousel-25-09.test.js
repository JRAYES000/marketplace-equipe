'use strict';

/**
 * Verrouille les 4 corrections demandees par Nomena apres verification page
 * par page du carrousel de test du 25/09/2026 (voir SKILL.md, section
 * "Verification du carrousel de test (25/09/2026, deuxieme relecture)") :
 *   1. Citation attribuee sans source reelle -> jamais d'attribution affichee.
 *   2. Chiffre affiche sans champ "source" -> refuse.
 *   3. Texte de corps unifie (gris/taille) sur tous les modeles.
 *   4. "Un seul fil" -- regle documentee dans SKILL.md (pas de garde-fou
 *      automatisable, voir plus bas pourquoi).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { validerDiapos } = require('../lib/valider-diapos');
const { chargerGabarit, injecterDiapo } = require('../generer-pdf');
const { champsVisibles } = require('../lib/modeles');

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

// ---------- 1. Citation attribuee sans source reelle ----------

test('une citation avec "auteur" mais sans "citationSource" n\'affiche AUCUNE attribution au rendu', async () => {
  const diapo = {
    role: 'contenu',
    modele: 'citation',
    citation: 'Un recrutement qui traine ne se rattrape jamais sur le salaire propose.',
    auteur: 'Julien Rayes, Claude Agency',
  };
  const { entete, blocDiapo, pied } = chargerGabarit('julien-agency');
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 6 })}${pied}`;
  // "Julien Rayes" apparait aussi dans la signature fixe du pied de page
  // (l'auteur du post, pas l'attribution de la citation) -- on verifie donc
  // specifiquement l'absence du tiret cadratin d'attribution + le champ
  // "auteur" complet de la citation, pas une simple recherche du nom seul.
  assert.ok(!html.includes('— Julien Rayes, Claude Agency'), 'l\'attribution de la citation apparait dans le rendu alors qu\'aucune citationSource n\'a ete fournie -- propos non prouve attribue quand meme');
});

test('une citation avec "auteur" ET "citationSource" affiche bien l\'attribution', async () => {
  const diapo = {
    role: 'contenu',
    modele: 'citation',
    citation: 'Un recrutement qui traine ne se rattrape jamais sur le salaire propose.',
    auteur: 'Julien Rayes, Claude Agency',
    citationSource: 'https://www.linkedin.com/feed/update/urn:li:activity:0000000000000000000/',
  };
  const { entete, blocDiapo, pied } = chargerGabarit('julien-agency');
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 6 })}${pied}`;
  assert.ok(html.includes('Julien Rayes'), 'l\'attribution n\'apparait pas alors qu\'une citationSource reelle a ete fournie');
});

test('champsVisibles ne compte "auteur" que si "citationSource" est fourni (le compte de mots suit ce qui est reellement affiche)', () => {
  const sansSource = champsVisibles({ citation: 'Test.', auteur: 'Quelqu\'un' }, 'citation');
  assert.deepEqual(sansSource, ['Test.', null]);
  const avecSource = champsVisibles({ citation: 'Test.', auteur: 'Quelqu\'un', citationSource: 'https://exemple.test' }, 'citation');
  assert.deepEqual(avecSource, ['Test.', 'Quelqu\'un']);
});

test('validerDiapos accepte une citation attribuee avec une citationSource reelle', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'citation',
    citation: 'Un recrutement qui traine ne se rattrape jamais sur le salaire propose.',
    auteur: 'Julien Rayes',
    citationSource: 'https://www.linkedin.com/feed/update/urn:li:activity:0000000000000000000/',
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

// ---------- 2. Source visible pour tout chiffre affiche ----------

test('validerDiapos refuse un pourcentage affiche sans champ "source"', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'gros-chiffre',
    titre: 'Un ecart mesure',
    chiffre: '4,9%',
    texte: 'Des offres abandonnees faute de candidats en 2025.',
  });
  assert.throws(() => validerDiapos(diapos), /aucun champ "source"/);
});

test('validerDiapos refuse un multiplicateur ("3x") affiche sans champ "source"', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Un poste vacant qui traîne',
    texte: 'Un poste vacant coûte 3x plus cher au bout de deux mois.',
  });
  assert.throws(() => validerDiapos(diapos), /aucun champ "source"/);
});

test('validerDiapos accepte un pourcentage affiche avec un champ "source" non vide', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'gros-chiffre',
    titre: 'Un ecart mesure',
    chiffre: '4,9%',
    texte: 'Des offres abandonnees faute de candidats en 2025.',
    source: 'France Travail, 21/04/2026',
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

test('validerDiapos n\'exige aucune source sur un simple compte ("trois signaux"), ce n\'est pas un chiffre-preuve', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'checklist',
    titre: 'Trois signaux a surveiller',
    items: ['Un premier signal', 'Un deuxieme signal', 'Un troisieme signal'],
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

for (const compte of ['julien-agency', 'julien-partners']) {
  test(`${compte} -- la ligne "Source : ..." est rendue en bas de page quand "source" est fourni`, async () => {
    const diapo = {
      role: 'contenu', modele: 'gros-chiffre', titre: 'Titre', chiffre: '4,9%', texte: 'Texte.',
      source: 'France Travail, 21/04/2026',
    };
    const { entete, blocDiapo, pied } = chargerGabarit(compte);
    const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 6 })}${pied}`;
    assert.ok(html.includes('Source : France Travail, 21/04/2026'), 'la ligne de source ne figure pas dans le HTML rendu');
  });

  test(`${compte} -- la ligne source reste vide (et invisible) quand "source" est absent`, async () => {
    const diapo = { role: 'contenu', titre: 'Titre', texte: 'Texte sans aucun chiffre.' };
    const { entete, blocDiapo, pied } = chargerGabarit(compte);
    const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 6 })}${pied}`;
    const navigateur = await chromium.launch();
    try {
      const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
      await page.setContent(html, { waitUntil: 'load' });
      const affichee = await page.$eval('.source-ligne', (el) => getComputedStyle(el).display);
      assert.equal(affichee, 'none', '.source-ligne reste visible alors qu\'aucune source n\'a ete fournie');
    } finally {
      await navigateur.close();
    }
  });
}

// ---------- 3. Texte de corps unifie sur tous les modeles ----------

for (const compte of ['julien-agency', 'julien-partners']) {
  test(`${compte} -- le texte de corps (.body-text, modele "accroche"/contenu) mesure desormais >= 46px, meme gris que les pages "gros-chiffre"`, async () => {
    const diapo = { role: 'contenu', titre: 'Titre', texte: 'Un texte de corps de mesure, assez long pour occuper plusieurs lignes.' };
    const { entete, blocDiapo, pied } = chargerGabarit(compte);
    const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 6 })}${pied}`;
    const navigateur = await chromium.launch();
    try {
      const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const taille = await page.$eval('.body-text', (el) => parseFloat(getComputedStyle(el).fontSize));
      const couleurTexte = await page.$eval('.body-text', (el) => getComputedStyle(el).color);
      const couleurMutedRgb = await page.evaluate(() => {
        const span = document.createElement('span');
        span.style.color = 'var(--muted)';
        document.body.appendChild(span);
        const rgb = getComputedStyle(span).color;
        span.remove();
        return rgb;
      });
      assert.ok(taille >= 46, `texte de corps mesure ${taille}px, attendu >= 46px (ancien format : 42px)`);
      assert.notEqual(couleurTexte, couleurMutedRgb, 'le texte de corps utilise encore l\'ancien gris dilue (--muted), pas le meme encre que les pages "gros-chiffre"');
    } finally {
      await navigateur.close();
    }
  });

  test(`${compte} -- une page de contenu simple reste verticalement centree (deja vrai via .content, non-regression)`, async () => {
    const diapo = { role: 'contenu', titre: 'Titre court', texte: 'Texte court.' };
    const { entete, blocDiapo, pied } = chargerGabarit(compte);
    const html = `${entete}${injecterDiapo(blocDiapo, diapo, 1, { total: 6 })}${pied}`;
    const navigateur = await chromium.launch();
    try {
      const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
      await page.setContent(html, { waitUntil: 'load' });
      const justify = await page.$eval('.content', (el) => getComputedStyle(el).justifyContent);
      assert.equal(justify, 'center', '.content n\'est plus centre verticalement -- une page a texte court se lira collee en haut ou en bas');
    } finally {
      await navigateur.close();
    }
  });
}

// ---------- 4. "Un seul fil" -- regle documentee, pas de garde-fou automatisable ----------

test('rappel : "un seul fil" est documente dans SKILL.md (limite assumee, jugement editorial requis)', () => {
  const fs = require('fs');
  const path = require('path');
  const skill = fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf-8');
  assert.match(skill, /[Uu]n seul fil/, 'la regle "un seul fil" n\'est pas documentee dans SKILL.md');
});
