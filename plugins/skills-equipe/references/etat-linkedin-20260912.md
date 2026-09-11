# Etat des lieux -- skills linkedin-* (12/09/2026)

Resume d'une reprise sans tout redecouvrir. Concerne les 3 skills
`linkedin-veille-virale`, `linkedin-commentaires`, `linkedin-carrousel`.
Complement de `references/actions-composio.md` (catalogue Composio complet) --
ce fichier-ci ne repete pas le detail des 24 actions, seulement l'etat de
preparation de chaque skill et ce qui reste bloquant.

## Ce qui est pret a activer des que Julien confirme l'identite `averse-cooser`

Bloque uniquement par ce point pour les trois skills : `publierPost`
(veille-virale), `publierCommentaire` (commentaires) et toute publication
carrousel (PDF ou image) restent interdites d'appel reel tant que la
connexion LinkedIn `averse-cooser` (vue en MCP, partagee par
`jrayes000@gmail.com`) n'est pas identifiee -- elle ne correspond a aucun des
deux identifiants Composio connus (`linkedin_arsino-dian`,
`linkedin_habe-bogue`).

Une fois confirmee, il n'y a plus qu'a :
- **linkedin-veille-virale** : appeler `publierPost({ authorUrn, commentary })`
  avec les URN deja verifies dans `reglages-comptes.json`. Rien d'autre a
  coder -- `lib/publier.js` est deja le point d'appel isole et fonctionnel
  (canal REST direct documente, pas encore MCP faute de jeton AuthKit).
- **linkedin-commentaires** : idem avec
  `publierCommentaire({ actorUrn, targetUrn, message })`.
- **linkedin-carrousel** : selon l'arbitrage PDF/image ci-dessous, soit
  deposer le PDF a la main (chemin actuel), soit appeler
  `publierCarrouselViaImage({ authorUrn, modeRepli, cheminsImages, commentary })`.

## Ce qui est pret a activer des que Julien tranche PDF vs image (linkedin-carrousel)

`lib/publier.js` expose `publierCarrouselViaImage({ authorUrn, modeRepli,
cheminsImages, commentary })` avec `modeRepli: "par-diapo" | "couverture"` --
code reel (televersement Composio + creation du post), mais **jamais appelee
nulle part dans le paquet** (verifie par `test/publier-repli-image.test.js`).
Le rendu local des images (`generer-images.js`, zero appel Composio) est deja
teste et valide (`test/generer-images.test.js`, 1080x1350px confirme).

Des que Julien choisit :
- **"par-diapo"** : generer les images (`genererImagesParDiapo`), puis
  appeler `publierCarrouselViaImage` avec `cheminsImages` = tous les fichiers
  retournes. Point non verifie par un appel reel : si
  `LINKEDIN_CREATE_LINKED_IN_POST.images` accepte plusieurs URN a la fois --
  si non, republier une image a la fois ou basculer sur "couverture".
- **"couverture"** : generer l'image (`genererImageCouverture`), puis appeler
  `publierCarrouselViaImage` avec `cheminsImages` = ce fichier seul.
- **Garder le PDF, depot manuel** : rien a changer, c'est deja le
  comportement par defaut (`publierCarrousel` leve une erreur explicite et
  redirige vers `sortants/<compte>/`).

Independant de `averse-cooser` : cet arbitrage peut etre tranche avant ou
apres la confirmation d'identite, les deux blocages sont independants.

## Ce qui est pret a activer des que APIFY_TOKEN est redisponible en session (sans lien avec Julien)

Le 11/09/2026, une session anterieure a reellement interroge Apify sur le
compte `julien_r` et obtenu 3 posts reels -- mais ce resultat n'a pas ete
sauvegarde dans le depot (aucun fichier, aucune memoire), et le contexte de
cette session a ete efface depuis. La session du 12/09/2026 a cherche
`APIFY_TOKEN` (variable d'environnement, fichiers `.env` locaux) sans le
trouver, et la tentative de le lire dans le depot prive `claude-config`
(`env/secrets.md`, via `gh repo clone`) a ete bloquee par le classifieur
auto-mode de Claude Code -- meme famille de blocage que celui deja documente
sur `composio login`, donc pas une piste a retenter en boucle depuis une
session sans acces different.

Consequence concrete : `dry-run-sortie/veille-exemple-fixture.json` et
`dry-run-sortie/commentaires-exemple-fixture.json` sont des exemples sur
donnees **fixture** (nom de fichier volontairement explicite), pas des
candidats prets a publier sur donnees reelles. Des que `APIFY_TOKEN` est
fourni directement (ou accessible par un canal que le classifieur
n'intercepte pas), il suffit de :
1. Remplir `comptes_a_surveiller`/`comptes_cibles` dans
   `reglages-comptes.json` avec les profils reels a suivre.
2. Relancer `node dry-run.js` dans chaque skill -- il bascule automatiquement
   sur un vrai appel Apify des que `APIFY_TOKEN` est present et le compte
   rempli (voir `chargerPosts()` dans chaque `dry-run.js`).
3. Rediger le texte final (post recycle/post de veille, commentaire) comme
   jugement editorial de la session invoquante, comme documente au point 3 de
   chaque SKILL.md -- pas une generation automatique.

## Recapitulatif -- rien d'autre n'est avancable sans reponse externe

Au 12/09/2026, les trois points bloquants ci-dessus (identite `averse-cooser`,
arbitrage PDF/image, `APIFY_TOKEN`) couvrent tout ce qui reste a faire pour
passer les trois skills en usage reel. Le reste (recuperation/tri Apify,
rendu PDF et image, tests, dry runs bout-en-bout) est code, teste et
documente. Ne pas relancer les canaux deja constates bloques (`composio
login`, extraction de jeton navigateur, `gh` sur `claude-config`) en
esperant un resultat different sans nouvelle information.
