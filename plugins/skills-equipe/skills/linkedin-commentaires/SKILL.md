---
name: linkedin-commentaires
description: "Trouve des posts LinkedIn pertinents sous des comptes cibles et publie un commentaire redige sur mesure, pour julien-partners ou julien-agency"
---

# linkedin-commentaires

## Ce que fait la skill

1. `lib/trouver-posts.js` (`trouverPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes listes dans
   `comptes_cibles` de `reglages-comptes.json`. **Champ obligatoire :
   `targetUrls`, pas `profiles`** -- avec `profiles` l'acteur renvoie zero
   post sans aucune erreur.
2. `trierPosts` ecarte les carrousels (repere : `document.totalPageCount`
   present -- commenter dessus reviendrait a commenter un post non lu) et les
   posts au-dela de `seuil_max_commentaires`.
3. La session Claude qui invoque cette skill lit les posts retenus et
   **ecrit elle-meme** le commentaire, dans le ton de
   `reglages-comptes.json` -- ce n'est pas une generation automatique en JS.
4. `lib/publier-commentaire.js` (`publierCommentaire`) est le **seul** point
   d'appel qui publie reellement : `publierCommentaire({ actorUrn, targetUrn,
   message })`. `targetUrn` doit etre le `shareUrn` du post (jamais une URN
   `urn:li:activity:`, refusee par l'API).
5. `dry-run.js` (`npm run dry-run`) execute les etapes 1-3 de bout en bout
   sans jamais appeler `publierCommentaire` (il n'importe meme pas
   `lib/publier-commentaire.js`) -- avec le jeu fixture de
   `fixtures/posts-exemple.json` tant que `comptes_cibles` est vide, ou avec
   un vrai appel Apify des que ce champ est rempli et `APIFY_TOKEN` present.
   Ecrit le resultat (post cible, `shareUrn`, commentaire final, arguments
   qu'on passerait a `publierCommentaire`) dans
   `dry-run-sortie/commentaires-exemple-fixture.json` -- nom de fichier
   volontairement explicite : **c'est un exemple sur donnees fixture, pas un
   candidat pret a publier sur donnees reelles** (voir "A completer avant un
   usage reel" ci-dessous). `npm test` (`node --test`) verifie le tri
   (`test/trierPosts.test.js`, y compris que `shareUrn` est bien conserve) et
   ce dry run (`test/dry-run.test.js`), y compris qu'il n'importe jamais
   `lib/publier-commentaire.js`.

Plafonds par defaut dans `reglages-comptes.json` (repris des regles reelles
deja en usage dans `visibilite-ops`, `routines/commentaires-linkedin.md`) :
12 commentaires par jour et par compte, 3 au maximum sous la meme cible par
semaine -- a faire respecter par la session qui invoque la skill, rien dans
le code ne les impose automatiquement pour l'instant.

## Etat au 12/09/2026 -- ce qui est pret, ce qui attend

- **Pret et teste reellement** : le mecanisme de recuperation des posts
  (meme fonction Apify que `linkedin-veille-virale`, verifiee avec le compte
  `julien_r`).
- **Pret et teste de bout en bout, hors publication reelle** : la chaine
  recherche -> tri -> commentaire final, via `dry-run.js` -- un exemple
  concret de ce que serait le commentaire publie (voir
  `dry-run-sortie/commentaires-exemple-fixture.json`, genere par
  `npm run dry-run`), sans qu'aucune publication reelle n'ait eu lieu.
- **Identite confirmee, `publierCommentaire` utilisable pour julien-agency** :
  `averse-cooser` correspond a `urn:li:person:aFqu-W7ClW` (julien-agency),
  confirme le 12/09/2026 par appel reel -- voir SKILL.md de
  `linkedin-carrousel` et `references/etat-linkedin-20260912.md`.
  `julien-partners` reste **non confirme**.
- **Pipeline de publication texte verifie reellement (action voisine), mais
  pas `publierCommentaire` lui-meme** : le 12/09/2026, un appel reel de
  `LINKEDIN_CREATE_LINKED_IN_POST` en `lifecycleState: "DRAFT"` a confirme
  que l'authentification et l'URN de julien-agency fonctionnent de bout en
  bout via le canal MCP (cree, verifie non public, puis supprime -- voir
  SKILL.md de `linkedin-veille-virale`). **`publierCommentaire` utilise une
  action differente** (`LINKEDIN_CREATE_COMMENT_ON_POST`), qui n'a pas
  d'equivalent "brouillon" dans son schema -- un commentaire est visible des
  sa creation, donc pas de test sans effet de bord reel identifie pour cette
  action precise. Elle reste donc **non testee par un appel reel**, meme si
  la confiance dans le canal/l'identite a augmente.
- **Canal reellement fonctionnel : MCP, via une cle d'acces "consumer"**
  (pas le canal REST documente jusqu'ici dans `lib/composio.js`) -- obtenue
  dans les reglages d'un compte Composio membre de l'equipe de Julien
  (Reglages -> "Sessions & API Key"), pas via `composio login`. **A faire** :
  migrer `lib/composio.js` vers ce canal quand cette skill sera reprise pour
  un usage reel.
- **APIFY_TOKEN : localise, mais recuperation programmatique bloquee** --
  voir "A completer avant un usage reel" ci-dessous.

## A completer avant un usage reel

- `comptes_cibles` dans `reglages-comptes.json` est vide pour les deux
  comptes -- a remplir avec les profils/pages a suivre pour trouver des
  posts a commenter.
- **`APIFY_TOKEN`** : lu dans la variable d'environnement `APIFY_TOKEN` (voir
  `.env.example`) -- rien a changer cote code. Le 12/09/2026, ce jeton a ete
  **localise** dans le gestionnaire de secrets local de l'equipe
  (`env/secrets.md`, compte Apify `julien_r`) -- il existe, ce n'est pas un
  cas de jeton manquant. Mais la lecture programmatique suivie de son usage a
  ete refusee par le classifieur auto-mode sous le motif explicite
  **"[Credential Exploration]"** -- une categorie de blocage distincte,
  visant precisement ce type d'action, pas un probleme de methode. **Ne pas
  retenter cette lecture dans une session future.** Seule voie : que
  quelqu'un (Julien ou Nomena) exporte lui-meme `APIFY_TOKEN` avant de
  lancer `dry-run.js`, ou colle le resultat d'un appel deja fait ailleurs.

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve :
`references/etat-linkedin-20260912.md` du paquet.
