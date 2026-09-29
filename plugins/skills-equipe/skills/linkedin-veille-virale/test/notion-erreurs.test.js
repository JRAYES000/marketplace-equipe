'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { creerBaseVeilleEtPosts } = require('../lib/notion');

// Brief section 2, regle 4 : "rien ne plante a vide ... cle manquante : elle
// s'arrete en disant laquelle et ou la mettre" -- meme correction que
// linkedin-commentaires/lib/notion.js (bug reel trouve le 14/09/2026 : le
// message etiquetait a tort l'absence de jeton comme une erreur "reseau").
//
// Isole NOTION_TOKEN explicitement (voir linkedin-commentaires/test/
// notion-erreurs.test.js) : ne suppose jamais un environnement sans jeton.
let notionTokenSauvegarde;
before(() => {
  notionTokenSauvegarde = process.env.NOTION_TOKEN;
  delete process.env.NOTION_TOKEN;
});
after(() => {
  if (notionTokenSauvegarde === undefined) delete process.env.NOTION_TOKEN;
  else process.env.NOTION_TOKEN = notionTokenSauvegarde;
});

test('refuse sans NOTION_TOKEN, message explicite plutot qu\'un plantage reseau', async () => {
  await assert.rejects(
    () => creerBaseVeilleEtPosts({ parentPageId: 'peu-importe' }),
    /NOTION_TOKEN manquant/
  );
});

test('ne pretend jamais une erreur "reseau" quand c\'est en fait le jeton qui manque', async () => {
  await assert.rejects(
    () => creerBaseVeilleEtPosts({ parentPageId: 'peu-importe' }),
    (err) => {
      assert.ok(!/reseau/i.test(err.message), `message ne doit pas mentionner "reseau" : ${err.message}`);
      return true;
    }
  );
});
