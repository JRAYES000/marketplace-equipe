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
 * [sortie.pdf]         : chemin de sortie ; a defaut un nom temporaire dans sortants/
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

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

async function genererPdf({ compte, diapos, sortie }) {
  if (!Array.isArray(diapos) || diapos.length === 0) {
    throw new Error('La liste de diapos est vide.');
  }
  const html = construireDocument(compte, diapos);

  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.setContent(html, { waitUntil: 'load' });
    // Attendre que les polices embarquees (base64) soient reellement chargees :
    // sans ca, le PDF peut figer un instant de police de repli (FOUT).
    await page.evaluate(() => document.fonts.ready);

    fs.mkdirSync(SORTANTS_DIR, { recursive: true });
    const cheminSortie =
      sortie || path.join(SORTANTS_DIR, `TEMP-carrousel-${compte}-${Date.now()}.pdf`);

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

module.exports = { genererPdf, construireDocument };
