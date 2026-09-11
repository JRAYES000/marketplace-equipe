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
 * CONVENTION DE NOMMAGE DES FICHIERS DE SORTIE
 * -----------------------------------------------------------------------
 *   sortants/<compte>/AAAA-MM-JJ-<slug>.pdf
 *
 * Alignee sur la convention deja en usage dans les depots de contenu de
 * l'equipe (ex. visibilite-ops : sortants/<canal>/AAAA-MM-JJ-<slug>.md) :
 * date ISO en tete, slug en minuscules/tirets, compte comme SOUS-DOSSIER
 * (jamais comme prefixe du nom de fichier).
 *
 *   - <compte>  : le meme identifiant que le parametre CLI (page-claude,
 *                 julien-agency, julien-partners) -- un dossier par compte.
 *   - AAAA-MM-JJ : date du jour de generation (heure locale de la machine).
 *   - <slug>    : derive du titre de la premiere diapo de role "hook" (a
 *                 defaut, la toute premiere diapo) : minuscules, accents
 *                 retires, tout caractere non alphanumerique remplace par
 *                 un tiret, tirets multiples fusionnes, tronque a 60
 *                 caracteres sans couper un mot en deux.
 *
 * Anti-collision : si le fichier AAAA-MM-JJ-<slug>.pdf existe deja (meme
 * sujet publie deux fois le meme jour pour le meme compte), un suffixe
 * -2, -3... est ajoute. Un fichier existant n'est JAMAIS ecrase
 * silencieusement.
 * -----------------------------------------------------------------------
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

const SLUG_LONGUEUR_MAX = 60;

function retirerAccents(texte) {
  // Decompose (e.g. 'é' -> 'e' + accent combinant U+0301), puis retire les
  // marques diacritiques combinantes (plage Unicode U+0300-U+036F) via leurs
  // points de code explicites -- jamais de caractere combinant litteral dans
  // le code source, ca corrompt silencieusement l'editeur/le fichier.
  return texte.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function slugifier(texte, longueurMax = SLUG_LONGUEUR_MAX) {
  let slug = retirerAccents(String(texte || '').toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slug.length > longueurMax) {
    const tronque = slug.slice(0, longueurMax);
    const dernierTiret = tronque.lastIndexOf('-');
    // ne pas couper un mot en deux : reculer jusqu'au dernier tiret complet,
    // sauf s'il est trop tot (perte de plus de la moitie du texte utile)
    slug = dernierTiret > longueurMax * 0.5 ? tronque.slice(0, dernierTiret) : tronque;
  }

  return slug || 'sans-titre';
}

function dateISODuJour(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function slugDepuisDiapos(diapos) {
  const diapoHook = diapos.find((d) => d.role === 'hook') || diapos[0];
  return slugifier(diapoHook && diapoHook.titre);
}

/**
 * Calcule un chemin de sortie sortants/<compte>/AAAA-MM-JJ-<slug>[-N].pdf
 * qui ne collisionne jamais avec un fichier deja present : ajoute -2, -3...
 * tant que le nom est deja pris. N'ecrase jamais silencieusement.
 */
function cheminSortieParDefaut(compte, diapos, date = new Date()) {
  const dossierCompte = path.join(SORTANTS_DIR, compte);
  fs.mkdirSync(dossierCompte, { recursive: true });

  const base = `${dateISODuJour(date)}-${slugDepuisDiapos(diapos)}`;
  let candidat = path.join(dossierCompte, `${base}.pdf`);
  let n = 2;
  while (fs.existsSync(candidat)) {
    candidat = path.join(dossierCompte, `${base}-${n}.pdf`);
    n += 1;
  }
  return candidat;
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
  slugifier,
  cheminSortieParDefaut,
  dateISODuJour,
  // Exportes pour generer-images.js (repli image, voir lib/publier.js) : la
  // construction d'un document a une seule diapo reutilise exactement le
  // meme gabarit/injection que le PDF multi-page, aucune divergence de rendu
  // entre les deux formats de sortie.
  chargerGabarit,
  injecterDiapo,
  slugDepuisDiapos,
};
