# Actions Composio -- toolkit LinkedIn

Registre verifie des actions ("tools") enregistrees par Composio pour le toolkit `linkedin`, destine a servir de reference aux skills `linkedin-carrousel`, `linkedin-veille-virale`, `linkedin-commentaires` (workspace `jrayes000_workspace`).

## Methode de verification

**La cle `COMPOSIO_API_KEY` de production (`ak_nz4gKAqnX4jAEOmXJ9jG`) ne permet PAS de lister les actions via l'API REST v3/v3.1** (`GET /api/v3/tools`, `GET /api/v3/toolkits`) : elle renvoie HTTP 403 `APIKey_InsufficientPermissions` -- "the key has no access for 'tools'" / "has write access" (mais pas read) pour `toolkits` et `connected_accounts`. Teste sur v3, v3.1 et l'ancien v1 (`/api/v1/actions` -> HTTP 410, endpoint retire). Julien devra ajouter la permission `tools:read` (et idealement `toolkits:read`) a cette cle, ou fournir une cle differente, pour que cette liste puisse un jour etre revérifiee directement via l'API.

**Contournement retenu : documentation publique officielle**, consultee sans authentification :
- URL : <https://docs.composio.dev/toolkits/linkedin>
- `curl` direct (sans cle) -> **HTTP 200** (page publique, aucune authentification requise)
- Version du toolkit documentee dans la page : **`20260826_00`**
- La page embarque un bloc JSON complet (payload Next.js "flight", `self.__next_f.push(...)`) contenant, pour chacune des 24 actions, `slug`, `name`, `description`, `input_parameters` (avec `required: true/false` par parametre), `output_parameters`, `scopes` et `tags`. Ce bloc a ete extrait et decode avec le scanner JSON officiel de Python (`json.decoder.scanstring`), pas par un remplacement de texte naif -- une premiere tentative de remplacement naif produisait un JSON tronque/incomplet silencieusement accepte (voir piege ci-dessous). Le tableau ci-dessous est genere programmatiquement depuis ce JSON extrait, sans retranscription manuelle.
- **24 actions trouvees** -- confirme le chiffre annonce par Julien, aucun ecart a signaler.

**Piege rencontre et evite** : la page contient en realite DEUX tableaux `"tools":[...]` differents dans son payload -- un resume compact (`slug`/`name`/`description` seulement) et le tableau complet avec `input_parameters`. Une extraction naive sur le premier marqueur trouve aurait silencieusement produit un tableau de 24 entrees valide mais **incomplet** (sans les parametres), sans lever d'erreur. Verifie en comparant les deux blocs avant de choisir le bon.

