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
//
// Faille de conception trouvee et corrigee le 15/09/2026 : `vuesProfil`/
// `demandesContact` ne sont PAS des proprietes d'un commentaire -- ce sont
// des mesures de profil datees (le brief : "dans mes statistiques LinkedIn,
// jour par jour"). Avant cette date, la fonction prenait un seul tableau
// `lignes` et lisait ces deux chiffres SUR CHAQUE LIGNE DE COMMENTAIRE,
// additionnes par ligne -- 5 commentaires publies le meme jour, portant
// chacun le meme chiffre global (le releve du jour, ecrit sur les 5),
// auraient produit un total 5 fois trop eleve. Desormais deux parametres
// separes : `lignesCommentaires` (compte uniquement) et `relevesProfil`
// (un releve par jour, voir lib/statistiques-profil.js).

test('calculerComparaisonHebdomadaire regroupe le nombre de commentaires par semaine ISO', () => {
  const lignesCommentaires = [
    { date: '2026-09-08' }, // mardi, semaine du 07/09
    { date: '2026-09-09' }, // mercredi, meme semaine
    { date: '2026-09-15' }, // mardi, semaine suivante
  ];
  const resultat = calculerComparaisonHebdomadaire(lignesCommentaires);
  assert.equal(resultat.length, 2);
  assert.equal(resultat[0].nombreCommentaires, 2);
  assert.equal(resultat[0].debutSemaine, '2026-09-07');
  assert.equal(resultat[1].nombreCommentaires, 1);
  assert.equal(resultat[1].debutSemaine, '2026-09-14');
});

test('calculerComparaisonHebdomadaire regroupe les releves de profil par semaine ISO, separement des commentaires', () => {
  const relevesProfil = [
    { date: '2026-09-08', vuesProfil: 10, demandesContact: 1 }, // mardi, semaine du 07/09
    { date: '2026-09-09', vuesProfil: 5, demandesContact: 0 },  // mercredi, meme semaine -- jour DIFFERENT, somme correcte
    { date: '2026-09-15', vuesProfil: 20, demandesContact: 2 }, // mardi, semaine suivante
  ];
  const resultat = calculerComparaisonHebdomadaire([], relevesProfil);
  assert.equal(resultat.length, 2);
  assert.equal(resultat[0].vuesProfil, 15); // 10 + 5, deux JOURS distincts de la meme semaine
  assert.equal(resultat[0].demandesContact, 1);
  assert.equal(resultat[1].vuesProfil, 20);
});

/**
 * LE cas que l'audit a demande de verrouiller : 5 commentaires publies le
 * MEME jour, un seul releve de profil ce jour-la (comme la procedure du
 * 18/09 le fait desormais). Le total hebdomadaire de vues de profil doit
 * rester celui du releve UNIQUE -- pas multiplie par 5. Ce test echouerait
 * si `calculerComparaisonHebdomadaire` recommencait a lire vuesProfil/
 * demandesContact sur les lignes de commentaires plutot que sur les releves.
 */
test('5 commentaires le meme jour, 1 seul releve de profil -- le total n\'est PAS multiplie par 5 (regression du 15/09/2026)', () => {
  const lignesCommentaires = Array.from({ length: 5 }, (_, i) => ({ date: '2026-09-15', auteurCible: `personne-${i}` }));
  const relevesProfil = [{ date: '2026-09-15', vuesProfil: 100, demandesContact: 4 }];

  const resultat = calculerComparaisonHebdomadaire(lignesCommentaires, relevesProfil);
  assert.equal(resultat.length, 1);
  assert.equal(resultat[0].nombreCommentaires, 5); // les 5 commentaires comptent bien
  assert.equal(resultat[0].vuesProfil, 100);        // mais le releve de profil reste celui d'UN jour, pas 500
  assert.equal(resultat[0].demandesContact, 4);
});

test('dedoublonnage par date : deux releves fournis pour la meme date ne s\'additionnent pas (filet de securite)', () => {
  // Meme si un futur appelant repasse un releve par commentaire (l'erreur
  // d'origine) plutot qu'un seul par jour, l'agregation ne doit jamais
  // sommer deux entrees de la meme date -- seule la derniere est retenue.
  const relevesProfil = [
    { date: '2026-09-15', vuesProfil: 100, demandesContact: 4 },
    { date: '2026-09-15', vuesProfil: 100, demandesContact: 4 },
    { date: '2026-09-15', vuesProfil: 100, demandesContact: 4 },
  ];
  const resultat = calculerComparaisonHebdomadaire([], relevesProfil);
  assert.equal(resultat[0].vuesProfil, 100);
  assert.equal(resultat[0].demandesContact, 4);
});

test('calculerComparaisonHebdomadaire ignore les entrees sans date, ne plante pas sur des tableaux vides', () => {
  assert.deepEqual(calculerComparaisonHebdomadaire([]), []);
  assert.deepEqual(calculerComparaisonHebdomadaire([], []), []);
  assert.deepEqual(calculerComparaisonHebdomadaire([{}], [{ vuesProfil: 5 }]), []);
});

test('calculerComparaisonHebdomadaire traite vuesProfil/demandesContact absents comme 0, jamais NaN', () => {
  const resultat = calculerComparaisonHebdomadaire([{ date: '2026-09-08' }], []);
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
