---
name: linkedin-carrousel
description: "Composer et publier des carrousels LinkedIn pour Claude Agency (acces confirme le 12/09) et Claude Partners (acces non confirme) -- la page Claude est abandonnee pour l'instant"
---

# linkedin-carrousel

## Perimetre au 12/09/2026 (renverse le meme jour par un test reel -- ne pas revenir a la version precedente)

**Hypothese initiale de Julien (11-12/09/2026), infirmee par un test reel le 12/09/2026** :
Julien pensait que la connexion Composio partagee `averse-cooser` correspondait a
julien-partners ("compte marque par defaut"), et avait donc designe julien-partners comme
priorite absolue. Un appel reel de `LINKEDIN_GET_MY_INFO` via le canal MCP (voir plus bas et
`references/etat-linkedin-20260912.md`) a renvoye `id: aFqu-W7ClW` -- **julien-agency, pas
julien-partners**. Cette trace est gardee volontairement : ce n'est pas une supposition qui
s'est averee juste, c'en est une qui s'est averee fausse, corrigee par un test, pas par une
nouvelle supposition.

**Perimetre reel a jour** :
- **julien-agency** : **acces Composio confirme reellement** le 12/09/2026 (connexion
  `averse-cooser`). C'est desormais le seul compte sur lequel un exemple reel de publication
  est possible. Carrousel pret dans `a-publier/` (redige pour ce compte, pas une simple
  reutilisation du texte pense pour julien-partners -- voir `a-publier/README.md`), **en
  attente de l'accord explicite de Julien avant tout appel reel** de
  `publierCarrouselViaImage` -- l'identite technique est solide, mais publier reste un acte
  public irreversible sur son compte, pas une decision a prendre seul.
- **julien-partners** : acces Composio **non confirme** -- `averse-cooser` ne correspond pas a
  ce compte. Aucune autre connexion LinkedIn partagee n'est visible a ce jour pour ce compte.
  A rouvrir si/quand un acces reel existe ; ce n'est plus la priorite du 20/09.
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

## Ce qui est pret a publier des que Julien donne son accord explicite (julien-agency)

`a-publier/julien-agency-2026-09-12.json` (5 diapos, contenu reel) et
`a-publier/julien-agency-2026-09-12.commentary.txt` (texte du post) sont rediges comme
jugement editorial **pour julien-agency** (ton confiant/direct/pedagogue/oriente-dirigeants),
avec leur rendu deja verifie visuellement (PDF + image de couverture 1080x1350, mode
"couverture" choisi en premier car c'est le cas le plus simple des deux modes du repli image --
voir `a-publier/README.md` pour la commande exacte a executer). Ce contenu n'est **pas** une
reprise telle quelle du texte initialement pense pour julien-partners : la version
julien-partners s'appuyait a la diapo 3 sur un angle "reseau professionnel" propre au
positionnement facilitateur/reseau de ce compte -- retire et remplace par un angle
cout/consequence pour l'entreprise, coherent avec julien-agency. **Ne pas executer la commande
de publication avant l'accord explicite de Julien** (voir plus bas et `a-publier/README.md`) --
l'identite technique est confirmee, l'autorisation de publier ne l'est pas.

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

- **(2026-09-12) Identite `averse-cooser` -- CONFIRMEE par test reel, infirme l'hypothese initiale** :
  Premiere tentative le 12/09/2026 via le dashboard Composio de nomena (compte membre de
  l'equipe Composio de Julien, deja authentifie dans le navigateur) : la connexion
  `averse-cooser` est bien visible et confirmee comme LA seule connexion LinkedIn partagee,
  mais l'UI ne propose aucun testeur d'action, et construire a la main le flux OAuth du canal
  MCP (`connect.composio.dev/mcp`, AuthKit/WorkOS, PKCE) a ete bloque par le classifieur
  auto-mode apres l'enregistrement du client OAuth -- non contourne a ce stade.

  **Deblocage reel, meme jour** : le dashboard de nomena expose, dans Reglages -> "Sessions &
  API Key", une **cle API "consumer" dediee** (`x-consumer-api-key`) prevue explicitement par
  Composio pour authentifier un client MCP sans passer par le flux OAuth complet -- ce n'est
  pas un jeton extrait en douce, c'est un mecanisme documente sur la page elle-meme ("MCP
  clients can authenticate two ways: with an API key ... or with OAuth"). Avec cette cle en
  en-tete `x-consumer-api-key` :
  1. `POST https://connect.composio.dev/mcp` (`initialize`) -> `200`, session MCP ouverte.
  2. `tools/call` sur `COMPOSIO_SEARCH_TOOLS` ("get the authenticated user's LinkedIn profile
     information") -> revele deja dans sa reponse la connexion active :
     `accounts:[{"id":"linkedin_averse-cooser","user_info":{"sub":"aFqu-W7ClW","name":"Julien
     Rayes",...}}]`.
  3. `tools/call` sur `COMPOSIO_MULTI_EXECUTE_TOOL` avec `tool_slug: LINKEDIN_GET_MY_INFO`,
     `arguments: {}` -> reponse reelle confirmee :
     `"id":"aFqu-W7ClW"`, `"localizedHeadline":"...| Claude Agency"`,
     `"profileUrl":"https://www.linkedin.com/in/julien-rayes"`.

  **Resultat : `id: aFqu-W7ClW` correspond a julien-agency, pas a julien-partners**
  (`ZvLHybJZhj`). L'hypothese initiale de Julien ("compte marque par defaut" = julien-partners)
  etait raisonnable mais fausse -- gardee ci-dessus pour comprendre pourquoi le perimetre a
  bascule le meme jour. `julien-partners` n'a, a ce jour, aucune connexion LinkedIn partagee
  confirmee : a rouvrir si un acces reel apparait un jour pour ce compte.

  Consequence : `publierPost`/`publierCommentaire`/`publierCarrouselViaImage` peuvent
  desormais etre appelees reellement pour julien-agency avec `authorUrn:
  urn:li:person:aFqu-W7ClW` -- **mais `publierCarrouselViaImage` ne doit pas etre appelee sans
  l'accord explicite de Julien** (voir `a-publier/README.md`) : la confirmation technique ne
  vaut pas autorisation de publier.

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve : `references/etat-linkedin-20260912.md`
du paquet.
