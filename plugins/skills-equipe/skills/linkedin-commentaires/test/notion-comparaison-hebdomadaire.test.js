'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculerComparaisonHebdomadaire, ecrireBlocComparaisonHebdomadaire } = require('../lib/notion');

// Vue de comparaison demandee par le brief (section 6, "le coeur de la
// skill") : commentaires de la semaine cote a cote avec vues de profil et
// demandes de contact. L'API Notion n'autorise qu'un seul axe Y par chart
// view (voir creerVueComparaisonHebdomadaire) -- calculerComparaisonHebdomadaire
// est l'alternative testable sans reseau (agregation pure), ecrite ensuite en
// bloc tableau par ecrireBlocComparaisonHebdomadaire.

test('calculerComparaisonHebdomadaire regroupe par semaine ISO et somme les 3 mesures', () => {
  const lignes = [
    { date: '2026-09-08', vuesProfil: 10, demandesContact: 1 }, // mardi, semaine du 07/09
    { date: '2026-09-09', vuesProfil: 5, demandesContact: 0 },  // mercredi, meme semaine
    { date: '2026-09-15', vuesProfil: 20, demandesContact: 2 }, // mardi, semaine suivante
  ];
  const resultat = calculerComparaisonHebdomadaire(lignes);
  assert.equal(resultat.length, 2);
  assert.equal(resultat[0].nombreCommentaires, 2);
  assert.equal(resultat[0].vuesProfil, 15);
  assert.equal(resultat[0].demandesContact, 1);
  assert.equal(resultat[0].debutSemaine, '2026-09-07');
  assert.equal(resultat[1].nombreCommentaires, 1);
  assert.equal(resultat[1].vuesProfil, 20);
  assert.equal(resultat[1].debutSemaine, '2026-09-14');
});

test('calculerComparaisonHebdomadaire ignore les lignes sans date, ne plante pas sur un tableau vide', () => {
  assert.deepEqual(calculerComparaisonHebdomadaire([]), []);
  assert.deepEqual(calculerComparaisonHebdomadaire([{ vuesProfil: 5 }]), []);
});

test('calculerComparaisonHebdomadaire traite vuesProfil/demandesContact absents comme 0, jamais NaN', () => {
  const resultat = calculerComparaisonHebdomadaire([{ date: '2026-09-08' }]);
  assert.equal(resultat[0].vuesProfil, 0);
  assert.equal(resultat[0].demandesContact, 0);
  assert.equal(Number.isNaN(resultat[0].vuesProfil), false);
});

test('ecrireBlocComparaisonHebdomadaire refuse sans pageId', async () => {
  await assert.rejects(
    () => ecrireBlocComparaisonHebdomadaire({ lignes: [] }),
    /pageId requis/
  );
});

test('ecrireBlocComparaisonHebdomadaire refuse si aucune ligne exploitable (rien a ecrire)', async () => {
  await assert.rejects(
    () => ecrireBlocComparaisonHebdomadaire({ pageId: 'peu-importe', lignes: [], notionToken: 'peu-importe' }),
    /Aucune ligne avec une Date exploitable/
  );
});

test('ecrireBlocComparaisonHebdomadaire refuse sans NOTION_TOKEN avant tout appel reseau', async () => {
  await assert.rejects(
    () => ecrireBlocComparaisonHebdomadaire({ pageId: 'peu-importe', lignes: [{ date: '2026-09-08' }] }),
    /NOTION_TOKEN manquant/
  );
});
