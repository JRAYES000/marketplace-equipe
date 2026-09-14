'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { creerBaseCommentaires } = require('../lib/notion');

// Brief section 2, regle 4 : "rien ne plante a vide ... cle manquante : elle
// s'arrete en disant laquelle et ou la mettre" -- verifie sur les erreurs
// Notion reelles rencontrees le 14/09/2026 (ID invalide/page non partagee),
// pas seulement sur l'absence de jeton.

test('refuse sans NOTION_TOKEN, message explicite plutot qu\'un plantage reseau', async () => {
  await assert.rejects(
    () => creerBaseCommentaires({ parentPageId: 'peu-importe' }),
    /NOTION_TOKEN manquant/
  );
});

test('ne pretend jamais une erreur "reseau" quand c\'est en fait le jeton qui manque', async () => {
  await assert.rejects(
    () => creerBaseCommentaires({ parentPageId: 'peu-importe' }),
    (err) => {
      assert.ok(!/reseau/i.test(err.message), `message ne doit pas mentionner "reseau" : ${err.message}`);
      return true;
    }
  );
});