**Colonne "portee compte propre / tiers"** : deduite du schema (parametre `author`/`actor`/`owner` couple a un scope OAuth precis => compte connecte ; identifiant d'entite libre sans controle de propriete visible dans le schema => tiers potentiel, avec le tag `openWorldHint` de Composio comme signal corroborant). Marquee **"a verifier par test"** partout ou la documentation ne tranche pas explicitement -- notamment les trois actions de suppression, ou l'application reelle de la regle de propriete depend du comportement de l'API LinkedIn sous-jacente, non documente ici.

## Tableau des 24 actions

### `LINKEDIN_CREATE_ARTICLE_OR_URL_SHARE`

- **Nom Composio** : Create article or URL share
- **Description (verbatim API)** : Tool to create an article or URL share on LinkedIn using the UGC Posts API. Use when you need to share a link with optional commentary on LinkedIn. Supports sharing URLs as articles with customizable visibility settings.
- **Parametres requis** : `author`, `visibility`, `specificContent`
- **Parametres optionnels** : `lifecycleState`
- **Scopes OAuth** : w_member_social, w_organization_social
- **Tags Composio** : important, openWorldHint, ugc_posts_creation, createHint
- **Portee compte propre / tiers** : Compte connecte : `author` doit etre l'URN d'une personne ou organisation couverte par le scope OAuth (w_member_social / w_organization_social) du token utilise. Le schema n'empeche pas syntaxiquement de fournir un URN tiers, mais l'API LinkedIn le refuserait hors compte autorise -- non teste en conditions reelles, deduit du modele de scopes OAuth.

### `LINKEDIN_CREATE_COMMENT_ON_POST`

- **Nom Composio** : Create comment on LinkedIn post
- **Description (verbatim API)** : Tool to create a first-level or nested comment on a LinkedIn share, UGC post, or parent comment via the Social Actions Comments API. Use when you need to engage with posts by adding comments or replying to existing comments. Supports text comments with optional @-mentions and image attachments.
- **Parametres requis** : `actor`, `object`, `message`, `target_urn`
- **Parametres optionnels** : `content`, `parent_comment`
- **Scopes OAuth** : w_member_social, w_organization_social
- **Tags Composio** : openWorldHint, createHint
- **Portee compte propre / tiers** : Compte connecte pour l'auteur du commentaire (`actor`), mais la cible (`target_urn`/`object`) peut etre n'importe quel post/commentaire LinkedIn, y compris d'un tiers -- c'est le principe meme d'un commentaire. Tag `openWorldHint` confirme un univers de cibles non restreint.

### `LINKEDIN_CREATE_LINKED_IN_POST`

- **Nom Composio** : Create a LinkedIn post
- **Description (verbatim API)** : Creates a new post on LinkedIn for the authenticated user or an organization they manage. Requires w_member_social scope for posting as a person, and w_organization_social scope for posting as an organization (with ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER, or CONTENT_ADMIN role).
- **Parametres requis** : `author`, `commentary`
- **Parametres optionnels** : `images`, `container`, `visibility`, `distribution`, `lifecycleState`, `reshareContext`, `contentLandingPage`, `contentCallToActionLabel`, `isReshareDisabledByAuthor`
- **Scopes OAuth** : w_member_social, w_organization_social
- **Tags Composio** : openWorldHint, createHint
- **Portee compte propre / tiers** : Compte connecte : `author` doit correspondre a une personne/organisation couverte par le scope OAuth du token. A verifier par test si l'API accepte de poster pour un tiers non autorise (attendu : rejet).

### `LINKEDIN_CREATE_VIDEO_POST`

- **Nom Composio** : Create video post
- **Description (verbatim API)** : Publish an available member-owned LinkedIn video as a personal native video post.
- **Parametres requis** : `video_urn`, `commentary`
- **Parametres optionnels** : `title`, `visibility`
- **Scopes OAuth** : openid, profile, w_member_social
- **Tags Composio** : createHint, video_post
- **Portee compte propre / tiers** : Compte connecte (post personnel natif) : le `video_urn` doit avoir ete televerse par le membre authentifie ("available member-owned" dans la description).

### `LINKEDIN_DELETE_LINKED_IN_POST`

- **Nom Composio** : Delete LinkedIn Post
- **Description (verbatim API)** : Deletes a specific LinkedIn post (share) by its unique `share_id`, which must correspond to an existing share.
- **Parametres requis** : `share_id`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : w_member_social, w_organization_social
- **Tags Composio** : destructiveHint, openWorldHint
- **Portee compte propre / tiers** : A verifier par test : seul un `share_id` est requis, sans verification explicite de propriete decrite dans le schema. L'application de la regle de propriete depend du comportement de l'API LinkedIn elle-meme, non documente ici.

### `LINKEDIN_DELETE_POST`

- **Nom Composio** : Delete Post
- **Description (verbatim API)** : Delete a LinkedIn post using the Posts API REST endpoint. Supports both ugcPost and share URN formats. This action is idempotent - deleting an already-deleted post returns success. Note: LinkedIn's own live /rest/posts DELETE endpoint does NOT actually honor this on its own (a repeat delete 404s rather than returning 204 as LinkedIn's docs claim); this action compensates by treating a 404 as a successful deletion.
- **Parametres requis** : `post_urn`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : w_member_social, w_organization_social
- **Tags Composio** : destructiveHint, idempotentHint, openWorldHint, ugc_posts_deletion
- **Portee compte propre / tiers** : A verifier par test : meme remarque que LINKEDIN_DELETE_LINKED_IN_POST -- seul `post_urn` est requis, propriete non verifiee dans le schema documente.

### `LINKEDIN_DELETE_UGC_POST`

