---
name: linkedin-veille-virale
description: "Surveille des comptes LinkedIn suivis, repere les posts qui valent une reaction (score d'engagement reel) et redige un post recycle/inspire pour julien-partners ou julien-agency. Activation MANUELLE uniquement : ne se declenche jamais d'elle-meme, seulement sur demande explicite (ex. 'fais la veille du jour', 'cherche un post a recycler pour julien-agency', 'veille LinkedIn')."
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
   `dry-run-sortie/veille-exemple-fixture.json` -- nom de fichier volontairement
   explicite : **c'est un exemple sur donnees fixture, pas un candidat pret a
   publier sur donnees reelles** (voir "A completer avant un usage reel"
   ci-dessous). `npm test` (`node --test`) verifie le tri
   (`test/trierPosts.test.js`) et ce dry run (`test/dry-run.test.js`), y
   compris qu'il n'importe jamais `lib/publier.js`.

## Cinq regles d'usage (brief du 10/09/2026, section 2) -- etat au 15/09/2026

Ajoute le 15/09/2026 -- cette section n'existait pas, trouve par l'audit du meme jour alors que
les deux autres skills linkedin-* l'avaient deja.

1. **Phrase de lancement** : « fais la veille du jour », « cherche un post a recycler pour
   julien-agency » (voir aussi les variantes dans la description en tete de ce fichier).
2. **Point de situation en 3 lignes** : `node etat.js [compte]` -- lit le dernier passage de
   veille reel connu sur disque (`data/veille-resultats-reels-*.json`, gitignore) et les posts
   adaptes deja prets dans `a-publier/`, jamais de donnee inventee.
3. **Lecture des chiffres depuis une capture d'ecran, jamais de saisie manuelle** :
   **implementee le 15/09/2026**, maintenant que la page Notion "Veille & posts" existe
   reellement et attend des chiffres a 7 jours. Aucun OCR dans ce paquet : c'est la **session
   Claude** qui lit les chiffres visibles sur la capture d'ecran collee dans la conversation
   (capacite multimodale native), pas une automatisation aveugle. Une fois les chiffres lus,
   `lib/notion.js` (`mettreAJourStatistiques7j`) retrouve l'entree par titre exact et ecrit ce
   qui a ete lu :
   ```
   node mettre-a-jour-stats.js --titre "Le vrai cout d'un recrutement -- adapte de Codie Sanchez" \
     --vues 1500 --reactions 40 --commentaires 6 --bilan Neutre
   ```
   `retrouverEntreeParTitre` refuse explicitement si le titre correspond a plusieurs entrees --
   teste sans reseau dans `test/notion-statistiques.test.js`. **Non teste contre une vraie
   capture d'ecran a ce jour** : le mecanisme d'ecriture est reel et verifie, la lecture par
   Claude reste a confirmer sur un premier cas concret (le plus tot possible sera lorsque les 3
   posts programmes le 15/09 auront cumule des vues, au plus tot le 18-19/09 pour 7 jours
   pleins sur le premier).
4. **Rien ne plante a vide** : `recupererPosts`/`trierPosts` refusent avec un message explicite
   (jamais une exception brute) si `APIFY_TOKEN` manque ou si `profileUrls` est vide ; les
   erreurs Notion (`messageErreurNotion`, `lib/notion.js`) traduisent chaque echec connu en
   message actionnable. `etat.js` gere le cas "aucun compte surveille, aucun post pret" (voir
   regle 5).
5. **Jamais les mains vides** : `etat.js` propose un repli concret (`node dry-run.js` sur le jeu
   fixture) des que `comptes_a_surveiller` est vide et qu'aucun post adapte n'existe pour un
   compte -- teste reellement :
   ```
   $ node etat.js julien-partners
   10 compte(s) surveille(s) configure(s) dans reglages-comptes.json (comptes_a_surveiller).
   Dernier passage de veille reel connu (...) : 35 posts recuperes, 15 retenus, ... encore "a rediger".
   ... post(s) adapte(s) pret(s) dans a-publier/ pour julien-partners : ...
   Publication reelle sur LinkedIn : aucun registre tenu par cette skill -- verifier aupres de Julien ...
   ```

