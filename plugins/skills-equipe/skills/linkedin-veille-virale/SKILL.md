---
name: linkedin-veille-virale
description: "Surveille des comptes LinkedIn suivis, repere les posts qui valent une reaction et publie un post recycle/inspire pour julien-partners ou julien-agency"
---

# linkedin-veille-virale

## Ce que fait la skill

1. `lib/veille.js` (`recupererPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes listes dans
   `comptes_a_surveiller` de `reglages-comptes.json`, pour le compte concerne.
   **Champ obligatoire : `targetUrls`, pas `profiles`** -- avec `profiles`
   l'acteur renvoie zero post sans aucune erreur.
2. `trierPosts` ecarte les carrousels (repere : `document.totalPageCount`
   present) et les posts au-dela de `seuil_max_commentaires`, puis trie du
   plus recent au plus ancien.
3. La session Claude qui invoque cette skill lit les posts retenus, choisit
   celui qui merite une reaction, et **ecrit elle-meme** le texte du post
   recycle/inspire dans le ton de `reglages-comptes.json` -- ce n'est pas une
   generation automatique en JS, la redaction reste un jugement humain/LLM,
   pas un script.
4. `lib/publier.js` (`publierPost`) est le **seul** point d'appel qui publie
   reellement : `publierPost({ authorUrn, commentary })`. Rien d'autre dans
   le module n'ecrit sur LinkedIn.
5. `dry-run.js` (`npm run dry-run`) execute les etapes 1-3 de bout en bout
   sans jamais appeler `publierPost` (il n'importe meme pas `lib/publier.js`)
   -- avec le jeu fixture de `fixtures/posts-exemple.json` tant que
   `comptes_a_surveiller` est vide, ou avec un vrai appel Apify des que ce
   champ est rempli et `APIFY_TOKEN` present. Ecrit le resultat (post retenu,
   texte final, arguments qu'on passerait a `publierPost`) dans
   `dry-run-sortie/veille-exemple-fixture.json` -- nom de fichier volontairement
   explicite : **c'est un exemple sur donnees fixture, pas un candidat pret a
   publier sur donnees reelles** (voir "A completer avant un usage reel"
   ci-dessous). `npm test` (`node --test`) verifie le tri
   (`test/trierPosts.test.js`) et ce dry run (`test/dry-run.test.js`), y
   compris qu'il n'importe jamais `lib/publier.js`.

## Etat au 12/09/2026 -- ce qui est pret, ce qui attend

- **Pret et teste reellement** : `recupererPosts` (Apify) -- verifie avec le
  compte `julien_r` (`GET /v2/users/me` -> 200) avant construction du reste.
- **Pret et teste de bout en bout, hors publication reelle** : la chaine
  recuperation -> tri -> texte final, via `dry-run.js` -- un exemple concret
  de ce que serait le post recycle/inspire (voir
  `dry-run-sortie/veille-exemple-fixture.json`, genere par `npm run dry-run`),
  sans qu'aucune publication reelle n'ait eu lieu.
- **Identite confirmee, `publierPost` utilisable pour julien-agency** :
  `averse-cooser` (la connexion LinkedIn partagee via MCP) correspond a
  `urn:li:person:aFqu-W7ClW`, c'est-a-dire **julien-agency** -- confirme par
  appel reel de `LINKEDIN_GET_MY_INFO` le 12/09/2026 (voir SKILL.md de
  `linkedin-carrousel` et `references/etat-linkedin-20260912.md` pour le
  detail complet). `julien-partners` reste **non confirme**.
- **Pipeline de publication texte verifie reellement, sans rien publier**
  (12/09/2026) : appel reel de `LINKEDIN_CREATE_LINKED_IN_POST` (la meme
  action que `publierPost`) pour julien-agency avec `lifecycleState: "DRAFT"`
  -- creation reussie (`urn:li:share:7504206574081646592`), verifiee non
  accessible en lecture publique (`LINKEDIN_GET_POST_CONTENT` -> `403
  Forbidden`, coherent avec un brouillon jamais publie), puis supprimee
  (`LINKEDIN_DELETE_POST` -> `deleted: true`). Preuve technique que
  l'authentification, l'URN d'auteur et le champ `commentary` fonctionnent
  de bout en bout pour ce compte via le canal MCP -- **ne couvre que l'action
  de creation de post**, pas `publierCommentaire` de `linkedin-commentaires`
  (action differente, sans equivalent brouillon -- voir son SKILL.md).
- **Canal reellement fonctionnel : MCP, via une cle d'acces "consumer"**
  (pas le canal REST documente jusqu'ici dans `lib/composio.js`). Cette cle
  s'obtient dans les reglages d'un compte Composio membre de l'equipe de
  Julien (Reglages -> "Sessions & API Key"), pas via `composio login` (CLI,
  bloque par le classifieur auto-mode) ni par extraction de jeton navigateur.
  **A faire** : `lib/composio.js` utilise toujours le canal REST par defaut
  (`COMPOSIO_API_KEY`, qui ne couvre aucune connexion LinkedIn dans ce
  paquet) -- migrer vers le canal MCP quand cette skill sera reprise pour un
  usage reel, en s'inspirant de la methode qui a fonctionne pour
  `linkedin-carrousel`.
- **APIFY_TOKEN : RESOLU le 12/09/2026** -- Nomena a export le jeton
  lui-meme dans l'environnement de la session (pas de lecture automatisee
  d'un fichier de secrets, pas de contournement du blocage documente
  precedemment). Un vrai appel `recupererPosts` a suivi immediatement sur le
  profil `https://www.linkedin.com/in/julien-rayes` : 5 posts reels
  recuperes et sauvegardes dans `data/posts-julien-rayes-2026-09-12.json`
  (gitignore -- contenu specifique a un compte reel, voir `.gitignore`). Un
  exemple **reel** de post recycle/inspire (pas un exemple sur fixture) est
  redige et pret dans `a-publier/` -- voir son `README.md` pour le detail et
  la limite honnete : le profil interroge est celui de Julien Rayes
  lui-meme (= julien-agency), pas encore un veritable compte tiers, faute de
  `comptes_a_surveiller` rempli.
- **Exemple `a-publier/` cible julien-agency, pas julien-partners** (corrige
  le 12/09/2026) : redige initialement pour julien-partners, dont l'identite
  Composio n'est pas confirmee ; Julien a dit explicitement que le compte
  importe peu, donc le texte a ete **reecrit** (pas juste republie sous un
  autre `authorUrn`) dans le ton de julien-agency (confiant, direct,
  pedagogue, oriente-dirigeants) pour cibler `urn:li:person:aFqu-W7ClW`, le
  seul compte avec un acces reellement confirme -- voir
  `a-publier/README.md`. **Ne pas publier avant que Julien confirme
  l'apparence reelle du carrousel** deja publie sur ce meme compte (voir
  `linkedin-carrousel`) : eviter d'empiler plusieurs posts de test sur le
  meme compte avant d'avoir valide le premier.

