const test = require('node:test');
const assert = require('node:assert/strict');

// Un script de creation de lignes Notion a plante (30/09/2026) : lib/notion.js
// definit appelNotion mais ne l'exportait pas, donc `const { appelNotion } = require(...)`
// donnait `undefined`.
test('lib/notion.js exporte appelNotion comme fonction', () => {
  delete require.cache[require.resolve('../lib/notion.js')];
  const notion = require('../lib/notion.js');
  assert.equal(typeof notion.appelNotion, 'function');
});

test('appelNotion exporte garde son comportement : jeton absent leve avant tout appel reseau', async () => {
  const ancienJeton = process.env.NOTION_TOKEN;
  const ancienFetch = global.fetch;
  delete process.env.NOTION_TOKEN;
  let fetchAppele = false;
  global.fetch = async () => {
    fetchAppele = true;
    return { ok: true, status: 200, text: async () => '{}' };
  };
  try {
    delete require.cache[require.resolve('../lib/notion.js')];
    const { appelNotion } = require('../lib/notion.js');
    await assert.rejects(() => appelNotion('/pages'));
    assert.equal(fetchAppele, false);
  } finally {
    global.fetch = ancienFetch;
    if (ancienJeton !== undefined) process.env.NOTION_TOKEN = ancienJeton;
  }
});
