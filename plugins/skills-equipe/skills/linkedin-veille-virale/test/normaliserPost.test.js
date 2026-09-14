'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normaliserPost } = require('../lib/veille');

// Forme reelle renvoyee par harvestapi/linkedin-profile-posts, meme forme
// que celle observee le 14/09/2026 dans linkedin-commentaires -- champs non
// pertinents omis, identifiants factices.
const BRUT_EXEMPLE = {
  id: '7504102064814268416',
  linkedinUrl: 'https://www.linkedin.com/posts/exemple_activity-7504102064814268416',
  content: "Texte du post d'exemple.",
  author: {
    name: 'Exemple Auteur',
    linkedinUrl: 'https://www.linkedin.com/in/exemple-auteur',
  },
  postedAt: {
    timestamp: 1789117351726,
    date: '2026-09-11T09:02:31.726Z',
    postedAgoShort: '3d',
  },
  shareUrn: 'urn:li:share:7504102064151674880',
  engagement: { id: '7504102064814268416', likes: 3, comments: 2, shares: 0 },
};

test('normalise la forme reelle Apify vers la forme plate attendue par trierPosts/dry-run.js', () => {
  const post = normaliserPost(BRUT_EXEMPLE);
  assert.equal(post.authorName, 'Exemple Auteur');
  assert.equal(post.text, "Texte du post d'exemple.");
  assert.equal(post.postedAt, '2026-09-11T09:02:31.726Z');
  assert.equal(post.commentsCount, 2);
  assert.equal(post.shareUrn, 'urn:li:share:7504102064151674880');
  assert.equal(post.id, '7504102064814268416');
});

test('conserve document.totalPageCount tel quel (deja au bon niveau dans la forme brute)', () => {
  const brutCarrousel = { ...BRUT_EXEMPLE, document: { totalPageCount: 8 } };
  const post = normaliserPost(brutCarrousel);
  assert.equal(post.document.totalPageCount, 8);
});

test("ne plante pas si author/postedAt/engagement sont absents -- cas demande", () => {
  const post = normaliserPost({ id: 'x', shareUrn: 'urn:li:share:x' });
  assert.equal(post.authorName, undefined);
  assert.equal(post.postedAt, undefined);
  assert.equal(post.commentsCount, undefined);
});
