#!/usr/bin/env node
'use strict';

/**
 * Regle 3 du brief (lecture des chiffres par capture d'ecran). Aucun OCR
 * ici : la session Claude lit les chiffres visibles sur la capture d'ecran
 * collee par l'utilisateur dans la conversation, puis appelle ce script
 * avec ce qu'elle a lu -- meme principe que dans linkedin-commentaires.
 *
 * Usage :
 *   node mettre-a-jour-stats.js --titre "Le vrai cout d'un recrutement -- adapte de Codie Sanchez" \
 *     --vues 1500 --reactions 40 --commentaires 6 --bilan Neutre
 *
 * Necessite NOTION_TOKEN et le dataSourceId de la base "Veille & posts".
 */
const { mettreAJourStatistiques7j } = require('./lib/notion');

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dataSourceId = args.dataSourceId || process.env.NOTION_VEILLE_DATA_SOURCE_ID;
  if (!dataSourceId) {
    console.error(
      '--dataSourceId manquant (ou NOTION_VEILLE_DATA_SOURCE_ID dans l\'environnement) : ' +
      'l\'identifiant de la base "Veille & posts" dans Notion.'
    );
    process.exitCode = 1;
    return;
  }
  if (!args.titre) {
    console.error('--titre manquant (doit correspondre exactement au champ "Titre" dans Notion).');
    process.exitCode = 1;
    return;
  }

  const resultat = await mettreAJourStatistiques7j({
    dataSourceId,
    titre: args.titre,
    vues7j: args.vues !== undefined ? Number(args.vues) : undefined,
    reactions7j: args.reactions !== undefined ? Number(args.reactions) : undefined,
    commentaires7j: args.commentaires !== undefined ? Number(args.commentaires) : undefined,
    bilan: args.bilan,
  });
  console.log(`Statistiques mises a jour pour "${args.titre}" : ${resultat.url}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
