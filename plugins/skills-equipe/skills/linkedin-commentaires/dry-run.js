'use strict';

/**
 * Execution a blanc, de bout en bout, de linkedin-commentaires -- jusqu'au(x)
 * texte(s) final(aux) des commentaires tels qu'ils seraient publies -- SANS
 * jamais appeler publierCommentaire(). Ce module n'importe meme pas
 * lib/publier-commentaire.js.
 *
 * Pipeline complet (brief du 10/09/2026, section 6) :
 *   1. chargerPosts -- Apify reel si APIFY_TOKEN + comptes_cibles remplis,
 *      sinon fixtures/posts-exemple.json.
 *   2. trierPosts -- ecarte carrousels et posts trop commentes, trie par
 *      date decroissante (lib/trouver-posts.js, inchange).
 *   3. filtrerPostsFrais -- ne garde que les posts de moins de 4h (priorite a
 *      la fraicheur, pas a la popularite -- lib/planifier-commentaires.js).
 *   4. Quota journalier -- lit le registre reel des commentaires deja publies
 *      aujourd'hui pour ce compte (lib/registre.js), exclut les auteurs deja
 *      commentes, s'arrete au quota de 5/jour.
 *   5. Redaction -- fixture pour ce dry run (fixtures/redactions-exemple.json,
 *      genre tague) ; en usage reel c'est la session Claude qui invoque la
 *      skill qui redige, poste par poste (SKILL.md, point 3).
 *   6. validerCommentaire -- refuse (jamais un avertissement) tout brouillon
 *      hors des regles de forme/genre avant de l'inclure dans le resultat.
 *
 * La redaction du commentaire final (fixtures/redactions-exemple.json) est
 * ecrite a la main pour ce jeu de posts precis -- ce n'est pas une generation
 * automatique en JS.
 */
const fs = require('fs');
const path = require('path');
const { trierPosts, trouverPosts } = require('./lib/trouver-posts');
const { filtrerPostsFrais, validerQuotaJournalier, dateJourISO, QUOTA_MAX_PAR_JOUR } = require('./lib/planifier-commentaires');
const { validerCommentaire } = require('./lib/valider-commentaire');
const { chargerRegistre, entreesDuJour } = require('./lib/registre');
const reglages = require('./reglages-comptes.json');
const postsFixture = require('./fixtures/posts-exemple.json');
const redactionsExemple = require('./fixtures/redactions-exemple.json');

async function chargerPosts(config) {
  const urls = config.comptes_cibles || [];
  if (process.env.APIFY_TOKEN && urls.length > 0) {
    return { source: 'apify-reel', posts: await trouverPosts({ profileUrls: urls }) };
  }
  return {
    source: 'fixture (APIFY_TOKEN absent et/ou comptes_cibles vide -- voir fixtures/posts-exemple.json)',
    posts: postsFixture,
  };
}

async function executerPourCompte(compte, config, { maintenant = new Date(), cheminRegistre } = {}) {
  const { source, posts } = await chargerPosts(config);
  const apresTri = trierPosts(posts, { maxCommentaires: config.seuil_max_commentaires });
  const frais = filtrerPostsFrais(apresTri, maintenant);
  const ecartesFraicheur = apresTri.filter((p) => !frais.includes(p)).map((p) => p.id);

  const registre = chargerRegistre(cheminRegistre);
  const entreesExistantes = entreesDuJour(registre, compte, dateJourISO(maintenant));
  const entreesSimulees = [...entreesExistantes];

  const redactionsCompte = redactionsExemple[compte] || {};
  const candidats = [];
  const refuses = [];

  for (const post of frais) {
    if (entreesSimulees.length >= QUOTA_MAX_PAR_JOUR) break;

    const redaction = redactionsCompte[post.id];
    if (!redaction) continue; // pas de contenu redige pour ce post dans ce jeu

    try {
      validerQuotaJournalier(entreesSimulees, { auteurCible: post.authorName });
      validerCommentaire({ texte: redaction.texte, genre: redaction.genre });
    } catch (err) {
      refuses.push({ postId: post.id, raison: err.message });
      continue;
    }

    candidats.push({
      postCible: {
        id: post.id,
        auteur: post.authorName,
        url: post.url,
        shareUrn: post.shareUrn,
        postedAt: post.postedAt,
        commentsCount: post.commentsCount,
        texteOriginal: post.text,
      },
      genre: redaction.genre,
      contenuFinal: redaction.texte,
      argumentsPublierCommentaire: { actorUrn: config.actor_urn, targetUrn: post.shareUrn, message: redaction.texte },
    });
    entreesSimulees.push({ date: dateJourISO(maintenant), auteurCible: post.authorName });
  }

  const resultat = {
    compte,
    source,
    nbPostsRecuperes: posts.length,
    nbPostsRetenusApresTri: apresTri.length,
    nbPostsFrais: frais.length,
    ecartesFraicheur,
    quotaDejaUtiliseAujourdhui: entreesExistantes.length,
    quotaRestant: Math.max(0, QUOTA_MAX_PAR_JOUR - entreesExistantes.length),
    candidats,
    refuses,
    publicationReelle: 'NON EFFECTUEE -- dry run uniquement, publierCommentaire() jamais appele par ce script',
  };

  // Regle 5 du brief ("jamais les mains vides") : jamais un resultat vide
  // silencieux -- si rien n'est retenu, dire pourquoi et proposer un repli
  // concret plutot qu'un tableau candidats vide sans explication.
  if (candidats.length === 0) {
    if (posts.length === 0) {
      resultat.repli = `Aucun post recupere pour ${compte} -- comptes_cibles est probablement vide ou injoignable. Verifier reglages-comptes.json et APIFY_TOKEN avant de relancer.`;
    } else if (frais.length === 0) {
      resultat.repli = `Aucun post de moins de 4h trouve parmi les ${apresTri.length} post(s) retenus pour ${compte}. Repli propose : reessayer au prochain passage (2 par jour prevus), ou, si le delai presse, commenter malgre tout le plus recent disponible en signalant explicitement qu'il depasse la fenetre de fraicheur -- decision a valider par Julien, pas automatique.`;
    } else if (entreesExistantes.length >= QUOTA_MAX_PAR_JOUR) {
      resultat.repli = `Quota journalier deja atteint pour ${compte} (${entreesExistantes.length}/${QUOTA_MAX_PAR_JOUR}). Rien a faire de plus aujourd'hui pour ce compte.`;
    } else {
      resultat.repli = `Posts frais disponibles pour ${compte}, mais aucune redaction correspondante dans ce jeu de donnees (voir "refuses" pour le detail). En usage reel, c'est la session Claude qui redige a la volee pour chaque post retenu.`;
    }
  }

  return resultat;
}

async function main() {
  const resultats = {};
  for (const [compte, config] of Object.entries(reglages)) {
    resultats[compte] = await executerPourCompte(compte, config);
  }

  // Nom de fichier explicite : ce resultat vient du jeu FIXTURE
  // (fixtures/posts-exemple.json), pas d'un vrai appel Apify -- voir
  // chargerPosts() ci-dessus et le champ "source" de chaque entree.
  const sortiePath = path.join(__dirname, 'dry-run-sortie', 'commentaires-exemple-fixture.json');
  fs.mkdirSync(path.dirname(sortiePath), { recursive: true });
  fs.writeFileSync(sortiePath, JSON.stringify(resultats, null, 2), 'utf8');

  console.log(JSON.stringify(resultats, null, 2));
  console.log(`\nEcrit dans ${sortiePath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { executerPourCompte, chargerPosts };
