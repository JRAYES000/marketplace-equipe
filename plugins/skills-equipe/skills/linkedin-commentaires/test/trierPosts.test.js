'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { trierPosts } = require('../lib/trouver-posts');

test('ecarte les carrousels (document.totalPageCount present)', () => {
  const posts = [
    { id: 'a', postedAt: '2026-09-09', commentsCount: 1 },
    { id: 'b', postedAt: '2026-09-10', commentsCount: 1, document: { totalPageCount: 4 } },
  ];
  const retenus = trierPosts(posts, { maxCommentaires: 30 });
  assert.deepEqual(retenus.map((p) => p.id), ['a']);
});

test('ecarte les posts au-dela du seuil de commentaires', () => {
  const posts = [
    { id: 'a', postedAt: '2026-09-09', commentsCount: 31 },
    { id: 'b', postedAt: '2026-09-08', commentsCount: 30 },
  ];
  const retenus = trierPosts(posts, { maxCommentaires: 30 });
  assert.deepEqual(retenus.map((p) => p.id), ['b']);
});

test('trie du plus recent au plus ancien', () => {
  const posts = [
    { id: 'ancien', postedAt: '2026-01-01', commentsCount: 0 },
    { id: 'recent', postedAt: '2026-09-09', commentsCount: 0 },
    { id: 'milieu', postedAt: '2026-05-01', commentsCount: 0 },
  ];
  const retenus = trierPosts(posts, { maxCommentaires: 30 });
  assert.deepEqual(retenus.map((p) => p.id), ['recent', 'milieu', 'ancien']);
});

test('conserve shareUrn (jamais une urn:li:activity:) pour les posts retenus', () => {
  const postsFixture = require('../fixtures/posts-exemple.json');
  const retenus = trierPosts(postsFixture, { maxCommentaires: 30 });
  for (const post of retenus) {
    assert.ok(post.shareUrn, `shareUrn manquant sur ${post.id}`);
    assert.match(post.shareUrn, /^urn:li:share:/);
  }
});

test('sur le jeu fixture reel : garde c1 et c4-plus-ancien, dans cet ordre', () => {
  const postsFixture = require('../fixtures/posts-exemple.json');
  const retenus = trierPosts(postsFixture, { maxCommentaires: 30 });
  assert.deepEqual(retenus.map((p) => p.id), ['c1', 'c4-plus-ancien']);
});

/**
 * Non-regression 17/09/2026 (suite) : un post dont l'auteur a un nom/URL
 * accentue ne doit jamais etre ecarte pour cette seule raison -- trierPosts
 * ne filtre que sur document.totalPageCount et commentsCount, jamais sur le
 * contenu du nom/URL d'auteur ; verifie explicitement apres qu'un bug de ce
 * type (mais dans un script d'analyse ponctuel, jamais ici) ait fait passer
 * des comptes accentues pour inactifs.
 */
test('ne filtre jamais un post sur la base d\'un nom/URL d\'auteur accentue', () => {
  const posts = [
    {
      id: 'accentue',
      postedAt: '2026-09-17T08:04:00.158Z',
      commentsCount: 1,
      authorName: 'Théophile Burnet ⚡️',
      authorUrl: 'https://www.linkedin.com/in/th%C3%A9ophile-burnet',
    },
  ];
  const retenus = trierPosts(posts, { maxCommentaires: 30 });
  assert.deepEqual(retenus.map((p) => p.id), ['accentue']);
});

/**
 * Non-regression 25/09/2026 : incident reel, un post du groupe "NBC Réseaux
 * d'Affaires" (id 9079228), le plus frais du jour pour julien-partners, a
 * ete retenu comme candidat prioritaire puis refuse par LinkedIn en
 * publication (403 CommentCreatePermission -- aucun compte n'a la permission
 * de commenter dans ce groupe). `estPostDeGroupe` doit ecarter ces posts des
 * `trierPosts`, avant meme le tri par fraicheur, pour qu'ils ne prennent plus
 * jamais la place d'un candidat reellement commentable.
 */
test('ecarte un post de groupe LinkedIn (shareUrn urn:li:groupPost:...)', () => {
  const posts = [
    {
      id: 'groupe-nbc',
      postedAt: '2026-09-25T13:24:30.865Z',
      commentsCount: 0,
      shareUrn: 'urn:li:groupPost:9079228-7509241424735858690',
      authorUrl: 'https://www.linkedin.com/groups/9079228',
    },
    {
      id: 'profil-normal',
      postedAt: '2026-09-24T13:37:18.641Z',
      commentsCount: 0,
      shareUrn: 'urn:li:ugcPost:7508882186008166400',
      authorUrl: 'https://www.linkedin.com/in/valentin--muller',
    },
  ];
  const retenus = trierPosts(posts, { maxCommentaires: 30 });
  assert.deepEqual(retenus.map((p) => p.id), ['profil-normal']);
});

test('ecarte un post de groupe repere seulement par authorUrl (shareUrn absent ou atypique)', () => {
  const posts = [
    {
      id: 'groupe-sans-shareUrn-typique',
      postedAt: '2026-09-25T09:24:47.298Z',
      commentsCount: 0,
      shareUrn: 'urn:li:groupPost:9079228-7509181095746138112',
      authorUrl: 'https://www.linkedin.com/groups/9079228?q=highlightedFeedForGroups',
    },
  ];
  const retenus = trierPosts(posts, { maxCommentaires: 30 });
  assert.deepEqual(retenus, []);
});
