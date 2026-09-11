'use strict';

/**
 * Recupere les posts recents des comptes suivis via l'acteur Apify
 * harvestapi/linkedin-profile-posts, et les trie pour ne garder que ceux qui
 * valent une reaction (post inspire / recycle).
 *
 * Le champ attendu par l'acteur est bien `targetUrls`, pas `profiles` --
 * avec `profiles` l'acteur renvoie zero post sans aucune erreur (piege deja
 * documente dans visibilite-ops, routines/commentaires-linkedin.md).
 */
async function recupererPosts({
  profileUrls,
  maxPosts = 5,
  postedLimit = 'week',
  includeReposts = false,
  apifyToken,
} = {}) {
  const token = apifyToken || process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN manquant (variable d\'environnement ou parametre apifyToken).');
  }
  if (!Array.isArray(profileUrls) || profileUrls.length === 0) {
    throw new Error('profileUrls doit etre un tableau non vide d\'URL de profils LinkedIn.');
  }

  const url = `https://api.apify.com/v2/acts/harvestapi~linkedin-profile-posts/run-sync-get-dataset-items?token=${token}`;
  const reponse = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUrls: profileUrls, maxPosts, postedLimit, includeReposts }),
  });

  if (!reponse.ok) {
    const texte = await reponse.text();
    throw new Error(`Apify a repondu ${reponse.status} : ${texte}`);
  }
  return reponse.json();
}

/**
 * Tri : ecarte les carrousels (repere mecanique : document.totalPageCount
 * present dans la reponse de l'acteur -- leur contenu vit dans les pages, pas
 * dans le texte du post) et les posts au-dela du seuil de commentaires
 * configure (au-dela, un fil est deja trop encombre pour y gagner en
 * visibilite). Le reste est trie du plus recent au plus ancien.
 */
function trierPosts(posts, { maxCommentaires = 30 } = {}) {
  return posts
    .filter((post) => !(post.document && typeof post.document.totalPageCount === 'number'))
    .filter((post) => (post.commentsCount ?? 0) <= maxCommentaires)
    .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
}

module.exports = { recupererPosts, trierPosts };