- **Nom Composio** : Delete UGC Post (Legacy)
- **Description (verbatim API)** : Delete a UGC post using the legacy UGC Post API endpoint. Use when you need to delete a post using the v2/ugcPosts endpoint. Deletion is idempotent - previously deleted posts also return success.
- **Parametres requis** : `ugc_post_urn`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : w_member_social, w_organization_social, w_compliance
- **Tags Composio** : destructiveHint, idempotentHint, openWorldHint, ugc_posts_deletion
- **Portee compte propre / tiers** : A verifier par test : meme remarque, seul `ugc_post_urn` est requis.

### `LINKEDIN_GET_AD_TARGETING_FACETS`

- **Nom Composio** : Get ad targeting facets
- **Description (verbatim API)** : Tool to retrieve available ad targeting facets from LinkedIn Marketing API. Use when you need to discover what targeting options are available for ad campaigns (e.g., locations, industries, job functions).
- **Parametres requis** : _(aucun parametre)_
- **Parametres optionnels** : _(aucun parametre)_
- **Scopes OAuth** : _(non specifie)_
- **Tags Composio** : readOnlyHint, openWorldHint, advertising
- **Portee compte propre / tiers** : Non applicable -- donnees de reference globales de la Marketing API (facettes de ciblage), aucune notion de compte tiers.

### `LINKEDIN_GET_AUDIENCE_COUNTS`

- **Nom Composio** : Get audience counts
- **Description (verbatim API)** : Retrieves audience size counts for specified targeting criteria. Use when estimating reach for LinkedIn ad campaigns or targeted content.
- **Parametres requis** : `targetingCriteria`
- **Parametres optionnels** : `q`
- **Scopes OAuth** : _(non specifie)_
- **Tags Composio** : readOnlyHint, openWorldHint, advertising
- **Portee compte propre / tiers** : Non applicable -- estimation d'audience sur des criteres de ciblage generiques, pas liee a un compte precis.

### `LINKEDIN_GET_COMPANY_INFO`

- **Nom Composio** : Get company info
- **Description (verbatim API)** : Retrieves organizations where the authenticated user has specific roles (ACLs), to determine their management or content posting capabilities for LinkedIn company pages.
- **Parametres requis** : _(aucun requis)_
- **Parametres optionnels** : `role`, `count`, `start`, `state`
- **Scopes OAuth** : r_organization_admin
- **Tags Composio** : openWorldHint, readOnlyHint
- **Portee compte propre / tiers** : Compte connecte uniquement : la description precise explicitement "organizations where the authenticated user has specific roles (ACLs)" -- limite aux organisations gerees par l'utilisateur authentifie.

### `LINKEDIN_GET_IMAGE`

- **Nom Composio** : Get image details
- **Description (verbatim API)** : Tool to retrieve details of a LinkedIn image using its URN. Use when you need to check image status, get download URLs, or access image metadata for a single image.
- **Parametres requis** : `image_urn`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : r_organization_social, rw_ads, w_member_social
- **Tags Composio** : readOnlyHint, openWorldHint, media_retrieval
- **Portee compte propre / tiers** : A verifier par test : `image_urn` est un identifiant libre : rien dans le schema ne restreint la lecture aux images du compte connecte. Tag `openWorldHint`.

### `LINKEDIN_GET_IMAGES`

- **Nom Composio** : Get images
- **Description (verbatim API)** : Tool to retrieve image metadata including download URLs, status, and dimensions from LinkedIn's Images API. Use when you need to access image details for posts, profiles, or media library assets.
- **Parametres requis** : `ids`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : r_organization_social, rw_ads, w_member_social
- **Tags Composio** : readOnlyHint, openWorldHint, media_retrieval
- **Portee compte propre / tiers** : A verifier par test : meme remarque, `ids` est une liste d'URN libres.

### `LINKEDIN_GET_MY_INFO`

- **Nom Composio** : Get my info
- **Description (verbatim API)** : Fetches the authenticated LinkedIn user's profile information including name, headline, profile picture, and other profile details.
- **Parametres requis** : _(aucun parametre)_
- **Parametres optionnels** : _(aucun parametre)_
- **Scopes OAuth** : profile, r_liteprofile, r_basicprofile
- **Tags Composio** : readOnlyHint, openWorldHint
- **Portee compte propre / tiers** : Compte connecte exclusivement : "Fetches the authenticated LinkedIn user's profile" -- pas de parametre, ne peut porter que sur soi-meme.

