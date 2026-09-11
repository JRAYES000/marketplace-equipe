# A publier -- julien-agency, identite ET accord confirmes -- publication reelle bloquee par un bug confirme

**Identite `averse-cooser` confirmee par test reel le 12/09/2026** (voir
`references/etat-linkedin-20260912.md` pour le detail complet de la methode) : appel MCP
reel de `LINKEDIN_GET_MY_INFO` sur la connexion partagee `averse-cooser`, champ `id` retourne
= `aFqu-W7ClW` -- **julien-agency**, pas julien-partners comme le pensait initialement Julien
(hypothese "compte marque par defaut", non confirmee a l'epoque, infirmee par ce test).

**Julien a donne son accord explicite le 12/09/2026** ("OK parfait pour Claude Agency. Peu
importe le compte LinkedIn sur lequel tu publies."). Une tentative reelle de publication a
suivi le meme jour -- **echec propre, aucun post cree** : voir "Ce qui a echoue" ci-dessous.
Le point bloquant n'est plus l'identite ni l'accord, c'est un bug confirme dans
`publierCarrouselViaImage`.

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
commit que celui-ci). julien-partners reste un compte a acces LinkedIn **non confirme/a
ouvrir** -- rien n'empeche d'y refaire un carrousel une fois son propre acces verifie, mais ce
n'est plus la priorite du 20/09 (voir SKILL.md).

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

## A faire pour debloquer une vraie publication -- impasse confirmee, pas juste un blocage classifieur

Deux pistes investiguees le 12/09/2026 pour obtenir le `s3key` requis par `images`, toutes
deux dans une impasse pour des raisons differentes :

1. **Passer par le stockage propre de Composio, comme le fait son SDK officiel.** Lu dans le
   code source public du SDK Python (`ComposioHQ/composio`, `_files.py`, via `gh api` sans
   authentification) : le mecanisme reel n'utilise jamais de base64, juste un `POST
   /api/v3/files/upload/request` (body `md5`/`filename`/`mimetype`/`tool_slug`/`toolkit_slug`)
   qui renvoie une URL S3 presignee, puis un PUT des octets bruts (meme primitive que l'upload
   LinkedIn qui a fonctionne). **Teste reellement** : cet endpoint refuse la cle "consumer" MCP
   (401 `Auth_NoAuthProvided` en `x-consumer-api-key`, 401 `APIKey_InvalidAPIKey` en `x-api-key`
   avec la meme valeur -- prefixe `ck_` non reconnu). Il exige une veritable `COMPOSIO_API_KEY`
   de projet (prefixe `ak_`), indisponible ici -- et celle deja connue dans
   `references/actions-composio.md` appartient a un projet sans connexion LinkedIn, donc ne
   suffirait pas non plus.
2. **Faire entrer les octets dans le bac a sable de `COMPOSIO_REMOTE_WORKBENCH`** (le seul outil
   MCP, via la cle consumer, exposant un helper d'upload local) : suppose un transfert de
   fichier vers ce bac a sable. L'encodage base64 tente pour cela a ete bloque par le
   classifieur auto-mode de Claude Code -- non contourne.

**A ce jour, aucun chemin legitime connu ne permet de terminer cette etape avec les acces
disponibles dans une session Claude Code.** Debloquer necessite soit une `COMPOSIO_API_KEY` de
projet couvrant a la fois `averse-cooser` et l'endpoint de fichiers (a demander a Julien ou a
qui gere le projet Composio concerne), soit un mecanisme MCP equivalent que Composio n'expose
pas encore.
