#!/usr/bin/env node
'use strict';

/**
 * Genere un carrousel LinkedIn (PDF multi-page) a partir d'un des 3 templates
 * HTML de templates/ et d'une liste ordonnee de diapos.
 *
 * Usage CLI :
 *   node generer-pdf.js <compte> <fichier-diapos.json> [sortie.pdf]
 *
 * <compte>            : page-claude | julien-agency | julien-partners
 * <fichier-diapos.json> : [{ "role": "hook"|"contenu", "modele": "...", "titre": "...", "texte": "...", "accent": "..." }, ...]
 *   - "role" absent ou different de "hook" => "contenu"
 *   - "texte" optionnel (la diapo hook n'en a generalement pas)
 *   - "accent" obligatoire sur le hook (retour de Julien du 18/09/2026, voir
 *     SKILL.md) : sous-chaine exacte du "titre" a mettre en couleur au rendu
 *     (lib/valider-diapos.js le refuse sinon). Ignore sur les diapos "contenu".
 *   - "modele" optionnel (refonte du 24/09/2026, demande de Julien) : un des
 *     6 gabarits de page -- voir "Modeles de page" plus bas. Absent =>
 *     "accroche" si role "hook", sinon rendu generique titre+texte (comme
 *     avant cette refonte).
 * [sortie.pdf]         : chemin de sortie explicite ; sinon nom genere automatiquement
 *                        (convention ci-dessous).
 *
 * -----------------------------------------------------------------------
 * MODELES DE PAGE (refonte du 24/09/2026, demande de Julien -- SKILL.md)
 * -----------------------------------------------------------------------
 * Champ "modele" d'une diapo, un des 6 :
 *   - "accroche"     : gabarit historique (titre seul en grand sur le hook,
 *                      ou titre+texte en page de contenu). Fond contraste
 *                      (plein terracotta fonce) uniquement sur le hook.
 *   - "gros-chiffre" : { chiffre: "3x", titre: "...", texte: "..." } -- un
 *                      chiffre/statistique en tres grand, titre en eyebrow
 *                      au-dessus, texte en legende en-dessous.
 *   - "comparaison"  : { titre, colonneGauche: { titre, items: [] },
 *                      colonneDroite: { titre, items: [] } } -- deux
 *                      colonnes cote a cote.
 *   - "checklist"    : { titre, items: [] } -- une liste a puces cochees.
 *   - "citation"     : { citation, auteur, citationSource } -- une citation
 *                      en grand. "auteur" ne s'affiche QUE si "citationSource"
 *                      est aussi fourni (URL du post ou document reel ou la
 *                      citation apparait mot pour mot) -- sans lui, aucune
 *                      attribution n'est rendue, jamais de propos prete a
 *                      quelqu'un sans preuve (retour de Julien, 25/09/2026).
 *   - "cta"          : { titre, texte, bouton } -- appel a l'action unique,
 *                      fond contraste comme le hook (page de fermeture).
 *
 * Sur n'importe quel modele, un champ "source" optionnel : affiche en petit
 * en bas de page ("Source : ..."). OBLIGATOIRE des qu'un chiffre-preuve
 * (pourcentage ou multiplicateur, ex. "4,9%", "3x") apparait dans un champ
 * visible de la diapo -- refuse sinon par lib/valider-diapos.js
 * (validerSourceChiffre, retour de Julien du 25/09/2026).
 *
 * Sur n'importe quel modele, un emplacement image optionnel :
 *   - "image": "chemin/vers/fichier.png|jpg" -- image reelle (generee par
 *     fal.ai), inseree telle quelle.
 *   - "imageEmplacement": true -- pas encore d'image reelle : affiche un
 *     encadre en pointilles signalant clairement l'emplacement prevu,
 *     jamais un vide silencieux.
 *
 * -----------------------------------------------------------------------
 * CONVENTION DE NOMMAGE DES FICHIERS DE SORTIE (brief Julien du 10/09/2026)
 * -----------------------------------------------------------------------
 *   sortants/<compte>/<Titre lisible en francais>.pdf
 *
 * LinkedIn affiche ce nom de fichier sous le post : il doit donc se lire
 * comme un vrai titre, PAS comme un identifiant technique. D'ou, contrairement
 * a l'ancienne convention (date + slug) :
 *   - PAS de date en prefixe.
 *   - PAS de numero.
 *   - Casse et accents du titre conserves (ce n'est pas un slug d'URL).
 *   - Espaces conserves entre les mots.
 *   - <compte> reste un SOUS-DOSSIER (jamais un prefixe du nom de fichier).
 *
 *   - <compte>            : le meme identifiant que le parametre CLI
 *                           (page-claude, julien-agency, julien-partners).
 *   - <Titre lisible ...> : derive du titre de la premiere diapo de role
 *                           "hook" (a defaut, la toute premiere diapo) :
 *                           seuls les caracteres interdits dans un nom de
 *                           fichier (/ \ : * ? " < > | et retour a la ligne)
 *                           sont remplaces par un espace, espaces multiples
 *                           fusionnes, tronque a 80 caracteres sans couper
 *                           un mot en deux.
 *
 * Anti-collision (cas limite, pas la norme) : si deux diapos ont exactement
 * le meme titre pour le meme compte, " (2)", " (3)"... est ajoute -- jamais
 * de simple numero colle au titre, pour rester lisible si jamais affiche.
 * Un fichier existant n'est JAMAIS ecrase silencieusement.
 * -----------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { validerDiapos } = require('./lib/valider-diapos');
const { dataUriDepuisAsset, dataUriDepuisChemin } = require('./lib/assets');

const SKILL_DIR = __dirname;
const TEMPLATES_DIR = path.join(SKILL_DIR, 'templates');
const SORTANTS_DIR = path.join(SKILL_DIR, 'sortants');

const TEMPLATE_PAR_COMPTE = {
  'page-claude': 'page-claude.html',
  'julien-agency': 'julien-agency.html',
  'julien-partners': 'julien-partners.html',
};

// Refonte du 24/09/2026 : logo reel par marque (plus le meme fichier partage
// pour les 3 comptes) -- Claude Agency a un soleil a 8 branches (soleil,
// assets/logo-claude-agency-512.png, 512x512, fourni par le depot du site
// JRAYES000/CLAUDEAGENCY), Claude Partners une medaille/coche (SVG vectoriel,
// relevee reellement sur claudepartners.fr, voir assets/logo-claude-partners.svg).
// page-claude n'est pas touche par cette refonte (compte en pause, voir SKILL.md).
const LOGO_FICHIER_PAR_COMPTE = {
  'julien-agency': 'logo-claude-agency-512.png',
  'julien-partners': 'logo-claude-partners.svg',
};

const NOM_MARQUE_PAR_COMPTE = {
  'julien-agency': 'Claude Agency',
  'julien-partners': 'Claude Partners',
};

// Photo de Julien Rayes, partagee par les deux comptes (c'est lui l'auteur
// des deux). Fichier unique et facile a remplacer : au 24/09/2026 c'est une
// capture d'ecran de son profil LinkedIn (~362x389px, pas le fichier
// original) -- suffisant pour un medaillon <=240px de large, pas plus. Des
// que Julien fournit le fichier original, le remplacer SOUS CE MEME NOM ne
// demande aucun changement de template ni de code.
const PHOTO_FICHIER = 'photo-julien-rayes.png';

const POLICE_BRICOLAGE = 'fonts/bricolage-grotesque-variable.woff2';
const POLICE_SCHIBSTED = 'fonts/schibsted-grotesk-variable.woff2';

const { resoudreModele } = require('./lib/modeles');

const MARQUEUR_DEBUT = '<!-- SLIDE:BEGIN -->';
const MARQUEUR_FIN = '<!-- SLIDE:END -->';

function echapperHtml(texte) {
  return String(texte)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Retour de Julien du 18/09/2026 (3 carrousels de reference) : un seul
 * mot/chiffre du titre en couleur, jamais tout le titre dans la meme teinte.
 * `accent` est verifie ailleurs (lib/valider-diapos.js) comme sous-chaine
 * exacte du titre pour tout hook -- ici on se contente d'echouer proprement
 * (repli sur le titre entier, sans span) si ce n'est pas le cas, plutot que
 * de dupliquer ce controle : ce module ne fait que du rendu.
 */
