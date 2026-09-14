'use strict';

/**
 * Execution a blanc, de bout en bout, de linkedin-veille-virale -- jusqu'au
 * texte final du post recycle/inspire tel qu'il serait publie -- SANS jamais
 * appeler publierPost(). Ce module n'importe meme pas lib/publier.js.
 *
 * Par defaut (aucun APIFY_TOKEN dans l'environnement, ou comptes_a_surveiller
 * vide dans reglages-comptes.json -- les deux sont vrais au 11/09/2026), la
 * recuperation utilise le jeu de posts fixture (fixtures/posts-exemple.json),
 * simulant une reponse reelle de l'acteur Apify harvestapi/linkedin-profile-posts.
 * Des que APIFY_TOKEN est fourni ET qu'un compte a des URLs dans
 * comptes_a_surveiller, ce script appelle recupererPosts() pour de vrai a la
 * place -- meme pipeline, donnees reelles, sans autre modification.
 *
 * La redaction du texte final (fixtures/redactions-exemple.json) est ecrite a
 * la main pour ce jeu de posts precis -- ce n'est pas une generation
 * automatique en JS : en usage reel c'est la session Claude qui invoque la
 * skill qui redige, poste par poste (SKILL.md, point 3).
 */
const fs = require('fs');
const path = require('path');
const { trierPosts, recupererPosts } = require('./lib/veille');
const reglages = require('./reglages-comptes.json');
const reglageScore = require('./reglage-score.json');
const { abonnes: abonnesReels } = require('./abonnes-comptes.json');
const postsFixture = require('./fixtures/posts-exemple.json');
const abonnesExemple = require('./fixtures/abonnes-exemple.json');
const redactionsExemple = require('./fixtures/redactions-exemple.json');

// Date de reference fixe pour le jeu fixture, pour que la fenetre de fraicheur (7 jours)
// reste deterministe quelle que soit la date reelle d'execution -- les posts fixture ont
// ete dates autour du 09-10/09/2026 pour ce scenario.
const MAINTENANT_FIXTURE = new Date('2026-09-14T12:00:00.000Z');

async function chargerPosts(config) {
  const urls = config.comptes_a_surveiller || [];
  if (process.env.APIFY_TOKEN && urls.length > 0) {
    return {
      source: 'apify-reel',
      posts: await recupererPosts({ profileUrls: urls }),
      abonnesParIdentifiant: abonnesReels,
      maintenant: new Date(),
    };
  }
  return {
    source: 'fixture (APIFY_TOKEN absent et/ou comptes_a_surveiller vide -- voir fixtures/posts-exemple.json)',
    posts: postsFixture,
    abonnesParIdentifiant: abonnesExemple,
    maintenant: MAINTENANT_FIXTURE,
  };
}

async function executerPourCompte(compte, config) {
  const { source, posts, abonnesParIdentifiant, maintenant } = await chargerPosts(config);
  const retenus = trierPosts(posts, {
    seuilScore: reglageScore.seuil_score,
    coefficients: reglageScore.coefficients,
    fenetreJours: reglageScore.fenetre_jours,
    abonnesParIdentifiant,
    maintenant,
  });
  const idsRetenus = new Set(retenus.map((p) => p.id));
  const ecartes = posts.filter((p) => !idsRetenus.has(p.id)).map((p) => p.id);

  if (retenus.length === 0) {
    return { compte, source, nbPostsRecuperes: posts.length, retenus: [], ecartes, choisi: null };
  }

  const choisi = retenus[0];
  const redactionsCompte = redactionsExemple[compte] || {};
  const contenuFinal = redactionsCompte[choisi.id] || null;

  return {
    compte,
    source,
    nbPostsRecuperes: posts.length,
    nbPostsRetenus: retenus.length,
    ecartes,
    postChoisi: {
      id: choisi.id,
      auteur: choisi.authorName,
      url: choisi.url,
      postedAt: choisi.postedAt,
      commentsCount: choisi.commentsCount,
      score: choisi.score,
      texteOriginal: choisi.text,
    },
    contenuFinal,
    authorUrn: config.author_urn,
    argumentsPublierPost: contenuFinal
      ? { authorUrn: config.author_urn, commentary: contenuFinal }
      : null,
    publicationReelle: 'NON EFFECTUEE -- dry run uniquement, publierPost() jamais appele par ce script',
  };
}

async function main() {
  const resultats = {};
  for (const [compte, config] of Object.entries(reglages)) {
    resultats[compte] = await executerPourCompte(compte, config);
  }

  // Nom de fichier explicite : ce resultat vient du jeu FIXTURE
  // (fixtures/posts-exemple.json), pas d'un vrai appel Apify -- voir
  // chargerPosts() ci-dessus et le champ "source" de chaque entree.
  const sortiePath = path.join(__dirname, 'dry-run-sortie', 'veille-exemple-fixture.json');
  fs.mkdirSync(path.dirname(sortiePath), { recursive: true });
  fs.writeFileSync(sortiePath, JSON.stringify(resultats, null, 2), 'utf8');

  console.log(JSON.stringify(resultats, null, 2));
  console.log(`\nEcrit dans ${sortiePath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { executerPourCompte, chargerPosts };
