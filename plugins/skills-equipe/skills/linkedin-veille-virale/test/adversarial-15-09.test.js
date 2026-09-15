'use strict';

/**
 * Non-regression : failles reellement reproduites lors de l'audit adversarial
 * et de robustesse du 15/09/2026 (sous-agent dedie + tests directs), toutes
 * corrigees le meme jour. Chaque test ici reproduit exactement l'entree qui
 * passait a travers le garde-fou AVANT la correction.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { validerQuotaHebdomadaire } = require('../lib/planifier-veille');
const { chargerRegistre, entreesDeLaSemaine, enregistrerPostPublie, normaliserCompte, validerJourISO } = require('../lib/registre');
const { trierPosts } = require('../lib/veille');

// --- Volet 1 : contournement du quota/registre par variation de cle ------

test('registre : compte "Julien-Agency" (casse differente) normalise vers "julien-agency", ne cree pas un historique separe', () => {
  const registre = { 'julien-agency': [{ date: '2026-09-15' }, { date: '2026-09-16' }, { date: '2026-09-17' }] };
  const entrees = entreesDeLaSemaine(registre, 'Julien-Agency', '2026-09-18');
  assert.equal(entrees.length, 3);
  assert.throws(() => validerQuotaHebdomadaire(entrees, { date: '2026-09-18' }), /quota hebdomadaire atteint \(3\/3/);
});

test('registre : compte "julien_agency" (underscore) refuse -- ne fragmente jamais silencieusement le quota', () => {
  const registre = { 'julien-agency': [{ date: '2026-09-15' }] };
  assert.throws(() => entreesDeLaSemaine(registre, 'julien_agency', '2026-09-16'), /compte "julien_agency" inconnu/);
});

test('registre : quota reellement partage quelle que soit la casse d\'appel -- meme compte, meme historique', () => {
  const cheminRegistre = path.join(os.tmpdir(), `registre-veille-test-${Date.now()}.json`);
  try {
    enregistrerPostPublie('julien-agency', { date: '2026-09-15' }, cheminRegistre);
    enregistrerPostPublie('JULIEN-AGENCY', { date: '2026-09-16' }, cheminRegistre);
    const registre = chargerRegistre(cheminRegistre);
    assert.deepEqual(Object.keys(registre), ['julien-agency']);
    assert.equal(entreesDeLaSemaine(registre, 'julien-agency', '2026-09-16').length, 2);
  } finally {
    fs.rmSync(cheminRegistre, { force: true });
  }
});

test('validerQuotaHebdomadaire : date avec heure/fuseau refusee explicitement plutot que de fausser "meme jour"', () => {
  const entreesSemaine = [{ date: '2026-09-15' }];
  // Avant correction : "2026-09-15T18:00:00.000Z" !== "2026-09-15" (egalite stricte) -->
  // un 2e post le meme jour calendaire passait silencieusement.
  assert.throws(
    () => validerQuotaHebdomadaire(entreesSemaine, { date: '2026-09-15T18:00:00.000Z' }),
    /hors du format attendu/
  );
  assert.throws(() => validerJourISO('2026-09-15 18:00', 'test'), /hors du format attendu/);
});

test('normaliserCompte accepte les deux comptes reels, refuse tout le reste', () => {
  assert.equal(normaliserCompte('julien-partners'), 'julien-partners');
  assert.equal(normaliserCompte('  Julien-Agency  '), 'julien-agency');
  assert.throws(() => normaliserCompte('page-claude'), /inconnu/);
});

// --- Volet 2 : donnees hostiles -------------------------------------------

test('registre corrompu (JSON invalide sur disque) refuse avec un message explicite, pas un SyntaxError brut', () => {
  const cheminCorrompu = path.join(os.tmpdir(), `registre-veille-corrompu-${Date.now()}.json`);
  fs.writeFileSync(cheminCorrompu, '{ ceci n est pas du JSON valide');
  try {
    assert.throws(() => chargerRegistre(cheminCorrompu), /Registre illisible/);
  } finally {
    fs.rmSync(cheminCorrompu, { force: true });
  }
});

test('trierPosts ne plante pas sur un element null au milieu du tableau (reponse Apify malformee)', () => {
  const posts = [
    null,
    { id: 'ok', authorPublicIdentifier: 'x', postedAt: new Date().toISOString(), reactionsCount: 100, commentsCount: 10, sharesCount: 5 },
  ];
  assert.doesNotThrow(() => {
    trierPosts(posts, { seuilScore: 0, coefficients: { reactions: 1, commentaires: 3, partages: 5 }, abonnesParIdentifiant: { x: 1000 } });
  });
});

test('appelNotion (via lib/notion.js) refuse proprement sur une reponse 500 non-JSON, pas un SyntaxError brut', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => '<html><body>Internal Server Error</body></html>',
  });
  process.env.NOTION_TOKEN = 'faux-jeton-test';
  delete require.cache[require.resolve('../lib/notion.js')];
  const { retrouverEntreeParTitre } = require('../lib/notion.js');
  await assert.rejects(
    () => retrouverEntreeParTitre({ dataSourceId: 'abc', titre: 'Test' }),
    /corps qui n'est pas du JSON exploitable/
  );
});

test('executerActionComposio refuse proprement sur une reponse 429 non-JSON, pas un SyntaxError brut', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 429,
    text: async () => 'Too Many Requests',
  });
  delete require.cache[require.resolve('../lib/composio.js')];
  const { executerActionComposio } = require('../lib/composio.js');
  await assert.rejects(
    () => executerActionComposio('LINKEDIN_CREATE_LINKED_IN_POST', { arguments: {}, apiKey: 'x' }),
    /corps qui n'est pas du JSON exploitable/
  );
});
