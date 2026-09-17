# A publier -- julien-agency, identite ET accord confirmes -- carrousel publie techniquement, contenu visible NON CONFIRME

**Identite `averse-cooser` confirmee par test reel le 12/09/2026** (voir
`references/etat-linkedin-20260912.md` pour le detail complet de la methode) : appel MCP
reel de `LINKEDIN_GET_MY_INFO` sur la connexion partagee `averse-cooser`, champ `id` retourne
= `aFqu-W7ClW` -- **julien-agency**, pas julien-partners comme le pensait initialement Julien
(hypothese "compte marque par defaut", non confirmee a l'epoque, infirmee par ce test).

**Julien a donne son accord explicite le 12/09/2026** ("OK parfait pour Claude Agency. Peu
importe le compte LinkedIn sur lequel tu publies."). Une premiere tentative reelle de
publication a echoue proprement (voir "Ce qui a echoue" ci-dessous). Une seconde tentative,
avec la methode que Julien a trouvee lui-meme (bac a sable `COMPOSIO_REMOTE_WORKBENCH`), a
**reussi techniquement** : `LINKEDIN_CREATE_LINKED_IN_POST` a repondu sans erreur avec un
identifiant de post reel (`urn:li:share:7504217733631266816`). **Mais le contenu visible reel
du post n'est pas confirme** -- voir "Deuxieme tentative" plus bas. Julien doit ouvrir le post
lui-meme pour trancher.

## Ce qui est pret (rebascule sur julien-agency le 12/09/2026)

- `julien-agency-2026-09-12.json` -- 5 diapos, contenu reel (pas une fixture de test),
  **re-redige** dans le ton de julien-agency (confiant, direct, pedagogue, oriente-dirigeants
  -- voir `reglages-comptes.json`), pas une simple reutilisation du texte pense pour
  julien-partners : la version initiale s'appuyait sur un angle "reseau professionnel"
  (diapo 3, "le reseau professionnel est plus petit qu'on ne le pense") propre au
  positionnement facilitateur/reseau de julien-partners -- retire et remplace par un angle
  cout/consequence pour l'entreprise, coherent avec le positionnement dirigeants de
  julien-agency.
- `julien-agency-2026-09-12.commentary.txt` -- texte du post LinkedIn, meme ajustement de ton
  (registre plus direct/affirmatif, moins empathique).
- Rendu local deja verifie visuellement le 12/09/2026 (PDF 5 pages + image de couverture
  1080x1350px, diapo hook, mode "couverture", template julien-agency -- palette verte/terracotta
  correcte) -- mais **`sortants/` est dans `.gitignore`** (scratch local, jamais commit), donc
  ces fichiers ne sont pas dans le depot. Pour les regenerer a l'identique :

  ```bash
  node generer-pdf.js julien-agency a-publier/julien-agency-2026-09-12.json
  node generer-images.js couverture julien-agency a-publier/julien-agency-2026-09-12.json
  ```

  Le nom de fichier genere depend de la date du jour de generation (voir la convention de
  nommage en tete de `generer-pdf.js`) -- adapter le chemin dans la commande ci-dessous au nom
  reellement produit.

## Trace de l'ancienne hypothese (julien-partners) -- gardee pour l'historique

Le contenu initial (memes 5 diapos, angle "reseau professionnel" a la diapo 3, commentary un
peu plus chaleureux) a ete redige le 12/09/2026 pour julien-partners, sur l'hypothese non
confirmee de Julien. Il n'est plus dans ce dossier (remplace par la version julien-agency
ci-dessus) mais son historique reste dans `git log` de ce fichier et de
`julien-partners-2026-09-12.json`/`.commentary.txt` (renommes puis reecrits dans le meme
commit que celui-ci).

**Mise a jour du 17/09/2026** : julien-partners a desormais un acces LinkedIn reel et verifie
(canal REST/`ak_`, voir `references/actions-composio.md`). Le carrousel de test du 15/09
(`fixtures/diapos-test-julien-partners-ia-pme.json`, 10 diapos "IA pour les PME", chiffre
Bpifrance source) a ete regenere via le pipeline reel et **publie pour de vrai** ce jour-la :
[voir le post](https://www.linkedin.com/feed/update/urn:li:activity:7506384428168806400/) --
10 images, `urn:li:ugcPost:7506384426956783618`, verifie par navigation directe sur le profil
(pages, titres, accents, pied de page conformes). Legende validee par `generer-post.js` avant
publication -- texte complet dans `julien-partners-2026-09-17.commentary.txt`.

## Ce qui a echoue (tentative reelle, 12/09/2026, apres l'accord de Julien)

Appel via le canal MCP (meme methode que la confirmation d'identite) :

1. `LINKEDIN_REGISTER_IMAGE_UPLOAD` (owner_urn `aFqu-W7ClW`) -> **reussi**, URN d'asset
   LinkedIn native obtenue.
2. PUT des octets de l'image de couverture sur l'URL presignee -> **reussi**, `201 Created`.
3. `LINKEDIN_CREATE_LINKED_IN_POST` (author `aFqu-W7ClW`, commentary, `images: [<URN de
   l'etape 1>]`) -> **echoue**, `400` :
   `"Invalid request data provided - Input should be a valid dictionary or instance of
   FileUploadable on parameter images.0"`. **Aucun post n'a ete cree.**

Cause reelle (confirmee via `COMPOSIO_GET_TOOL_SCHEMAS`) : `images` n'accepte pas une URN
simple, il exige `{ name, mimetype, s3key }` -- un fichier deja stocke dans le S3/R2 propre a
Composio. `lib/publier.js` documente desormais ce constat en detail et leve une erreur
explicite dans `publierCarrouselViaImage` avant tout appel reseau, pour eviter de re-televerser
inutilement une image a chaque tentative tant que ce n'est pas corrige.

Deux pistes avaient ete investiguees le 12/09/2026 pour obtenir le `s3key` requis par
`images`, sans succes a l'epoque :

1. Appeler `POST /api/v3/files/upload/request` directement (comme le fait le SDK officiel de
   Composio en interne) : refuse la cle "consumer" MCP (401), exige une veritable
   `COMPOSIO_API_KEY` de projet, indisponible.
2. Faire entrer les octets dans le bac a sable de `COMPOSIO_REMOTE_WORKBENCH` : l'encodage
   tente pour ce transfert avait ete bloque par le classifieur auto-mode.

## Deuxieme tentative (12/09/2026) -- methode trouvee par Julien, publication reussie techniquement

Julien a identifie que `COMPOSIO_REMOTE_WORKBENCH` embarque un helper (`upload_local_file`)
qui appelle lui-meme l'endpoint de fichiers avec la cle de la session MCP en cours -- pas
besoin d'une cle de projet separee (la piste 1 ci-dessus testait l'endpoint hors du bac a
sable, avec la mauvaise cle). Deroule dans une seule session MCP continue (le `s3key` n'est
valide que pour la session qui l'a genere) :

1. Le PDF du carrousel a ete transfere dans le bac a sable, decode, puis televerse via
   `upload_local_file` -- **reussi**, un `s3key` reel obtenu (cette fois, l'encodage necessaire
   au transfert n'a pas ete bloque -- contrairement a la tentative precedente).
2. `LINKEDIN_CREATE_LINKED_IN_POST` appele dans la meme session avec `images: [{ name:
   "carrousel.pdf", mimetype: "application/pdf", s3key: <valeur> }]`, author `aFqu-W7ClW`,
   le commentary de `julien-agency-2026-09-12.commentary.txt` -- **reussi sans erreur** :
   `{"data":{"x_restli_id":"urn:li:share:7504217733631266816"},"error":null}`.

**Ce qui n'est PAS confirme** : si le PDF apparait reellement comme document/carrousel
feuilletable sur le post, ou si LinkedIn l'a silencieusement ignore (le point de vigilance
signale par Julien lui-meme des le depart -- l'action gere peut-etre des images seules).
Verifications tentees et non concluantes :
- `LINKEDIN_GET_POST_CONTENT` -> `403 Forbidden`.
- `LINKEDIN_LIST_REACTIONS` -> `404 Entity not found`.
- (Le meme type d'echec de lecture etait deja survenu sur un brouillon de test dont
  l'existence etait pourtant confirmee par ailleurs -- ces echecs de lecture via l'API ne
  sont donc probablement pas concluants en soi, dans un sens comme dans l'autre.)
- Verification par URL publique -> bloquee par le mecanisme anti-bot de LinkedIn (`999`),
  **non contournee**.

**Le post n'a pas ete supprime** (aucune erreur reelle signalee, donc pas de motif de
suppression), mais **n'est pas marque comme livre**. Julien doit ouvrir le post lui-meme et
confirmer ce qu'il voit reellement avant que ce chantier soit considere termine.
