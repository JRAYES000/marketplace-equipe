#!/usr/bin/env node
'use strict';

/**
 * Cree reellement la page Notion de suivi des commentaires et sa vue de
 * comparaison hebdomadaire. Necessite NOTION_TOKEN et NOTION_PARENT_PAGE_ID
 * dans l'environnement (voir .env.example). N'a pas ete execute a ce jour,
 * faute de jeton disponible dans cette session -- voir SKILL.md.
 *
 * Usage : node creer-page-notion.js
 */
const { creerBaseCommentaires, creerVueComparaisonHebdomadaire } = require('./lib/notion');

async function main() {
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
  if (!parentPageId) {
    console.error('NOTION_PARENT_PAGE_ID manquant (id de la page Notion sous laquelle creer la base).');
    process.exitCode = 1;
    return;
  }

  const { databaseId, dataSourceId, url } = await creerBaseCommentaires({ parentPageId });
  console.log(`Base "Commentaires" creee : ${url}`);

  await creerVueComparaisonHebdomadaire({ databaseId, dataSourceId });
  console.log('Vue de comparaison hebdomadaire creee (a ajuster a la main si besoin, voir lib/notion.js).');

  console.log('\nA FAIRE A LA MAIN (aucun endpoint public Notion ne le permet) :');
  console.log(`  Ouvrir ${url} -> bouton "Share" -> inviter contact@claudeagency.fr en modification.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