function titreAvecAccent(titre, accent) {
  const texte = String(titre || '');
  const segment = String(accent || '');
  const index = segment ? texte.indexOf(segment) : -1;
  if (index === -1) {
    return echapperHtml(texte);
  }
  const avant = texte.slice(0, index);
  const milieu = texte.slice(index, index + segment.length);
  const apres = texte.slice(index + segment.length);
  return `${echapperHtml(avant)}<span class="accent-mot">${echapperHtml(milieu)}</span>${echapperHtml(apres)}`;
}

/**
 * Une <li> par element d'une liste (checklist, colonne de comparaison).
 * Tableau absent/invalide -> liste vide (jamais une exception ici, la forme
 * du contenu n'est pas le role de ce module de rendu).
 */
function listeHtml(items, classeLi) {
  if (!Array.isArray(items)) return '';
  return items.map((item) => `<li class="${classeLi}">${echapperHtml(item)}</li>`).join('');
}

/**
 * Emplacement image optionnel (brief du 24/09/2026 : 1 a 3 images generees
 * par fal.ai par carrousel, acces en cours de demande au 24/09). Trois cas :
 *   - `diapo.image` fourni -> image reelle, inseree en data URI.
 *   - `diapo.imageEmplacement` vrai -> encadre en pointilles, signale
 *     explicitement comme en attente (jamais un vide silencieux).
 *   - ni l'un ni l'autre -> chaine vide, aucun emplacement reserve.
 */
