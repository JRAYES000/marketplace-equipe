#!/usr/bin/env node
'use strict';

/**
 * Regle 3 du brief (lecture des chiffres par capture d'ecran). Aucun OCR
 * ici : la session Claude lit les chiffres visibles sur la capture d'ecran
 * collee par l'utilisateur dans la conversation, puis appelle ce script
 * avec ce qu'elle a lu -- meme principe que la redaction editoriale des
 * commentaires (un jugement assiste, pas une automatisation aveugle).
 *
 * Usage (statistiques du COMMENTAIRE uniquement -- J'aime, reponses,
 * reponse de l'auteur) :
 *   node mettre-a-jour-stats.js --auteur "Jean ZENDJI" --date 2026-09-15 \
 *     --jaime 4 --reponses 1 --reponseAuteur true
 *
 * Necessite NOTION_TOKEN et le dataSourceId de la base "Commentaires" (voir
 * SKILL.md, section Notion, pour le retrouver).
 *
 * Vues de profil et demandes de contact NE PASSENT PLUS PAR ICI (retire le
 * 15/09/2026, faille de conception -- voir lib/statistiques-profil.js) :
 * ce sont des mesures de PROFIL datees, pas des proprietes d'un
 * commentaire. Utiliser `node enregistrer-releve-profil.js` a la place, UNE
 * fois par jour, jamais une fois par commentaire.
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
  // Verifie d'abord l'usage de flags retires : une erreur de commande pure,
  // independante de la configuration Notion -- inutile de faire chercher
  // dataSourceId/auteur a quelqu'un qui s'est juste trompe de script.
  if (args.vuesProfil !== undefined || args.demandesContact !== undefined) {
    console.error(
      '--vuesProfil/--demandesContact ne sont plus acceptes ici (faille de conception corrigee le ' +
      '15/09/2026 -- additionner ces chiffres par commentaire gonflait le tableau de comparaison ' +
      'hebdomadaire). Utilisez "node enregistrer-releve-profil.js --date ... --vuesProfil ... ' +
      '--demandesContact ..." UNE fois par jour, pas une fois par commentaire.'
    );
    process.exitCode = 1;
    return;
  }
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
  });
  console.log(`Statistiques mises a jour pour "${args.auteur}" : ${resultat.url}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