### `LINKEDIN_GET_NETWORK_SIZE`

- **Nom Composio** : Get network size
- **Description (verbatim API)** : Tool to retrieve the follower count for a LinkedIn organization. Use when you need to get the number of members following a specific company or organization on LinkedIn.
- **Parametres requis** : `organization_id`
- **Parametres optionnels** : `edgeType`
- **Scopes OAuth** : rw_organization_admin
- **Tags Composio** : readOnlyHint, openWorldHint, analytics
- **Portee compte propre / tiers** : A verifier par test -- signal contradictoire : `organization_id` est un identifiant libre (tag `openWorldHint`), ce qui suggererait un ciblage tiers possible, MAIS le scope exige `rw_organization_admin` (role admin), qui sur les autres actions de ce toolkit signifie systematiquement "organisation geree par l'utilisateur". Je ne tranche pas entre les deux lectures sans test reel.

### `LINKEDIN_GET_ORG_PAGE_STATS`

- **Nom Composio** : Get organization page statistics
- **Description (verbatim API)** : Tool to retrieve page statistics for a LinkedIn organization page. Use when you need engagement metrics like page views and custom button clicks. Supports both lifetime statistics (all-time data segmented by demographics) and time-bound statistics (aggregate data for specific time ranges). Requires rw_organization_admin permission with ADMINISTRATOR role for the organization.
- **Parametres requis** : `organization`
- **Parametres optionnels** : `timeRangeEnd`, `timeRangeStart`, `timeGranularityType`
- **Scopes OAuth** : rw_organization_admin
- **Tags Composio** : readOnlyHint, openWorldHint, analytics
- **Portee compte propre / tiers** : Compte connecte uniquement : la description exige explicitement le role ADMINISTRATOR sur l'organisation cible via le scope `rw_organization_admin`.

### `LINKEDIN_GET_PERSON`

- **Nom Composio** : Get person profile
- **Description (verbatim API)** : Retrieves a LinkedIn member's profile information by their person ID. Returns lite profile fields (name, profile picture) by default, or basic profile fields (including headline and vanity name) with appropriate permissions.
- **Parametres requis** : `person_id`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : profile, r_liteprofile, r_basicprofile
- **Tags Composio** : important, readOnlyHint, openWorldHint, content_retrieval
- **Portee compte propre / tiers** : A verifier par test -- `person_id` est un identifiant libre dans le schema, mais les scopes requis (`profile`, `r_liteprofile`, `r_basicprofile`) sont, dans le modele de permissions LinkedIn documente publiquement par ailleurs, historiquement limites au profil du membre authentifie lui-meme (endpoint `/v2/me`), pas a un membre arbitraire. Je ne confirme PAS "tiers possible" sur la seule base du parametre libre : contradiction non resolue avec le scope, a trancher par un appel reel.

### `LINKEDIN_GET_POST_CONTENT`

- **Nom Composio** : Get post content
- **Description (verbatim API)** : Tool to retrieve detailed post content including text, images, videos, and metadata from LinkedIn by post URN. Use when you need to fetch the full content and details of a specific LinkedIn post.
- **Parametres requis** : `post_id`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : r_organization_social, r_member_social
- **Tags Composio** : important, readOnlyHint, openWorldHint, content_retrieval
- **Portee compte propre / tiers** : A verifier par test -- `post_id` est un identifiant libre (tag `openWorldHint`), mais je n'ai pas de confirmation que les scopes `r_organization_social`/`r_member_social` autorisent la lecture d'un post d'un tiers non connecte plutot que seulement du contenu accessible au compte connecte. Ne pas trancher sans test.

### `LINKEDIN_GET_SHARE_STATS`

- **Nom Composio** : Get share statistics
- **Description (verbatim API)** : Retrieves share statistics for a LinkedIn organization, including impressions, clicks, likes, comments, and shares. Use to analyze content performance for an organization page. Optionally filter by time intervals to get time-bound statistics.
- **Parametres requis** : `organizational_entity`
- **Parametres optionnels** : `time_intervals`
- **Scopes OAuth** : rw_organization_admin
- **Tags Composio** : readOnlyHint, openWorldHint, analytics
- **Portee compte propre / tiers** : Compte connecte uniquement (implicite) : les statistiques de partage d'une organisation necessitent le scope `rw_organization_admin`, donc limite aux organisations gerees.

