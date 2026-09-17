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

const { validerCommentaire } = require('../lib/valider-commentaire');
const { validerQuotaJournalier } = require('../lib/planifier-commentaires');
const { chargerRegistre, entreesDuJour, enregistrerCommentairePublie, normaliserCompte, validerJourISO } = require('../lib/registre');
const { trierPosts } = require('../lib/trouver-posts');

// --- Volet 1 : contournement des garde-fous de contenu -------------------

test('voix passive : "un projet a ete livre pour une equipe de 12" refuse sans anecdoteSourcee', () => {
  assert.throws(
    () => validerCommentaire({
      texte: 'Un projet a ete livre pour une equipe de douze personnes chez un client exigeant. Le rythme de travail a impressionne tout le monde.',
      genre: 'histoire_vecue',
    }),
    /experience professionnelle/
  );
});

test('voix passive acceptee si anecdoteSourcee: true (comportement voulu, pas casse par la correction)', () => {
  assert.doesNotThrow(() => validerCommentaire({
    texte: 'Un projet a été livré pour une équipe de douze personnes chez un client exigeant. Le rythme de travail a impressionné tout le monde.',
    genre: 'histoire_vecue',
    anecdoteSourcee: true,
  }));
});

test('commentaire vide reformule sur 2 phrases ("ca resonne"/"ca me parle") toujours refuse', () => {
  assert.throws(
    () => validerCommentaire({
      texte: 'Interessant comme approche, ca resonne avec ce qu\'on observe en ce moment. Ca me parle vraiment.',
      genre: 'desaccord_argumente',
    }),
    /formulation vide/
  );
});

test('une seule phrase-ouverture creuse suivie d\'un vrai contenu reste acceptee (pas de sur-blocage)', () => {
  assert.doesNotThrow(() => validerCommentaire({
    texte: 'Ça me parle beaucoup. Le vrai problème reste la formation des managers, pas les outils eux-mêmes.',
    genre: 'desaccord_argumente',
  }));
});

// --- Volet 1 : contournement du quota/registre par variation de cle ------

test('registre : compte "Julien-Agency" (casse differente) normalise vers "julien-agency", ne cree pas un historique separe', () => {
  const registre = { 'julien-agency': [{ date: '2026-09-15', auteurCible: 'marie-dupont' }] };
  // Avant correction : cle brute -> tableau vide, quota/anti-doublon silencieusement contournes.
  // Apres correction : la casse est normalisee, l'entree existante est bien retrouvee.
  assert.deepEqual(entreesDuJour(registre, 'Julien-Agency', '2026-09-15'), registre['julien-agency']);
});

test('registre : compte "julien_agency" (underscore) refuse plutot que de creer un historique separe', () => {
  const registre = { 'julien-agency': [{ date: '2026-09-15', auteurCible: 'marie-dupont' }] };
  assert.throws(() => entreesDuJour(registre, 'julien_agency', '2026-09-15'), /compte "julien_agency" inconnu/);
});

test('registre : quota reellement partage quelle que soit la casse d\'appel -- meme compte, meme historique', () => {
  const cheminRegistre = path.join(os.tmpdir(), `registre-commentaires-test-${Date.now()}.json`);
  try {
    enregistrerCommentairePublie('julien-agency', { date: '2026-09-15', auteurCible: 'a' }, cheminRegistre);
    enregistrerCommentairePublie('JULIEN-AGENCY', { date: '2026-09-15', auteurCible: 'b' }, cheminRegistre);
    const registre = chargerRegistre(cheminRegistre);
    // Une seule cle reelle dans le registre : les deux appels (casse differente)
    // ont bien accumule sur le MEME historique, pas deux historiques separes.
    assert.deepEqual(Object.keys(registre), ['julien-agency']);
    assert.equal(entreesDuJour(registre, 'julien-agency', '2026-09-15').length, 2);
  } finally {
    fs.rmSync(cheminRegistre, { force: true });
  }
});

/**
 * Non-regression 17/09/2026 (suite) -- ecart trouve entre le "10 commentaires"
 * du suivi de mission et les 5 entrees reelles du registre pour le 16/09/2026 :
 * `enregistrerCommentairePublie('julien-partners', ...)` acceptait n'importe
 * quel `compte` en texte libre, jamais confronte a l'identite LinkedIn
 * reellement utilisee. Un commentaire redige pour julien-partners mais
 * REELLEMENT publie sous l'identite julien-agency (le canal MCP resolvait
 * tout vers aFqu-W7ClW avant le 17/09/2026, voir references/actions-composio.md)
 * pouvait donc etre enregistre sous "julien-partners" -- son quota reel
 * (agency) n'en tenait jamais compte, rendant un depassement du quota
 * d'agency invisible au code tout en etant bien reel sur LinkedIn.
 */
