---
name: linkedin-carrousel
description: "Composer et publier des carrousels LinkedIn pour Claude Partners (priorite) et Claude Agency (ecrit, non teste) -- la page Claude est abandonnee pour l'instant"
---

# linkedin-carrousel

## Perimetre au 12/09/2026 (clarifie par Julien)

- **julien-partners** : priorite absolue. Seule livraison exigee pour le 20/09 : un carrousel
  branche et valide sur ce compte, avec un exemple reel de publication. Passe avant tout le
  reste, y compris avant de finaliser julien-agency.
- **julien-agency** : code ecrit/complete, mais **non teste en publication reelle** -- l'acces
  Composio n'existe pas encore sur ce compte. Ne pas presenter comme "pret", seulement comme
  "ecrit, en attente d'acces".
- **page-claude** : **abandonnee pour l'instant**, sur decision de Julien. Le code deja ecrit
  (URN substituable dans `publierCarrousel`/`publierCarrouselViaImage`, template
  `templates/page-claude.html`) reste tel quel dans le depot sans qu'on y retouche -- ce n'est
  pas un chantier actif, ne pas perdre de temps a le reprendre. `reglages-comptes.json` garde
  l'entree `page-claude` (structure a 3 comptes voulue), mais son `ton`/`palette`/`concurrents`
  restent volontairement vides : les renseigner serait du travail perdu.

`generer-pdf.js` produit le PDF multi-page a partir des templates de `templates/` et d'une
liste de diapos (voir l'en-tete du script pour l'usage et la convention de nommage des
fichiers de sortie). `generer-images.js` fait le meme rendu en PNG (repli image, voir
plus bas).

## Ce qui est pret a publier des que l'identite est confirmee (julien-partners)

`a-publier/julien-partners-2026-09-12.json` (5 diapos, contenu reel) et
`a-publier/julien-partners-2026-09-12.commentary.txt` (texte du post) sont deja rediges comme
jugement editorial pour ce compte, avec leur rendu deja verifie dans
`sortants/julien-partners/` (PDF + image de couverture 1080x1350, mode "couverture" choisi en
premier car c'est le cas le plus simple des deux modes du repli image -- voir
`a-publier/README.md` pour la commande exacte a executer). **Ne pas executer cette commande
avant la confirmation reelle de l'identite `averse-cooser`** (voir plus bas).

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
  compte julien-partners, et retest sur julien-agency pour confirmer que le meme pipeline
  fonctionne sur son propre template) : rendu net, polices chargees, 1080x1350px confirme en
  lisant le chunk IHDR du PNG, tailles de fichier coherentes -- voir
  `test/generer-images.test.js` (`npm test`, 11 tests verts). Cote Composio,
  `lib/publier.js` expose desormais `publierCarrouselViaImage({ authorUrn, modeRepli,
  cheminsImages, commentary })` -- `modeRepli: "par-diapo" | "couverture"` -- qui televerse
  reellement les PNG deja rendus (`LINKEDIN_REGISTER_IMAGE_UPLOAD` puis PUT des octets) et
  cree le post avec `images`. **Personne ne l'appelle nulle part dans ce paquet** (verifie par
  `test/publier-repli-image.test.js`) : elle reste inerte tant que Julien n'a pas tranche entre
  les deux modes (ou confirme qu'il garde le depot manuel du PDF). Point non verifie par un
  appel reel : si `LINKEDIN_CREATE_LINKED_IN_POST.images` accepte plusieurs URN a la fois
  (necessaire pour "par-diapo") -- le nom au pluriel le suggere, non confirme.

- **(2026-09-12) Identite `averse-cooser` -- toujours non confirmee, tentative reelle documentee** :
  Julien pense que cette connexion correspond a julien-partners (compte marque par defaut),
  mais veut une confirmation reelle (sortie brute de `LINKEDIN_GET_MY_INFO`), pas une
  supposition. Tentative faite le 12/09/2026 via le dashboard Composio (`dashboard.composio.dev`,
  session navigateur deja connectee) : la connexion `averse-cooser` (partagee par
  `jrayes000@gmail.com`, "Active for you in MCP") est bien visible et confirmee comme LA seule
  connexion LinkedIn partagee, mais l'UI du dashboard n'expose aucun moyen d'executer une action
  directement dessus -- il faut reellement passer par le canal MCP
  (`connect.composio.dev/mcp`), qui repond `401` avec un flux OAuth complet (AuthKit/WorkOS,
  `login.composio.dev`, PKCE) tant qu'aucun jeton Bearer n'est fourni. Construction de ce flux :
  l'enregistrement dynamique du client OAuth a reussi (`POST /oauth2/register` -> `client_id`
  obtenu), mais l'etape suivante (generation des parametres PKCE via un script) a ete bloquee
  par le classifieur auto-mode de Claude Code, puis une simple navigation navigateur
  supplementaire a ete bloquee aussi -- signal clair pour arreter plutot que contourner. **Cette
  confirmation reste a faire par Julien lui-meme** (ou toute personne pouvant completer le
  consentement OAuth), pas par une nouvelle tentative de cette session. Tant qu'elle n'est pas
  faite, aucune fonction de ce dossier ne doit etre appelee avec un effet de bord reel sur
  LinkedIn -- voir `a-publier/README.md` pour la commande prete a executer une fois confirme.

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve : `references/etat-linkedin-20260912.md`
du paquet.