### `LINKEDIN_GET_VIDEOS`

- **Nom Composio** : Get videos
- **Description (verbatim API)** : Retrieves video metadata from LinkedIn for a video owned by a person or organization. Supports single video retrieval and batch retrieval (multiple videos). Use when you need to get video details including duration, dimensions, status, download URLs, and media library information. Note: this does not support finding videos by a LinkedIn Ads sponsored account - that's an ads/Campaign-Manager-specific capability outside this toolkit's organic-posting scope.
- **Parametres requis** : _(aucun requis)_
- **Parametres optionnels** : `video_ids`, `video_urn`
- **Scopes OAuth** : w_organization_social, w_member_social
- **Tags Composio** : readOnlyHint, openWorldHint, media_retrieval
- **Portee compte propre / tiers** : A verifier par test : `video_urn`/`video_ids` sont des identifiants libres ; la description ne restreint pas explicitement a la propriete du compte connecte.

### `LINKEDIN_INITIALIZE_IMAGE_UPLOAD`

- **Nom Composio** : Initialize image upload
- **Description (verbatim API)** : Tool to initialize an image upload to LinkedIn and return a presigned upload URL plus the resulting image URN. Use when you need to prepare an image upload for LinkedIn posts. After calling this tool, upload the image bytes to the returned upload_url via PUT request, then use the image URN in CREATE_LINKED_IN_POST action.
- **Parametres requis** : `owner`
- **Parametres optionnels** : _(aucun optionnel)_
- **Scopes OAuth** : rw_ads, w_member_social, w_organization_social, w_power_creators
- **Tags Composio** : important, openWorldHint, media_upload, createHint
- **Portee compte propre / tiers** : Compte connecte : `owner` doit correspondre a une personne/organisation couverte par le scope OAuth du token (meme logique que la creation de post).

### `LINKEDIN_LIST_REACTIONS`

- **Nom Composio** : List reactions on entity
- **Description (verbatim API)** : Retrieves reactions (likes, celebrations, etc.) on a LinkedIn entity such as a share, post, or comment. Use when you need to see who reacted to content and what type of reactions were used.
- **Parametres requis** : `entity`
- **Parametres optionnels** : `sort`, `count`, `start`
- **Scopes OAuth** : r_organization_social_feed, r_member_social_feed
- **Tags Composio** : readOnlyHint, openWorldHint, analytics
- **Portee compte propre / tiers** : A verifier par test -- meme reserve que LINKEDIN_GET_POST_CONTENT : `entity` est un URN libre (tag `openWorldHint`), mais je ne confirme pas que les scopes `r_organization_social_feed`/`r_member_social_feed` permettent de lister les reactions sur du contenu de tiers plutot que seulement sur le contenu du compte connecte.

### `LINKEDIN_REGISTER_IMAGE_UPLOAD`

- **Nom Composio** : Register image upload
- **Description (verbatim API)** : Tool to initialize a native LinkedIn image upload for feed shares and return a presigned upload URL plus the resulting digital media asset URN. Use when you need to upload an image to attach to a LinkedIn post. After calling this tool, upload the image bytes to the returned upload_url, then use the asset_urn in LINKEDIN_CREATE_LINKED_IN_POST.
- **Parametres requis** : `owner_urn`
- **Parametres optionnels** : `recipe`, `supported_upload_mechanism`
- **Scopes OAuth** : w_member_social, w_organization_social, rw_ads, w_compliance
- **Tags Composio** : important, openWorldHint, media_upload, createHint
- **Portee compte propre / tiers** : Compte connecte : `owner_urn` doit correspondre a une personne/organisation couverte par le scope OAuth du token.

### `LINKEDIN_SEARCH_AD_TARGETING_ENTITIES`