/**
 * Ligne de source discrete en bas de page (retour de Julien par mail,
 * 25/09/2026, verification du carrousel de test) : toute page qui affiche un
 * chiffre-preuve montre sa source en petit en bas de page (organisme,
 * annee) -- exige par `lib/valider-diapos.js` (`validerSourceChiffre`) avant
 * meme d'arriver ici. Chaine vide si `diapo.source` est absent (page sans
 * chiffre-preuve) -- CSS `.source-ligne:empty` la masque completement,
 * jamais un espace reserve pour rien.
 */
function blocSourceLigne(diapo) {
  if (!diapo.source) return '';
  return `Source : ${echapperHtml(diapo.source)}`;
}

function blocImage(diapo) {
  if (diapo.image) {
    const uri = dataUriDepuisChemin(diapo.image);
    return `<div class="image-slot"><img src="${uri}" alt=""></div>`;
  }
  if (diapo.imageEmplacement) {
    return (
      '<div class="image-slot image-slot--vide"><span>Emplacement image IA (fal.ai)' +
      ' — à générer</span></div>'
    );
  }
  return '';
}

function chargerGabarit(compte) {
  const fichier = TEMPLATE_PAR_COMPTE[compte];
  if (!fichier) {
    throw new Error(
      `Compte inconnu : "${compte}". Attendu : ${Object.keys(TEMPLATE_PAR_COMPTE).join(', ')}`
    );
  }
  const cheminTemplate = path.join(TEMPLATES_DIR, fichier);
  let html = fs.readFileSync(cheminTemplate, 'utf-8');

  // Refonte du 24/09/2026 : polices, logo et photo ne sont plus bakes a la
  // main dans le HTML source (illisible, impossible a remplacer sans
  // regenerer un base64) -- ils sont injectes ici, a partir de vrais
  // fichiers sous assets/ (voir lib/assets.js). Un template qui ne contient
  // pas un de ces marqueurs (page-claude.html, non touche par cette
  // refonte) n'est pas affecte : replaceAll sur une chaine absente ne fait
  // rien.
  html = html
    .replaceAll('{{FONT_BRICOLAGE_DATAURI}}', dataUriDepuisAsset(POLICE_BRICOLAGE))
    .replaceAll('{{FONT_SCHIBSTED_DATAURI}}', dataUriDepuisAsset(POLICE_SCHIBSTED))
    .replaceAll('{{PHOTO_DATAURI}}', dataUriDepuisAsset(PHOTO_FICHIER))
    .replaceAll('{{NOM_MARQUE}}', NOM_MARQUE_PAR_COMPTE[compte] || '');

  const logoFichier = LOGO_FICHIER_PAR_COMPTE[compte];
  if (logoFichier) {
    html = html.replaceAll('{{LOGO_DATAURI}}', dataUriDepuisAsset(logoFichier));
  }

  const debut = html.indexOf(MARQUEUR_DEBUT);
  const fin = html.indexOf(MARQUEUR_FIN);
  if (debut === -1 || fin === -1) {
    throw new Error(
      `Marqueurs ${MARQUEUR_DEBUT} / ${MARQUEUR_FIN} introuvables dans ${cheminTemplate}`
    );
  }

  return {
    entete: html.slice(0, debut),
    blocDiapo: html.slice(debut + MARQUEUR_DEBUT.length, fin),
    pied: html.slice(fin + MARQUEUR_FIN.length),
  };
}

