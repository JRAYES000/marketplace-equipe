#!/usr/bin/env node
'use strict';

/**
 * Point de situation en trois lignes, des la premiere ligne d'execution
 * (brief Julien du 10/09/2026, section 2, regle 2).
 *
 * Usage CLI :
 *   node etat.js [compte]
 *
 * Limite assumee, pour ne rien inventer : ce script lit uniquement le
 * registre reel (data/registre-commentaires.json) et reglages-comptes.json.
 * Il ne sait pas combien de temps s'est ecoule depuis le dernier PASSAGE de
 * la skill (par opposition au dernier commentaire publie) -- aucune trace de
 * "derniere execution" n'est tenue independamment des publications reelles.
 */

const path = require('path');
const { chargerRegistre, entreesDuJour } = require('./lib/registre');
const { dateJourISO, QUOTA_MAX_PAR_JOUR } = require('./lib/planifier-commentaires');
const reglages = require('./reglages-comptes.json');

function etatPourCompte(compte, config, maintenant = new Date()) {
  const registre = chargerRegistre();
  const entreesTousLesJours = registre[compte] || [];
  const aujourdhui = dateJourISO(maintenant);
  const entreesAujourdhui = entreesDuJour(registre, compte, aujourdhui);

  const derniere = [...entreesTousLesJours].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const lignes = [];
  lignes.push(
    derniere
      ? `Dernier commentaire publie pour ${compte} : le ${derniere.date} (aupres de "${derniere.auteurCible}").`
      : `Aucun commentaire jamais publie pour ${compte} (registre vide).`
  );
  lignes.push(
    `Aujourd'hui (${aujourdhui}) : ${entreesAujourdhui.length}/${QUOTA_MAX_PAR_JOUR} commentaires deja publies pour ${compte}, ${Math.max(0, QUOTA_MAX_PAR_JOUR - entreesAujourdhui.length)} restants.`
  );
  const nbCibles = (config.comptes_cibles || []).length;
  lignes.push(
    nbCibles > 0
      ? `${nbCibles} compte(s) cible(s) configure(s) dans reglages-comptes.json.`
      : `Aucun compte cible configure -- comptes_cibles est vide. Voir references/comptes-cibles-proposition-20260914.md pour une liste de candidats a valider.`
  );

  if (entreesTousLesJours.length === 0 && nbCibles === 0) {
    lignes.push(
      'Repli propose : tant que comptes_cibles est vide, lancer "node dry-run.js" sur le jeu fixture ' +
      '(fixtures/posts-exemple.json) pour verifier le pipeline, plutot que de rester sans rien a montrer.'
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

module.exports = { etatPourCompte };
