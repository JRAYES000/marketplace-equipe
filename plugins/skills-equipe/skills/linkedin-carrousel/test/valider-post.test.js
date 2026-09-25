'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validerEtConvertirPost,
  convertirGras,
} = require('../lib/valider-post');

/**
 * Brouillon conforme de reference -- reecrit le 25/09/2026 (retour de Julien :
 * un post de carrousel fait 5 lignes maximum, accroche/promesse/appel a
 * l'action, sans repeter le detail des diapos -- voir SKILL.md et
 * lib/valider-post.js). 4 lignes non vides, ~330 caracteres, accroche
 * interrogative a moins de 140 caracteres, 3 emojis en tete/fin de bloc,
 * 2 passages en gras sans accent, 2 hashtags en fin. Sert de base saine a
 * partir de laquelle chaque test d'echec introduit UNE seule violation.
 */
const BROUILLON_CONFORME = `Pourquoi vos meilleurs candidats disparaissent-ils avant l'offre ? 🧭

Rarement pour le salaire. Dans ce carrousel, **trois signes** qui trahissent un processus qui hésite. 📅

**Passez a l'action** : réservez votre audit gratuit de trente minutes. 👉

claudeagency.fr #recrutement #rh`;

test('accepte le brouillon conforme et renvoie un texte converti en gras unicode', () => {
  const resultat = validerEtConvertirPost(BROUILLON_CONFORME);
  assert.ok(resultat.includes('𝐭𝐫𝐨𝐢𝐬 𝐬𝐢𝐠𝐧𝐞𝐬'), 'le gras doit etre converti en unicode');
  assert.ok(!resultat.includes('**'), 'aucune etoile ne doit subsister apres conversion');
});

test('refuse un gras accentue -- cas demande', () => {
  const brouillon = BROUILLON_CONFORME.replace('**trois signes**', '**trois signes déjà là**');
  assert.throws(() => convertirGras(brouillon), /gras "trois signes déjà là" contient un accent/);
});

test('refuse un post sans aucun gras', () => {
  const sansGras = BROUILLON_CONFORME.replace(/\*\*/g, '');
  assert.throws(() => validerEtConvertirPost(sansGras), /aucun passage en gras/);
});

test('refuse deux emojis colles -- cas demande', () => {
  const brouillon = BROUILLON_CONFORME.replace("avant l'offre ? 🧭", "avant l'offre ? 🧭📅");
  assert.throws(() => validerEtConvertirPost(brouillon), /deux emojis se suivent/);
});

test('refuse un emoji au milieu d\'une phrase', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    'Rarement 🎯 pour le salaire.'
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /au milieu d'une phrase/);
});

test('refuse hors de la fourchette 3-6 emojis (0 emoji)', () => {
  const brouillon = BROUILLON_CONFORME.replace('🧭', '').replace('📅', '').replace('👉', '');
  assert.throws(() => validerEtConvertirPost(brouillon), /0 emoji\(s\) trouve\(s\)/);
});

test('refuse un post de moins de 60 caracteres -- cas demande', () => {
  assert.throws(
    () => validerEtConvertirPost("Salut ? **go** 🧭📅👉"),
    /caracteres, attendu entre 60 et 700/
  );
});

test('refuse un post de plus de 700 caracteres -- cas demande', () => {
  const rembourrage = 'Un mot de plus. '.repeat(40);
  const brouillon = BROUILLON_CONFORME.replace(
    'Dans ce carrousel, **trois signes** qui trahissent un processus qui hésite. 📅',
    `Dans ce carrousel, **trois signes** qui trahissent un processus qui hésite. ${rembourrage}📅`
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /attendu entre 60 et 700/);
});

test('refuse plus de 5 lignes de texte -- cas demande (retour de Julien du 25/09/2026)', () => {
  // BROUILLON_CONFORME a deja 4 lignes non vides -- en ajouter deux fait 6,
  // au-dela du maximum de 5 (une seule de plus, 5, resterait conforme).
  const brouillon = `${BROUILLON_CONFORME}\n\nUne cinquieme ligne.\n\nUne sixieme ligne de trop, qui repete le carrousel.`;
  assert.throws(() => validerEtConvertirPost(brouillon), /6 lignes de texte, maximum 5/);
});

test('une ligne blanche entre deux paragraphes ne compte pas comme une ligne', () => {
  // Le brouillon conforme a deja des lignes blanches entre ses 4 paragraphes --
  // s'il passait, une ligne blanche compterait a tort comme une ligne de texte.
  assert.doesNotThrow(() => validerEtConvertirPost(BROUILLON_CONFORME));
});

test('refuse une accroche sans point d\'interrogation dans les 140 premiers caracteres', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    "Pourquoi vos meilleurs candidats disparaissent-ils avant l'offre ? 🧭",
    "Vos meilleurs candidats disparaissent avant l'offre, presque toujours en silence. 🧭"
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /aucun point d'interrogation/);
});

test('refuse plus de 2 hashtags en fin de post', () => {
  const brouillon = BROUILLON_CONFORME.replace('#recrutement #rh', '#recrutement #rh #dirigeants');
  assert.throws(() => validerEtConvertirPost(brouillon), /maximum 2/);
});