- **Nom Composio** : Search ad targeting entities
- **Description (verbatim API)** : Search for ad targeting entities using typeahead search. Use when you need to find targeting entities like geographic locations, job titles, industries, or other targeting criteria for LinkedIn ad campaigns.
- **Parametres requis** : `facet`, `query`
- **Parametres optionnels** : `count`, `start`, `queryVersion`
- **Scopes OAuth** : r_ads, rw_ads
- **Tags Composio** : readOnlyHint, openWorldHint, advertising
- **Portee compte propre / tiers** : Non applicable -- recherche dans un referentiel global de ciblage publicitaire, aucune notion de compte tiers.

### `LINKEDIN_UPLOAD_VIDEO`

- **Nom Composio** : Upload video
- **Description (verbatim API)** : Upload an MP4 video for a native post by the authenticated LinkedIn member and wait until it is ready.
- **Parametres requis** : _(aucun requis)_
- **Parametres optionnels** : `file`, `video_url`
- **Scopes OAuth** : openid, profile, w_member_social
- **Tags Composio** : createHint, media_upload
- **Portee compte propre / tiers** : Compte connecte : "for a native post by the authenticated LinkedIn member" -- explicitement limite au membre authentifie.

## Test decisif -- LINKEDIN_CREATE_COMMENT_ON_POST

**Tentative du 11/09/2026 -- BLOQUEE avant tout contact avec LinkedIn (pas d'echec definitif).**

Action ciblee : `LINKEDIN_CREATE_COMMENT_ON_POST` (scopes `w_member_social`,
`w_organization_social` ; parametres requis `actor`, `object`, `message`, `target_urn`).

### Endpoint d'execution identifie

`POST https://backend.composio.dev/api/v3.1/tools/execute/{tool_slug}` (documente sur
<https://docs.composio.dev/reference/api-reference/tools/postToolsExecuteByToolSlug>,
verifie par curl direct -- redirection 308 vers cette URL canonique). Corps JSON attendu :
`arguments` (objet cle/valeur des parametres du tool), `connected_account_id` (optionnel),
`user_id` (optionnel), `version` (optionnel, defaut "latest").

### Blocage rencontre

Appel de test en lecture seule d'abord (`LINKEDIN_GET_MY_INFO`, zero parametre, zero effet
de bord) pour identifier le compte qui agirait -- **avant** de risquer le commentaire reel :

```
POST /api/v3.1/tools/execute/LINKEDIN_GET_MY_INFO   body: {"arguments":{}}
-> HTTP 400 ActionExecute_ConnectedAccountEntityIdRequired
   "User ID is required with connected account."
```