## Etat au 12/09/2026 -- ce qui est pret, ce qui attend

- **Pret et teste reellement** : `recupererPosts` (Apify) -- verifie avec le
  compte `julien_r` (`GET /v2/users/me` -> 200) avant construction du reste.
- **Pret et teste de bout en bout, hors publication reelle** : la chaine
  recuperation -> tri -> texte final, via `dry-run.js` -- un exemple concret
  de ce que serait le post recycle/inspire (voir
  `dry-run-sortie/veille-exemple-fixture.json`, genere par `npm run dry-run`),
  sans qu'aucune publication reelle n'ait eu lieu.
- **Identite confirmee, `publierPost` utilisable pour julien-agency** :
  `averse-cooser` (la connexion LinkedIn partagee via MCP) correspond a
  `urn:li:person:aFqu-W7ClW`, c'est-a-dire **julien-agency** -- confirme par
  appel reel de `LINKEDIN_GET_MY_INFO` le 12/09/2026 (voir SKILL.md de
  `linkedin-carrousel` et `references/etat-linkedin-20260912.md` pour le
  detail complet). `julien-partners` reste **non confirme**.
- **Pipeline de publication texte verifie reellement, sans rien publier**
  (12/09/2026) : appel reel de `LINKEDIN_CREATE_LINKED_IN_POST` (la meme
  action que `publierPost`) pour julien-agency avec `lifecycleState: "DRAFT"`
  -- creation reussie (`urn:li:share:7504206574081646592`), verifiee non
  accessible en lecture publique (`LINKEDIN_GET_POST_CONTENT` -> `403
  Forbidden`, coherent avec un brouillon jamais publie), puis supprimee
  (`LINKEDIN_DELETE_POST` -> `deleted: true`). Preuve technique que
  l'authentification, l'URN d'auteur et le champ `commentary` fonctionnent
  de bout en bout pour ce compte via le canal MCP -- **ne couvre que l'action
  de creation de post**, pas `publierCommentaire` de `linkedin-commentaires`
  (action differente, sans equivalent brouillon -- voir son SKILL.md).
- **Canal reellement fonctionnel : MCP, via une cle d'acces "consumer"**
  (pas le canal REST documente jusqu'ici dans `lib/composio.js`). Cette cle
  s'obtient dans les reglages d'un compte Composio membre de l'equipe de
  Julien (Reglages -> "Sessions & API Key"), pas via `composio login` (CLI,
  bloque par le classifieur auto-mode) ni par extraction de jeton navigateur.
  **A faire** : `lib/composio.js` utilise toujours le canal REST par defaut
  (`COMPOSIO_API_KEY`, qui ne couvre aucune connexion LinkedIn dans ce
  paquet) -- migrer vers le canal MCP quand cette skill sera reprise pour un
  usage reel, en s'inspirant de la methode qui a fonctionne pour
  `linkedin-carrousel`.
- **APIFY_TOKEN : RESOLU le 12/09/2026** -- Nomena a export le jeton
  lui-meme dans l'environnement de la session (pas de lecture automatisee
  d'un fichier de secrets, pas de contournement du blocage documente
  precedemment). Un vrai appel `recupererPosts` a suivi immediatement sur le
  profil `https://www.linkedin.com/in/julien-rayes` : 5 posts reels
  recuperes et sauvegardes dans `data/posts-julien-rayes-2026-09-12.json`
  (gitignore -- contenu specifique a un compte reel, voir `.gitignore`). Un
  exemple **reel** de post recycle/inspire (pas un exemple sur fixture) est
  redige et pret dans `a-publier/` -- voir son `README.md` pour le detail et
  la limite honnete : le profil interroge est celui de Julien Rayes
  lui-meme (= julien-agency), pas encore un veritable compte tiers, faute de
  `comptes_a_surveiller` rempli.
