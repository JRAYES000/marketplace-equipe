'use strict';

/**
 * Recupere les posts recents des comptes cibles via l'acteur Apify
 * harvestapi/linkedin-profile-posts, pour y trouver des posts a commenter.
 *
 * Le champ attendu par l'acteur est bien `targetUrls`, pas `profiles` --
 * avec `profiles` l'acteur renvoie zero post sans aucune erreur (piege deja
 * documente dans visibilite-ops, routines/commentaires-linkedin.md).
 */
/**
 * Normalise un item brut renvoye par harvestapi/linkedin-profile-posts vers
 * la forme plate attendue par trierPosts/dry-run.js/lib/planifier-commentaires.js.
 *
 * Ecart reel trouve le 14/09/2026 au premier appel reel de ce paquet contre
 * l'acteur (jamais detecte avant, car dry-run.js tournait uniquement contre
 * fixtures/posts-exemple.json, deja ecrit dans la forme plate suppose) :
 * `author.name` (pas `authorName`), `content` (pas `text`), `postedAt.date`
 * (objet imbrique, pas une chaine ISO directe), `engagement.comments` (pas
 * `commentsCount`). `shareUrn` et `document.totalPageCount`, en revanche,
 * sont bien au niveau attendu -- verifie sur un vrai post carrousel recu.
 */
function normaliserPost(brut) {
  return {
    id: brut.id,
    authorName: brut.author && brut.author.name,
    authorUrl: brut.author && brut.author.linkedinUrl,
    shareUrn: brut.shareUrn,
    url: brut.linkedinUrl,
    text: brut.content,
    postedAt: brut.postedAt && brut.postedAt.date,
    commentsCount: brut.engagement && brut.engagement.comments,
    document: brut.document,
  };
}

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
  const bruts = await reponse.json();
  // Audit adversarial du 15/09/2026 : un `.map` direct sur une reponse qui
  // n'est PAS un tableau (Apify renvoyant un objet d'erreur avec status 200,
  // par exemple) plantait avec "bruts.map is not a function" -- message brut
  // sans aucune indication de la cause reelle.
  if (!Array.isArray(bruts)) {
    throw new Error(
      `Apify a repondu 200 mais le corps n'est pas un tableau de posts (recu : ${typeof bruts}). ` +
      `Contenu recu : ${JSON.stringify(bruts).slice(0, 200)}.`
    );
  }
  return bruts.map(normaliserPost);
}

/**
 * Tri : ecarte les carrousels (repere mecanique : document.totalPageCount
 * present -- leur contenu vit dans les pages, pas dans le texte du post, donc
 * commenter dessus reviendrait a commenter un post non lu), et les posts
 * au-dela du seuil de commentaires configure. Garde `shareUrn`, qui est ce
 * qu'il faut passer tel quel en `object` et `target_urn` de
 * LINKEDIN_CREATE_COMMENT_ON_POST -- une URN `urn:li:activity:` est refusee
 * par l'API.
 *
 * Audit adversarial du 15/09/2026 : un element `null`/non-objet au milieu du
 * tableau (reponse Apify malformee) plantait avec un TypeError brut
 * ("Cannot read properties of null") des le premier filtre -- ecarte
 * desormais explicitement plutot que de faire planter tout le passage pour
 * un seul post malforme parmi d'autres valides.
 */
function trierPosts(posts, { maxCommentaires = 30 } = {}) {
  return posts
    .filter((post) => post !== null && typeof post === 'object')
    .filter((post) => !(post.document && typeof post.document.totalPageCount === 'number'))
    .filter((post) => (post.commentsCount ?? 0) <= maxCommentaires)
    .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
}

module.exports = { trouverPosts, trierPosts, normaliserPost };
