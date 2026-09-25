'use strict';

/**
 * Verrouille les 3 corrections demandees par Nomena apres une troisieme
 * relecture du carrousel de test du 25/09/2026 (voir SKILL.md) :
 *   1. Mesure REELLE (Playwright) de l'espacement haut/bas -- rejoue la page
 *      5 qui debordait vraiment (titre qui touche le trait du haut, image
 *      qui descend jusqu'au pied de page).
 *   2. Appel a l'action "cta" : action concrete et faisable, jamais une
 *      demande d'engagement interdite ("commentez OUI").
 *   3. Chiffre qui prouve l'accroche -- rappel documente dans SKILL.md
 *      (aucun garde-fou automatisable sur la pertinence semantique).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const {
  chargerGabarit,
  injecterDiapo,
  validerEspacementReel,
  genererPdf,
} = require('../generer-pdf');
const { validerDiapos } = require('../lib/valider-diapos');

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

async function rendreEtMesurer(compte, diapo) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const html = `${entete}${injecterDiapo(blocDiapo, diapo, 4, { total: 7 })}${pied}`;
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await validerEspacementReel(page);
  } finally {
    await navigateur.close();
  }
}

// ---------- 1. Espacement reel -- rejoue la page 5 qui debordait ----------

test('validerEspacementReel refuse la page 5 telle qu\'elle debordait reellement (titre+3 items+image)', async () => {
  const diapoDebordante = {
    role: 'contenu',
    modele: 'checklist',
    titre: 'Comment repérer un processus qui s\'essouffle',
    items: [
      'Un délai de réponse qui s\'allonge chaque semaine',
      'Exemple : un candidat qui relance avant vous, signe d\'un vivier trop mince',
      'Activez votre réseau de recommandations avant d\'ouvrir un nouveau poste',
    ],
    image: 'a-publier/images/julien-partners-2026-09-25-reseau-noeud.jpg',
    imagePrompt: 'Illustration de reseau, pour le test.',
  };
  await assert.rejects(
    () => rendreEtMesurer('julien-agency', diapoDebordante),
    /(trait du haut|pied de page)/
  );
});

test('validerEspacementReel accepte la meme page une fois allegee (sans image, items raccourcis)', async () => {
  const diapoCorrigee = {
    role: 'contenu',
    modele: 'checklist',
    titre: 'Comment repérer un processus qui s\'essouffle',
    items: [
      'Un délai de réponse qui s\'allonge chaque semaine',
      'Exemple : un candidat qui relance avant vous',
      'Un vivier trop mince pour tenir la cadence',
    ],
  };
  await assert.doesNotReject(() => rendreEtMesurer('julien-agency', diapoCorrigee));
});

test('genererPdf refuse de bout en bout un carrousel dont une page deborde reellement', async () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'checklist',
    titre: 'Comment repérer un processus qui s\'essouffle',
    items: [
      'Un délai de réponse qui s\'allonge chaque semaine',
      'Exemple : un candidat qui relance avant vous, signe d\'un vivier trop mince',
      'Activez votre réseau de recommandations avant d\'ouvrir un nouveau poste',
    ],
    image: 'a-publier/images/julien-partners-2026-09-25-reseau-noeud.jpg',
    imagePrompt: 'Illustration de reseau, pour le test.',
  });
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const sortie = path.join(os.tmpdir(), `test-debordement-${Date.now()}.pdf`);
  await assert.rejects(
    () => genererPdf({ compte: 'julien-agency', diapos, sortie }),
    /(trait du haut|pied de page)/
  );
  assert.ok(!fs.existsSync(sortie), 'un PDF a ete ecrit sur disque alors que la mesure d\'espacement aurait du refuser avant tout rendu final');
});

// ---------- 2. CTA : action concrete, jamais une demande d'engagement ----------

test('validerDiapos refuse un cta avec une demande d\'engagement interdite ("commentez OUI")', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'cta',
    titre: 'Passez à l\'action',
    texte: 'Commentez OUI si vous voulez la checklist complète.',
    bouton: 'Je participe',
  });
  assert.throws(() => validerDiapos(diapos), /formulation interdite/);
});

test('validerDiapos accepte un cta avec une action concrete et faisable ("Ecrivez-moi ... en message prive")', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    modele: 'cta',
    titre: 'Passez à l\'action cette semaine',
    texte: 'Écrivez-moi « recrutement » en message privé, je vous partage la checklist complète.',
    bouton: 'Écrivez-moi « recrutement »',
  });
  assert.doesNotThrow(() => validerDiapos(diapos));
});

test('validerDiapos n\'applique la banque de formulations interdites qu\'au modele "cta" (pas de faux positif ailleurs)', () => {
  const diapos = carrouselMinimal({
    role: 'contenu',
    titre: 'Un vrai constat',
    texte: 'Commentez OUI ne fait pas partie de ce texte -- mais un tiret cadratin — si, sur un modele non-cta.',
  });
  // "modele" absent -> "accroche", jamais verifie par validerCtaSansEngagement.
  // Le tiret cadratin dans ce texte ne doit PAS declencher ce garde-fou
  // (il ne s'applique qu'au modele "cta"), meme s'il violerait la regle sur
  // un vrai cta.
  assert.doesNotThrow(() => validerDiapos(diapos));
});

// ---------- 3. Le chiffre doit prouver l'accroche ----------

test('rappel : la regle "le chiffre doit prouver l\'accroche" est documentee dans SKILL.md', () => {
  const fs = require('fs');
  const path = require('path');
  const skill = fs.readFileSync(path.join(__dirname, '..', 'SKILL.md'), 'utf-8');
  assert.match(skill, /prouve|prouver/i, 'la regle liant le chiffre a l\'accroche n\'est pas documentee dans SKILL.md');
});
