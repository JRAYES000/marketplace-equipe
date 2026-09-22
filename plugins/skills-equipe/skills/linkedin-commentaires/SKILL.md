---
name: linkedin-commentaires
description: "Trouve des posts LinkedIn recents et frais (<4h) sous des comptes cibles et redige un commentaire sur mesure, dans l'un des quatre genres du brief, pour julien-partners ou julien-agency. Activation MANUELLE uniquement : ne se declenche jamais d'elle-meme, seulement sur demande explicite (ex. 'fais les commentaires du jour', 'commentaires LinkedIn pour julien-agency')."
---

# linkedin-commentaires

**Activation MANUELLE uniquement.** Cette skill ne se lance jamais d'elle-meme -- seulement sur
demande explicite.

**Phrase de lancement** : « les commentaires du jour ».
Variantes probables : « fais les commentaires du jour », « commentaires LinkedIn pour
julien-agency/julien-partners », « lance la veille commentaires », « qu'est-ce qu'on commente
aujourd'hui ».

## Ce que fait la skill

1. `lib/trouver-posts.js` (`trouverPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes listes dans `comptes_cibles` de
   `reglages-comptes.json`. **Champ obligatoire : `targetUrls`, pas `profiles`** -- avec
   `profiles` l'acteur renvoie zero post sans aucune erreur.
2. `trierPosts` ecarte les carrousels (`document.totalPageCount` present -- commenter dessus
   reviendrait a commenter un post non lu) et les posts au-dela de `seuil_max_commentaires`,
   trie par date decroissante.
3. `lib/planifier-commentaires.js` (`filtrerPostsFrais`) ne garde que les posts publies il y a
   moins de 4 heures. `validerQuotaJournalier` refuse un nouveau commentaire si le quota du jour
   (5) est atteint, ou si la meme personne a deja ete commentee aujourd'hui.
4. La session Claude qui invoque cette skill **ecrit elle-meme** le commentaire, dans le ton de
   `reglages-comptes.json`, en choisissant l'un des quatre genres du brief -- `information_chiffree`,
   `desaccord_argumente`, `histoire_vecue`, `vraie_question` (`GENRES` dans
   `lib/valider-commentaire.js`) -- ce n'est pas une generation automatique en JS.
5. `lib/valider-commentaire.js` (`validerCommentaire`) **refuse** tout brouillon hors des regles
   de forme ou dont le genre declare ne correspond pas au contenu (voir "Garde-fous").
6. `lib/publier-commentaire.js` (`publierCommentaire`) est le **seul** point d'appel qui publie
   reellement : `targetUrn` doit etre le `shareUrn` du post (jamais `urn:li:activity:`, refuse
   par l'API).
7. Une fois publie, `lib/registre.js` (`enregistrerCommentairePublie`) l'ajoute a
   `data/registre-commentaires.json` (gitignore) -- ce registre fait respecter le quota d'un
   lancement a l'autre.
8. `node dry-run.js` (**sans argument** -- il boucle automatiquement sur tous les comptes de
   `reglages-comptes.json`, il n'y a pas de filtre par compte) execute les etapes 1-5 sans
   jamais appeler `publierCommentaire`. Bascule sur le jeu fixture des que `APIFY_TOKEN` est
   absent (a lui seul, meme si `comptes_cibles` est rempli) et/ou que `comptes_cibles` est vide.

## Point de situation

Lancer `node etat.js [compte]` avant toute chose -- affiche en trois lignes le dernier
commentaire publie, le quota du jour deja utilise, et l'etat des comptes cibles. `dry-run.js` et
`etat.js` proposent un repli concret des que rien n'est disponible (aucun post frais, aucun
compte cible, quota atteint) -- jamais les mains vides.

**Repli "aucun candidat sous le plafond de fraicheur" (ajoute le 16/09/2026)** :
`genererRepliAucunCandidat` (`lib/planifier-commentaires.js`) construit ce repli reellement,
plutot que de laisser la session Claude s'arreter a "zero candidat" sans explication -- exactement
ce qui s'est produit lors des 3 premiers passages reels (15/09 matin, 15/09 apres-midi, 16/09
matin, voir "Fraicheur" plus bas). Prend en entree la liste des cibles avec la date du post le
plus recent trouve sur chacune (`[{ compte, nom, url, postedAt }]`, `postedAt: null` si aucun post
exploitable), releve manuellement par la session via Claude in Chrome (pas d'automatisation Apify
ici -- meme repli documente que le suivi a 3 jours). Renvoie :
- `message` : le constat complet, compte par compte, du plus recent au plus ancien.
- `comptesInactifs` : les comptes au-dela de `SEUIL_INACTIVITE_JOURS` (28 jours, voir le
  commentaire dans le code pour le calcul reel qui a fixe ce seuil).
- `recommandation` : soit "rien a signaler, absence ponctuelle" si aucun compte n'est inactif,
  soit une invitation explicite a remplacer les comptes inactifs dans `comptes_cibles`.

Teste sur le cas reel du 16/09/2026 (les 8 comptes julien-agency, ages reels releves ce matin) :
`genererRepliAucunCandidat` identifie correctement Jean ZENDJI comme le plus actif (4 jours) et
signale 6/8 comptes comme inactifs depuis plus de 28 jours, avec la recommandation de les
remplacer -- voir `a-publier/README.md` du 16/09/2026 pour la sortie complete. Consequence
directe : `references/comptes-cibles-proposition-20260916-complement-agence.md` propose 6 comptes
de remplacement, verifies sur leur frequence de publication reelle (pas seulement thematique --
c'est precisement ce qui manquait a la premiere liste du 14/09/2026). **Valides par Nomena et
integres le 16/09/2026** -- voir "Ce que ce passage demontre" plus bas pour le resultat obtenu des
le passage suivant.

## Ce que le passage du 16/09/2026 demontre -- la fenetre de 4h depend de la liste, pas du reglage

3 passages reels avec l'ancienne liste de 8 comptes julien-agency : **0 candidat sous 4h a chaque
fois** (15/09 matin, 15/09 apres-midi, 16/09 matin). Conclusion a l'epoque, prudente mais fausse :
la deviation semblait tenir a l'heure du passage dans la journee. Des l'ajout de 6 comptes plus
actifs (meme jour, meme reglage de la skill, seule la liste a change) : **4 candidats sur 5 tombent
sous 4h** (35 min, 1h, 35 min, 35 min). La fenetre de 4h du brief n'est donc pas une contrainte
irrealiste a assouplir -- elle fonctionne des que les comptes suivis publient reellement plusieurs
fois par semaine. **Pour Julien qui fera tourner la skill au quotidien** : la qualite du resultat
d'un passage tient a la liste de comptes cibles (`comptes_cibles`), pas au reglage de la fenetre de
fraicheur -- une liste qui se degrade avec le temps (comptes qui ralentissent, changent de sujet)
doit etre revue avant de toucher au seuil de 4h lui-meme.

## Comptes cibles

`comptes_cibles` est rempli dans `reglages-comptes.json` : 8 comptes pour julien-partners, 14
pour julien-agency (8 profils initiaux + 6 complementaires ajoutes le 16/09/2026 -- voir
`references/comptes-cibles-proposition-20260914.md` puis
`references/comptes-cibles-proposition-20260916-complement-agence.md`). **Critere corrige le
16/09/2026** : ce qui qualifie un compte cible n'est plus "base en France" mais "audience
francophone dirigeants/PME" -- corrige apres avoir initialement ecarte a tort un excellent
candidat (Leonel ADAGBE, base a Lome/Togo mais dont les posts et l'audience visee sont
entierement francophones), voir `_critere_pays_corrige_20260916` dans `reglages-comptes.json`.
`mehdi-stili-6769a6174` porte l'annotation `comptes_cibles_statut: en_observation` (cadence
recente correcte mais precedee d'un trou de plusieurs mois) -- a reevaluer a partir du
30/09/2026.

## Variables d'environnement (`.env.example`)

- **`APIFY_TOKEN`** -- requis pour `trouverPosts` ; sans lui, repli fixture (voir plus haut).
- **`NOTION_TOKEN`** + **`NOTION_PARENT_PAGE_ID`** -- pour la base "Commentaires" (suivi a 3
  jours). `NOTION_PARENT_PAGE_ID` est l'ID de la page Notion **deja partagee avec
  l'integration** (bouton "..." de la page -> "Connexions") sous laquelle creer la base.
- **`COMPOSIO_CONSUMER_API_KEY`** -- cle "consumer" (prefixe `ck_`, Reglages du compte personnel
  Composio -> "Sessions & API Key", surface "FOR YOU"), utilisee par `lib/composio.js` via le
  canal MCP (`https://connect.composio.dev/mcp`) pour **julien-agency uniquement** -- verifie le
  16/09/2026 (5 commentaires publies pour de vrai), toujours le seul canal fonctionnel pour ce
  compte (aucune connexion pour lui sur le projet "ak_", verifie le 17/09/2026).
- **`COMPOSIO_API_KEY`** -- cle de PROJET (prefixe `ak_`), utilisee pour **julien-partners
  uniquement** depuis le 17/09/2026, canal REST direct (`backend.composio.dev/api/v3.1`) avec
  `connected_account_id: "ca_vn1-dhh8VcYf"` explicite -- une connexion LinkedIn ACTIVE reelle pour
  ce compte, verifiee via `GET /api/v3/connected_accounts`. Le routage entre les deux canaux se
  fait automatiquement par compte (`../../lib/composio-canal.js`, partage avec
  `linkedin-carrousel`) : `publierCommentaire({ actorUrn, ... })` derive le bon canal depuis
  `actorUrn`, aucun changement d'appel necessaire pour les scripts existants.
  **Ne jamais passer une cle `ak_...` a `validerCle`/canal MCP** (couche PLATFORM Composio) :
  ce format y est toujours refuse explicitement avant tout appel reseau (`validerCle`,
  `lib/composio.js`) -- voir `references/actions-composio.md` pour le protocole MCP complet,
  l'historique de cette confusion (12/09 et 16/09/2026), et le detail du routage par compte
  tranche le 17/09/2026.

## Registre des echecs Composio/LinkedIn (`data/registre-echecs.json`)

Ajoute le 17/09/2026 (suite) -- comble un manque signale par un rapport d'investigation sur le
quota Composio du 16/09/2026 : `data/registre-commentaires.json` n'enregistrait que les succes,
aucune trace des tentatives echouees (mauvais canal, shareUrn invalide, etc.) n'existait.

Desormais, tout echec reel de `lib/composio.js` (canal MCP ou REST, quel que soit le compte) est
journalise automatiquement, AVANT que l'erreur ne remonte a l'appelant -- le comportement en cas
d'echec ne change pas, seule une trace est gardee en plus. Chaque entree : horodatage, compte
vise, canal (`mcp` ou `rest`), action Composio appelee, code HTTP si disponible, `source`
(`composio` si le rejet vient d'avant tout relais reel -- cle invalide, session MCP non etablie,
format de requete refuse ; `linkedin` si Composio a bien relaye mais que l'action elle-meme a
echoue cote LinkedIn), et un message d'erreur tronque. **Jamais de cle API ni de donnee
personnelle dans ce fichier.**

Fichier local, jamais commite (voir `.gitignore` racine, meme regle que
`data/registre-commentaires.json`) -- a consulter en cas d'investigation future sur un incident
de publication ou de quota, en complement du registre de succes. Implementation partagee avec
`linkedin-carrousel` : `plugins/skills-equipe/lib/composio-canal.js`, fonction `journaliserEchec`.

## Garde-fous automatiques (refus explicite, jamais un avertissement)

### Structure et frequence -- `lib/planifier-commentaires.js`

- **Fraicheur** : seuls les posts de moins de 4h sont retenus en priorite. Sur des comptes peu
  actifs (moins de quelques posts/semaine chacun), un passage donne legitimement 0 post frais --
  pas un signe de panne, mais desormais un repli qui a une LIMITE (voir plafond ci-dessous, pas
  "poster le plus recent quel qu'il soit").
  **Testee en conditions reelles quatre fois** (15/09 matin, 15/09 fin d'apres-midi, 16/09 matin,
  16/09 matin apres complement de comptes) : **0 post frais les trois premieres fois**, puis
  **4 posts frais sur 5 candidats au 4e passage** (16/09, apres integration de 6 comptes
  complementaires plus actifs -- voir plus bas "Comptes cibles"). La regle n'etait donc pas fausse
  : c'est la LISTE des comptes cibles qui etait le vrai probleme, pas la fenetre de 4h elle-meme
  ni l'heure du passage (voir "Recommandation d'usage" plus bas, a nuancer avec ce resultat).
  Voir `references/linkedin-commentaires-historique.md` pour le detail compte par compte.
- **Plafond dur de fraicheur (ajoute le 16/09/2026)** : `validerFraicheurMaximale`
  (`lib/planifier-commentaires.js`, `FRAICHEUR_MAX_HEURES = 48`) **refuse** tout post publie il y
  a plus de 48h -- explicitement, pas un avertissement. Avant ce garde-fou, rien n'empechait de
  proposer un post arbitrairement vieux des que la fenetre de 4h ne donnait rien (incident reel :
  un post de 5 mois propose dans le lot du 16/09/2026, refuse par Nomena -- "a ce delai, il ne
  sera vu par personne, et ca donne l'image de quelqu'un qui racle le fil pour remplir un quota",
  contraire a la raison d'etre de la regle, pas seulement a sa lettre). 48h choisi comme plafond
  raisonnable : au-dela, le post a deja fini son cycle de visibilite dans le fil. Consequence
  assumee : si aucun post n'est ni frais (<4h) ni acceptable (<48h) sur un compte donne, le bon
  comportement est de ne rien proposer pour ce compte ce jour-la, jamais de forcer un vieux post.
  Teste par 4 cas dans `test/planifier-commentaires.test.js` (accepte pile a 48h, refuse a 48.1h,
  refuse sur le cas reel du post de 5 mois, refuse si `postedAt` absent).
- **Quota journalier (5/jour)** et **jamais deux fois la meme personne le meme jour** --
  verifie contre `data/registre-commentaires.json`, pas une simple limite documentee. **Testee
  pour de vrai le 15/09/2026** (fin d'apres-midi, registre reel a 5/5) : refus confirme
  (`"Commentaire refuse : quota journalier atteint (5/5 deja publies aujourd'hui pour ce
  compte)."`), y compris contre la variante de casse que l'audit adversarial avait trouvee
  contournable (fusionne desormais vers le vrai compte, le quota tient quand meme).
- **Canal de publication reel (ajoute le 16/09/2026)** : `validerCanalPublicationReel` refuse de
  preparer un commentaire pour un compte dont `canal_publication_reel` n'est pas `true` dans
  `reglages-comptes.json`. Incident reel, **deux fois de suite** : le 15/09/2026, 4 commentaires
  rediges pour julien-partners ont echoue en publication (4 x 403) parce que ce compte n'est pas
  connecte a Composio pour les commentaires (Buffer ne peut pas servir de repli non plus -- il ne
  publie que des posts programmes, jamais un commentaire sous celui d'un tiers) ; le 16/09/2026,
  **le meme lot a ete refait a l'identique** pour julien-partners avant d'etre bloque a la
  relecture, faute de tout garde-fou qui l'aurait empeche des la preparation. `reglages-comptes.json`
  porte desormais ce champ explicitement -- `true` pour julien-agency et, depuis le 17/09/2026,
  pour julien-partners aussi (Julien a partage une deuxieme connexion, `asher-fill`), meme si
  cette derniere n'est pas encore reellement joignable (voir garde-fou suivant). Teste par 4 cas,
  et verifie en conditions reelles contre le lot du 16/09 lui-meme (voir `a-publier/README.md`).
- **Verification de connexion avant chaque publication (ajoute le 17/09/2026)** :
  `verifierConnexionAvantPublication` (`lib/publier-commentaire.js`), appelee automatiquement en
  tete de `publierCommentaire`, refuse la publication si la connexion Composio REELLEMENT active
  (verifiee via `LINKEDIN_GET_MY_INFO` juste avant l'appel) ne correspond pas a l'`actorUrn`
  demande. Motif : le canal MCP resout aujourd'hui systematiquement vers une seule connexion
  "preferee" (`averse-cooser`/julien-agency) meme quand une deuxieme connexion partagee existe
  pour le meme toolkit (`asher-fill`/julien-partners) -- **7 parametres de ciblage testes le
  17/09/2026** (`connected_account_id`, `account_id`, `user_id`, `auth_config_id`, en sibling de
  `tool_slug` ou dans `arguments`, y compris deux appels de controle nommant explicitement chaque
  connexion), tous silencieusement ignores, voir `references/actions-composio.md`. Sans ce
  garde-fou, un commentaire prepare pour julien-partners partirait silencieusement sous
  l'identite julien-agency -- exactement le risque signale par Julien. 4 tests dedies
  (`test/publier-commentaire.test.js`), dont un qui verifie que
  `LINKEDIN_CREATE_COMMENT_ON_POST` n'est jamais appele quand la connexion ne correspond pas.

### Contenu du commentaire -- `lib/valider-commentaire.js`

**Le retour de Julien du 18/09/2026 sur les posts (hook irresistible, gras sur ce qui porte, 3-6
emojis -- voir `linkedin-carrousel/SKILL.md` et `linkedin-veille-virale/SKILL.md`) ne s'applique
PAS ici, volontairement.** Un commentaire n'est pas un post : pas de mise en forme (LinkedIn
n'affiche ni gras ni structure dans un commentaire), et l'interdiction totale d'emoji ci-dessous
reste en vigueur, inchangee. Note explicite pour ne pas confondre les deux la prochaine fois que
ce retour sera relu.

- **2 a 4 phrases**, aucune puce/liste numerotee, aucun emoji, aucun lien.
- **Formulations creuses refusees** ("super post", "tellement vrai", "top", "merci du partage").
- **Genre coherent avec le contenu** : `information_chiffree` exige un chiffre dans le texte,
  `vraie_question` exige que le texte se termine par "?". **Limite assumee, non verifiable par
  une regle mecanique** : le chiffre exige par `information_chiffree` doit etre une information
  EN PLUS du post (le brief), pas une reformulation du chiffre deja present dans le post cible --
  incident reel le 16/09/2026 (deux commentaires recyclaient le chiffre du post source), corrige
  a la relecture humaine, aucun garde-fou automatique ne peut le detecter (il faudrait comparer
  au texte du post cible, hors de portee de `validerCommentaire` qui ne voit que le commentaire).
  **`information_chiffree` est le genre le plus risque des quatre -- consigne de redaction,
  pas de garde-fou possible (ajoute le 18/09/2026, troisieme incident du meme type)** : deux
  fois sur trois, le chiffre propose venait deja du post cible (16/09/2026, deux commentaires ;
  18/09/2026, un brouillon pour Theophile Burnet recyclait le "129 EUR/mois" du post lui-meme,
  intercepte avant publication et le commentaire rebascule sur `desaccord_argumente`) ; la
  troisieme fois, le chiffre etait externe mais deformait sa source (14/09/2026, "84% des
  developpeurs utilisent deja l'IA au quotidien" attribue a tort a Stack Overflow, qui mesure en
  realite "using or planning to use" -- corrige en "51% ... use AI tools daily", la bonne mesure).
  Aucun garde-fou mecanique n'est possible dans les deux cas (verifier "externe au post" exige de
  comparer au texte cible, hors de portee de `validerCommentaire` ; verifier "dit exactement ce
  que la source mesure" exige de comprendre le sens de la source, pas seulement sa presence) --
  la verification reste humaine, au moment de la redaction, jamais a posteriori. **Avant de
  retenir ce genre : verifier que le chiffre est externe au post ET que sa formulation dit
  exactement ce que la source mesure. En cas de doute sur l'un des deux, choisir un autre genre
  plutot que forcer celui-ci.**
- **Aucune experience personnelle non sourcee** : un commentaire qui affirme a la premiere
  personne ("on"/"nous"/"j'ai") avoir vecu une experience professionnelle concrete (client,
  mission, resultat) est **refuse**, sauf si `anecdoteSourcee: true` est passe explicitement --
  ce que seule une confirmation reelle de Julien ou Nomena autorise. **Ne jamais inventer une
  anecdote pour remplir le genre `histoire_vecue`** (ou toute autre affirmation d'experience) :
  sans anecdote confirmee, choisir un autre genre. Voir `references/` pour l'incident qui a
  motive cette regle.
- **Generalisation statistique vague et non sourcee (ajoute le 16/09/2026)** :
  `validerQuantificationVague` refuse "la plupart de/des", "la majorite de/des", "beaucoup
  de/d'", "peu de/d'" suivi d'un groupe/nom -- incident reel : "La plupart des utilisateurs de
  Claude Code n'en connaissent qu'une poignee" (aucun chiffre, aucune experience a la premiere
  personne) passait integralement inapercu de tous les garde-fous existants. Contrairement a
  `anecdoteSourcee`, **aucun echappatoire** : un commentaire de 2-4 phrases sans lien n'a pas de
  moyen raisonnable de citer une vraie source, la seule remediation reelle est de reformuler.
  Exception assumee pour ne pas casser les tours idiomatiques courants ("la plupart du temps",
  "dans la plupart des cas").
- **Accents manquants** (`lib/valider-orthographe.js`) : refuse tout texte contenant un mot
  d'une liste fermee de mots toujours accentues en francais standard -- heuristique
  volontairement imparfaite (mots ambigus type "a"/"à" exclus pour eviter les faux positifs).

`node --test` : 97 tests.

## Recommandation d'usage -- horaire de lancement (16/09/2026, a lire comme secondaire)

**Facteur secondaire par rapport a la liste de comptes cibles** (voir "Ce que le passage du
16/09/2026 demontre" plus haut -- c'est le facteur principal, verifie sur donnees reelles). Sur
les 3 passages avec l'ancienne liste, l'ecart a la fenetre de 4h n'a jamais ete monotone dans le
temps (72h le 15/09 matin, 7h le 15/09 fin d'apres-midi, 21h le 16/09 matin) : l'heure du passage
dans la journee jouait un role, les comptes cibles publiant surtout en fin de matinee et
l'apres-midi. Reste une optimisation valable une fois la liste elle-meme active : **lancer le
passage du matin plus tard dans la matinee et privilegier l'apres-midi quand un choix est
possible** augmente encore la probabilite de tomber sur un post frais -- mais ne compense jamais
une liste de comptes inactifs, comme les 3 passages a 0/3 l'ont montre.

## Recommandation d'usage -- ne pas revisiter la meme personne trop de jours d'affilee (17/09/2026)

Le brief interdit deux commentaires chez la meme personne le MEME jour (`validerQuotaJournalier`,
verifie mecaniquement), mais rien n'empeche mecaniquement d'y revenir plusieurs jours d'affilee
si son compte reste le plus frais disponible a chaque passage. **Cas reel** : Theo Meuriot
commente le 16/09 puis a nouveau le 17/09 (deux posts differents, tous deux reellement les plus
frais du jour) -- acceptable une fois, mais Nomena a signale que ca deviendrait moins defendable
a un 3e jour consecutif, surtout sans interaction en retour (like, reponse, DM) de la personne
visee entre les deux passages.

**Volontairement PAS un garde-fou de code** : contrairement au quota journalier, ceci reste un
jugement de situation (interaction en retour ou non, qualite du post, autres candidats
disponibles ce jour-la), pas une regle mecanique verifiable par une fonction. **Recommandation** :
au-dela de deux jours consecutifs chez la meme personne sans interaction en retour de sa part,
preferer un autre compte de la liste ce jour-la, meme si son post est objectivement moins frais
-- la diversite des personnes visees compte aussi, pas seulement la fraicheur du post.

## Audit adversarial et de robustesse (15/09/2026)

Un sous-agent dedie a tente reellement de faire passer du contenu hors-regle a travers les
garde-fous (sans jamais modifier leur code), et des donnees malformees ont ete injectees dans
les fonctions reseau/registre. Failles reellement reproduites et corrigees le meme jour, chacune
verrouillee par un test dans `test/adversarial-15-09.test.js` :

- **Voix passive pour affirmer une experience non sourcee** ("un projet a ete livre pour une
  equipe de 12" -- aucun pronom de 1ere personne, donc invisible a l'ancienne regex) : nouvelle
  detection independante des pronoms (`REGEX_VOIX_PASSIVE_EXPERIENCE`).
  **Limite assumee, non corrigee** : "je" seul et "mon"/"ma"/"mes" restent volontairement hors du
  detecteur de pronoms -- trop frequents dans une opinion generale ("mon avis sur ce type de
  mission") pour les y ajouter sans faire exploser les faux refus. Meme compromis que "a"/"à"
  deja exclus des accents.
- **Commentaire vide reformule sur 2-4 phrases** ("ça résonne", "ça me parle") : la liste
  `COMMENTAIRES_VIDES` ne matchait que le texte ENTIER ; une phrase individuellement vide au
  milieu d'un commentaire de plusieurs phrases refuse desormais si TOUTES les phrases le sont.
- **Quota/anti-doublon contourne par variation de la cle "compte"** (`Julien-Agency` vs
  `julien-agency` vs `julien_agency` creaient chacun un historique separe pour le meme compte
  reel) : `lib/registre.js` normalise et restreint desormais `compte` a
  `julien-agency`/`julien-partners` exactement.
- **Comparaison de date par egalite de chaine stricte** : une date fournie avec une heure/fuseau
  cassait silencieusement la detection "meme personne le meme jour". Format "AAAA-MM-JJ" valide
  strictement des l'entree de `entreesDuJour`/`enregistrerCommentairePublie`.
- **Registre corrompu sur disque** : `chargerRegistre` plantait avec un `SyntaxError` brut --
  message explicite desormais, comme tout autre garde-fou.
- **Reponse Apify malformee** : un element `null` dans le tableau de posts, ou une reponse qui
  n'est pas un tableau, plantaient `trierPosts`/`trouverPosts` avec un `TypeError` brut --
  filtres/messages explicites desormais.
- **Reponse Notion/Composio 500/429/tronquee** : `reponse.json()` etait appele sans filet --
  message explicite desormais (`lib/notion.js`, `lib/composio.js`), au lieu d'un `SyntaxError`
  brut.

## Audit adversarial du 22/09/2026 (demande explicite de Nomena, meme methode)

Meme sous-agent/methode, applique aux quatre skills LinkedIn a la fois (voir aussi
`linkedin-carrousel` et `linkedin-mise-en-forme`). Faille reellement reproduite et corrigee le
meme jour, verrouillee par `test/adversarial-22-09.test.js` :

- **Domaine nu sans "www." ni "http(s)://" echappait a `REGEX_LIEN`** : "monsite.fr" ou
  "bit.ly/abc123" passaient entierement inapercus, alors que LinkedIn les rend cliquables comme
  n'importe quel autre lien. `REGEX_LIEN` reconnait desormais aussi une liste fermee des TLD les
  plus courants (`.com`, `.fr`, `.net`, `.org`, `.io`, `.co`, `.ly`, `.be`, `.info`, `.app`,
  `.dev`, `.ai`) precedes d'un nom de domaine plausible. **Limite assumee** : un TLD hors de
  cette liste (ex. ".xyz", ".shop") reste un angle mort -- meme philosophie que les autres listes
  fermees de ce depot (`MOTS_SANS_ACCENT_VERS_CORRECT`, `INTERDITS`), pas une detection d'URL
  exhaustive.
- **Verifie sans trouver de faille** : le pronom "on" combine a du vocabulaire d'experience (deja
  couvert), et l'ouverture creuse "Super post !" suivie d'une vraie question -- confirmee comme un
  comportement VOULU, tranche le 15/09/2026 ("le but reste de bloquer le vide integral, pas de
  punir une accroche informelle"), pas une nouvelle faille.

### Deuxieme passage le meme jour (4 pistes demandees explicitement, apres l'integration du logo dans `linkedin-carrousel`)

Trois failles reelles confirmees et corrigees, une piste verifiee sans rien trouver de nouveau.
Verrouillees dans `test/adversarial-22-09.test.js` (memes fichiers de test, section dediee) :

- **Lien avec espaces inseres autour du point echappait a `REGEX_LIEN`** : "mon site . fr",
  "site .fr" ou "site. fr" passaient entierement inapercus -- `REGEX_LIEN` exigeait le nom de
  domaine et le TLD colles l'un a l'autre. Nouvelle regex `REGEX_LIEN_ESPACE`, meme liste fermee
  de TLD que `REGEX_LIEN` (memes limites assumees), tolerante a des espaces avant/apres le point.
- **`normaliserAuteurCible` ne collabait pas les espaces INTERNES** : "Theophile Burnet" et
  "Theophile  Burnet" (double espace, tabulation, espace insecable -- variation plausible d'une
  extraction Apify ou d'une frappe manuelle) restaient deux chaines differentes malgre `.trim()`,
  qui ne touche que les extremites. La regle "jamais deux fois la meme personne le meme jour"
  tombait donc silencieusement pour la MEME personne reelle -- meme famille de faille que la
  casse/decoration de fin deja corrigees le 17/09/2026, angle mort different (interieur du nom, pas
  ses bords). `normaliserAuteurCible` collabe desormais tout espace interne en un seul
  (`.replace(/\s+/g, ' ')`), avant la mise en minuscule.
- **`validerFraicheurMaximale` (plafond dur 48h) laissait passer une date future ou invalide SANS
  ERREUR** : `ageHeures > FRAICHEUR_MAX_HEURES` vaut `false` aussi bien pour un age negatif (post
  "publie" dans le futur) que pour un age `NaN` (date non parsable) -- toute comparaison avec `NaN`
  etant `false` en JavaScript, l'absence de rejet etait interpretee a tort comme "assez frais".
  Contrairement a `filtrerPostsFrais` (simple tri de la fenetre 4h, deja protege par `age >= 0`),
  cette fonction est le VERITABLE garde-fou dur avant publication : elle leve desormais une erreur
  explicite et distincte pour une date future ("manifestement invalide -- un post ne peut pas avoir
  ete publie apres maintenant") et pour une date non parsable ("fraicheur non verifiable").
- **Verifie sans trouver de faille nouvelle** : un genre declare sans que le contenu corresponde.
  "information_chiffree" sans aucun chiffre est deja bloque par `validerGenre`. "histoire_vecue" et
  "desaccord_argumente" ne verifient, eux, aucune coherence de contenu -- mais c'est une limite
  **deja documentee explicitement** en tete de `lib/valider-commentaire.js` ("juger si un argument
  est solide ou une histoire credible reste hors de portee d'une regle mecanique, assume comme
  limite"), pas une faille nouvellement decouverte. Fige par un test qui confirme ce comportement
  CONNU plutot que de forcer un "correctif" pour un cas deja assume.

## Suivi a 3 jours (regle 3 du brief -- lecture par capture d'ecran)

Aucun OCR : c'est la **session Claude** qui lit les chiffres visibles sur la capture d'ecran
collee dans la conversation, puis appelle le script avec ce qu'elle a lu.

**Deux mesures, deux natures, deux scripts** (corrige le 15/09/2026 -- voir "Faille de
conception" plus bas) :
- **Statistiques du COMMENTAIRE** (J'aime, reponses, reponse de l'auteur) -- une ligne par
  commentaire, `mettre-a-jour-stats.js` :
  ```
  node mettre-a-jour-stats.js --auteur "Jean ZENDJI" --date 2026-09-15 \
    --jaime 4 --reponses 1 --reponseAuteur true
  ```
  `retrouverLigneCommentaire` refuse explicitement si plusieurs lignes correspondent au meme
  auteur (preciser `--date` leve l'ambiguite). Refuse explicitement `--vuesProfil`/
  `--demandesContact` (retires, voir ci-dessous).
- **Vues de profil et demandes de contact** -- un releve par JOUR, independant du nombre de
  commentaires publies ce jour-la, `enregistrer-releve-profil.js` :
  ```
  node enregistrer-releve-profil.js --date 2026-09-18 --vuesProfil 42 --demandesContact 2
  ```
  Stocke dans `data/statistiques-profil.json` (gitignore). Un second appel pour la meme date
  **remplace** le premier, ne s'y ajoute jamais.

**Faille de conception trouvee et corrigee (15/09/2026, avant toute donnee reelle ecrite)** :
vues de profil et demandes de contact etaient a l'origine des colonnes PAR LIGNE DE COMMENTAIRE
dans Notion, additionnees par ligne dans `calculerComparaisonHebdomadaire`. Le brief est pourtant
explicite : "Vues de profil et demandes de contact sont dans mes statistiques LinkedIn, jour par
jour" -- une mesure de PROFIL datee, pas une propriete de commentaire. 5 commentaires publies le
meme jour, portant chacun le meme chiffre global (le releve unique de ce jour-la), auraient
gonfle le tableau de comparaison hebdomadaire d'un facteur 5 sans que rien ne le signale. Voir
`lib/statistiques-profil.js` pour le detail complet et `test/notion-comparaison-hebdomadaire.test.js`
pour le test qui verrouille la non-regression (5 commentaires + 1 releve = le total d'UN jour,
jamais multiplie).

**Marche a suivre prete pour le 18/09/2026** (3 jours apres les 5 commentaires reels du 15/09) :
`references/procedure-18-09-suivi-3-jours-commentaires.md` -- ecrans LinkedIn exacts a ouvrir,
chiffres a relever pour chacun des 5 commentaires ET pour le releve de profil du jour (un seul,
pas cinq), ordre de collage, commandes pretes a copier-coller (mise a jour le 15/09/2026 pour
refleter ce correctif).

**Comparaison hebdomadaire** ("le coeur de la skill" selon le brief : commentaires de la semaine
cote a cote avec vues de profil et demandes de contact) : `creerVueComparaisonHebdomadaire`
cree un graphique Notion (nombre de commentaires par semaine seul -- l'API Notion n'accepte
qu'un axe Y par vue). `ecrireBlocComparaisonHebdomadaire({ pageId, lignes, relevesProfil })`
complete avec un **bloc tableau natif** sur la page (les 3 chiffres cote a cote, une ligne par
semaine) : `lignes` = les commentaires (comptage), `relevesProfil` = `listeReleves()` depuis
`lib/statistiques-profil.js` (vues/demandes, dedupliquees par date avant agregation). **`pageId`
doit etre la page PARENTE de la base "Commentaires"** (jamais l'ID de la base elle-meme -- une
base de donnees Notion n'accepte pas de blocs enfants). A relancer pour rafraichir (pas une vue
qui se met a jour seule).

## Regles d'usage (brief du 10/09/2026, section 2) -- etat actuel

1. **Phrase de lancement** : faite.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]`.
3. **Lecture des chiffres depuis une capture d'ecran** : mecanisme pret et fonctionnel (voir
   "Suivi a 3 jours") -- premiere execution reelle prevue une fois les posts publies depuis
   3 jours (voir `references/` pour la date exacte).
4. **Rien ne plante a vide** : `validerCommentaire`/`validerQuotaJournalier` refusent avec un
   message explicite ; `etat.js` et `dry-run.js` gerent le cas "rien de disponible".
5. **Jamais les mains vides** : `dry-run.js` et `etat.js` proposent un repli concret des que
   rien n'est disponible.

## Historique et incidents

Decisions de conception, incidents reels (dont l'invention d'une anecdote inexistante, a
l'origine de la regle "jamais d'experience non sourcee"), blocages Notion resolus, publications
reelles : `references/linkedin-commentaires-historique.md`. Etat des lieux transverse aux 3
skills : `references/etat-linkedin-20260912.md`.
