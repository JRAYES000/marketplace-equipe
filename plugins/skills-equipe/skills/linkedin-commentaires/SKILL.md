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

## Etat au 11/09/2026 -- ce qui est pret, ce qui attend

- **Pret et teste reellement** : le mecanisme de recuperation des posts
  (meme fonction Apify que `linkedin-veille-virale`, verifiee avec le compte
  `julien_r`).
- **Pret et teste de bout en bout, hors publication reelle** : la chaine
  recherche -> tri -> commentaire final, via `dry-run.js` -- un exemple
  concret de ce que serait le commentaire publie (voir
  `dry-run-sortie/commentaires-exemple-fixture.json`, genere par
  `npm run dry-run`), sans qu'aucune publication reelle n'ait eu lieu.
- **A faire des que possible, independamment de Julien** : meme constat que
  `linkedin-veille-virale` -- les 3 posts reels obtenus via Apify sur le
  compte `julien_r` le 11/09/2026 n'ont pas ete sauvegardes dans le depot, et
  la session du 12/09/2026 n'a pas retrouve `APIFY_TOKEN` (tentative de
  lecture dans `claude-config`/`env/secrets.md` bloquee par le classifieur
  auto-mode, meme famille que le blocage `composio login` deja documente --
  pas une piste a retenter en boucle). La redaction d'un exemple **reel** de
  commentaire (a partir de vrais posts, pas de la fixture) reste a faire des
  que `APIFY_TOKEN` est redisponible -- sans lien avec les deux blocages
  Julien ci-dessous.
- **Pret, non teste par publication reelle** : `publierCommentaire`. URN
  d'acteur fournis et verifies par Julien (`reglages-comptes.json` :
  `julien-partners` -> `urn:li:person:ZvLHybJZhj`, `julien-agency` ->
  `urn:li:person:aFqu-W7ClW`).
- **Bloque, hors de mon controle** : meme blocage MCP que
  `linkedin-veille-virale` -- voir le SKILL.md de cette skill ou
  `references/actions-composio.md` du paquet pour le detail complet des
  tests effectues (jeton AuthKit requis, `composio login` bloque par le
  classifieur, extraction de jeton navigateur ecartee). `lib/composio.js`
  utilise en attendant le canal REST direct, raison documentee.
- **Ambiguite non resolue** : la seule connexion LinkedIn active vue en MCP
  porte le nom `averse-cooser`, ne correspond a aucun des deux identifiants
  connus -- tant que Julien n'a pas confirme, `publierCommentaire` ne doit
  pas etre appelee reellement.

## A completer avant un usage reel

- `comptes_cibles` dans `reglages-comptes.json` est vide pour les deux
  comptes -- a remplir avec les profils/pages a suivre pour trouver des
  posts a commenter.

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve :
`references/etat-linkedin-20260912.md` du paquet.
