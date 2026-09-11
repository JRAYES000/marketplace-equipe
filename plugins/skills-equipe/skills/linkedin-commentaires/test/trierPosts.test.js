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