/**
 * `contexte` : "carrousel" (defaut, flèche + numero visibles -- PDF multi-pages
 * et rendu par-diapo, inchange) ou "image-seule" (masque flèche "Balayez" et
 * numero de page, reperes qui n'ont pas de sens sans document feuilletable --
 * voir generer-images.js, genererImageCouverture). Parametre explicite,
 * jamais devine depuis le nombre de diapos.
 */
function injecterDiapo(blocDiapo, diapo, index, { contexte = 'carrousel', total } = {}) {
  // Format "3/10" (retour de Julien du 24/09/2026 : "01" cite parmi les
  // defauts du dessin -- trop technique/pesant pour un numero de page).
  // `total` doit venir de l'appelant (construireDocument, generer-images.js) --
  // sans lui, on suppose que cette diapo est la derniere de son propre
  // carrousel (repli sur `index + 1`, jamais un "undefined" affiche).
  const numero = `${index + 1}/${total || index + 1}`;
  // Bug trouve le 18/09/2026 en production reelle (premier post de veille genere
  // avec ce mecanisme) : genererImageCouverture clone TOUJOURS la diapo avec
  // role: 'contenu' (voir rendreDiapoEnPng, forcerLogoVisible) pour afficher le
  // logo -- une condition sur `diapo.role === 'hook'` ici desactivait donc
  // silencieusement l'accent sur CHAQUE image "couverture", le cas d'usage
  // principal pour lequel l'accent a ete construit. Le champ `accent` est deja
  // le signal explicite et suffisant (valide comme obligatoire sur le hook par
  // lib/valider-diapos.js) -- inutile et dangereux de le recroiser avec `role`.
  const titreHtml = diapo.accent
    ? titreAvecAccent(diapo.titre, diapo.accent)
    : echapperHtml(diapo.titre || '');

  // Modele de page (refonte du 24/09/2026, voir lib/modeles.js -- source
  // unique de verite, partagee avec lib/valider-diapos.js pour que rendu et
  // comptage de mots s'accordent toujours sur "ce qui s'affiche vraiment").
  const modele = resoudreModele(diapo);

  const colonneGauche = diapo.colonneGauche || {};
  const colonneDroite = diapo.colonneDroite || {};

  return blocDiapo
    .replaceAll('{{TITRE}}', titreHtml)
    .replaceAll('{{TEXTE}}', echapperHtml(diapo.texte || ''))
    .replaceAll('{{NUMERO}}', numero)
    .replaceAll('{{ROLE}}', diapo.role === 'hook' ? 'hook' : 'contenu')
    .replaceAll('{{CONTEXTE}}', contexte)
    .replaceAll('{{MODELE}}', modele)
    .replaceAll('{{CHIFFRE}}', echapperHtml(diapo.chiffre || ''))
    .replaceAll('{{COMP_GAUCHE_TITRE}}', echapperHtml(colonneGauche.titre || ''))
    .replaceAll('{{COMP_GAUCHE_ITEMS}}', listeHtml(colonneGauche.items, 'comp-item'))
    .replaceAll('{{COMP_DROITE_TITRE}}', echapperHtml(colonneDroite.titre || ''))
    .replaceAll('{{COMP_DROITE_ITEMS}}', listeHtml(colonneDroite.items, 'comp-item'))
    .replaceAll('{{CHECKLIST_ITEMS}}', listeHtml(diapo.items, 'checklist-item'))
    .replaceAll('{{CITATION}}', echapperHtml(diapo.citation || ''))
    // Le tiret cadratin ne fait plus partie du gabarit statique (voir
    // templates/*.html, .citation-auteur) : sans auteur, la ligne doit
    // disparaitre entierement (:empty), pas laisser un "— " orphelin.
    // Retour de Julien par mail (25/09/2026, verification du carrousel de
    // test) : la page 5 attribuait a "Julien Rayes" une phrase qu'il n'a
    // jamais publiee -- incident reel. Une citation attribuee exige
    // desormais un champ "citationSource" (URL du post ou document reel ou
    // elle apparait mot pour mot) ; sans lui, l'attribution ne s'affiche
    // JAMAIS, quel que soit le contenu de "auteur" -- la citation retombe
    // silencieusement sur un propos editorial general (deja un usage
    // autorise du modele "citation", voir SKILL.md). Jamais de propos prete
    // a quelqu'un sans son texte reel.
    .replaceAll('{{CITATION_AUTEUR}}', (diapo.auteur && diapo.citationSource) ? `— ${echapperHtml(diapo.auteur)}` : '')
    .replaceAll('{{CTA_BOUTON}}', echapperHtml(diapo.bouton || ''))
    .replaceAll('{{IMAGE_BLOC}}', blocImage(diapo))
    .replaceAll('{{SOURCE_LIGNE}}', blocSourceLigne(diapo));
}

