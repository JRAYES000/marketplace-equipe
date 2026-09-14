#!/usr/bin/env node
'use strict';

/**
 * Cree reellement la page Notion "Veille & posts" et ses 3 vues filtrees.
 * Necessite NOTION_TOKEN et NOTION_PARENT_PAGE_ID dans l'environnement (voir
 * .env.example). N'a pas ete execute a ce jour, faute de jeton disponible
 * dans cette session -- voir SKILL.md.
 *
 * Usage : node creer-page-notion.js
 */
const { creerBaseVeilleEtPosts, creerVuesParCompte } = require('./lib/notion');

async function main() {
  const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
  if (!parentPageId) {
    console.error('NOTION_PARENT_PAGE_ID manquant (id de la page Notion sous laquelle creer la base).');
    process.exitCode = 1;
    return;
  }

  const { databaseId, dataSourceId, url } = await creerBaseVeilleEtPosts({ parentPageId });
  console.log(`Base "Veille & posts" creee : ${url}`);

  await creerVuesParCompte({ databaseId, dataSourceId });
  console.log('3 vues filtrees creees (une par compte).');

  console.log('\nA FAIRE A LA MAIN (aucun endpoint public Notion ne le permet) :');
  console.log(`  Ouvrir ${url} -> bouton "Share" -> inviter contact@claudeagency.fr en modification.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}