## A completer avant un usage reel

- `comptes_a_surveiller` dans `reglages-comptes.json` est vide pour les deux
  comptes -- a remplir avec les profils LinkedIn a suivre pour un usage en
  production (voir la limite notee dans `a-publier/README.md`).
- **(12/09/2026) Verifie : pas de source existante pour remplir ce champ.**
  Hypothese testee -- le champ `concurrents` de
  `linkedin-carrousel/reglages-comptes.json` (mentionne pour le ton/palette)
  aurait pu fournir des candidats naturels. Verifie : il existe dans le
  schema mais est **vide `[]`** pour les trois comptes, y compris
  julien-agency -- jamais rempli depuis sa creation. Aucune autre mention de
  comptes concurrents/pairs reels n'existe ailleurs dans ce depot (recherche
  faite sur l'ensemble de `skills-equipe`). **Ce qu'il faut, precisement** :
  une liste de profils ou pages LinkedIn publics reels (URL exploitable par
  l'acteur Apify `harvestapi/linkedin-profile-posts`, pas un simple nom
  d'entreprise) pertinents pour l'audience de julien-agency
  (dirigeants/automatisation IA) et julien-partners (reseau/facilitateurs).
  **C'est une decision editoriale/business, pas technique** : qui surveiller
  releve du jugement de Julien ou de Nomena, pas d'un choix a inventer ici --
  aucun compte n'a ete devine ou ajoute pour combler ce vide. A fournir
  avant de pouvoir tester le pipeline sur un veritable tiers.

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve :
`references/etat-linkedin-20260912.md` du paquet.
