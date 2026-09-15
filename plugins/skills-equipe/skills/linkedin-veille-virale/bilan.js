#!/usr/bin/env node
'use strict';

/**
 * Commande "bilan" du brief (section 5) : "sur 30 jours et par compte, quels
 * formats et quels sujets ont le mieux marche". Cote reseau
 * (recupererEntreesRecentes) + calcul pur (calculerBilan, deja teste sans
 * reseau dans test/notion-bilan.test.js) -- ce script est le premier point
 * qui les relie et les execute reellement contre l'API Notion.
 *
 * Usage :
 *   node bilan.js julien-agency [--jours 30] [--dataSourceId <id>]
 *
 * Necessite NOTION_TOKEN et le dataSourceId de la base "Veille & posts"
 * (ou NOTION_VEILLE_DATA_SOURCE_ID dans l'environnement).
 */
const { recupererEntreesRecentes, calculerBilan } = require('./lib/notion');

const COMPTES = ['page-claude', 'julien-agency', 'julien-partners'];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    } else {
      args._.push(argv[i]);
    }
  }
  return args;
}

function formatterLigne({ nom, nombre, scoreMoyen }) {
  return `  - ${nom} : ${nombre} entree(s), score moyen ${scoreMoyen.toFixed(5)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const compte = args._[0];
  if (!compte || !COMPTES.includes(compte)) {
    console.error(`Compte manquant ou inconnu -- attendu l'un de : ${COMPTES.join(', ')}.`);
    process.exitCode = 1;
    return;
  }
  const dataSourceId = args.dataSourceId || process.env.NOTION_VEILLE_DATA_SOURCE_ID;
  if (!dataSourceId) {
    console.error(
      '--dataSourceId manquant (ou NOTION_VEILLE_DATA_SOURCE_ID dans l\'environnement) : ' +
      'l\'identifiant de la base "Veille & posts" dans Notion.'
    );
    process.exitCode = 1;
    return;
  }
  const fenetreJours = args.jours ? Number(args.jours) : 30;

  const entrees = await recupererEntreesRecentes({ dataSourceId, compte, fenetreJours });
  const bilan = calculerBilan(entrees, { compte });

  console.log(`Bilan ${compte} -- ${fenetreJours} derniers jours`);
  console.log(`${bilan.nombreEntrees} entree(s) sur la periode.`);

  if (bilan.nombreEntrees === 0) {
    console.log(bilan.message);
    return;
  }

  const SEUIL_INTERPRETABLE = 10;
  if (bilan.nombreEntrees < SEUIL_INTERPRETABLE) {
    console.log(
      `Echantillon trop petit (${bilan.nombreEntrees} < ${SEUIL_INTERPRETABLE}) pour degager une ` +
      'tendance fiable -- chiffres bruts ci-dessous, a titre indicatif seulement, pas une ' +
      'conclusion ("le format X marche mieux") que si peu de donnees ne permet pas d\'affirmer.'
    );
  }

  console.log('\nPar format :');
  bilan.parFormat.forEach((l) => console.log(formatterLigne(l)));
  console.log('\nPar sujet :');
  bilan.parSujet.forEach((l) => console.log(formatterLigne(l)));
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
