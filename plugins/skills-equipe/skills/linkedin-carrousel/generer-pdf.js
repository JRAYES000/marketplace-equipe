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
 * <fichier-diapos.json> : [{ "role": "hook"|"contenu", "titre": "...", "texte": "..." }, ...]
 *   - "role" absent ou different de "hook" => "contenu"
 *   - "texte" optionnel (la diapo hook n'en a generalement pas)
 * [sortie.pdf]         : chemin de sortie explicite ; sinon nom genere automatiquement
 *                        (convention ci-dessous).
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

const SKILL_DIR = __dirname;
const TEMPLATES_DIR = path.join(SKILL_DIR, 'templates');
const SORTANTS_DIR = path.join(SKILL_DIR, 'sortants');

const TEMPLATE_PAR_COMPTE = {
  'page-claude': 'page-claude.html',
  'julien-agency': 'julien-agency.html',
  'julien-partners': 'julien-partners.html',
};

const MARQUEUR_DEBUT = '<!-- SLIDE:BEGIN -->';
const MARQUEUR_FIN = '<!-- SLIDE:END -->';

function echapperHtml(texte) {
  return String(texte)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function chargerGabarit(compte) {
  const fichier = TEMPLATE_PAR_COMPTE[compte];
  if (!fichier) {
    throw new Error(
      `Compte inconnu : "${compte}". Attendu : ${Object.keys(TEMPLATE_PAR_COMPTE).join(', ')}`
    );
  }
  const cheminTemplate = path.join(TEMPLATES_DIR, fichier);
  const html = fs.readFileSync(cheminTemplate, 'utf-8');

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

function injecterDiapo(blocDiapo, diapo, index) {
  const numero = String(index + 1).padStart(2, '0');
  return blocDiapo
    .replaceAll('{{TITRE}}', echapperHtml(diapo.titre || ''))
    .replaceAll('{{TEXTE}}', echapperHtml(diapo.texte || ''))
    .replaceAll('{{NUMERO}}', numero)
    .replaceAll('{{ROLE}}', diapo.role === 'hook' ? 'hook' : 'contenu');
}

function construireDocument(compte, diapos) {
  const { entete, blocDiapo, pied } = chargerGabarit(compte);
  const diapositives = diapos
    .map((diapo, index) => injecterDiapo(blocDiapo, diapo, index))
    .join('\n');
  return `${entete}${diapositives}${pied}`;
}

const TITRE_LONGUEUR_MAX = 80;
const CARACTERES_INTERDITS = /[\\/:*?"<>|\r\n]+/g;

/**
 * Derive un nom de fichier lisible en francais a partir d'un titre de diapo :
 * casse et accents conserves (ce n'est PAS un slug d'URL), seuls les
 * caracteres interdits dans un nom de fichier sont retires, espaces
 * multiples fusionnes, tronque a 80 caracteres sans couper un mot en deux.
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
  const diapos = JSON.parse(fs.readFileSync(cheminDiapos, 'utf-8'));
  const resultat = await genererPdf({ compte, diapos, sortie });
  console.log(`PDF genere : ${resultat.cheminSortie} (${resultat.nombreDiapos} diapos)`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
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
};