test('refuse des hashtags places ailleurs qu\'en toute fin', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    'Rarement pour le #salaire.'
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /uniquement regroupes a la toute fin/);
});

test('refuse un tiret long explicitement interdit', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    'Rarement pour le salaire -- rarement.'
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /tiret long/);
});

test('refuse une demande d\'engagement explicite', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    'Commentez OUI si vous etes concerne.'
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /demande d'engagement/);
});

test('refuse "ce n\'est pas X, c\'est Y"', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    "Ce n'est pas une question de salaire, c'est une question de delai."
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /ce n'est pas X, c'est\/mais plutot Y/);
});

test('refuse un chiffre sans source attachee -- cas demande', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    "42% des candidats partent avant l'offre."
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /n'a pas de source attachee/);
});

test('accepte un chiffre avec sa source attachee', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    "42% des candidats partent avant l'offre (source : étude interne vérifiable)."
  );
  assert.doesNotThrow(() => validerEtConvertirPost(brouillon));
});

test('n\'accuse pas a tort l\'annee ecrite a l\'interieur de sa propre citation', () => {
  // Regression : "2025" dans "(source : France Num, 2025)" est un chiffre
  // comme un autre pour la regex -- il ne doit pas exiger une SECONDE source.
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    "26% des TPE-PME françaises utilisent déjà l'IA (source : France Num, 2025)."
  );
  assert.doesNotThrow(() => validerEtConvertirPost(brouillon));
});

/**
 * Affinement du 21/09/2026 (post de veille Allie K. Miller) : la source collee n'est exigee
 * que pour un chiffre-PREUVE ; un chiffre-ANECDOTE (age, annee/date, duree, nombre de
 * personnes) passe avec une ligne "Source : ..." unique en fin de post.
 */
const AJOUT_ANECDOTE = "Une aidante familiale de 79 ans a suivi l'atelier pendant 4 semaines avec 12 personnes en salle, le 17/09/2026.";
const AVEC_LIGNE_SOURCE = (b) => b.replace(
  '\n\nclaudeagency.fr #recrutement #rh',
  "\n\nSource : post LinkedIn d'Allie K. Miller, 17/09/2026.\n\nclaudeagency.fr #recrutement #rh"
);

test('chiffre-anecdote (age, duree, nombre de personnes, date) sans source collee mais avec ligne Source finale : passe', () => {
  const brouillon = AVEC_LIGNE_SOURCE(BROUILLON_CONFORME.replace('Rarement pour le salaire.', AJOUT_ANECDOTE));
  assert.doesNotThrow(() => validerEtConvertirPost(brouillon));
});

test('chiffre-anecdote en gras Unicode ("**79 ans**") reconnu comme detail d\'anecdote avec ligne Source finale', () => {
  const brouillon = AVEC_LIGNE_SOURCE(BROUILLON_CONFORME.replace('Rarement pour le salaire.', 'Une aidante de **79 ans** a suivi l\'atelier.'));
  assert.doesNotThrow(() => validerEtConvertirPost(brouillon));
});

test('chiffre-anecdote SANS ligne Source finale : refuse (la dispense exige la ligne Source)', () => {
  const brouillon = BROUILLON_CONFORME.replace('Rarement pour le salaire.', AJOUT_ANECDOTE);
  assert.throws(() => validerEtConvertirPost(brouillon), /n'a pas de source attachee/);
});

test('chiffre-preuve (pourcentage) sans source collee : refuse MEME avec une ligne Source finale', () => {
  const brouillon = AVEC_LIGNE_SOURCE(BROUILLON_CONFORME.replace('Rarement pour le salaire.', "42% des candidats partent avant l'offre."));
  assert.throws(() => validerEtConvertirPost(brouillon), /n'a pas de source attachee/);
});

test('chiffre-preuve (volume "16 541 offres", "+2000%") sans source collee : refuse meme avec ligne Source finale', () => {
  const volume = AVEC_LIGNE_SOURCE(BROUILLON_CONFORME.replace('Rarement pour le salaire.', 'Les mentions passent a 16 541 offres.'));
  assert.throws(() => validerEtConvertirPost(volume), /n'a pas de source attachee/);
  const hausse = AVEC_LIGNE_SOURCE(BROUILLON_CONFORME.replace('Rarement pour le salaire.', 'Les postes ont bondi de +2000%.'));
  assert.throws(() => validerEtConvertirPost(hausse), /n'a pas de source attachee/);
});

test('"N personnes" dans une phrase de sondage reste une donnee d\'etude : refuse meme avec ligne Source finale', () => {
  const brouillon = AVEC_LIGNE_SOURCE(BROUILLON_CONFORME.replace('Rarement pour le salaire.', 'Un sondage a interroge 1 000 personnes.'));
  assert.throws(() => validerEtConvertirPost(brouillon), /n'a pas de source attachee/);
});

test('une ligne Source finale vague ("Source : une etude") ne dispense de rien', () => {
  const brouillon = BROUILLON_CONFORME
    .replace('Rarement pour le salaire.', AJOUT_ANECDOTE)
    .replace('\n\nclaudeagency.fr #recrutement #rh', '\n\nSource : une etude\n\nclaudeagency.fr #recrutement #rh');
  assert.throws(() => validerEtConvertirPost(brouillon), /n'a pas de source attachee/);
});
