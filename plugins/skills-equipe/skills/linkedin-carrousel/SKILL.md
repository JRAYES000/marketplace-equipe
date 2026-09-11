---
name: linkedin-carrousel
description: "(provisoire) Composer des carrousels LinkedIn soignes pour les comptes Claude Agency, Claude Partners et la page Claude"
---

# linkedin-carrousel

En construction. `generer-pdf.js` produit le PDF multi-page a partir des templates de
`templates/` et d'une liste de diapos (voir l'en-tete du script pour l'usage et la
convention de nommage des fichiers de sortie).

## Limites connues

- **(2026-09-11)** Le PDF fini atterrit dans `sortants/<compte>/AAAA-MM-JJ-<slug>.pdf`,
  mais rien ne le fait passer de la a la publication reelle sur LinkedIn : aucun dossier
  surveille, aucun point d'entree. Verifie a cette date : `sortants/instagram/` du depot
  `visibilite-ops` est vide (juste `.gitkeep`), et son pipeline de brouillons
  (`sortants/<canal>/*.md` + clic "Valider" de Julien) ne gere que du texte, pas un
  artefact binaire comme un PDF. A faire deposer/publier a la main pour l'instant, ou a
  outiller plus tard (ex. un sortant `.md` qui reference le chemin du PDF genere, avec le
  geste de publication -- upload document -- qui reste a construire cote Composio).

- **(2026-09-11, confirme)** `lib/publier.js` (`publierCarrousel`) leve volontairement une
  erreur : verifie sur les 24 actions du toolkit `linkedin` de Composio
  (`references/actions-composio.md` du paquet), **aucune n'accepte un document/PDF**. Les
  actions image (`LINKEDIN_REGISTER_IMAGE_UPLOAD`, `LINKEDIN_INITIALIZE_IMAGE_UPLOAD`) ne
  gerent pas les documents multi-pages, et `LINKEDIN_CREATE_LINKED_IN_POST` n'a pas de champ
  document. Coherent avec `visibilite-ops` (JOURNAL.md, 04/09) qui a abandonne les posts
  illustres pour la meme raison. La fonction reste prete a brancher des qu'une action
  Composio equivalente existera.

- **(2026-09-11)** Canal voulu pour toute publication : MCP (`connect.composio.dev/mcp`),
  pas le SDK/cle API. Teste reellement : ce canal exige un jeton AuthKit (session OAuth),
  pas une cle API statique -- `composio login` (CLI officiel) bloque par le classifieur
  auto-mode, extraction de jeton navigateur ecartee (pas une pratique a suivre). En
  attendant, `lib/composio.js` utilise le canal REST direct comme implementation actuelle --
  raison technique documentee, pas un changement fait en silence.

- **(2026-09-11)** URN d'auteur verifies par Julien pour julien-partners
  (`urn:li:person:ZvLHybJZhj`) et julien-agency (`urn:li:person:aFqu-W7ClW`), dans
  `reglages-comptes.json`. Pour page-claude, `author_urn` reste `null` : `LINKEDIN_GET_COMPANY_INFO`
  repond 403 (autorisation d'organisation a valider cote LinkedIn, Julien s'en occupe) --
  brancher `urn:li:organization:<id>` une fois debloque, rien d'autre a changer.

- **(2026-09-12) Repli image code, mais inerte tant que Julien n'a pas choisi** :
  `generer-images.js` rend localement (Playwright, zero appel Composio, meme gabarit HTML que
  le PDF) les deux options documentees le 11/09 :
  - `genererImagesParDiapo` -- une image PNG 1080x1350 par diapo (option "par-diapo").
  - `genererImageCouverture` -- une seule image PNG 1080x1350, la diapo "hook" ou la
    premiere (option "couverture").
  Verifie reellement en local le 12/09/2026 sur `fixtures/diapos-exemple.json` (4 diapos,
  compte julien-partners) : rendu net, polices chargees, 1080x1350px confirme en lisant le
  chunk IHDR du PNG, tailles de fichier coherentes (53-77 Ko) -- voir
  `test/generer-images.test.js` (`npm test`, 4 tests verts). Cote Composio,
  `lib/publier.js` expose desormais `publierCarrouselViaImage({ authorUrn, modeRepli,
  cheminsImages, commentary })` -- `modeRepli: "par-diapo" | "couverture"` -- qui televerse
  reellement les PNG deja rendus (`LINKEDIN_REGISTER_IMAGE_UPLOAD` puis PUT des octets) et
  cree le post avec `images`. **Personne ne l'appelle nulle part dans ce paquet** (verifie par
  `test/publier-repli-image.test.js`) : elle reste inerte tant que Julien n'a pas tranche entre
  les deux modes (ou confirme qu'il garde le depot manuel du PDF). Point non verifie par un
  appel reel : si `LINKEDIN_CREATE_LINKED_IN_POST.images` accepte plusieurs URN a la fois
  (necessaire pour "par-diapo") -- le nom au pluriel le suggere, non confirme.

- **(2026-09-11) Ambiguite non resolue** : la seule connexion LinkedIn active vue en MCP
  (`connect.composio.dev/~/connect/apps/linkedin`, "Shared with you") porte le nom
  `averse-cooser`, partagee par `jrayes000@gmail.com` -- ne correspond a aucun des deux
  identifiants Composio connus (`linkedin_arsino-dian`, `linkedin_habe-bogue`). Tant que
  Julien n'a pas confirme a qui correspond cette connexion, aucune fonction de ce dossier ne
  doit etre appelee avec un effet de bord reel sur LinkedIn.
