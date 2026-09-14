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
/**
 * Normalise un item brut renvoye par harvestapi/linkedin-profile-posts vers
 * la forme plate attendue par trierPosts/dry-run.js.
 *
 * Meme ecart que celui trouve et corrige le 14/09/2026 dans
 * linkedin-commentaires/lib/trouver-posts.js (jamais detecte ici, car
 * dry-run.js tournait uniquement contre fixtures/posts-exemple.json, deja
 * ecrit dans la forme plate supposee) : `author.name` (pas `authorName`),
 * `content` (pas `text`), `postedAt.date` (objet imbrique, pas une chaine
 * ISO directe), `engagement.comments` (pas `commentsCount`). `shareUrn` et
 * `document.totalPageCount` sont bien au niveau attendu.
 */
function normaliserPost(brut) {
  return {
    id: brut.id,
    authorName: brut.author && brut.author.name,
    authorUrl: brut.author && brut.author.linkedinUrl,
    authorPublicIdentifier: brut.author && brut.author.publicIdentifier,
    shareUrn: brut.shareUrn,
    url: brut.linkedinUrl,
    text: brut.content,
    postedAt: brut.postedAt && brut.postedAt.date,
    commentsCount: brut.engagement && brut.engagement.comments,
    reactionsCount: brut.engagement && brut.engagement.likes,
    sharesCount: brut.engagement && brut.engagement.shares,
    document: brut.document,
  };
}

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
  const bruts = await reponse.json();
  return bruts.map(normaliserPost);
}

/**
 * Score d'engagement du brief (section 5) :
 * (reactions + coeff_commentaires*commentaires + coeff_partages*partages) / abonnes.
 * `abonnesParIdentifiant` associe `authorPublicIdentifier` (ex. "emollick") au nombre
 * d'abonnes de ce compte -- l'acteur Apify ne renvoie jamais ce chiffre dans la reponse
 * d'un post, verifie sur un echantillon reel le 14/09/2026 (voir
 * references/comptes-a-surveiller-veille-20260914.md pour la source de ces chiffres).
 * Renvoie `null` (jamais 0, qui se confondrait avec un vrai score nul) si les abonnes du
 * compte sont inconnus -- le post est alors ecarte par `trierPosts`, pas score a 0.
 */
function calculerScore(post, { coefficients, abonnesParIdentifiant }) {
  const abonnes = abonnesParIdentifiant && abonnesParIdentifiant[post.authorPublicIdentifier];
  if (!abonnes) return null;
  const reactions = post.reactionsCount ?? 0;
  const commentaires = post.commentsCount ?? 0;
  const partages = post.sharesCount ?? 0;
  const numerateur =
    reactions * coefficients.reactions +
    commentaires * coefficients.commentaires +
    partages * coefficients.partages;
  return numerateur / abonnes;
}

/**
 * Tri : ecarte les carrousels (repere mecanique : document.totalPageCount present
 * dans la reponse de l'acteur -- leur contenu vit dans les pages, pas dans le texte
 * du post), puis ne garde que les posts a la fois plus frais que `fenetreJours` et
 * dont le score d'engagement (voir calculerScore) depasse `seuilScore` -- les deux
 * conditions du brief (section 5), pas l'une ou l'autre. Un post dont l'auteur n'a
 * pas d'abonnes connus dans `abonnesParIdentifiant` est ecarte plutot que suppose
 * "assez bon" ou "pas assez bon". Le reste est trie par score decroissant : le
 * meilleur candidat a recycler en premier (dry-run.js/SKILL.md choisissent toujours
 * `retenus[0]`).
 */
function trierPosts(
  posts,
  { seuilScore, coefficients, fenetreJours = 7, abonnesParIdentifiant = {}, maintenant = new Date() } = {}
) {
  return posts
    .filter((post) => !(post.document && typeof post.document.totalPageCount === 'number'))
    .filter((post) => {
      if (!post.postedAt) return false;
      const ageJours = (maintenant - new Date(post.postedAt)) / (1000 * 60 * 60 * 24);
      return ageJours >= 0 && ageJours <= fenetreJours;
    })
    .map((post) => ({ post, score: calculerScore(post, { coefficients, abonnesParIdentifiant }) }))
    .filter(({ score }) => score !== null && score > seuilScore)
    .sort((a, b) => b.score - a.score)
    .map(({ post, score }) => ({ ...post, score }));
}

module.exports = { recupererPosts, trierPosts, normaliserPost, calculerScore };
