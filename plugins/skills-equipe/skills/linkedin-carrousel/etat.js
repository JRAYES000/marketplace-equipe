#!/usr/bin/env node
'use strict';

/**
 * Point de situation en trois lignes, des la premiere ligne d'execution
 * (brief Julien du 10/09/2026, section 2, regle 2) : "Un outil dont on
 * ignore l'etat, on arrete de l'ouvrir."
 *
 * Usage CLI :
 *   node etat.js [compte]
 *
 * [compte] : page-claude | julien-agency | julien-partners. Si omis, un
 * etat est imprime pour chaque compte qui a au moins un brouillon ou un
 * carrousel genere.
 *
 * Limite assumee, pour ne rien inventer : ce script lit uniquement l'etat
 * VISIBLE SUR DISQUE (fichiers dans a-publier/ et sortants/). Il ne sait
 * pas si un carrousel a ete reellement publie et vu sur LinkedIn -- aucun
 * registre de confirmation n'existe encore dans ce depot (voir
 * references/etat-linkedin-20260912.md, tenu a la main). La troisieme
 * ligne le dit explicitement plutot que d'afficher une fausse certitude.
 */

const fs = require('fs');
const path = require('path');
const { titreDepuisDiapos } = require('./generer-pdf');

const SKILL_DIR = __dirname;
const A_PUBLIER_DIR = path.join(SKILL_DIR, 'a-publier');
const SORTANTS_DIR = path.join(SKILL_DIR, 'sortants');
const COMPTES_CONNUS = ['page-claude', 'julien-agency', 'julien-partners'];

function joursDepuis(date) {
  const jours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'il y a 1 jour';
  return `il y a ${jours} jours`;
}

function listerBrouillonsJson() {
  if (!fs.existsSync(A_PUBLIER_DIR)) return [];
  return fs.readdirSync(A_PUBLIER_DIR).filter((f) => f.endsWith('.json'));
}

function compteDuFichier(nomFichier) {
  return COMPTES_CONNUS.find((c) => nomFichier.startsWith(c)) || null;
}

function dernierPdfGenere(compte) {
  const dossier = path.join(SORTANTS_DIR, compte);
  if (!fs.existsSync(dossier)) return null;
  const pdfs = fs.readdirSync(dossier)
    .filter((f) => f.endsWith('.pdf'))
    .map((f) => {
      const chemin = path.join(dossier, f);
      return { fichier: f, mtime: fs.statSync(chemin).mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  return pdfs[0] || null;
}

function etatPourCompte(compte) {
  const brouillons = listerBrouillonsJson().filter((f) => compteDuFichier(f) === compte);
  const dernierPdf = dernierPdfGenere(compte);

  const brouillonsNonRendus = brouillons.filter((nomFichier) => {
    try {
      const diapos = JSON.parse(fs.readFileSync(path.join(A_PUBLIER_DIR, nomFichier), 'utf-8'));
      const titre = titreDepuisDiapos(diapos);
      const dossier = path.join(SORTANTS_DIR, compte);
      return !fs.existsSync(dossier) || !fs.existsSync(path.join(dossier, `${titre}.pdf`));
    } catch {
      return true;
    }
  });

  const lignes = [];
  lignes.push(
    dernierPdf
      ? `Dernier carrousel genere pour ${compte} : "${dernierPdf.fichier}" (${joursDepuis(dernierPdf.mtime)}).`
      : `Aucun carrousel jamais genere pour ${compte}.`
  );
  lignes.push(
    brouillonsNonRendus.length > 0
      ? `${brouillonsNonRendus.length} brouillon(s) dans a-publier/ pas encore rendu(s) en PDF : ${brouillonsNonRendus.join(', ')}.`
      : `Aucun brouillon en attente de rendu pour ${compte}.`
  );
  lignes.push(
    'Publication reelle sur LinkedIn : aucune confirmation suivie automatiquement ici -- ' +
    "verifier aupres de Julien (voir references/etat-linkedin-20260912.md, tenu a la main)."
  );

  if (brouillons.length === 0 && !dernierPdf) {
    lignes.push(
      `Repli propose : aucun contenu pour ${compte} pour l'instant -- reprendre ` +
      '"fixtures/diapos-exemple.json" comme point de depart, ou un sujet deja publie pour un ' +
      'autre compte sous un angle propre a celui-ci, plutot que de repartir d\'une page blanche.'
    );
  }

  return lignes;
}

function main() {
  const [, , compteDemande] = process.argv;
  const comptes = compteDemande
    ? [compteDemande]
    : COMPTES_CONNUS.filter((c) => listerBrouillonsJson().some((f) => compteDuFichier(f) === c) || dernierPdfGenere(c));

  if (comptes.length === 0) {
    console.log('Aucun compte n\'a de brouillon ni de carrousel genere pour l\'instant.');
    console.log(
      'Repli propose : commencez par "fixtures/diapos-exemple.json" (4 diapos de demonstration, ' +
      'a completer jusqu\'a 6 minimum avant generation -- voir lib/valider-diapos.js) ' +
      'ou redigez un premier brouillon dans a-publier/<compte>-<sujet>.json.'
    );
    return;
  }

  for (const compte of comptes) {
    console.log(`-- ${compte} --`);
    for (const ligne of etatPourCompte(compte)) {
      console.log(ligne);
    }
    console.log('');
  }
}

if (require.main === module) {
  main();
}

module.exports = { etatPourCompte, listerBrouillonsJson, compteDuFichier, dernierPdfGenere };
