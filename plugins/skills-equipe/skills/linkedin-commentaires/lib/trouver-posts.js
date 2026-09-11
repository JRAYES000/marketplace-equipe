'use strict';

/**
 * Recupere les posts recents des comptes cibles via l'acteur Apify
 * harvestapi/linkedin-profile-posts, pour y trouver des posts a commenter.
 *
 * Le champ attendu par l'acteur est bien `targetUrls`, pas `profiles` --
 * avec `profiles` l'acteur renvoie zero post sans aucune erreur (piege deja
 * documente dans visibilite-ops, routines/commentaires-linkedin.md).
 */
async function trouverPosts({
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
 * present -- leur contenu vit dans les pages, pas dans le texte du post, donc
 * commenter dessus reviendrait a commenter un post non lu), et les posts
 * au-dela du seuil de commentaires configure. Garde `shareUrn`, qui est ce
 * qu'il faut passer tel quel en `object` et `target_urn` de
 * LINKEDIN_CREATE_COMMENT_ON_POST -- une URN `urn:li:activity:` est refusee
 * par l'API.
 */
function trierPosts(posts, { maxCommentaires = 30 } = {}) {
  return posts
    .filter((post) => !(post.document && typeof post.document.totalPageCount === 'number'))
    .filter((post) => (post.commentsCount ?? 0) <= maxCommentaires)
    .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
}

module.exports = { trouverPosts, trierPosts };
