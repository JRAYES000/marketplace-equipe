'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
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

/**
 * Depuis le 18/09/2026 : la couverture (mode "image seule", pas de document
 * feuilletable) n'est PLUS identique a diapo-01 du rendu par-diapo (mode
 * "carrousel", ou chaque image fait partie d'une serie a televerser toutes
 * ensemble). Incident reel qui a motive ce changement : premiere publication
 * image-seule pour julien-partners, fleche "Balayez" et numero "01" visibles
 * sans rien a balayer derriere -- repere de carrousel trompeur sur un post a
 * une seule image. Voir generer-pdf.js (injecterDiapo, parametre {{CONTEXTE}})
 * et templates/*.html (regle CSS `[data-contexte="image-seule"]`).
 */
test('couverture masque la fleche "Balayez" et le numero de page (contexte image-seule)', async () => {
  const dossierSortie = dossierTemporaire();
  try {
    const couverture = await genererImageCouverture({ compte: 'julien-partners', diapos, sortie: path.join(dossierSortie, 'couverture.png') });
    assert.ok(fs.existsSync(couverture.cheminSortie));
    // Rendu HTML direct (sans capture d'ecran) pour verifier la regle CSS
    // appliquee, plutot que d'inspecter des pixels.
    const { chargerGabarit, injecterDiapo } = require('../generer-pdf');
    const { entete, blocDiapo, pied } = chargerGabarit('julien-partners');
    const html = `${entete}${injecterDiapo(blocDiapo, diapos[0], 0, { contexte: 'image-seule' })}${pied}`;
    // Cible l'attribut sur la balise .slide elle-meme (pas la regle CSS du
    // <style>, qui contient aussi litteralement la chaine "image-seule").
    assert.match(html, /<div class="slide"[^>]*data-contexte="image-seule"/);
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

test('par-diapo et le PDF gardent le contexte "carrousel" par defaut (fleche + numero inchanges)', async () => {
  const { chargerGabarit, injecterDiapo } = require('../generer-pdf');
  const { entete, blocDiapo, pied } = chargerGabarit('julien-partners');
  const htmlParDiapo = `${entete}${injecterDiapo(blocDiapo, diapos[0], 0)}${pied}`;
  assert.match(htmlParDiapo, /<div class="slide"[^>]*data-contexte="carrousel"/);
  assert.doesNotMatch(htmlParDiapo, /<div class="slide"[^>]*data-contexte="image-seule"/);
});

/**
 * Second incident du 18/09/2026 : les trois gabarits masquent le logo Claude
 * Agency sur `[data-role="hook"]` (correct pour un vrai carrousel, ou le
 * logo apparait a partir de la page 2) -- mais `genererImageCouverture`
 * rendait justement la diapo hook telle quelle, donc sans logo, alors
 * qu'une couverture est une image UNIQUE (jamais de page 2 derriere).
 * Fix : `rendreDiapoEnPng` clone la diapo avec `role: 'contenu'` avant
 * rendu quand `forcerLogoVisible` est actif, uniquement pour le rendu --
 * le fichier de diapos source garde `role: "hook"` intact (voir
 * genererImageCouverture, qui utilise encore `d.role === 'hook'` pour
 * choisir l'index). Ce test verifie le HTML reellement rendu, pas des
 * pixels : `data-role` doit valoir "contenu" pour la couverture d'une
 * diapo hook, alors que le rendu par-diapo (mode carrousel reel) doit
 * garder "hook" intact sur cette meme diapo.
 */
test('la couverture force le logo visible (role "contenu" au rendu) meme sur une diapo hook', async () => {
  const { chargerGabarit, injecterDiapo } = require('../generer-pdf');
  const { entete, blocDiapo, pied } = chargerGabarit('julien-partners');

  const diapoHook = diapos.find((d) => d.role === 'hook') || diapos[0];
  assert.equal(diapoHook.role, 'hook', 'le fixture doit contenir une diapo hook pour que ce test soit probant');

  const htmlCouverture = `${entete}${injecterDiapo(blocDiapo, { ...diapoHook, role: 'contenu' }, 0, { contexte: 'image-seule' })}${pied}`;
  assert.match(htmlCouverture, /<div class="slide"[^>]*data-role="contenu"/);
  assert.doesNotMatch(htmlCouverture, /<div class="slide"[^>]*data-role="hook"/);

  // Le rendu par-diapo (vrai carrousel, plusieurs images) doit lui garder
  // le role reel "hook" sur cette meme diapo -- logo absent, fleche visible,
  // comportement inchange par ce fix.
  const htmlParDiapo = `${entete}${injecterDiapo(blocDiapo, diapoHook, 0)}${pied}`;
  assert.match(htmlParDiapo, /<div class="slide"[^>]*data-role="hook"/);
});

/**
 * Non-regression du 22/09/2026, demandee explicitement apres l'integration
 * du vrai logo (commit 9bbffeb) : le test precedent ne verifie que
 * l'attribut `data-role` du HTML source, jamais si l'element `.logo` qui en
 * depend est une vraie image chargee -- un fichier logo qui redeviendrait un
 * chemin relatif casse (au lieu du base64 attendu), ou qui serait retire par
 * erreur d'un gabarit, passerait inapercu par ce seul test. Celui-ci exerce
 * le VRAI chemin de code (`genererImageCouverture`, avec son
 * `forcerLogoVisible` interne), genere un PNG reel, puis rend independamment
 * le meme HTML que produirait ce chemin pour verifier que `.logo-img` est une
 * `<img>` avec des dimensions naturelles > 0 -- pas de texte residuel, pas
 * d'image cassee, sur une diapo dont le role source est "hook".
 *
 * Selecteur `.logo-img` depuis la refonte du 24/09/2026 (demande de Julien) :
 * julien-partners a son propre fichier logo et sa propre classe, voir
 * templates/julien-partners.html.
 */
test('genererImageCouverture affiche la vraie image du logo (pas de texte, pas d\'image cassee) quand forcerLogoVisible force le role "contenu" sur une diapo hook', async () => {
  const dossierSortie = dossierTemporaire();
  const cheminCouverture = path.join(dossierSortie, 'couverture-logo.png');
  try {
    const diapoHook = diapos.find((d) => d.role === 'hook') || diapos[0];
    assert.equal(diapoHook.role, 'hook', 'le fixture doit contenir une diapo hook pour que ce test soit probant');

    // Chemin de code reel : produit effectivement un PNG, sans planter.
    const resultat = await genererImageCouverture({ compte: 'julien-partners', diapos, sortie: cheminCouverture });
    assert.ok(fs.existsSync(resultat.cheminSortie));
    const { largeur, hauteur, tailleOctets } = lireDimensionsPng(resultat.cheminSortie);
    assert.equal(largeur, 1080);
    assert.equal(hauteur, 1350);
    assert.ok(tailleOctets > 5000, `couverture suspicieusement petite (${tailleOctets} octets)`);

    // Verification du contenu visuel reel : meme HTML que celui que
    // genererImageCouverture construit en interne (role force "contenu",
    // contexte "image-seule"), rendu independamment pour inspecter le DOM.
    const { chargerGabarit, injecterDiapo } = require('../generer-pdf');
    const { entete, blocDiapo, pied } = chargerGabarit('julien-partners');
    const html = `${entete}${injecterDiapo(blocDiapo, { ...diapoHook, role: 'contenu' }, 0, { contexte: 'image-seule' })}${pied}`;

    const navigateur = await chromium.launch();
    try {
      const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
      try {
        await page.setContent(html, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        const logo = page.locator('.logo-img');
        assert.ok(await logo.isVisible(), 'le logo devrait etre visible sur la couverture (role force "contenu")');

        const balise = await logo.evaluate((el) => el.tagName.toLowerCase());
        assert.equal(balise, 'img', `.logo-img devrait etre une balise <img>, recu : <${balise}>`);

        const texte = await logo.evaluate((el) => el.textContent.trim());
        assert.equal(texte, '', `.logo-img ne devrait contenir aucun texte residuel (ancien "Claude Partners"), recu : "${texte}"`);

        const { largeurNaturelle, hauteurNaturelle } = await logo.evaluate((el) => ({
          largeurNaturelle: el.naturalWidth,
          hauteurNaturelle: el.naturalHeight,
        }));
        assert.ok(
          largeurNaturelle > 0 && hauteurNaturelle > 0,
          `le logo de la couverture devrait reellement se charger, pas etre casse -- naturalWidth=${largeurNaturelle}, naturalHeight=${hauteurNaturelle}`
        );
      } finally {
        await page.close();
      }
    } finally {
      await navigateur.close();
    }
  } finally {
    fs.rmSync(dossierSortie, { recursive: true, force: true });
  }
});

/**
 * Trou de couverture trouve le 22/09/2026 en diagnostiquant un retour de
 * Julien ("aucun logo sur les 10 pages du carrousel julien-partners du
 * 17/09") : le bug ne s'est pas reproduit (logo bien present, source et
 * gabarit inchanges depuis), mais aucun test existant ne verifiait la
 * visibilite reelle du logo pour le mode `genererImagesParDiapo` -- seul
 * `genererImageCouverture` (mode image-seule) etait couvert. Une regression
 * future sur ce point (regle CSS `.logo` cassee, template qui oublie le
 * bloc `.logo`, injecterDiapo qui perd le role) serait donc passee inapercue
 * jusqu'a ce qu'un client la remarque -- exactement le scenario diagnostique.
 *
 * Rendu Playwright reel (comme le fait `genererImagesParDiapo`), verifie
 * avec `isVisible()` plutot qu'une simple presence dans le HTML source :
 * une regle CSS qui masquerait le logo par erreur laisserait l'element dans
 * le DOM mais invisible a l'ecran -- un test sur le HTML brut ne l'aurait
 * pas detecte.
 *
 * Mis a jour le 22/09/2026 : Julien a fourni le vrai logo Claude Agency
 * (etoile a 8 branches, terracotta) -- le bloc ".logo" (texte + petit carre
 * de couleur) qui repondait a son retour du 18/09/2026 n'etait jamais que le
 * NOM de la marque en texte stylise, pas un vrai logo. Ce test verifiait
 * jusque-la la presence du texte ("Claude Agency"/"Claude Partners"/"Claude")
 * -- il verifie desormais que le logo est une image (<img>) reellement
 * chargee (naturalWidth/naturalHeight > 0, pas une image cassee), pas la
 * presence d'un texte qui n'existe plus.
 *
 * Mis a jour le 24/09/2026 (refonte des 6 modeles de page, demande de
 * Julien) : julien-agency et julien-partners ont desormais chacun leur
 * propre fichier logo (plus un seul fichier partage par les 3 comptes) et
 * l'affichent sur classe `.logo-img` (dans un chip `.brandmark`), visible
 * sur TOUTE diapo -- y compris le hook, qui le masquait avant cette refonte
 * (retour explicite de Julien : "le logo doit etre visible en page 1 dans
 * le fil"). page-claude n'est pas touche par cette refonte (compte en
 * pause, voir SKILL.md) : il garde son ancien comportement, classe `.logo`,
 * masque sur le hook. Le test verifie donc les deux regles, une par
 * groupe de comptes -- ni l'ancienne ni la nouvelle regle n'est
 * "la bonne" dans l'absolu, chaque gabarit assume la sienne.
 */
test('le logo est visible et charge sur toute diapo pour julien-agency/julien-partners (page 1 comprise), et sur "contenu" seulement pour page-claude (compte inchange)', async () => {
  const { chargerGabarit, injecterDiapo } = require('../generer-pdf');
  const diapoHook = { role: 'hook', titre: 'Titre de test pour la diapo hook', accent: 'test' };
  const diapoContenu = { role: 'contenu', titre: 'Titre de test pour une diapo contenu', texte: 'Texte de test.' };

  // { compte, selecteur, logoVisibleSurHook } -- la seule chose qui varie
  // reellement entre les deux groupes de comptes (voir commentaire plus haut).
  const CAS = [
    { compte: 'julien-agency', selecteur: '.logo-img', logoVisibleSurHook: true },
    { compte: 'julien-partners', selecteur: '.logo-img', logoVisibleSurHook: true },
    { compte: 'page-claude', selecteur: '.logo', logoVisibleSurHook: false },
  ];

  const navigateur = await chromium.launch();
  try {
    for (const { compte, selecteur, logoVisibleSurHook } of CAS) {
      const { entete, blocDiapo, pied } = chargerGabarit(compte);

      for (const [role, diapo] of [['hook', diapoHook], ['contenu', diapoContenu]]) {
        const html = `${entete}${injecterDiapo(blocDiapo, diapo, 0)}${pied}`;
        const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
        try {
          await page.setContent(html, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          const logo = page.locator(selecteur);
          const estVisible = await logo.isVisible();
          const attendu = role === 'contenu' || logoVisibleSurHook;

          assert.equal(
            estVisible,
            attendu,
            `logo (${selecteur}) devrait etre ${attendu ? 'visible' : 'absent'} sur une diapo "${role}" (${compte})`
          );

          if (attendu) {
            const balise = await logo.evaluate((el) => el.tagName.toLowerCase());
            assert.equal(balise, 'img', `${selecteur} devrait etre une balise <img> (${compte}), recu : <${balise}>`);

            const { largeurNaturelle, hauteurNaturelle, srcCommenceParDataUri } = await logo.evaluate((el) => ({
              largeurNaturelle: el.naturalWidth,
              hauteurNaturelle: el.naturalHeight,
              srcCommenceParDataUri: el.getAttribute('src').startsWith('data:image/'),
            }));
            assert.ok(srcCommenceParDataUri, `${selecteur} doit etre embarque en base64 (data:image/...), pas un chemin relatif qui ne se resoudrait pas dans page.setContent() (${compte})`);
            assert.ok(
              largeurNaturelle > 0 && hauteurNaturelle > 0,
              `l'image du logo devrait reellement se charger, pas etre cassee (${compte}) -- naturalWidth=${largeurNaturelle}, naturalHeight=${hauteurNaturelle}`
            );
          }
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await navigateur.close();
  }
});
