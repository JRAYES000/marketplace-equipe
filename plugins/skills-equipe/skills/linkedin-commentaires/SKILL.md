---
name: linkedin-commentaires
description: >
  Trouve des posts LinkedIn de moins de 4 h chez les comptes cibles et rédige un commentaire, ou
  une réponse à un commentaire reçu, pour julien-agency ou julien-partners. Pour « les
  commentaires du jour », « fais les commentaires du jour », « commentaires LinkedIn pour
  julien-agency ». Activation manuelle : sur demande explicite uniquement.
---

# linkedin-commentaires

> **Compte `julien-partners` recyclé le 27/11/2026.** Le profil LinkedIn `linkedin.com/in/julien-rayes-claude-partners` est devenu `linkedin.com/in/julien-rayes-mesdroitschomage` et fait la promotion de Mes Droits Chômage (simulateur d'aides publiques). Ne plus rien y publier, commenter ni programmer au titre de Claude Partners sans l'accord écrit de Julien. Les posts déjà publiés restent en ligne. Ancien profil relevé dans `MESDROITSCHOMAGE/reseaux/linkedin/ancien-profil-claude-partners.md`.

Sommaire : Déroulé · Point de situation · Comptes cibles · Variables d'environnement ·
Garde-fous automatiques · Règles de rédaction · Suivi à 3 jours · Pièges · Annexes.

Phrase de lancement : « les commentaires du jour ». Variantes : « fais les commentaires du
jour », « commentaires LinkedIn pour julien-agency / julien-partners », « qu'est-ce qu'on
commente aujourd'hui ».

## Déroulé

1. `lib/trouver-posts.js` (`trouverPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes de `comptes_cibles`
   (`reglages-comptes.json`). Champ obligatoire : `targetUrls` (avec `profiles`, l'acteur renvoie
   zéro post sans erreur).
2. `trierPosts` écarte les carrousels (`document.totalPageCount`), les posts de groupe
   (`shareUrn` en `urn:li:groupPost:` ou auteur en `linkedin.com/groups/` : aucun des deux comptes
   n'a le droit d'y commenter) et les posts au-delà de `seuil_max_commentaires`, puis trie par date.
3. `lib/planifier-commentaires.js` : `filtrerPostsFrais` garde les posts de moins de 4 h ;
   `validerQuotaJournalier` refuse au-delà de 5 commentaires par jour et par compte, ou une
   personne déjà commentée le jour même.
4. La session Claude **écrit elle-même** le commentaire, dans le ton de `reglages-comptes.json`,
   en choisissant un genre : `information_chiffree`, `desaccord_argumente`, `histoire_vecue`,
   `vraie_question` (`GENRES`, `lib/valider-commentaire.js`).
   **Réponse à un commentaire reçu** (sous un post de Julien, lu sur LinkedIn) : genre
   `reponse` (`GENRE_REPONSE`). Mêmes contrôles, plus `validerAucunePromesse` (aucune promesse au
   nom de Julien : recontact, message privé, rendez-vous, prix). Une réponse ne compte pas dans le
   quota et ne s'inscrit ni au registre ni dans Notion.
5. `validerCommentaire` refuse tout brouillon hors règles (voir « Garde-fous »).
6. `lib/publier-commentaire.js` (`publierCommentaire`) est le seul point qui publie : `targetUrn`
   est le `shareUrn` du post (jamais `urn:li:activity:`).
7. `lib/registre.js` (`enregistrerCommentairePublie`) ajoute le commentaire à
   `data/registre-commentaires.json` (gitignoré), qui fait tenir le quota d'un lancement à l'autre.

**Essai à blanc** : `node dry-run.js` (sans argument, tous les comptes) exécute les étapes 1 à 5
sans publier. Sans `APIFY_TOKEN` ou sans `comptes_cibles`, il bascule sur la fixture. Sortie dans
`dry-run-sortie/dernier-dry-run.json` (non suivi) ; la fixture versionnée n'est jamais réécrite.

## Point de situation

`node etat.js [compte]` d'abord : dernier commentaire publié, quota du jour, état des comptes
cibles. `etat.js` et `dry-run.js` proposent un repli concret quand rien n'est disponible.

**Aucun candidat sous 4 h** : relever via Claude in Chrome la date du post le plus récent de
chaque cible, puis `genererRepliAucunCandidat` (`lib/planifier-commentaires.js`, entrée
`[{ compte, nom, url, postedAt }]`) rend le constat compte par compte, les comptes inactifs depuis
plus de 28 jours (`SEUIL_INACTIVITE_JOURS`) et une recommandation (absence ponctuelle, ou
remplacer les comptes inactifs).

## Comptes cibles

`comptes_cibles` dans `reglages-comptes.json` : 8 comptes pour julien-partners, 16 pour
julien-agency. Critère : audience francophone de dirigeants et de PME (pas le pays de résidence),
et une publication réelle plusieurs fois par semaine. La qualité d'un passage tient à cette liste,
pas au seuil de 4 h : une liste qui se dégrade se revoit avant de toucher au seuil.
`mehdi-stili-6769a6174` est `comptes_cibles_statut: en_observation` (trou de plusieurs mois avant
une cadence correcte) : à réévaluer au prochain point sur la liste.

## Variables d'environnement (`.env.example`)

Chaque script CLI (`dry-run.js`, `creer-page-notion.js`, `mettre-a-jour-stats.js`) charge le
`.env` de la skill par `chargerEnvLocal()` (`lib/charger-env.js`) sans écraser une variable déjà
définie ni afficher de valeur. Une clé manquante arrête le script avec un message explicite ;
seul `dry-run.js` a un repli fixture, pour `APIFY_TOKEN`.

- `APIFY_TOKEN` : requis par `trouverPosts`.
- `NOTION_TOKEN` + `NOTION_PARENT_PAGE_ID` : base « Commentaires » (suivi à 3 jours) ; la page
  parente doit être partagée avec l'intégration (« … » → « Connexions »).
- `NOTION_COMMENTAIRES_DATA_SOURCE_ID` : base « Commentaires » pour `mettre-a-jour-stats.js`
  (sinon `--dataSourceId`).
- `COMPOSIO_CONSUMER_API_KEY` (préfixe `ck_`, canal MCP `https://connect.composio.dev/mcp`) :
  julien-agency uniquement.
- `COMPOSIO_API_KEY` (préfixe `ak_`, canal REST `backend.composio.dev/api/v3.1`,
  `connected_account_id: "ca_vn1-dhh8VcYf"`) : julien-partners uniquement.

Le routage par compte est automatique (`../../lib/composio-canal.js`) :
`publierCommentaire({ actorUrn, … })` choisit le canal. Une clé `ak_`
n'est jamais passée au canal MCP (`validerCle` la refuse avant tout appel). Protocole complet :
[../../references/actions-composio.md](../../references/actions-composio.md).

Tout échec réel de `lib/composio.js` est journalisé dans `data/registre-echecs.json` (local,
gitignoré, sans clé ni donnée personnelle) par `journaliserEchec`, avant que l'erreur remonte.

## Garde-fous automatiques

Refus explicite, jamais un avertissement.

### Fréquence et publication — `lib/planifier-commentaires.js`, `lib/publier-commentaire.js`

- **Fenêtre de 4 h** pour les candidats prioritaires.
- **Plafond dur de 48 h** (`validerFraicheurMaximale`, `FRAICHEUR_MAX_HEURES`) : un post plus
  vieux, daté dans le futur, sans date ou à date illisible est refusé. Rien sous 48 h sur un
  compte : ne rien proposer ce jour-là.
- **Quota de 5 par jour et par compte**, jamais deux fois la même personne le même jour, vérifié
  contre le registre. Le compte est normalisé (`julien-agency` / `julien-partners` exactement), la
  date au format `AAAA-MM-JJ`, le nom de l'auteur sans casse ni espaces multiples.
- **Canal réel** (`validerCanalPublicationReel`) : refus si `canal_publication_reel` n'est pas
  `true` pour le compte. Aucun outil de programmation ne sert de repli.
- **Connexion vérifiée avant chaque publication** (`verifierConnexionAvantPublication`, via
  `LINKEDIN_GET_MY_INFO`) : refus si la connexion Composio active ne correspond pas à l'`actorUrn`.
  Le canal MCP résout toujours vers la connexion préférée (julien-agency) ; sans ce contrôle, un
  commentaire julien-partners partirait sous l'identité julien-agency.

### Contenu — `lib/valider-commentaire.js`

- **2 à 4 phrases**, aucune puce ni liste, aucun emoji, aucun lien (domaine nu et « site . fr »
  compris, liste fermée de TLD courants).
- **Formulations creuses refusées** (« super post », « tellement vrai », « top », « merci du
  partage »), y compris un commentaire dont toutes les phrases sont creuses.
- **Genre cohérent** : `information_chiffree` exige un chiffre, `vraie_question` finit par « ? ».
- **Aucune expérience personnelle non sourcée** (« on », « nous », « j'ai » + client, mission,
  résultat, ou voix passive du type « un projet a été livré ») sauf `anecdoteSourcee: true`, que
  seule une confirmation réelle de Julien ou Nomena autorise.
- **Généralisation vague refusée** (`validerQuantificationVague`) : « la plupart des », « la
  majorité des », « beaucoup de », « peu de » + nom, sans échappatoire (reformuler). « La plupart
  du temps » et « dans la plupart des cas » restent admis.
- **Accents manquants** (`../../lib/valider-orthographe.js`, liste fermée partagée).

Tests : `node --test`.

## Règles de rédaction

Un commentaire n'est pas un post : pas de gras, pas de structure, aucun emoji. Les règles de forme
des posts (`linkedin-mise-en-forme`) ne s'appliquent pas ici.

- **`information_chiffree` est le genre le plus risqué.** Avant de le retenir : le chiffre est
  externe au post commenté, et sa formulation dit exactement ce que la source mesure. Au moindre
  doute, choisir un autre genre. Aucun script ne peut le vérifier.
- **Jamais d'anecdote inventée** pour remplir `histoire_vecue` : sans anecdote confirmée, un autre genre.
- `histoire_vecue` et `desaccord_argumente` ne sont pas contrôlés sur le fond : la solidité de
  l'argument se juge à la relecture.
- **Diversité des personnes** : au-delà de deux jours de suite chez la même personne sans
  interaction en retour (like, réponse, message), préférer un autre compte, même moins frais.
- **Heure de passage** (facteur secondaire) : fin de matinée et après-midi donnent plus de posts
  frais, sans compenser une liste de comptes inactifs.

## Suivi à 3 jours (lecture par capture d'écran)

La session lit les chiffres sur la capture collée dans la conversation (pas d'OCR), puis :

- **Statistiques d'un commentaire** (J'aime, réponses, réponse de l'auteur), une ligne par
  commentaire :
  ```
  node mettre-a-jour-stats.js --auteur "Jean ZENDJI" --date 2026-09-15 --jaime 4 --reponses 1 --reponseAuteur true
  ```
  Refus si plusieurs lignes correspondent (préciser `--date`) ; `--vuesProfil` et
  `--demandesContact` sont refusés ici.
- **Vues de profil et demandes de contact**, un relevé par jour :
  ```
  node enregistrer-releve-profil.js --date 2026-09-18 --vuesProfil 42 --demandesContact 2
  ```
  Stocké dans `data/statistiques-profil.json` ; un second appel pour la même date remplace le premier.

**Comparaison hebdomadaire** : `creerVueComparaisonHebdomadaire` crée le graphique Notion
(commentaires par semaine) ; `ecrireBlocComparaisonHebdomadaire({ pageId, lignes, relevesProfil })`
ajoute un tableau (commentaires, vues, demandes par semaine), avec `relevesProfil = listeReleves()`.
`pageId` est la page parente de la base « Commentaires », jamais la base. À relancer pour rafraîchir.
Marche à suivre détaillée :
[../../references/procedure-18-09-suivi-3-jours-commentaires.md](../../references/procedure-18-09-suivi-3-jours-commentaires.md).

## Pièges

- `profiles` au lieu de `targetUrls` dans l'appel Apify : zéro post, aucune erreur.
- Un post de groupe passe la fenêtre de fraîcheur puis échoue en 403 : il est écarté avant le tri.
- Vues de profil stockées par commentaire : un relevé du jour multiplié par 5 dans la comparaison
  hebdomadaire. Elles sont stockées par date.
- Date future ou `NaN` : toute comparaison avec `NaN` est fausse en JavaScript, d'où le refus explicite.
- Réponse Apify, Notion ou Composio malformée, registre corrompu : messages explicites, pas
  d'exception brute.
- « je » seul et « mon / ma / mes » restent hors du détecteur d'expérience (trop fréquents dans
  une opinion).

## Annexes

- [references/historique.md](references/historique.md) : ancien corps complet (passages réels de
  septembre, audits adversariaux du 15 et du 22/09, incidents).
- [references/evals.md](references/evals.md) : cas de test à rejouer après une modification.
- [../../references/linkedin-commentaires-historique.md](../../references/linkedin-commentaires-historique.md) :
  décisions de conception, incident de l'anecdote inventée, blocages Notion, publications réelles.
- [../../references/comptes-cibles-proposition-20260914.md](../../references/comptes-cibles-proposition-20260914.md)
  et [../../references/comptes-cibles-proposition-20260916-complement-agence.md](../../references/comptes-cibles-proposition-20260916-complement-agence.md) :
  constitution de la liste de comptes cibles.
- [../../references/etat-linkedin-20260912.md](../../references/etat-linkedin-20260912.md) : état
  des lieux transverse aux skills LinkedIn.