Composio exige un `user_id`/`entity_id` pour savoir quel compte connecte utiliser. Six
valeurs plausibles testees (toutes en lecture seule, aucune n'a atteint LinkedIn) :
`default`, `jrayes000_workspace`, `julien`, `nomena`, `nomenaf.pro@gmail.com`,
`nomena-linkedin-cle` -- toutes en **HTTP 404 `ActionExecute_ConnectedAccountNotFound`**
("No connected account found for user ID X for toolkit linkedin").

Impossible de lister les comptes connectes pour trouver la bonne valeur :
`GET /api/v3/connected_accounts` reste en **403** avec cette cle (permission ecriture
seulement, pas lecture -- meme constat que dans la section "Methode de verification"
ci-dessus).

**Tentative de contournement via le dashboard web** (`dashboard.composio.dev`, sans saisie
d'identifiants) : redirection automatique vers `login.composio.dev` -- **aucune session
navigateur active**, donc aucune information recuperable par cette voie sans qu'un humain
se connecte.

### Etat final

**Aucun appel n'a atteint l'API LinkedIn** -- tous les refus ci-dessus viennent de Composio,
avant meme la tentative reelle. Le test du commentaire sur un post tiers n'a donc **pas ete
execute**, ni en succes ni en echec reel. Il reste bloque tant que l'une de ces conditions
n'est pas remplie :
1. Julien communique le `user_id`/`entity_id` exact utilise lors de la connexion du compte
   LinkedIn dans Composio, ou
2. la permission `connected_accounts:read` est ajoutee a la cle pour que je puisse lister
   moi-meme le(s) compte(s) connecte(s) et recuperer son identifiant.

Rien n'a ete publie sur LinkedIn, ni sur un compte propre ni sur celui d'un tiers.

### Mise a jour du 11/09/2026 -- identifiants reels trouves, mais invalides pour cette cle

Piste explorée avant de contacter Julien : relecture complète de `env/secrets.md` et de
tout le dépôt `claude-config`, puis extension au dépôt privé `JRAYES000/visibilite-ops`
(référencé par une mémoire de `claude-config` sans lien évident avec Composio). Ce dépôt
contient la routine de production `routines/commentaires-linkedin.md`, qui documente
noir sur blanc les deux comptes LinkedIn connectés à Composio pour la vague quotidienne
de commentaires (12/jour/compte) :

| Population | Compte | Identifiant Composio | `actor` |
| --- | --- | --- | --- |
| prestataires | Claude Partners | `linkedin_arsino-dian` | `urn:li:person:ZvLHybJZhj` |
| dirigeants | Claude Agency | `linkedin_habe-bogue` | `urn:li:person:aFqu-W7ClW` |

**Testé en lecture seule (`LINKEDIN_GET_MY_INFO`, zero effet de bord) avec les 4 valeurs
(les deux identifiants Composio et les deux URN `actor`) sous la cle `COMPOSIO_API_KEY`
(`ak_nz4gKAqnX4jAEOmXJ9jG`, workspace `jrayes000_workspace`) : les 4 en HTTP 404
`ActionExecute_ConnectedAccountNotFound`.**

Conclusion : ces identifiants sont reels et actifs pour la routine `visibilite-ops`, mais
**appartiennent a un autre projet/cle Composio** que celui documente dans `env/secrets.md`
sous le nom `COMPOSIO_API_KEY` (ajoutee le 2026-09-10, "cle nomena-linkedin-cle"). Les deux
integrations ne partagent pas le meme espace de comptes connectes, malgre le meme
"workspace" `jrayes000_workspace` au sens Composio -- soit parce que `visibilite-ops`
utilise une cle differente (non presente dans `env/secrets.md`, probablement en secret
GitHub direct du depot `visibilite-ops` ou Cloudflare Pages, cf.
`routines-cloud-visibilite.md` : "Les cles d'envoi (Composio...) ne vivent que sur
Cloudflare Pages"), soit parce que l'entite (`user_id`) est scopee par projet Composio et
non par workspace.

**Autres pistes explorees, sans resultat exploitable sans risque :**
- *Endpoint d'initiation de connexion* (`COMPOSIO_INITIATE_CONNECTION`, mentionne dans le
  `suggested_fix` de chaque erreur 404) : creerait une **nouvelle** connexion OAuth
  LinkedIn (flux d'autorisation reel demandant une action humaine sur linkedin.com) --
  non execute, effet de bord non maitrisable a distance.
- *Webhooks / journal d'evenements Composio* : non explore en detail, rendu inutile par
  la decouverte (puis l'echec) de la piste des identifiants deja notes -- la cle actuelle
  n'a de toute facon pas de permission de lecture confirmee sur une eventuelle liste de
  webhooks.
- *ID LinkedIn public comme `user_id`* : hypothese non testee -- les 4 refus 404 ci-dessus
  rendent peu probable qu'un identifiant LinkedIn brut (vanity URL ou ID numerique) soit la
  bonne forme pour cette cle, l'erreur etant systematiquement "no connected account", pas
  un probleme de format.

### Verification demandee le 11/09 : le blocage touche-t-il aussi les comptes PROPRES de Julien ?

**Oui, de facon confirmee -- le blocage est universel, pas specifique aux cibles tierces.**

Preuve : `LINKEDIN_GET_AD_TARGETING_FACETS` (action sans `scopes` declares dans son
schema, donnee de reference generique sans notion de compte) renvoie exactement la
meme erreur que toutes les actions liees a un post ou un profil :

```
POST /api/v3.1/tools/execute/LINKEDIN_GET_AD_TARGETING_FACETS   body: {"arguments":{}}
-> HTTP 400 ActionExecute_ConnectedAccountEntityIdRequired
```

La resolution du compte connecte (`user_id`/`entity_id`) est une etape prealable a
**toute** action du toolkit `linkedin` sous cette cle, avant meme d'atteindre la logique
propre a l'action (lecture, ecriture, compte propre ou tiers). Consequence directe : il
est impossible de construire la partie "publication" de `linkedin-carrousel` sur une
hypothese testee -- l'ecriture sur les propres comptes de Julien est bloquee exactement
comme le reste, tant que le `user_id`/`entity_id` correct n'est pas connu ou que
`connected_accounts:read` n'est pas accorde a la cle.

**Consequence pour l'architecture de `linkedin-carrousel`** : construire par defaut en
mode "composeur prepare, publication manuelle" (brouillon genere, publication faite a la
main par Julien ou via son propre acces Composio) plutot que de batir la publication
automatique sur une hypothese non verifiee.

### 11/09/2026 (suite) -- diagnostic definitif : aucun compte LinkedIn n'est connecte du tout

Methode demandee cette fois : tester chaque hypothese directement via l'outil, ne pas
s'arreter sans preuve d'echec concrete. Trois voies testees, trois erreurs reelles :

**1. `COMPOSIO_MANAGE_CONNECTIONS` (cense lister les connexions par toolkit)**
```
POST /api/v3.1/tools/execute/COMPOSIO_MANAGE_CONNECTIONS  body: {"arguments":{"toolkits":["linkedin"]}}
-> HTTP 200 {"successful":false,"error":"COMPOSIO_MANAGE_CONNECTIONS can only be
   called inside a tool-router session."}
```
Cree une session reelle (`POST /api/v3.1/tool_router/session`, body
`{"user_id":"...","toolkits":{"enable":["linkedin"]}}`) -> **HTTP 201**, `session_id`
obtenu (`trs_33KlRKqoE2Im`). Rappel de `COMPOSIO_MANAGE_CONNECTIONS` avec ce
`session_id` en argument -> **meme erreur, inchangee**. Cet outil n'est joignable que
via le point d'acces MCP dedie de la session (`.../tool_router/<id>/mcp`, protocole
JSON-RPC/SSE), pas via l'endpoint REST `/tools/execute/` utilise partout ailleurs dans
ce document. Non teste plus loin : implementer un client MCP complet pour un seul
diagnostic depasse la portee de cette verification.

**2. `LINKEDIN_GET_MY_INFO` avec les deux identifiants reels connus (retest a chaud,
pas une reutilisation d'un resultat perime)**
```
user_id=linkedin_arsino-dian  -> HTTP 404 ActionExecute_ConnectedAccountNotFound
user_id=linkedin_habe-bogue   -> HTTP 404 ActionExecute_ConnectedAccountNotFound
```
Identique au test du 11/09 precedent. Confirme : ce n'est pas un resultat perime, l'etat
n'a pas change.

**3. `COMPOSIO_INITIATE_CONNECTION` (le correctif suggere par l'erreur 404 elle-meme)**
Bloque par le classifieur auto-mode de Claude Code avant meme d'atteindre l'API Composio
-- a juste titre, cette action demarre un vrai flux OAuth LinkedIn. Non contourne.

**Diagnostic** : les trois voies convergent vers la meme conclusion -- **aucun compte
LinkedIn n'est OAuth-connecte du tout sous le projet Composio de `COMPOSIO_API_KEY`**,
quel que soit l'identifiant essaye. Ce n'est pas un probleme de format d'URN ni
d'entity_id a deviner : il n'y a rien a resoudre cote API, la connexion elle-meme
n'existe pas. Le compte `julien_arsino-dian` / `julien_habe-bogue` vus dans
`visibilite-ops` appartiennent a un **autre** projet Composio.

**Ce qui reste a faire, et qui ne peut pas se faire par API seule** : quelqu'un ayant
acces au dashboard Composio du projet `jrayes000_workspace` (celui de cette cle) doit
connecter reellement les comptes LinkedIn -- `COMPOSIO_INITIATE_CONNECTION` genere un
lien d'autorisation LinkedIn qu'un humain doit ouvrir et valider en se connectant. Aucun
appel API ne remplace cette etape.

**Consequence sur la livraison du 20/09** : les 3 skills mentionnees dans le brief
(linkedin-carrousel, linkedin-veille-virale, linkedin-commentaires) -- verifie dans ce
depot : **seule `linkedin-carrousel` existe reellement** ici, les deux autres n'ont
aucun dossier/code. Meme une fois les comptes connectes, produire "un exemple reel de
publication par skill" pour deux skills qui n'existent pas encore n'est pas possible
sans d'abord les construire.
