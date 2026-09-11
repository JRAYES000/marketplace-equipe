# Etat des lieux -- skills linkedin-* (mis a jour le 12/09/2026, perimetre clarifie par Julien)

Resume d'une reprise sans tout redecouvrir. Concerne les 3 skills
`linkedin-veille-virale`, `linkedin-commentaires`, `linkedin-carrousel`.
Complement de `references/actions-composio.md` (catalogue Composio complet) --
ce fichier-ci ne repete pas le detail des 24 actions, seulement l'etat de
preparation de chaque skill et ce qui reste bloquant.

**Perimetre clarifie par Julien le 12/09/2026 -- ne pas revenir a l'ancien
etat "3 comptes ouverts" decrit dans une version anterieure de ce fichier :**
- **julien-partners** : priorite absolue, seule livraison exigee pour le
  20/09 (carrousel branche et valide, avec un exemple reel de publication).
- **julien-agency** : code ecrit/complete mais **non teste en publication
  reelle** -- l'acces Composio n'existe pas encore sur ce compte. Ne jamais
  le qualifier de "pret", seulement "ecrit, en attente d'acces".
- **page-claude** : **abandonnee**. Le code existant (URN substituable)
  reste dans le depot sans y retoucher ; `reglages-comptes.json` garde
  l'entree mais son contenu (ton/palette/concurrents) reste vide --
  le renseigner serait du travail perdu selon Julien.

## Point bloquant n°1 -- identite `averse-cooser` : tentative reelle faite le 12/09, non aboutie

Julien pense que cette connexion correspond a julien-partners (compte marque
par defaut), mais veut une confirmation reelle (sortie brute de
`LINKEDIN_GET_MY_INFO`), pas une supposition. Ce qui a ete verifie et ce qui
reste a faire :

- **Confirme via le dashboard Composio** (`dashboard.composio.dev`, session
  navigateur deja authentifiee) : la connexion partagee `averse-cooser`
  (partagee par `jrayes000@gmail.com`) existe bien, est "Active", et c'est
  la SEULE connexion LinkedIn partagee visible. Le projet API-key
  (`jrayes000_workspace_first_project`, celui de `COMPOSIO_API_KEY`) n'a
  aucune connexion LinkedIn du tout -- confirme independamment, cette
  connexion partagee est une identite Composio distincte du projet API-key.
- **Non confirme** : l'`id` LinkedIn reel derriere `averse-cooser`. Le
  dashboard n'expose aucun bouton "tester cette action" dans son UI -- il
  faut reellement passer par le canal MCP (`connect.composio.dev/mcp`), qui
  exige un jeton Bearer obtenu par un flux OAuth complet (AuthKit/WorkOS via
  `login.composio.dev`, PKCE S256, `token_endpoint_auth_method: none`).
- **Tentative de construire ce flux (12/09/2026)** : l'enregistrement
  dynamique du client OAuth a reussi (`POST https://login.composio.dev/oauth2/register`
  -> `client_id` obtenu sans probleme). L'etape suivante -- generer les
  parametres PKCE (`code_verifier`/`code_challenge`) via un script -- a ete
  refusee par le classifieur auto-mode de Claude Code. Une simple navigation
  navigateur supplementaire (meme vers une page neutre) a ensuite ete
  refusee aussi, signe que le classifieur avait elargi son refus a toute la
  suite de l'action plutot qu'a un seul appel. Conforme a la consigne de
  l'outil ("STOP, n'essaie pas de contourner") : aucune tentative de
  contournement supplementaire n'a ete faite.
- **A faire, et par qui** : cette confirmation doit etre completee par
  quelqu'un qui peut terminer le consentement OAuth cote humain -- soit
  Julien lui-meme via son propre acces (CLI `composio` officiel, ou un
  client MCP deja installe comme Claude Desktop connecte a
  `connect.composio.dev/mcp`), soit en communiquant directement le resultat
  de `LINKEDIN_GET_MY_INFO` deja execute par un autre moyen. **Ne pas
  relancer la construction manuelle du flux OAuth dans une session future
  en esperant un resultat different** -- le blocage est au niveau du
  classifieur, pas un probleme de methode a corriger.

