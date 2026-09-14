#!/usr/bin/env node
'use strict';

/**
 * Point de situation en trois lignes, des la premiere ligne d'execution
 * (brief Julien du 10/09/2026, section 2, regle 2). Ajoute le 15/09/2026 --
 * cette skill n'en avait aucun jusqu'ici, trouve par l'audit du meme jour.
 *
 * Usage CLI :
 *   node etat.js [compte]
 *
 * Limite assumee, pour ne rien inventer : contrairement a linkedin-commentaires,
 * cette skill ne tient aucun registre de publication reelle (pas de
 * lib/registre.js equivalent) -- publierPost() n'a jamais ete appele en
 * conditions reelles a ce jour. Ce script lit donc l'etat le plus recent
 * disponible sur disque : le dernier passage de veille reel connu
 * (data/veille-resultats-reels-*.json, gitignore -- absent sur une machine
 * qui n'a jamais lance de vrai passage) et les posts adaptes prepares dans
 * a-publier/, pas un historique de publication.
 */

const fs = require('fs');
const path = require('path');
const reglages = require('./reglages-comptes.json');

function dernierFichierResultatsReels() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) return null;
  const candidats = fs
    .readdirSync(dataDir)
    .filter((f) => /^veille-resultats-reels-.*\.json$/.test(f))
    .sort()
    .reverse();
  if (candidats.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(dataDir, candidats[0]), 'utf8'));
}

function postsAdaptesPrets(compte) {
  const dir = path.join(__dirname, 'a-publier');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(compte) && f.endsWith('.commentary.txt'));
}

function etatPourCompte(compte, config) {
  const lignes = [];
  const nbSurveilles = (config.comptes_a_surveiller || []).length;

  lignes.push(
    nbSurveilles > 0
      ? `${nbSurveilles} compte(s) surveille(s) configure(s) dans reglages-comptes.json (comptes_a_surveiller).`
      : 'Aucun compte surveille configure -- comptes_a_surveiller est vide.'
  );

  const resultats = dernierFichierResultatsReels();
  if (resultats) {
    const aRediger = (resultats.posts || []).filter((p) => /a rediger/.test(p.etat || '')).length;
    lignes.push(
      `Dernier passage de veille reel connu (${resultats.genere_le}) : ${resultats.nb_recuperes} posts ` +
      `recuperes, ${resultats.nb_retenus} retenus, ${aRediger} encore "a rediger" -- aucun n'a ete adapte en post.`
    );
  } else {
    lignes.push(
      'Aucun passage de veille reel connu sur cette machine (data/veille-resultats-reels-*.json ' +
      'absent -- gitignore, propre a chaque machine). "node dry-run.js" donne un apercu sur donnees fixture.'
    );
  }

  const prets = postsAdaptesPrets(compte);
  lignes.push(
    prets.length > 0
      ? `${prets.length} post(s) adapte(s) pret(s) dans a-publier/ pour ${compte} : ${prets.join(', ')}.`
      : `Aucun post adapte pret dans a-publier/ pour ${compte} a ce jour.`
  );

  lignes.push(
    'Publication reelle sur LinkedIn : aucun registre tenu par cette skill -- verifier aupres de ' +
    'Julien (voir references/etat-linkedin-20260912.md, tenu a la main).'
  );

  if (nbSurveilles === 0 && prets.length === 0) {
    lignes.push(
      'Repli propose : tant que comptes_a_surveiller est vide, lancer "node dry-run.js" sur le jeu ' +
      'fixture (fixtures/posts-exemple.json) pour verifier le pipeline, plutot que de rester sans rien a montrer.'
    );
  }

  return lignes;
}

function main() {
  const [, , compteDemande] = process.argv;
  const comptes = compteDemande ? [compteDemande] : Object.keys(reglages);

  for (const compte of comptes) {
    const config = reglages[compte];
    if (!config) {
      console.log(`Compte inconnu : "${compte}". Attendu : ${Object.keys(reglages).join(', ')}.`);
      continue;
    }
    console.log(`-- ${compte} --`);
    for (const ligne of etatPourCompte(compte, config)) {
      console.log(ligne);
    }
    console.log('');
  }
}

if (require.main === module) {
  main();
}

module.exports = { etatPourCompte, dernierFichierResultatsReels, postsAdaptesPrets };
