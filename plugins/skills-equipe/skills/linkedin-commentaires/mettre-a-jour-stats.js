#!/usr/bin/env node
'use strict';

/**
 * Regle 3 du brief (lecture des chiffres par capture d'ecran). Aucun OCR
 * ici : la session Claude lit les chiffres visibles sur la capture d'ecran
 * collee par l'utilisateur dans la conversation, puis appelle ce script
 * avec ce qu'elle a lu -- meme principe que la redaction editoriale des
 * commentaires (un jugement assiste, pas une automatisation aveugle).
 *
 * Usage :
 *   node mettre-a-jour-stats.js --auteur "Jean ZENDJI" --date 2026-09-15 \
 *     --jaime 4 --reponses 1 --reponseAuteur true --vuesProfil 12 --demandesContact 0
 *
 * Necessite NOTION_TOKEN et le dataSourceId de la base "Commentaires" (voir
 * SKILL.md, section Notion, pour le retrouver).
 */
const { mettreAJourStatistiques } = require('./lib/notion');

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
  const dataSourceId = args.dataSourceId || process.env.NOTION_COMMENTAIRES_DATA_SOURCE_ID;
  if (!dataSourceId) {
    console.error(
      '--dataSourceId manquant (ou NOTION_COMMENTAIRES_DATA_SOURCE_ID dans l\'environnement) : ' +
      'l\'identifiant de la base "Commentaires" dans Notion.'
    );
    process.exitCode = 1;
    return;
  }
  if (!args.auteur) {
    console.error('--auteur manquant (doit correspondre exactement a "Personne visee" dans Notion).');
    process.exitCode = 1;
    return;
  }

  const resultat = await mettreAJourStatistiques({
    dataSourceId,
    auteurCible: args.auteur,
    date: args.date,
    jaime: args.jaime !== undefined ? Number(args.jaime) : undefined,
    reponses: args.reponses !== undefined ? Number(args.reponses) : undefined,
    reponseAuteur: args.reponseAuteur !== undefined ? args.reponseAuteur === 'true' : undefined,
    vuesProfil: args.vuesProfil !== undefined ? Number(args.vuesProfil) : undefined,
    demandesContact: args.demandesContact !== undefined ? Number(args.demandesContact) : undefined,
  });
  console.log(`Statistiques mises a jour pour "${args.auteur}" : ${resultat.url}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