- **Exemple `a-publier/` cible julien-agency, pas julien-partners** (corrige
  le 12/09/2026) : redige initialement pour julien-partners, dont l'identite
  Composio n'est pas confirmee ; Julien a dit explicitement que le compte
  importe peu, donc le texte a ete **reecrit** (pas juste republie sous un
  autre `authorUrn`) dans le ton de julien-agency (confiant, direct,
  pedagogue, oriente-dirigeants) pour cibler `urn:li:person:aFqu-W7ClW`, le
  seul compte avec un acces reellement confirme -- voir
  `a-publier/README.md`. **Ne pas publier avant que Julien confirme
  l'apparence reelle du carrousel** deja publie sur ce meme compte (voir
  `linkedin-carrousel`) : eviter d'empiler plusieurs posts de test sur le
  meme compte avant d'avoir valide le premier.

## Page Notion "Veille & posts" -- code pret, en attente du jeton (14/09/2026)

Prepare en avance de `linkedin-commentaires` (priorite 2 en cours), a la demande explicite de
Julien : tout ce qui ne depend pas de la cle Notion est ecrit des maintenant.

**Clarification** : cle d'integration Notion dans `env/secrets.md` (meme methode que
`APIFY_TOKEN`), appel direct a `api.notion.com` -- pas le connecteur OAuth de claude.ai.