function construireDocument(compte, diapos) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const diapositives = diapos
    .map((diapo, index) => injecterDiapo(blocDiapo, diapo, index, { total: diapos.length }))
    .join('\n');
  return `${entete}${diapositives}${pied}`;
}

const TITRE_LONGUEUR_MAX = 80;
const CARACTERES_INTERDITS = /[\\/:*?"<>|\r\n]+/g;

/**
 * Retire le(s) point(s) final(aux) d'un titre, avec les espaces qui les
 * suivraient. Bug reel trouve le 25/09/2026 : un titre de diapo hook qui se
 * termine deja par une phrase complete ("...Voici pourquoi.") produisait un
 * nom de fichier "...pourquoi..pdf" (double point) une fois l'extension
 * ajoutee -- jamais retire avant. Partagee avec `publierDocumentZernio`
 * (lib/publier-zernio.js) : meme defaut possible sur le `documentTitle`
 * envoye a Zernio, meme si aucune extension ne lui est accolee ensuite --
 * mieux vaut une seule fonction, jamais deux endroits a corriger separement.
 */
function retirerPointFinal(texte) {
  return String(texte || '').replace(/\.+\s*$/, '').trimEnd();
}

/**
 * Derive un nom de fichier lisible en francais a partir d'un titre de diapo :
 * casse et accents conserves (ce n'est PAS un slug d'URL), seuls les
 * caracteres interdits dans un nom de fichier sont retires, espaces
 * multiples fusionnes, tronque a 80 caracteres sans couper un mot en deux,
 * point final retire (voir retirerPointFinal -- sinon "Titre..pdf").
 */
function nomFichierDepuisTitre(texte, longueurMax = TITRE_LONGUEUR_MAX) {
  let titre = String(texte || '')
    .replace(CARACTERES_INTERDITS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (titre.length > longueurMax) {
    const tronque = titre.slice(0, longueurMax);
    const dernierEspace = tronque.lastIndexOf(' ');
    // ne pas couper un mot en deux : reculer jusqu'au dernier espace complet,
    // sauf s'il est trop tot (perte de plus de la moitie du texte utile)
    titre = dernierEspace > longueurMax * 0.5 ? tronque.slice(0, dernierEspace) : tronque;
  }

  titre = retirerPointFinal(titre);

  return titre || 'Sans titre';
}

function titreDepuisDiapos(diapos) {
  const diapoHook = diapos.find((d) => d.role === 'hook') || diapos[0];
  return nomFichierDepuisTitre(diapoHook && diapoHook.titre);
}

/**
 * Calcule un chemin de sortie sortants/<compte>/<Titre lisible>[ (N)].pdf qui
 * ne collisionne jamais avec un fichier deja present : ajoute " (2)", " (3)"...
 * tant que le nom est deja pris (cas limite -- pas de date, pas de numero par
 * defaut, comme l'exige le brief). N'ecrase jamais silencieusement.
 */
function cheminSortieParDefaut(compte, diapos) {
  const dossierCompte = path.join(SORTANTS_DIR, compte);
  fs.mkdirSync(dossierCompte, { recursive: true });

  const base = titreDepuisDiapos(diapos);
  let candidat = path.join(dossierCompte, `${base}.pdf`);
  let n = 2;
  while (fs.existsSync(candidat)) {
    candidat = path.join(dossierCompte, `${base} (${n}).pdf`);
    n += 1;
  }
  return candidat;
}

// Retour de Julien par mail (25/09/2026, verification du carrousel de test) :
// page 5 debordait reellement -- titre qui touche le trait decoratif du haut
// (defaut deja signale le 25/09/2026, jamais entierement corrige : la
// reduction de .image-slot a 380px suffisait pour LE carrousel de l'epoque,
// pas pour un contenu plus charge) ET image qui descend jusqu'au pied de
// page. Aucun garde-fou avant genererDiapos ne peut le detecter (ca depend
// de la police reellement rendue, de la longueur du texte ET de la presence
// d'une image -- une combinaison que le compte de mots/caracteres ne capture
// pas). Mesure REELLE apres rendu Playwright, sur le DOM tel qu'il sera
// imprime : ecart entre le trait decoratif du haut (.accent-rule) et le
// premier element visible du contenu, et entre le dernier element visible et
// le pied de page (.footer-wrap). Refuse explicitement si l'une des deux
// mesures est sous le minimum -- jamais un PDF genere silencieusement en
// deborde.
const ESPACE_HAUT_MIN_PX = 32;
const ESPACE_BAS_MIN_PX = 24;

async function validerEspacementReel(page) {
  const mesures = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.slide')).map((slide) => {
      const accentRule = slide.querySelector('.accent-rule');
      const content = slide.querySelector('.content');
      const footerWrap = slide.querySelector('.footer-wrap');
      if (!accentRule || !content || !footerWrap) return null;
      const visible = Array.from(content.children).find(
        (el) => getComputedStyle(el).display !== 'none'
      );
      if (!visible) return null;
      const rAccent = accentRule.getBoundingClientRect();
      const rVisible = visible.getBoundingClientRect();
      const rFooter = footerWrap.getBoundingClientRect();
      return {
        modele: slide.getAttribute('data-modele') || '',
        numero: slide.querySelector('.pagenum') ? slide.querySelector('.pagenum').textContent : '',
        ecartHaut: rVisible.top - rAccent.bottom,
        ecartBas: rFooter.top - rVisible.bottom,
      };
    });
  });

  mesures.forEach((mesure, index) => {
    if (!mesure) return;
    const repere = mesure.numero ? `diapo ${mesure.numero}` : `diapo n°${index + 1}`;
    if (mesure.ecartHaut < ESPACE_HAUT_MIN_PX) {
      throw new Error(
        `Carrousel refuse : ${repere} (modele "${mesure.modele}") -- ${mesure.ecartHaut.toFixed(1)}px ` +
        `entre le trait du haut et le premier element, minimum ${ESPACE_HAUT_MIN_PX}px. Le contenu ` +
        'touche le trait decoratif -- reduisez le texte ou deplacez l\'image sur une page moins chargee.'
      );
    }
    if (mesure.ecartBas < ESPACE_BAS_MIN_PX) {
      throw new Error(
        `Carrousel refuse : ${repere} (modele "${mesure.modele}") -- ${mesure.ecartBas.toFixed(1)}px ` +
        `entre le dernier element et le pied de page, minimum ${ESPACE_BAS_MIN_PX}px. Le contenu ` +
        'deborde vers le bas -- reduisez le texte ou deplacez l\'image sur une page moins chargee.'
      );
    }
  });
}

