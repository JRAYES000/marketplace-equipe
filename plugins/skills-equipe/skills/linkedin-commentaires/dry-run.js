'use strict';

/**
 * Execution a blanc, de bout en bout, de linkedin-commentaires -- jusqu'au
 * texte final du commentaire tel qu'il serait publie -- SANS jamais appeler
 * publierCommentaire(). Ce module n'importe meme pas lib/publier-commentaire.js.
 *
 * Par defaut (aucun APIFY_TOKEN dans l'environnement, ou comptes_cibles vide
 * dans reglages-comptes.json -- les deux sont vrais au 11/09/2026), la
 * recherche de posts utilise le jeu fixture (fixtures/posts-exemple.json),
 * simulant une reponse reelle de l'acteur Apify harvestapi/linkedin-profile-posts.
 * Des que APIFY_TOKEN est fourni ET qu'un compte a des URLs dans
 * comptes_cibles, ce script appelle trouverPosts() pour de vrai a la place --
 * meme pipeline, donnees reelles, sans autre modification.
 *
 * La redaction du commentaire final (fixtures/redactions-exemple.json) est
 * ecrite a la main pour ce jeu de posts precis -- ce n'est pas une generation
 * automatique en JS : en usage reel c'est la session Claude qui invoque la
 * skill qui redige, poste par poste (SKILL.md, point 3).
 */
const fs = require('fs');
const path = require('path');
const { trierPosts, trouverPosts } = require('./lib/trouver-posts');
const reglages = require('./reglages-comptes.json');
const postsFixture = require('./fixtures/posts-exemple.json');
const redactionsExemple = require('./fixtures/redactions-exemple.json');

async function chargerPosts(config) {
  const urls = config.comptes_cibles || [];
  if (process.env.APIFY_TOKEN && urls.length > 0) {
    return { source: 'apify-reel', posts: await trouverPosts({ profileUrls: urls }) };
  }
  return {
    source: 'fixture (APIFY_TOKEN absent et/ou comptes_cibles vide -- voir fixtures/posts-exemple.json)',
    posts: postsFixture,
  };
}

async function executerPourCompte(compte, config) {
  const { source, posts } = await chargerPosts(config);
  const retenus = trierPosts(posts, { maxCommentaires: config.seuil_max_commentaires });
  const ecartes = posts.filter((p) => !retenus.includes(p)).map((p) => p.id);

  if (retenus.length === 0) {
    return { compte, source, nbPostsRecuperes: posts.length, retenus: [], ecartes, choisi: null };
  }

  const cible = retenus[0];
  const redactionsCompte = redactionsExemple[compte] || {};
  const contenuFinal = redactionsCompte[cible.id] || null;

  return {
    compte,
    source,
    nbPostsRecuperes: posts.length,
    nbPostsRetenus: retenus.length,
    ecartes,
    postCible: {
      id: cible.id,
      auteur: cible.authorName,
      url: cible.url,
      shareUrn: cible.shareUrn,
      postedAt: cible.postedAt,
      commentsCount: cible.commentsCount,
      texteOriginal: cible.text,
    },
    contenuFinal,
    actorUrn: config.actor_urn,
    argumentsPublierCommentaire: contenuFinal
      ? { actorUrn: config.actor_urn, targetUrn: cible.shareUrn, message: contenuFinal }
      : null,
    publicationReelle: 'NON EFFECTUEE -- dry run uniquement, publierCommentaire() jamais appele par ce script',
  };
}

async function main() {
  const resultats = {};
  for (const [compte, config] of Object.entries(reglages)) {
    resultats[compte] = await executerPourCompte(compte, config);
  }

  const sortiePath = path.join(__dirname, 'dry-run-sortie', 'commentaires-exemple.json');
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
