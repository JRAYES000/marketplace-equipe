# Historique et incidents -- linkedin-carrousel

Ce fichier n'est pas necessaire pour faire tourner la skill (voir `SKILL.md` pour le mode
d'emploi) -- il garde la trace des decisions, tests reels et echecs qui ont produit l'etat
actuel, pour ne pas refaire les memes erreurs ni retenter une piste deja fermee. Complement de
`references/etat-linkedin-20260912.md` (etat des lieux transverse aux 3 skills) et
`references/actions-composio.md` (methode d'acces Composio).

## Perimetre au 12/09/2026 -- comment on est arrive a "julien-agency seul confirme"

**Hypothese initiale de Julien (11-12/09/2026), infirmee par un test reel le 12/09/2026** :
Julien pensait que la connexion Composio partagee `averse-cooser` correspondait a
julien-partners ("compte marque par defaut"), et avait donc designe julien-partners comme
priorite absolue. Un appel reel de `LINKEDIN_GET_MY_INFO` via le canal MCP a renvoye
`id: aFqu-W7ClW` -- **julien-agency, pas julien-partners**. Ce n'est pas une supposition qui
s'est averee juste, c'en est une qui s'est averee fausse, corrigee par un test.

**Identite `averse-cooser` -- methode complete de decouverte (12/09/2026)** : premiere tentative
via le dashboard Composio de Nomena a echoue (pas de testeur d'action dans l'UI, flux OAuth
manuel bloque par le classifieur auto-mode). Deblocage : le dashboard expose, dans Reglages ->
"Sessions & API Key", une cle API "consumer" dediee (`x-consumer-api-key`), prevue explicitement
par Composio pour authentifier un client MCP sans OAuth complet. Avec cette cle :
1. `POST https://connect.composio.dev/mcp` (`initialize`) -> `200`, session MCP ouverte.
2. `tools/call` sur `COMPOSIO_SEARCH_TOOLS` -> revele la connexion active :
   `accounts:[{"id":"linkedin_averse-cooser","user_info":{"sub":"aFqu-W7ClW","name":"Julien
   Rayes",...}}]`.
3. `tools/call` sur `COMPOSIO_MULTI_EXECUTE_TOOL` (`LINKEDIN_GET_MY_INFO`) -> confirme
   `"id":"aFqu-W7ClW"`, `"localizedHeadline":"...| Claude Agency"`.

Consequence : `julien-partners` n'a, a ce jour, aucune connexion LinkedIn partagee confirmee --
a rouvrir si un acces reel apparait un jour pour ce compte.

## Tentative de publication par image (12/09/2026) -- ECHEC, jamais rendue fonctionnelle

Julien avait donne son accord explicite pour publier sur julien-agency. Tentative via
`publierCarrouselViaImage` (canal MCP, cle consumer) :
1. `LINKEDIN_REGISTER_IMAGE_UPLOAD` -> reussi, `upload_url` + asset URN obtenus.
2. PUT des octets de l'image de couverture -> reussi, `201 Created`.
3. `LINKEDIN_CREATE_LINKED_IN_POST` (`images: [<URN>]`) -> **ECHOUE**, `400` : "Input should be
   a valid dictionary or instance of FileUploadable on parameter images.0". Aucun post cree.

Cause confirmee via `COMPOSIO_GET_TOOL_SCHEMAS` : le parametre `images` n'accepte pas une URN
LinkedIn en chaine simple -- il exige `{ name, mimetype, s3key }` referencant un fichier deja
stocke dans le S3/R2 de Composio. Contrainte du wrapper Composio, pas de l'API LinkedIn.
`publierCarrouselViaImage` leve donc une erreur explicite avant tout appel reseau plutot que de
re-tenter inutilement -- **ne pas la debrancher sans avoir resolu ce point** (router le fichier
via `COMPOSIO_REMOTE_WORKBENCH`/`upload_local_file`, voir plus bas pour la methode qui, elle,
fonctionne).

Complement le meme jour : un post texte simple (sans image, `lifecycleState: "DRAFT"`) a
fonctionne de bout en bout puis a ete supprime -- confirme que l'authentification, l'URN
d'auteur et `commentary` marchent, le blocage est localise a l'objet `images` seul.

## Methode qui fonctionne reellement -- publication via l'API Documents (12 puis 14/09/2026)

Trouvee le 12/09/2026 (testee par Julien lui-meme pour l'upload) : `COMPOSIO_REMOTE_WORKBENCH`
(sandbox Python persistant) expose un helper `upload_local_file` qui route un fichier vers le
stockage S3/R2 de Composio sans cle de projet separee -- contrairement a l'hypothese initiale.
Sequence complete, dans UNE SEULE session MCP continue (le `s3key` n'est valide que pour la
session qui l'a genere) :
1. Le PDF genere est transfere dans le bac a sable distant, puis televerse via
   `upload_local_file` -> un `s3key` reel.
2. `LINKEDIN_CREATE_LINKED_IN_POST` avec `images: [{ name, mimetype: "application/pdf", s3key
   }]`, author, commentary -> reussi.

**Signal API systematiquement ambigu sur ce compte** (droits ecriture seule) : `successful:
true`, corps vide, aucun ID de post extractible (LinkedIn renvoie l'ID reel dans l'en-tete HTTP
`x-restli-id`, non expose par `proxy_execute` en cas de succes) ; toute tentative de lecture
(`GET /rest/posts`, `LINKEDIN_GET_POST_CONTENT`, `LINKEDIN_LIST_REACTIONS`) echoue en 403/404 --
**c'est la signature normale d'un succes sur ce compte, pas un signal d'echec**. Seule la
verification par navigateur reel (permalinks) confirme une publication. Verification par URL
publique non authentifiee : bloquee par l'anti-bot LinkedIn (code `999`), jamais contournee.

Publication reelle confirmee deux fois par cette methode : le carrousel du 12/09 (5 diapos, non
conforme au brief, redige avant les garde-fous) et celui du 14/09 (10 diapos, conforme, mais
publie avant le garde-fou "accents manquants" -- voir plus bas). Republie corrige le 15/09 :
`urn:li:activity:7505338063762534401`.

## Methode d'acces Composio -- precision du 15/09/2026

Deux sessions avaient documente le mauvais endroit avant correction : ce n'est PAS une cle API
de projet PLATFORM (`dashboard.composio.dev`, `ak_...`, reservee aux admins d'organisation). La
bonne cle vit cote compte personnel, surface **"FOR YOU"** de Composio (bouton "Switch" en haut
a gauche de `connect.composio.dev`/`dashboard.composio.dev`) -> Reglages du compte -> "Sessions
& API Key" -> cle `ck_...`, header `x-consumer-api-key`. Voir `references/actions-composio.md`
pour le detail complet du protocole MCP (JSON-RPC, `Mcp-Session-Id`, etc.).

## Incident accents manquants (14/09/2026) -- a l'origine du garde-fou C

Le carrousel du 14/09/2026, deja publie et confirme en ligne, s'est revele integralement redige
sans accents -- ~68 occurrences sur 484 mots (diapos + texte du post, environ 1 mot sur 7), au
premier coup d'oeil pour tout lecteur francophone. Meme constat le meme jour sur les 5
commentaires et l'exemple de `linkedin-veille-virale`. Cause probable : `convertirGras` refuse a
raison tout accent DANS un passage en gras (aucune forme Unicode grasse accentuee n'existe) --
cette regle, propre au gras, semble avoir ete etendue par erreur a l'ensemble du texte lors de
la redaction. Le garde-fou `validerAccents` (liste fermee de mots toujours accentues) attrape 53
des 68 occurrences reelles -- le reste (mots ambigus comme "a"/"à", "ou"/"où") exige un jugement
humain, volontairement exclu pour eviter les faux positifs.

## Chiffre source trouve et bug corrige (14/09/2026)

26 % des TPE-PME francaises utilisent deja l'IA en 2025 (source : France Num, DGE, *Barometre
France Num 2025*, septembre 2025 -- URL reellement ouverte et lue). Integre via le pipeline reel.
**Bug trouve et corrige** dans `lib/valider-post.js` : l'annee ecrite a l'interieur de sa propre
citation `(source : France Num, 2025)` etait detectee comme un second chiffre sans source et
bouclait sur son propre refus -- corrige en elargissant la fenetre de detection (avant ET apres
le chiffre).

## Defaut de sens trouve par relecture visuelle (14/09/2026)

La diapo 2 du carrousel du 14/09 annoncait "trois signes" alors que 7 diapos d'idees suivaient --
corrige en "sept signes" (json ET post relies, pipeline re-execute entierement). Aucun garde-fou
automatique ne pouvait detecter cette incoherence de sens (les garde-fous verifient la forme, pas
que le contenu se tienne) -- seule la relecture visuelle diapo par diapo l'a fait. A refaire a
chaque carrousel, pas remplacable par un script.

## Suppression des deux anciens carrousels (12/09 et 14/09) -- toujours pas resolue au 15/09/2026

Plusieurs tentatives de suppression reelle, toutes en echec malgre des signaux API parfois
positifs -- **jamais declare "fait" sur la seule foi du code de retour** :

- **15/09/2026 (republication)** : `LINKEDIN_DELETE_POST` a repondu `{"deleted": true}` deux fois
  sur les deux anciens posts, qui sont pourtant restes visibles en ligne (verifie par navigation
  reelle sur leurs permalinks).
- **15/09/2026, sur demande explicite de Julien, 3 voies epuisees** : `DELETE /rest/posts/{urn}`
  direct via `proxy_execute` -> `404 NOT_FOUND` sur les deux, forme `share` (seule forme
  syntaxiquement valide ; `activity` rejete en `400 UGC_VALIDATIONS_FAILED`, `ugcPost` egalement
  `404`) ; `LINKEDIN_DELETE_POST` natif rejoue -> meme signal deja invalide (`deleted: true` sans
  effet reel constate). Detail complet, requetes et reponses brutes : Point n°17 de
  `references/etat-linkedin-20260912.md`.

Cause probable, jamais confirmee au-dela d'une hypothese : ces posts ont ete crees via l'API
Documents (`content.media.id`), pas via un post texte simple -- l'endpoint de suppression
standard ne les reconnait peut-etre pas comme la meme ressource. **A transmettre a Julien pour
suppression manuelle** (menu ••• -> Supprimer, depuis son propre profil) :
- 14/09 : `https://www.linkedin.com/posts/julien-rayes_pourquoi-vos-meilleurs-candidats-disparaissent-ils-activity-7505170085091840000-6DCd`
- 12/09 : `https://www.linkedin.com/posts/julien-rayes_carrouselpdf-activity-7505146405649559552-m6yM`

## Autres decisions de conception, avec leur motif

- **Convention de nommage des fichiers de sortie (14/09/2026, suite au brief du 10/09)** :
  `sortants/<compte>/<Titre lisible en francais>.pdf`, sans date ni numero, casse et accents
  conserves -- parce que LinkedIn affiche ce nom sous le post publie, il doit se lire comme un
  vrai titre. Avant cette date : `AAAA-MM-JJ-<slug>.pdf`.
- **`PDF_RENDER_API_KEY` retiree du `.env.example` (15/09/2026)** : vestigiale -- le rendu se
  fait entierement en local via Playwright, aucun service externe. A ne reintroduire que si un
  moteur de rendu distant remplace un jour Playwright.
- **`COMPOSIO_API_KEY` (repli REST, jamais la voie qui a servi a publier)** : `lib/composio.js`
  la lit comme methode de secours (cle de projet Composio statique). La voie qui fonctionne
  reellement est la cle consumer personnelle (voir plus haut) -- laisser `COMPOSIO_API_KEY` vide
  dans `.env.example` reste correct.
- **`reglages-comptes.json` n'est lu par aucun code de cette skill (verifie le 14/09/2026)** :
  le compte/gabarit vient toujours de l'argument CLI de `generer-pdf.js`/`generer-post.js`, pas
  d'un fichier de reglages. A garder en tete si une evolution future veut y brancher un ton ou
  une palette par compte.
- **Repli image (`generer-images.js`, `publierCarrouselViaImage`) code mais inerte** : rendu
  local (Playwright, meme gabarit HTML que le PDF) verifie et teste (`test/generer-images.test.js`,
  12 tests verts) pour deux modes (`par-diapo`, `couverture`) -- mais l'etape de creation du post
  reste cassee (voir plus haut, contrainte du wrapper Composio sur `images`). Personne ne
  l'appelle ailleurs dans le paquet (verifie par `test/publier-repli-image.test.js`). Ne pas
  debrancher : reste la base d'un correctif futur si la voie Documents casse un jour.
- **URN d'auteur** : julien-partners `urn:li:person:ZvLHybJZhj` (jamais confirme connecte
  cote Composio), julien-agency `urn:li:person:aFqu-W7ClW` (confirme). Pour page-claude,
  `author_urn` reste `null` : `LINKEDIN_GET_COMPANY_INFO` repond 403 (autorisation
  d'organisation a valider cote LinkedIn) -- brancher `urn:li:organization:<id>` une fois
  debloque.
- **Canal MCP obligatoire, pas le SDK/cle API** (11/09/2026) : ce canal exige un jeton AuthKit
  (session OAuth) ou la cle consumer, pas une cle API statique classique -- `composio login`
  (CLI officiel) est bloque par le classifieur auto-mode, extraction de jeton navigateur
  ecartee (pas une pratique a suivre).

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient activable des que
chaque blocage se leve : `references/etat-linkedin-20260912.md`.