async function genererPdf({ compte, diapos, sortie }) {
  validerDiapos(diapos);
  const html = construireDocument(compte, diapos);

  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    // Attendre que les polices embarquees (base64) soient reellement chargees :
    // sans ca, le PDF peut figer un instant de police de repli (FOUT).
    await page.evaluate(() => document.fonts.ready);
    await validerEspacementReel(page);

    const cheminSortie = sortie || cheminSortieParDefaut(compte, diapos);
    fs.mkdirSync(path.dirname(cheminSortie), { recursive: true });

    await page.pdf({
      path: cheminSortie,
      width: '1080px',
      height: '1350px',
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });

    return { cheminSortie, nombreDiapos: diapos.length };
  } finally {
    await navigateur.close();
  }
}

async function main() {
  const [, , compte, cheminDiapos, sortie] = process.argv;
  if (!compte || !cheminDiapos) {
    console.error('Usage : node generer-pdf.js <compte> <fichier-diapos.json> [sortie.pdf]');
    process.exitCode = 1;
    return;
  }
  const brut = fs.readFileSync(cheminDiapos, 'utf-8');
  let diapos;
  try {
    diapos = JSON.parse(brut);
  } catch (erreur) {
    // Audit adversarial du 15/09/2026 : un fichier de diapos corrompu
    // plantait avec un SyntaxError brut (position/ligne JSON), sans dire
    // quel fichier ni quoi faire.
    throw new Error(`Fichier de diapos illisible : "${cheminDiapos}" ne contient pas du JSON valide (${erreur.message}).`);
  }
  const resultat = await genererPdf({ compte, diapos, sortie });
  console.log(`PDF genere : ${resultat.cheminSortie} (${resultat.nombreDiapos} diapos)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  genererPdf,
  construireDocument,
  nomFichierDepuisTitre,
  cheminSortieParDefaut,
  // Exportes pour generer-images.js (repli image, voir lib/publier.js) : la
  // construction d'un document a une seule diapo reutilise exactement le
  // meme gabarit/injection que le PDF multi-page, aucune divergence de rendu
  // entre les deux formats de sortie.
  chargerGabarit,
  injecterDiapo,
  titreDepuisDiapos,
  titreAvecAccent,
  retirerPointFinal,
  validerEspacementReel,
  ESPACE_HAUT_MIN_PX,
  ESPACE_BAS_MIN_PX,
};