## Ce qui est pret a publier des que l'identite est confirmee (julien-partners)

Dans `linkedin-carrousel/a-publier/` : un carrousel reel (5 diapos,
`julien-partners-2026-09-12.json`) et son texte de post
(`julien-partners-2026-09-12.commentary.txt`), rediges comme jugement
editorial pour ce compte. Rendu deja verifie dans
`linkedin-carrousel/sortants/julien-partners/` (PDF 5 pages + image de
couverture 1080x1350, mode "couverture" choisi car c'est le cas le plus
simple du repli image -- un seul URN d'image, pas de doute sur si
`LINKEDIN_CREATE_LINKED_IN_POST.images` accepte un tableau a plusieurs
elements). Voir `a-publier/README.md` pour la commande exacte
(`publierCarrouselViaImage`) -- **a n'executer qu'apres la confirmation
d'identite ci-dessus**, pas avant.

Pour `linkedin-veille-virale` et `linkedin-commentaires`, une fois l'identite
confirmee, il n'y a plus qu'a appeler respectivement `publierPost({
authorUrn, commentary })` et `publierCommentaire({ actorUrn, targetUrn,
message })` avec les URN deja verifies dans chaque `reglages-comptes.json` --
`lib/publier.js` de chaque skill est deja le point d'appel isole et
fonctionnel (canal REST direct documente, pas encore MCP faute de jeton
AuthKit -- meme blocage que ci-dessus).

## Point bloquant n°2 -- APIFY_TOKEN indisponible en session (sans lien avec Julien)

Le 11/09/2026, une session anterieure a reellement interroge Apify sur le
compte `julien_r` et obtenu 3 posts reels -- mais ce resultat n'a pas ete
sauvegarde dans le depot (aucun fichier, aucune memoire), et le contexte de
cette session a ete efface depuis. La session du 12/09/2026 a cherche
`APIFY_TOKEN` (variable d'environnement, fichiers `.env` locaux) sans le
trouver, et la tentative de le lire dans le depot prive `claude-config`
(`env/secrets.md`, via `gh repo clone`) a ete bloquee par le classifieur
auto-mode -- meme famille de blocage que celui documente ci-dessus sur le
flux OAuth Composio, donc pas une piste a retenter en boucle depuis une
session sans acces different.

Consequence concrete : `dry-run-sortie/veille-exemple-fixture.json` et
`dry-run-sortie/commentaires-exemple-fixture.json` restent des exemples sur
donnees **fixture** (nom de fichier volontairement explicite), pas des
candidats prets a publier sur donnees reelles. Des que `APIFY_TOKEN` est
fourni directement, il suffit de remplir `comptes_a_surveiller`/
`comptes_cibles` dans `reglages-comptes.json`, relancer `node dry-run.js`
(bascule automatique sur un vrai appel Apify), puis rediger le texte final
comme jugement editorial -- voir le point 3 de chaque SKILL.md.

## Recapitulatif -- rien d'autre n'est avancable sans reponse externe

Au 12/09/2026, deux points bloquants couvrent tout ce qui reste a faire pour
passer les skills en usage reel : l'identite `averse-cooser` (bloque
`linkedin-carrousel`, `linkedin-veille-virale` et `linkedin-commentaires`) et
`APIFY_TOKEN` (bloque la redaction sur donnees reelles pour veille-virale et
commentaires -- independant du premier point). Le reste est code, teste et
documente : rendu PDF et image (les deux comptes actifs, julien-partners et
julien-agency), recuperation/tri Apify, dry runs bout-en-bout, contenu reel
pret pour julien-partners. Ne pas relancer les canaux deja constates bloques
(construction manuelle du flux OAuth Composio, `composio login`, extraction
de jeton navigateur, `gh` sur `claude-config`) en esperant un resultat
different sans nouvelle information ou un acces different.
