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

**Point de situation** : lancer `node etat.js [compte]` avant toute chose -- affiche en trois
lignes le dernier commentaire publie, le quota du jour deja utilise, et l'etat des comptes
cibles. Propose un repli si rien n'est configure (jamais les mains vides).

## Ce que fait la skill

1. `lib/trouver-posts.js` (`trouverPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes listes dans `comptes_cibles` de
   `reglages-comptes.json`. **Champ obligatoire : `targetUrls`, pas `profiles`** -- avec
   `profiles` l'acteur renvoie zero post sans aucune erreur.
2. `trierPosts` ecarte les carrousels (repere : `document.totalPageCount` present -- commenter
   dessus reviendrait a commenter un post non lu) et les posts au-dela de
   `seuil_max_commentaires`, trie par date decroissante.
3. `lib/planifier-commentaires.js` (`filtrerPostsFrais`) ne garde que les posts publies il y a
   **moins de 4 heures** -- priorite a la fraicheur, jamais a la popularite, comme l'exige le
   brief. `validerQuotaJournalier` refuse un nouveau commentaire si le quota du jour (5, voir
   plus bas) est atteint, ou si la meme personne a deja ete commentee aujourd'hui.
4. La session Claude qui invoque cette skill lit les posts retenus et **ecrit elle-meme** le
   commentaire, dans le ton de `reglages-comptes.json`, en choisissant l'un des quatre genres du
   brief -- ce n'est pas une generation automatique en JS.
5. `lib/valider-commentaire.js` (`validerCommentaire`) **refuse** (jamais un avertissement) tout
   brouillon hors des regles de forme (2-4 phrases, pas de puces/emoji/lien) ou dont le genre
   declare ne correspond pas au contenu (voir "Garde-fous" plus bas).
6. `lib/publier-commentaire.js` (`publierCommentaire`) est le **seul** point d'appel qui publie
   reellement : `publierCommentaire({ actorUrn, targetUrn, message })`. `targetUrn` doit etre le
   `shareUrn` du post (jamais une URN `urn:li:activity:`, refusee par l'API).
7. Une fois un commentaire reellement publie, `lib/registre.js` (`enregistrerCommentairePublie`)
   l'ajoute a `data/registre-commentaires.json` (gitignore) -- c'est ce registre qui fait
   respecter le quota journalier d'un lancement de la skill a l'autre.
8. `dry-run.js` (`npm run dry-run` ou `node dry-run.js`) execute les etapes 1-5 de bout en bout
   sans jamais appeler `publierCommentaire` (il n'importe meme pas
   `lib/publier-commentaire.js`) -- avec le jeu fixture de `fixtures/posts-exemple.json` tant
   que `comptes_cibles` est vide, ou avec un vrai appel Apify des que ce champ est rempli et
   `APIFY_TOKEN` present. `npm test` (`node --test`) verifie chaque garde-fou individuellement
   (voir plus bas) et ce dry run de bout en bout, y compris qu'il n'importe jamais
   `lib/publier-commentaire.js`.

## Garde-fous automatiques (14/09/2026) -- refus explicite, pas un avertissement

Priorite 2 (apres `linkedin-carrousel`, livre et confirme). Les regles de la section 6 du brief
sont desormais codees en garde-fous qui refusent, testes un par un avec un cas reel qui doit
echouer.

### Structure et frequence -- `lib/planifier-commentaires.js`

- **Fraicheur** : `filtrerPostsFrais` ne garde que les posts de moins de 4h, tries du plus
  recent au plus ancien. Un post de 5h est exclu -- teste reellement
  (`test/planifier-commentaires.test.js`).
  **A savoir avant de lancer la skill en usage courant** (pas seulement une excuse pour le
  passage du 14/09/2026, verifie ce jour-la sur les 16 comptes reels) : la regle des 4h
  suppose un vivier de comptes suffisamment actifs pour qu'il y ait TOUJOURS quelque chose de
  frais au moment du passage. Sur 8 comptes par marque, un compte qui ne publie qu'une ou deux
  fois par semaine ne garantit rien -- un passage donne legitimement 0 post frais si aucun des
  8 n'a publie dans les 4 heures precedentes, sans que ce soit un signe de panne. Plus la liste
  de comptes est active (plusieurs posts/semaine chacun), plus la fenetre de 4h a des chances
  de donner quelque chose ; avec des comptes qui publient rarement, le repli documente (poster
  le plus recent disponible, deviation ecrite) sera la norme plutot que l'exception.
- **Quota journalier (5/jour)** et **jamais deux fois la meme personne le meme jour** :
  `validerQuotaJournalier`, verifie contre `data/registre-commentaires.json` (le registre reel
  des commentaires deja publies, pas une simple limite documentee).
- Corrige a cette occasion : `reglages-comptes.json` portait encore l'ancien plafond de 12/jour
  (convention reprise de `visibilite-ops`) ; le brief integral impose 5 -- corrige et desormais
  fait respecter par le code, pas seulement documente.

### Contenu du commentaire -- `lib/valider-commentaire.js`

- **2 a 4 phrases**, refus hors de cette fourchette (teste avec 1 et avec 5 phrases).
- **Aucune puce/liste numerotee, aucun emoji, aucun lien** -- chacun teste avec un cas reel qui
  echoue.
- **Commentaires vides refuses** : liste de formulations creuses ("super post", "tellement
  vrai", "top", "merci du partage", etc.) -- refus explicite, testes.
- **Genre coherent avec le contenu** : `information_chiffree` exige un chiffre dans le texte,
  `vraie_question` exige que le texte se termine par "?" -- les deux testes en echec.
- **Aucune experience personnelle non sourcee** (ajoute le 14/09/2026, pendant exact de "aucun
  chiffre sans source" du carrousel) : un commentaire qui affirme a la premiere personne
  ("on"/"nous"/"j'ai") avoir vecu une experience professionnelle concrete (client, mission,
  equipe de N personnes, resultat obtenu) est **refuse**, sauf si `anecdoteSourcee: true` est
  passe explicitement -- ce que seule une confirmation reelle de Julien autorise. Voir "Genre
  histoire_vecue" plus bas pour la procedure complete et pourquoi ce garde-fou existe.
- **Accents manquants, controle PARTIEL ajoute le 15/09/2026** (`lib/valider-orthographe.js`,
  `validerAccents`, appele par `validerCommentaire`) : les 5 premiers commentaires reels
  s'etaient reveles integralement sans accents le 14/09 (pas un artefact d'affichage, confirme
  sur les octets du fichier) -- meme constat sur `linkedin-carrousel` (y compris du contenu deja
  publie) et `linkedin-veille-virale`. Refuse desormais tout texte contenant un mot d'une liste
  fermee de mots toujours accentues en francais standard -- imparfait par construction (mots
  ambigus comme "a"/"à" ou "ou"/"où" volontairement exclus, risque de faux positif trop eleve),
  mais mieux qu'aucun controle. **Limite restante, assumee** : le rythme voulu par le brief ("un
  mot parle en tete, un fragment sans verbe") reste une qualite de redaction non verifiable
  mecaniquement -- c'est a la session qui redige de le tenir.

## Genre "histoire_vecue" : ne jamais inventer une experience de Julien (14/09/2026)

**Incident reel** : un commentaire prepare le 14/09/2026 pour Jean Zendji affirmait "On a mis en
place un tri similaire chez un client hotelier l'an dernier" -- une mission qui n'a jamais existe,
inventee pour remplir le genre. Julien a signale le probleme avant publication : ce commentaire
serait parti sous son identite reelle, qu'il ne relit pas avant publication -- si un lecteur
demande un detail sur ce client, Julien est piege publiquement sur son propre profil. Le brief
interdit deja d'inventer un chiffre pour la meme raison (regle "aucun chiffre sans source") ;
inventer une experience entiere est plus grave, pas moins.

**Trois pistes evaluees, une tranchee** :
1. *(retenue)* La skill ne redige jamais seule ce genre : avant d'ecrire un commentaire
   "histoire_vecue" (ou toute affirmation d'experience dans un autre genre), la session qui
   redige doit d'abord obtenir une anecdote REELLE de Julien ou Nomena -- pas la deviner, pas
   l'inventer meme "plausible". Sans anecdote confirmee, elle choisit un autre genre plutot que
   de forcer celui-ci. Cout d'implementation nul (aucune infrastructure nouvelle), coherent avec
   le fait qu'un humain est deja dans la boucle a chaque redaction (point 4 ci-dessus).
2. *(ecartee pour l'instant)* Un fichier d'anecdotes reelles alimente par Julien a l'avance,
   consulte par la skill. Solution plus systematique, mais cout de maintenance reel pour Julien
   (il doit ecrire et tenir ce fichier a jour) sans gain immediat : aujourd'hui ce fichier serait
   vide, donc le comportement se reduit exactement a la piste 1 (proposer un autre genre, regle 4
   du brief : jamais planter/echouer a vide sans dire quoi faire). A reconsiderer si Julien
   souhaite un jour pre-ecrire des anecdotes pour accelerer la redaction.
3. *(ecartee)* Remplacer le genre par une observation generale assumee, sans "je/on" factuel.
   Ecartee parce qu'elle redefinirait unilateralement un genre que Julien a explicitement nomme
   et valide dans son brief ("histoire vecue" implique justement un vecu reel) -- ce n'est pas a
   la skill de decider seule que ce genre ne peut jamais exister sous sa forme prevue.

**Garde-fou automatique correspondant, code** : `lib/valider-commentaire.js`
(`validerAffirmationExperience`) refuse tout commentaire, **quel que soit son genre declare**,
qui combine un pronom de premiere personne (on/nous/j'ai/notre) et du vocabulaire d'experience
professionnelle (client, mission, equipe de N, livre/deploye/mis en place/implemente/accompagne,
resultat) dans la meme phrase -- sauf `anecdoteSourcee: true`, que seule la personne qui redige
peut poser, et seulement apres confirmation reelle de Julien. Heuristique, pas une preuve
(comme "aucun chiffre sans source" : aucune regle mecanique ne peut verifier qu'une anecdote a
vraiment eu lieu, seul un humain le peut) -- teste sur le cas reel du 14/09/2026 et sur un cas
d'observation generale qui ne doit pas etre accuse a tort (`test/valider-commentaire.test.js`).

**Resolu le 14/09/2026, sans attendre d'anecdote de Julien** (il ne relit rien et ne repond pas
toujours vite -- le livrable du 20 ne peut pas dependre de sa disponibilite) : les 4 commentaires
refuses ont ete **reecrits dans un genre qui ne demande aucune experience personnelle**, pas mis
en attente indefiniment.
- Theophile Burnet -> `information_chiffree`, mais avec un **vrai chiffre public sourcable**
  (84% des developpeurs utilisent l'IA en 2025 contre 76% en 2024, Stack Overflow Developer
  Survey 2025 -- page reellement ouverte et lue, citation exacte verifiee), jamais un chiffre
  "de chez un client".
- Florent Pontiac -> `vraie_question` : question reelle sur le site livre (structure, choix de
  design), sans pretendre l'avoir concu.
- Valentin Muller -> `desaccord_argumente` : argument sur le fond (tests automatises vs
  verification manuelle a posteriori), sans "on a livre" ni "chez nous".
- Jean Zendji -> `vraie_question` initialement, rebascule `desaccord_argumente` le 15/09/2026
  apres relecture de Julien (nuance reelle sur le tri en 2 categories du post source, pour
  rediversifier -- pas force).

**Relecture de Julien le 15/09/2026, deux corrections avant le GO** : (1) le chiffre du
commentaire Theophile Burnet deformait la source Stack Overflow ("using or planning to use"
confondu avec "au quotidien") -- remplace par le chiffre qui mesure reellement l'usage
quotidien (51% des developpeurs professionnels, meme enquete). (2) repartition des genres
rééquilibree (Jean Zendji vers `desaccord_argumente`). Les 5 commentaires couvrent desormais
**3 genres sur 4** (`vraie_question` x2, `information_chiffree` x1, `desaccord_argumente` x2)
-- `histoire_vecue` reste en reserve pour le jour ou Julien fournira une anecdote reelle,
deviation assumee et ecrite pour le mail du 20/09. **GO donne par Julien pour les cinq**, puis
publication reelle tentee sur les 5 le meme jour (canal Composio/MCP retrouve, voir
`linkedin-carrousel/SKILL.md`) : **1/5 reussi** (Jean Zendji, julien-agency, confirme API et
navigateur reel), **4/5 refuses proprement** (`403 Forbidden: Viewer/Actor is unauthorized
agent`) -- l'identite julien-partners n'est toujours pas reellement connectee cote Composio
(confirme, pas suppose). **Lecon retenue (Point n°16, `etat-linkedin-20260912.md`)** : les 4
avaient ete rediges pour julien-partners sur une hypothese jamais testee, alors que
`averse-cooser` = julien-agency est confirme depuis le 11/09 -- toujours verifier l'acces
Composio d'un compte par un appel reel avant de rediger du contenu pour lui, jamais le
supposer. **Meme jour, apres-midi** : les 4 refuses ont ete reecrits pour 4 profils reels de
julien-agency (Georges Solutions, Romain Charissou, Benjamin Lacroix, Raphael Mizrahi) et
publies reellement, confirmes API + navigateur pour chacun -- **les 5 commentaires du jour sont
en ligne**. Voir `a-publier/README.md` pour le detail complet et le statut de chacun.

### Sortie reelle des 5 cas de refus demandes

```
$ node -e "require('./lib/planifier-commentaires').validerQuotaJournalier([{date:'2026-09-14',auteurCible:'urn:li:person:a'},{date:'2026-09-14',auteurCible:'urn:li:person:b'},{date:'2026-09-14',auteurCible:'urn:li:person:c'},{date:'2026-09-14',auteurCible:'urn:li:person:d'},{date:'2026-09-14',auteurCible:'urn:li:person:e'}],{auteurCible:'urn:li:person:nouveau'})"
Commentaire refuse : quota journalier atteint (5/5 deja publies aujourd'hui pour ce compte).

$ node -e "require('./lib/valider-commentaire').validerCommentaire({texte:'Super post !',genre:'histoire_vecue'})"
Commentaire refuse : formulation vide detectee ("Super post !") -- ca ne rapporte rien et ca se voit, comme le dit le brief.

$ node -e "require('./lib/valider-commentaire').validerCommentaire({texte:'Bon point, ca rejoint ce qu on a vu chez un client 👍.',genre:'histoire_vecue'})"
Commentaire refuse : aucun emoji autorise.

$ node -e "require('./lib/valider-commentaire').validerCommentaire({texte:'Interessant.',genre:'histoire_vecue'})"
Commentaire refuse : 1 phrase(s) detectee(s), attendu entre 2 et 4.

$ node -e "require('./lib/valider-commentaire').validerCommentaire({texte:'On a vu ca aussi chez nous. Ca a vraiment aide.',genre:'information_chiffree'})"
Commentaire refuse : genre "information_chiffree" declare mais aucun chiffre trouve dans le texte.
```

`node --test` : 40 tests, tous verts (mis a jour le 15/09/2026 avec le garde-fou "accents manquants" -- voir plus haut).

## Cinq regles d'usage (brief du 10/09/2026, section 2) -- etat au 14/09/2026

1. **Phrase de lancement** : faite, voir en tete de ce fichier et dans le README du paquet.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]`.
3. **Lecture des chiffres depuis une capture d'ecran, jamais de saisie manuelle** : **a du sens
   ici** (contrairement a `linkedin-carrousel`), vu les colonnes de suivi a 3 jours prevues sur
   la page Notion (J'aime, reponses, vues de profil, demandes de contact -- section 6 du brief).
   **Non implemente a ce stade** : aucune page Notion n'existe encore (connecteur absent de
   cette session, voir plus bas), donc rien a lire par capture d'ecran pour l'instant -- a faire
   des que la page existe.
4. **Rien ne plante a vide** : `validerCommentaire`/`validerQuotaJournalier` refusent avec un
   message explicite (jamais une exception brute) ; `etat.js` et `dry-run.js` gerent le cas
   "rien de disponible" avec un message qui dit quoi faire (voir regle 5).
5. **Jamais les mains vides** : `dry-run.js` et `etat.js` proposent un repli concret des que
   rien n'est disponible (aucun post frais, aucun compte cible, quota atteint) -- teste
   reellement (voir sortie CLI plus bas). Le champ `comptes_cibles` vide n'a pas ete laisse tel
   quel non plus : une proposition argumentee de 8 comptes reels existe (voir "Comptes cibles"
   ci-dessous) plutot qu'un blocage silencieux.

**Sortie reelle de `node dry-run.js` a ce jour (comptes_cibles vide, donnees fixture datees,
donc hors fenetre de fraicheur reelle)** :
```
"repli": "Aucun post de moins de 4h trouve parmi les 2 post(s) retenus pour julien-partners.
Repli propose : reessayer au prochain passage (2 par jour prevus), ou, si le delai presse,
commenter malgre tout le plus recent disponible en signalant explicitement qu'il depasse la
fenetre de fraicheur -- decision a valider par Julien, pas automatique."
```

## Comptes cibles -- VALIDES par Julien le 14/09/2026

`comptes_cibles` est desormais rempli dans `reglages-comptes.json` : **16 profils LinkedIn
francais reels, verifies un par un par navigation** (jamais devines), 8 par marque -- brief
relu attentivement : "8 a 12 comptes PAR MARQUE", pas au total (premiere proposition
corrigee suite a la remarque de Julien, qui n'avait que 4/marque). Detail complet, positionnement
et methode de verification pour chacun : `references/comptes-cibles-proposition-20260914.md`.
**Julien a valide d'avance** ("je valide la liste completee").

## Page Notion -- code pret, en attente du jeton (mis a jour le 14/09/2026)

**Clarification importante** : ce n'est pas le connecteur OAuth "Notion" de claude.ai
(Reglages -> Parcourir -> Notion -> Connecter) qu'il faut ici -- Julien fournit une **cle
d'integration Notion** dans `env/secrets.md` (meme depot et methode que `APIFY_TOKEN`), a
utiliser en appel direct a l'API `api.notion.com` via `fetch`, pas via un outil MCP. Nomena
l'exportera dans l'environnement (`NOTION_TOKEN`) -- jamais lue directement par cette session.

`lib/notion.js` est ecrit et pret : `creerBaseCommentaires` (schema exact des colonnes du
brief : Titre, Compte, Personne visee, Lien du post, Date, Texte du commentaire, Genre, puis
les 5 colonnes de suivi a 3 jours) et `creerVueComparaisonHebdomadaire` (la vue "nombre de
commentaires de la semaine cote a cote avec les courbes de vues de profil/demandes de
contact"). `creer-page-notion.js` (CLI) execute les deux d'un coup des que `NOTION_TOKEN` et
`NOTION_PARENT_PAGE_ID` sont dans l'environnement.

**Limite verifiee, pas contournee** : l'API Notion publique n'expose aucun endpoint pour
inviter un e-mail externe sur une page (confirme par recherche) -- le partage en modification
avec `contact@claudeagency.fr` devra se faire a la main, une fois, via le bouton "Share" de
l'interface. Le script imprime l'URL exacte de la page pour ce geste.

**Mise a jour du 14/09/2026, jeton recu -- nouveau blocage reel, different de l'absence de
jeton** : `NOTION_TOKEN` fonctionne (`POST /v1/search` repond 200), mais **aucune page
ordinaire n'est partagee avec cette integration** -- seulement 3 bases de donnees existantes
(prospects/CRM, avec des donnees personnelles reelles de tiers : e-mails, telephones -- jamais
copiees ni referencees ici au-dela de ce simple constat). Une integration Notion "interne" ne
voit que ce qui lui a ete explicitement partage via le bouton "Share" d'une page -- **`POST
/v1/databases` exige un `parent.page_id` valide, et aucun n'est disponible dans ce qui est
partage aujourd'hui.** Je n'ai ni devine un ID de page, ni rattache les nouvelles bases a une
des bases de prospects existantes (aucun rapport avec ce travail, et ce serait polluer les
donnees de quelqu'un d'autre).

**A faire par Julien ou Nomena, dans Notion** : ouvrir (ou creer) une page destinee a ce
chantier, cliquer "..." en haut a droite -> "Connexions" -> ajouter l'integration Notion
utilisee ici par son nom, puis donner l'ID de cette page (visible dans son URL) pour
`NOTION_PARENT_PAGE_ID`. Des que fait, `creer-page-notion.js` peut tourner tel quel dans les
deux skills -- rien d'autre a changer cote code.

**Garde-fou verifie sur ce cas precis (regle 4 du brief, "rien ne plante a vide")** :
`creer-page-notion.js` et `lib/notion.js` ne remontent plus jamais l'exception brute de
l'API -- chaque echec connu est traduit en message qui dit quoi faire et ou. Teste reellement,
sortie reelle capturee :
```
$ node creer-page-notion.js                                    # NOTION_PARENT_PAGE_ID absent
NOTION_PARENT_PAGE_ID manquant. A definir dans l'environnement (meme methode que NOTION_TOKEN
et APIFY_TOKEN, voir .env.example) : c'est l'ID de la page Notion, deja partagee avec
l'integration (bouton "..." de la page -> "Connexions" -> ajouter l'integration), sous
laquelle creer cette base -- copiez-le depuis l'URL de la page (le bloc de 32 caracteres
apres le dernier tiret).

$ NOTION_PARENT_PAGE_ID=x node creer-page-notion.js             # NOTION_TOKEN absent
NOTION_TOKEN manquant (variable d'environnement ou parametre notionToken).

$ NOTION_TOKEN=<valide> NOTION_PARENT_PAGE_ID=<id-invalide-ou-non-partage> node creer-page-notion.js
Page ou base introuvable pour NOTION_PARENT_PAGE_ID -- deux causes possibles : (1) l'ID est
invalide (copiez-le depuis l'URL de la page Notion, le bloc de 32 caracteres apres le dernier
tiret) ; (2) la page existe mais n'est PAS partagee avec cette integration -- ouvrez la page
dans Notion, bouton "..." en haut a droite -> "Connexions" -> ajoutez l'integration par son
nom, puis relancez.

$ NOTION_TOKEN=<invalide> ... node creer-page-notion.js         # jeton invalide/expire (401)
NOTION_TOKEN invalide ou expire. Verifiez sa valeur dans Notion -> Parametres et membres ->
Connexions -> votre integration -> "Afficher le jeton secret", et reexportez-la dans
l'environnement.
```
**Bug reel corrige au passage** : la premiere version etiquetait a tort l'absence de
`NOTION_TOKEN` comme une erreur "reseau" (le `try/catch` autour de `fetch` interceptait aussi
l'exception synchrone levee avant tout appel reseau) -- corrige, avec test de non-regression
(`test/notion-erreurs.test.js`, meme correction repliquee dans `linkedin-veille-virale`).

## Exemple reel attendu le 20/09 -- BLOQUE sur un point technique different, pas contourne

`comptes_cibles` est desormais rempli et valide (voir ci-dessus) -- ce blocage-la est leve.
**Nouveau blocage, verifie explicitement le 14/09/2026** : `APIFY_TOKEN` n'est pas present dans
l'environnement de cette session (`echo $APIFY_TOKEN` -> vide). Sans lui, `trouverPosts` ne
peut recuperer aucun post reel des 16 comptes valides -- le pipeline entier (garde-fous,
fraicheur, quota, redaction, validation) est pret et teste sur fixture, mais ne peut pas
tourner sur donnees reelles tant que ce jeton n'est pas exporte. **A faire par Nomena**, meme
methode que le 12/09/2026 (export manuel dans l'environnement de la session, jamais une
lecture automatisee d'un fichier de secrets par ce code). Des que present, la recuperation
reelle et la redaction des cinq commentaires peuvent demarrer sans autre chantier technique.

## Etat au 12/09/2026 -- ce qui restait pret, ce qui attendait (avant les garde-fous du 14/09)

- **Identite confirmee, `publierCommentaire` utilisable pour julien-agency** :
  `urn:li:person:aFqu-W7ClW`, confirme par appel reel -- voir SKILL.md de `linkedin-carrousel`
  et `references/etat-linkedin-20260912.md`. `julien-partners` reste **non confirme**.
- **`publierCommentaire` reste non testee par un appel reel** : elle utilise
  `LINKEDIN_CREATE_COMMENT_ON_POST`, qui n'a pas d'equivalent "brouillon" -- un commentaire est
  visible des sa creation. Le canal MCP/l'identite ont ete confirmes fonctionnels sur une action
  voisine (creation de post), pas sur celle-ci precisement.
- **Canal reellement fonctionnel : MCP, via une cle d'acces "consumer"** (pas le canal REST de
  `lib/composio.js`, ecrit avant que ce canal MCP soit decouvert). **A faire** : migrer
  `lib/composio.js` vers ce canal avant toute publication reelle.
- **APIFY_TOKEN : RESOLU** -- export manuel par Nomena dans l'environnement de la session.

Etat des lieux complet des 3 skills linkedin-* :
`references/etat-linkedin-20260912.md` du paquet.