test('reproduit le cas reel : commentaire redirige (redige pour partners, publie sous agency) refuse d\'etre enregistre sous le mauvais compte', () => {
  const cheminRegistre = path.join(os.tmpdir(), `registre-redirection-test-${Date.now()}.json`);
  try {
    // Avant la correction du 17/09/2026 (suite), cet appel reussissait
    // silencieusement : le commentaire etait compte dans le quota
    // "julien-partners" alors qu'il avait reellement publie sous l'identite
    // aFqu-W7ClW (julien-agency) -- le quota reel d'agency ne le voyait jamais.
    assert.throws(
      () => enregistrerCommentairePublie(
        'julien-partners',
        { date: '2026-09-16', auteurCible: 'Cible redirigee', postId: 'x', actorUrn: 'urn:li:person:aFqu-W7ClW' },
        cheminRegistre
      ),
      /le compte declare "julien-partners" ne correspond pas au compte reel "julien-agency"/
    );
    assert.equal(fs.existsSync(cheminRegistre), false, 'aucune entree ne doit etre ecrite quand le compte declare est faux');
  } finally {
    fs.rmSync(cheminRegistre, { force: true });
  }
});

test('un commentaire redirige, enregistre sous le VRAI compte (agency), compte bien dans SON quota et fait basculer le depassement', () => {
  const cheminRegistre = path.join(os.tmpdir(), `registre-redirection-quota-${Date.now()}.json`);
  try {
    // 5 commentaires "genuinement" agency, deja au quota.
    for (let i = 0; i < 5; i += 1) {
      enregistrerCommentairePublie(
        'julien-agency',
        { date: '2026-09-16', auteurCible: `Cible agency ${i}`, postId: `p${i}`, actorUrn: 'urn:li:person:aFqu-W7ClW' },
        cheminRegistre
      );
    }
    // Le commentaire redirige, correctement enregistre sous le VRAI compte
    // (agency, pas partners) : le registre reflete desormais 6 publications
    // reelles sous agency ce jour-la, au-dela du plafond de 5.
    enregistrerCommentairePublie(
      'julien-agency',
      { date: '2026-09-16', auteurCible: 'Cible redirigee', postId: 'p-redirige', actorUrn: 'urn:li:person:aFqu-W7ClW' },
      cheminRegistre
    );
    const registre = chargerRegistre(cheminRegistre);
    const entrees = entreesDuJour(registre, 'julien-agency', '2026-09-16');
    assert.equal(entrees.length, 6, 'le registre doit montrer le vrai total publie sous agency, au-dela du quota de 5');
    assert.throws(
      () => validerQuotaJournalier(entrees, { auteurCible: 'Une nouvelle cible' }),
      /quota journalier atteint \(6\/5/
    );
  } finally {
    fs.rmSync(cheminRegistre, { force: true });
  }
});

test('registre : date avec heure/fuseau refusee explicitement plutot que de fausser la comparaison', () => {
  const registre = { 'julien-agency': [{ date: '2026-09-15', auteurCible: 'x' }] };
  assert.throws(() => entreesDuJour(registre, 'julien-agency', '2026-09-15T18:00:00.000Z'), /hors du format attendu/);
  assert.throws(() => validerJourISO('2026-09-15 18:00', 'test'), /hors du format attendu/);
});

test('normaliserCompte accepte les deux comptes reels, refuse tout le reste', () => {
  assert.equal(normaliserCompte('julien-agency'), 'julien-agency');
  assert.equal(normaliserCompte('  Julien-Partners  '), 'julien-partners');
  assert.throws(() => normaliserCompte('page-claude'), /inconnu/);
});

// --- Volet 2 : donnees hostiles -------------------------------------------

test('registre corrompu (JSON invalide sur disque) refuse avec un message explicite, pas un SyntaxError brut', () => {
  const cheminCorrompu = path.join(os.tmpdir(), `registre-corrompu-${Date.now()}.json`);
  fs.writeFileSync(cheminCorrompu, '{ ceci n est pas du JSON valide');
  try {
    assert.throws(() => chargerRegistre(cheminCorrompu), /Registre illisible/);
  } finally {
    fs.rmSync(cheminCorrompu, { force: true });
  }
});

test('trierPosts ne plante pas sur un element null au milieu du tableau (reponse Apify malformee)', () => {
  const posts = [null, { id: 'ok', postedAt: '2026-09-15T00:00:00.000Z', commentsCount: 1 }];
  assert.doesNotThrow(() => {
    const retenus = trierPosts(posts, {});
    assert.deepEqual(retenus.map((p) => p.id), ['ok']);
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
  const { retrouverLigneCommentaire } = require('../lib/notion.js');
  await assert.rejects(
    () => retrouverLigneCommentaire({ dataSourceId: 'abc', auteurCible: 'x' }),
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
  // Chemin jetable : depuis le 17/09/2026 (suite), un echec est journalise dans
  // data/registre-echecs.json (lib/composio-canal.js) -- ne pas ecrire dans le vrai fichier ici.
  const cheminRegistreEchecs = path.join(os.tmpdir(), `registre-echecs-adversarial-${Date.now()}.json`);
  try {
    await assert.rejects(
      () => executerActionComposio('LINKEDIN_CREATE_COMMENT_ON_POST', { arguments: {}, apiKey: 'x', cheminRegistreEchecs }),
      /corps qui n'est pas du JSON exploitable/
    );
  } finally {
    fs.rmSync(cheminRegistreEchecs, { force: true });
  }
});
