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
   `dry-run-sortie/veille-exemple.json`. `npm test` (`node --test`) verifie le
   tri (`test/trierPosts.test.js`) et ce dry run (`test/dry-run.test.js`),
   y compris qu'il n'importe jamais `lib/publier.js`.

## Etat au 11/09/2026 -- ce qui est pret, ce qui attend

- **Pret et teste reellement** : `recupererPosts` (Apify) -- verifie avec le
  compte `julien_r` (`GET /v2/users/me` -> 200) avant construction du reste.
- **Pret et teste de bout en bout, hors publication reelle** : la chaine
  recuperation -> tri -> texte final, via `dry-run.js` -- un exemple concret
  de ce que serait le post recycle/inspire (voir
  `dry-run-sortie/veille-exemple.json`, genere par `npm run dry-run`), sans
  qu'aucune publication reelle n'ait eu lieu.
- **Pret, non teste par publication reelle** : `publierPost`. Les URN
  d'auteur sont fournis et verifies par Julien
  (`reglages-comptes.json` : `julien-partners` -> `urn:li:person:ZvLHybJZhj`,
  `julien-agency` -> `urn:li:person:aFqu-W7ClW`) -- utilisables tels quels,
  pas a re-router par `LINKEDIN_GET_MY_INFO` (fallback documente dans
  `lib/publier.js`, non appele par defaut).
- **Bloque, hors de mon controle** : le canal voulu pour publier est MCP
  (`connect.composio.dev/mcp`), pas le SDK/cle API. Teste reellement le
  11/09/2026 (voir `references/actions-composio.md` du paquet) : ce canal
  exige un jeton AuthKit (session OAuth reelle), pas une cle API statique --
  `composio login` (le flux CLI officiel) est bloque par le classifieur
  auto-mode de Claude Code, et l'extraction d'un jeton depuis les requetes
  reseau du navigateur n'est pas une pratique a suivre. **En consequence,
  `lib/composio.js` utilise le canal REST direct (`/tools/execute`) comme
  implementation actuelle** -- raison technique documentee, pas un
  changement de canal fait en silence. A remplacer par un vrai appel MCP des
  que le jeton est disponible ; l'interface de `publierPost` ne devrait pas
  avoir besoin de changer.
- **Ambiguite non resolue** : la seule connexion LinkedIn active vue en MCP
  (`connect.composio.dev/~/connect/apps/linkedin`, "Shared with you") porte
  le nom `averse-cooser`, partagee par `jrayes000@gmail.com` -- ne correspond
  a aucun des deux identifiants Composio connus
  (`linkedin_arsino-dian`, `linkedin_habe-bogue`). Tant que Julien n'a pas
  confirme a qui correspond cette connexion, **`publierPost` ne doit pas etre
  appelee reellement**.

## A completer avant un usage reel

- `comptes_a_surveiller` dans `reglages-comptes.json` est vide pour les deux
  comptes -- a remplir avec les profils LinkedIn a suivre.
