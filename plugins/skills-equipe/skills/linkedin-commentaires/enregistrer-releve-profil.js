#!/usr/bin/env node
'use strict';

/**
 * Regle 3 du brief -- releve QUOTIDIEN des statistiques de PROFIL LinkedIn
 * (vues de profil, demandes de contact). Independant du nombre de
 * commentaires publies ce jour-la : UN appel par jour, jamais un appel par
 * commentaire (voir lib/statistiques-profil.js pour le detail de la faille
 * de conception corrigee le 15/09/2026, ou ce chiffre etait additionne par
 * commentaire dans le tableau de comparaison hebdomadaire).
 *
 * Usage :
 *   node enregistrer-releve-profil.js --date 2026-09-18 --vuesProfil 42 --demandesContact 2
 *
 * Aucun jeton Notion requis : ce releve vit uniquement dans
 * data/statistiques-profil.json (local, gitignore). Il est ensuite passe en
 * `relevesProfil` a `calculerComparaisonHebdomadaire`/
 * `ecrireBlocComparaisonHebdomadaire` (lib/notion.js) pour produire le
 * tableau de comparaison ecrit dans Notion.
 */

const { enregistrerReleveProfil, listeReleves } = require('./lib/statistiques-profil');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      const cle = argv[i].slice(2);
      const valeur = argv[i + 1];
      args[cle] = valeur;
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.date) {
    console.error('--date manquant (AAAA-MM-JJ).');
    process.exitCode = 1;
    return;
  }
  if (args.vuesProfil === undefined && args.demandesContact === undefined) {
    console.error('Au moins --vuesProfil ou --demandesContact est requis.');
    process.exitCode = 1;
    return;
  }

  const releve = enregistrerReleveProfil({
    date: args.date,
    vuesProfil: args.vuesProfil !== undefined ? Number(args.vuesProfil) : undefined,
    demandesContact: args.demandesContact !== undefined ? Number(args.demandesContact) : undefined,
  });
  console.log(
    `Releve enregistre pour ${args.date} : ${releve.vuesProfil} vue(s) de profil, ` +
    `${releve.demandesContact} demande(s) de contact.`
  );
  console.log(`Releves connus a ce jour : ${listeReleves().map((r) => r.date).join(', ')}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