`lib/notion.js` : `creerBaseVeilleEtPosts` (schema exact des 19 colonnes du brief, y compris
`Score` en propriete formule Notion native : `(Reactions + 3*Commentaires + 5*Partages) /
Abonnes`), `creerVuesParCompte` (les 3 vues filtrees demandees, une par compte),
`recupererEntreesRecentes` (requete l'API pour la fenetre demandee) et **`calculerBilan`** --
la commande "bilan" du brief (analyse 30 jours, formats/sujets les plus performants par
compte), ecrite en fonction PURE testable sans reseau (`test/notion-bilan.test.js`, 3 tests,
tous verts) pour rester verifiable independamment de la disponibilite de l'API. `creer-page-notion.js`
(CLI) cree la base et les 3 vues d'un coup des que `NOTION_TOKEN`/`NOTION_PARENT_PAGE_ID` sont
disponibles.

**Limite verifiee, pas contournee** : l'API Notion publique n'a aucun endpoint pour inviter un
e-mail externe -- le partage avec `contact@claudeagency.fr` reste un geste manuel, une fois,
via "Share" (le script imprime l'URL de la page pour ce geste).

**Mise a jour du 14/09/2026, jeton recu -- nouveau blocage** : `NOTION_TOKEN` fonctionne, mais
aucune page ordinaire n'est partagee avec cette integration (seulement des bases de donnees
existantes sans rapport, non modifiees) -- `POST /v1/databases` exige un `parent.page_id`
valide, indisponible aujourd'hui. Detail complet et marche a suivre dans le SKILL.md de
`linkedin-commentaires` (meme blocage, memes deux skills).

**Debloque le 15/09/2026** : Julien a partage la page "LinkedIn — Veille & Commentaires" avec
l'integration "Leads site claudeagency.fr" -- jeton verifie correspondre a cette integration
(`GET /v1/users/me` renvoie bien ce nom de bot), page retrouvee via `POST /v1/search` (l'ID
n'avait pas encore ete transmis). `node creer-page-notion.js` execute reellement : base
"Veille & posts" creee, 3 vues par compte creees. **Remplie avec les 3 vrais posts adaptes**
(voir `a-publier/README.md`) via une nouvelle fonction `ajouterEntreeVeille` (`lib/notion.js`) --
metriques reelles du post source (reactions/commentaires/partages/abonnes) reprises depuis
`data/veille-resultats-reels-20260914.json`, etat "A relire" (adaptes et valides
techniquement, mais le GO de publication de Julien n'a pas encore ete donne). Verifie en
relisant les 3 lignes via l'API (`POST /v1/data_sources/.../query`), pas suppose. URL de la
base dans `references/mail-20260920-brouillon.md`.

**Non execute a ce stade, pour cette raison** : `creerBaseVeilleEtPosts` n'a pas ete lance
contre l'API reelle -- sa forme est conforme a la documentation consultee, mais son
comportement reel reste a verifier des qu'une page parente sera disponible.

## Bug de schema corrige -- 14/09/2026

Le 14/09/2026, le premier appel reel de `linkedin-commentaires` contre l'acteur Apify
`harvestapi/linkedin-profile-posts` a revele que la forme reelle des donnees (`author.name`,
`content`, `postedAt.date` imbrique, `engagement.comments`) ne correspond pas a la forme plate
supposee par le code (`authorName`, `text`, `postedAt` chaine directe, `commentsCount`) --
jamais detecte avant faute d'avoir teste contre de vraies donnees (seulement contre une
fixture deja ecrite dans la forme supposee). Corrige dans `linkedin-commentaires/lib/trouver-posts.js`
(fonction `normaliserPost`). **Meme correctif applique ici, meme jour, session suivante** :
`lib/veille.js` exporte desormais `normaliserPost` et l'applique dans `recupererPosts`, avec les
memes 3 tests de non-regression (`test/normaliserPost.test.js`). A verifier malgre tout au
premier appel reel de ce paquet (pas encore fait), au cas ou l'acteur renverrait un ecart de
forme non couvert par ce correctif.

## comptes_a_surveiller renseigne -- 14/09/2026

**Rempli.** 10 influenceurs americains reels sur l'IA appliquee au business/PME/independants,
choisis et verifies un par un (handle exact + nombre d'abonnes actuel, profil LinkedIn reellement
ouvert -- jamais devine), decision editoriale tranchee seule sur delegation explicite de Julien.
Liste unique, partagee entre `julien-agency` et `julien-partners` (`comptes-a-surveiller.txt` a la
racine du paquet, copiee dans `comptes_a_surveiller` des deux comptes de
`reglages-comptes.json`). Methode complete et tableau des 10 profils :
`references/comptes-a-surveiller-veille-20260914.md`.

## Accents manquants -- garde-fou ajoute le 15/09/2026

`lib/valider-orthographe.js` (`validerAccents`) refuse tout texte contenant un mot d'une liste
fermee de mots toujours accentues en francais standard -- meme mecanisme que
`linkedin-carrousel`/`linkedin-commentaires` (voir leurs SKILL.md pour le detail complet et
l'incident qui l'a motive : le carrousel deja publie le 14/09 s'est revele integralement sans
accents). Ce paquet-ci n'avait **aucun validateur de contenu avant publication** : `dry-run.js`
appelle desormais `validerAccents` sur `contenuFinal` (la redaction du post recycle) -- si elle
echoue, `contenuFinal` et `argumentsPublierPost` deviennent `null` (`erreurOrthographe` porte le
detail) plutot que de laisser passer un texte fautif. L'exemple `a-publier/julien-agency-2026-09-12.commentary.txt`,
lui aussi integralement sans accents, corrige le meme jour.

## Score d'engagement code, passage reel execute -- 14/09/2026 (meme jour, session suivante)

`trierPosts` calcule desormais le score du brief -- `(reactions + 3*commentaires + 5*partages) /
abonnes` -- via `calculerScore`, et ne garde un post que s'il depasse `seuil_score` ET a moins de
`fenetre_jours` (7 par defaut). Coefficients/seuil/fenetre dans `reglage-score.json` (fichier de
reglage, pas en dur dans le code). Les abonnes par auteur (l'acteur Apify ne les renvoie jamais
dans la reponse d'un post) viennent de `abonnes-comptes.json`, cle = `authorPublicIdentifier`.
Un post dont l'auteur n'a pas d'abonnes connus est ecarte, jamais suppose a score 0. Trie par
score decroissant.

Passage reel execute avec `APIFY_TOKEN` fourni pour une session (jamais persiste) : **35 posts
recuperes sur les 10 comptes, 15 retenus**. Detail complet, seuil calibre sur la distribution
reelle observee, et export local (Notion toujours bloque) : Point n°11 de
`references/etat-linkedin-20260912.md`.

## Trois premiers posts adaptes sur donnees reelles -- 15/09/2026

Jusqu'ici, aucun des 15 candidats retenus le 14/09/2026 n'avait ete redige en post (etape 3 de
"Ce que fait la skill" -- jugement editorial, pas une generation automatique). Fait le 15/09/2026 :
3 posts adaptes, choisis parmi les meilleurs scores avec une matiere reellement adaptable
(Justin Welsh, Jason Feifer, Codie A. Sanchez) -- **adaptes, pas traduits** : angle et structure
du post source conserves, exemples et chiffres remplaces par des references francaises reelles
verifiees individuellement (Insee, Bpi France Le Lab/Rexecode, Strategies -- pages ouvertes et
lues, pas de chiffre de memoire). Passes reellement par les garde-fous d'ecriture de
`linkedin-carrousel` (`validerEtConvertirPost`) et `validerAccents`, bien que non natifs a ce
paquet -- demande explicite pour ce livrable. Detail complet, post source note pour chacun,
dans `a-publier/README.md`. Aucune publication reelle -- en attente du GO de Julien, regle
"trois maximum, jamais deux le meme jour" a respecter au moment de publier.

## GO de Julien, relecture, chiffre rafraichi, programmation reelle via Buffer -- 15/09/2026 (soir)

Julien a relu les 3 textes (colles integralement, un par message, apres plusieurs troncatures --
lecon retenue : toujours coller un texte long seul dans son message, jamais mele a du
commentaire). Trois retouches faites puis repassees par les garde-fous reels (`validerEtConvertirPost`,
ACCEPTE a chaque fois) :
- **Codie Sanchez** : chiffre recrutement rafraichi (mai 2023 -> T3 2025, 78% -> 60%, meme
  population mesuree -- source Bpifrance Le Lab/Rexecode reellement ouverte et verifiee), phrase
  "avant de se laisser seduire par le courant" clarifiee, "lui meme" -> "lui-meme".
- **Jason Feifer** : source Strategies citee deux fois de suite -- retiree la seconde ; "des
  octobre de la meme annee 2014" -- redondance retiree.
- **Justin Welsh** : "Ca se retourne rarement avant plusieurs annees" (referent flou) ->
  "Ce jugement met rarement moins de plusieurs annees a changer" ; plus, meme vigilance que les
  accents appliquee aux traits d'union des 3 textes : "soi meme" -> "soi-meme", "qu'est ce qui"
  -> "qu'est-ce qui", et deux vrais oublis d'accent trouves au passage ("des le depart" ->
  "des le depart", "l'exterieur/exterieure" -> avec accent, "independants" -> avec accent).

**Buffer connecte reellement** (compte `contact@claudeagency.fr`, deux profils LinkedIn
branches -- voir `references/actions-composio.md`, section 15/09 soir, pour la verification
faite avant tout usage). Les 3 textes **programmes reellement** via Buffer, un par jour distinct
(regle "trois par semaine maximum, jamais deux le meme jour" respectee) :
- Codie Sanchez -> julien-agency, aujourd'hui 15/09 22h29.
- Jason Feifer -> julien-agency, demain 16/09 18h00 (Europe/Paris).
- Justin Welsh -> julien-partners, apres-demain 17/09 13h00 (Europe/Paris).

Notion mis a jour avec la realite (pas une anticipation) : `Etat` = "Programme" (nouvelle valeur
ajoutee au schema de la base -- ne pas confondre avec "Publie", reserve au moment ou le post est
reellement en ligne), `Date de publication` = date programmee. **Pas encore "Publie"** : aucun
des 3 n'est encore reellement paru au moment de cette mise a jour -- a confirmer et a passer en
"Publie" avec le lien reel une fois chaque post effectivement en ligne (demander explicitement
"verifie si le post de veille du jour est en ligne" le jour dit, plutot que de supposer que la
programmation Buffer a fonctionne sans le verifier).

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve :
`references/etat-linkedin-20260912.md` du paquet.
