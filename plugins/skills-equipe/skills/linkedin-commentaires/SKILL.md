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
- **Limite assumee, pas contournee** : "orthographe irreprochable" et le rythme voulu par le
  brief ("un mot parle en tete, un fragment sans verbe") sont des qualites de redaction, pas des
  formes mecaniquement verifiables -- aucun garde-fou ne les impose, c'est a la session qui
  redige de les tenir.

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

`node --test` : 27 tests, tous verts (`lib/valider-commentaire.js` : 13, `lib/planifier-commentaires.js` : 5, `dry-run.js` : 4, `trierPosts` : 5).

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
chantier, cliquer "Share" en haut a droite, ajouter l'integration Notion utilisee ici par son
nom, puis donner l'ID de cette page (visible dans son URL) pour `NOTION_PARENT_PAGE_ID`. Des
que fait, `creer-page-notion.js` peut tourner tel quel dans les deux skills -- rien d'autre a
changer cote code.

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
