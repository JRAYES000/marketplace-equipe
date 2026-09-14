'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validerEtConvertirPost,
  convertirGras,
} = require('../lib/valider-post');

/**
 * Brouillon conforme de reference -- 1413 caracteres, accroche interrogative
 * a 87 caracteres, 4 emojis en tete de bloc, 2 passages en gras sans accent,
 * 2 hashtags en fin, aucune formulation interdite. Sert de base saine a
 * partir de laquelle chaque test d'echec introduit UNE seule violation.
 */
const BROUILLON_CONFORME = `Pourquoi vos meilleurs candidats disparaissent-ils avant meme de recevoir votre offre ?

Rarement pour le salaire. Le plus souvent, ils partent pendant que votre process hesite encore, et personne ne s'en rend compte avant le refus.

🧭 **Trois signes** reviennent, encore et encore, chez les entreprises qui perdent leurs meilleurs profils avant l'offre.

📅 Aucun delai n'est jamais communique. Un candidat sans date de reponse suppose le pire et signe ailleurs.

🔁 Le meme entretien se rejoue deux fois. Si le second redemande ce que le premier savait deja, le message envoye est clair : personne ne pilote ce process.

🤐 Les candidats ecartes n'ont jamais de reponse. Un silence ne coute rien aujourd'hui. Il coute le prochain candidat, qui ne repondra meme plus a votre message la prochaine fois.

Le vrai cout n'est pas le poste vacant un mois de plus. C'est la reputation qui se construit, entretien apres entretien, chez des gens qui finissent toujours par se parler entre eux.

Une seule chose a changer suffit souvent : fixer une date de reponse a chaque etape, et la tenir vraiment, meme quand la decision n'est pas encore prise.

Le candidat qui reste a rarement recu la meilleure offre du marche. Il a recu, le **plus vite** possible, une reponse claire sur ou il en etait.

Et vous, sur votre dernier recrutement : combien de jours se sont ecoules entre deux nouvelles envoyees au candidat ?

#recrutement #rh`;

test('accepte le brouillon conforme et renvoie un texte converti en gras unicode', () => {
  const resultat = validerEtConvertirPost(BROUILLON_CONFORME);
  assert.ok(resultat.includes('𝐓𝐫𝐨𝐢𝐬 𝐬𝐢𝐠𝐧𝐞𝐬'), 'le gras doit etre converti en unicode');
  assert.ok(!resultat.includes('**'), 'aucune etoile ne doit subsister apres conversion');
});

test('refuse un gras accentue -- cas demande', () => {
  const brouillon = BROUILLON_CONFORME.replace('**Trois signes**', '**Trois signes déjà connus**');
  assert.throws(() => convertirGras(brouillon), /gras "Trois signes déjà connus" contient un accent/);
});

test('refuse un post sans aucun gras', () => {
  const sansGras = BROUILLON_CONFORME.replace(/\*\*/g, '');
  assert.throws(() => validerEtConvertirPost(sansGras), /aucun passage en gras/);
});

test('refuse deux emojis colles -- cas demande', () => {
  const brouillon = BROUILLON_CONFORME.replace('🧭 **Trois signes**', '🧭📅 **Trois signes**');
  assert.throws(() => validerEtConvertirPost(brouillon), /deux emojis se suivent/);
});

test('refuse un emoji au milieu d\'une phrase', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    'Rarement 🎯 pour le salaire.'
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /au milieu d'une phrase/);
});

test('refuse hors de la fourchette 3-5 emojis (0 emoji)', () => {
  const brouillon = BROUILLON_CONFORME
    .replace('🧭 ', '').replace('📅 ', '').replace('🔁 ', '').replace('🤐 ', '');
  assert.throws(() => validerEtConvertirPost(brouillon), /0 emoji\(s\) trouve\(s\)/);
});

test('refuse un post de 1200 caracteres (sous 1300) -- cas demande', () => {
  // Tronque le brouillon conforme a ~1200 caracteres de texte utile tout en
  // gardant sa structure (gras, emojis, accroche, hashtags finaux) intacte.
  const lignes = BROUILLON_CONFORME.split('\n');
  const derniereLigne = lignes.pop(); // hashtags
  let corps = lignes.join('\n');
  while ([...`${corps}\n${derniereLigne}`].length > 1200) {
    corps = corps.slice(0, -1);
  }
  const brouillonCourt = `${corps}\n${derniereLigne}`;
  assert.throws(() => validerEtConvertirPost(brouillonCourt), /attendu entre 1300 et 1900/);
});

test('refuse une accroche sans point d\'interrogation dans les 140 premiers caracteres', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Pourquoi vos meilleurs candidats disparaissent-ils avant meme de recevoir votre offre ?',
    'Vos meilleurs candidats disparaissent avant meme de recevoir votre offre, presque toujours en silence.'
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
  assert.throws(() => validerEtConvertirPost(brouillon), /ce n'est pas X, c'est Y/);
});

test('refuse un chiffre sans source attachee -- cas demande', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    '42% des candidats partent avant l\'offre.'
  );
  assert.throws(() => validerEtConvertirPost(brouillon), /n'a pas de source attachee/);
});

test('accepte un chiffre avec sa source attachee', () => {
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    '42% des candidats partent avant l\'offre (source : etude interne verifiable).'
  );
  assert.doesNotThrow(() => validerEtConvertirPost(brouillon));
});

test('n\'accuse pas a tort l\'annee ecrite a l\'interieur de sa propre citation', () => {
  // Regression : "2025" dans "(source : France Num, 2025)" est un chiffre
  // comme un autre pour la regex -- il ne doit pas exiger une SECONDE source.
  const brouillon = BROUILLON_CONFORME.replace(
    'Rarement pour le salaire.',
    "26% des TPE-PME francaises utilisent deja l'IA (source : France Num, 2025)."
  );
  assert.doesNotThrow(() => validerEtConvertirPost(brouillon));
});
