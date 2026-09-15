# Historique et incidents -- linkedin-commentaires

Ce fichier n'est pas necessaire pour faire tourner la skill (voir `SKILL.md` pour le mode
d'emploi) -- il garde la trace des decisions, tests reels et incidents qui ont produit l'etat
actuel. Complement de `references/etat-linkedin-20260912.md` (etat des lieux transverse aux 3
skills).

## Correction du quota (14/09/2026)

`reglages-comptes.json` portait encore l'ancien plafond de 12/jour (convention reprise du depot
`visibilite-ops`) ; le brief integral impose 5 -- corrige et desormais fait respecter par le
code (`validerQuotaJournalier`), pas seulement documente.

## Incident "histoire_vecue" -- pourquoi la regle "jamais d'experience non sourcee" existe (14/09/2026)

Un commentaire prepare pour Jean Zendji affirmait "On a mis en place un tri similaire chez un
client hotelier l'an dernier" -- une mission qui n'a jamais existe, inventee pour remplir le
genre. Julien a signale le probleme avant publication : ce commentaire serait parti sous son
identite reelle, qu'il ne relit pas avant publication -- si un lecteur demande un detail sur ce
client, Julien est piege publiquement sur son propre profil. Le brief interdit deja d'inventer
un chiffre pour la meme raison ; inventer une experience entiere est plus grave, pas moins.

**Trois pistes evaluees, une tranchee** :
1. *(retenue)* La skill ne redige jamais seule ce genre sans anecdote REELLE confirmee par
   Julien ou Nomena -- sans elle, elle choisit un autre genre. Cout d'implementation nul,
   coherent avec le fait qu'un humain est deja dans la boucle a chaque redaction.
2. *(ecartee)* Un fichier d'anecdotes reelles pre-ecrit par Julien -- cout de maintenance reel
   pour un gain nul tant que ce fichier serait vide (se reduit a la piste 1). A reconsiderer si
   Julien veut un jour pre-ecrire des anecdotes.
3. *(ecartee)* Remplacer le genre par une observation generale sans "je/on" factuel --
   redefinirait unilateralement un genre que Julien a explicitement nomme et valide.

Garde-fou code : `validerAffirmationExperience` (`lib/valider-commentaire.js`) refuse tout
commentaire combinant un pronom de premiere personne et du vocabulaire d'experience
professionnelle, sauf `anecdoteSourcee: true` pose apres confirmation reelle. Heuristique, pas
une preuve -- comme "aucun chiffre sans source", aucune regle mecanique ne peut verifier qu'une
anecdote a vraiment eu lieu.

**Resolu le 14/09/2026 sans attendre d'anecdote de Julien** (indisponible, le livrable du 20 ne
pouvait pas en dependre) : les 4 commentaires refuses ont ete reecrits dans un genre qui ne
demande aucune experience personnelle -- Theophile Burnet -> `information_chiffree` (84% des
developpeurs utilisent l'IA en 2025, Stack Overflow Developer Survey 2025, verifie), Florent
Pontiac -> `vraie_question`, Valentin Muller -> `desaccord_argumente`, Jean Zendji ->
`vraie_question` puis `desaccord_argumente` apres relecture de Julien.

**Relecture de Julien le 15/09/2026** : le chiffre Theophile Burnet deformait la source ("using
or planning to use" confondu avec "au quotidien") -- remplace par le chiffre reel d'usage
quotidien (51%, meme enquete). Repartition finale : `vraie_question` x2, `information_chiffree`
x1, `desaccord_argumente` x2 -- 3 genres sur 4, `histoire_vecue` en reserve pour une anecdote
reelle future.

## Publication reelle des 5 commentaires (15/09/2026)

GO donne par Julien. Premiere tentative : 1/5 reussi (Jean Zendji, julien-agency, confirme API
et navigateur), 4/5 refuses (`403 Forbidden: Viewer/Actor is unauthorized agent`) -- les 4
avaient ete rediges pour julien-partners sur une hypothese jamais testee que ce compte etait
connecte cote Composio (il ne l'etait pas -- lecon retenue : toujours verifier l'acces Composio
d'un compte par un appel reel avant de rediger du contenu pour lui). Meme jour, apres-midi : les
4 refuses reecrits pour 4 profils reels de julien-agency (Georges Solutions, Romain Charissou,
Benjamin Lacroix, Raphael Mizrahi) et publies reellement, confirmes API + navigateur. Detail
complet et statut de chacun : `a-publier/README.md` du paquet.

## Comptes cibles -- proposition initiale corrigee (14/09/2026)

Premiere proposition : 4 comptes par marque. Julien a relu le brief ("8 a 12 comptes PAR
MARQUE", pas au total) et signale l'erreur -- corrigee a 8 par marque (16 au total). Julien a
valide d'avance ("je valide la liste completee"). Detail complet, positionnement et methode de
verification de chacun : `references/comptes-cibles-proposition-20260914.md`.

## Page Notion -- deblocages successifs

- **Bug corrige** : la premiere version de `lib/notion.js` etiquetait a tort l'absence de
  `NOTION_TOKEN` comme une erreur "reseau" (le `try/catch` autour de `fetch` interceptait aussi
  l'exception synchrone levee avant tout appel reseau) -- corrige, meme correction repliquee
  dans `linkedin-veille-virale`.
- **14/09/2026, jeton recu, nouveau blocage** : `NOTION_TOKEN` fonctionnait, mais aucune page
  ordinaire n'etait partagee avec l'integration (seulement des bases de prospects/CRM existantes,
  jamais copiees ni referencees). `POST /v1/databases` exige un `parent.page_id` valide --
  aucune ID de page devine, aucun rattachement force a une base existante d'un autre chantier.
- **15/09/2026, debloque** : Julien a partage la page "LinkedIn — Veille & Commentaires" avec
  l'integration "Leads site claudeagency.fr". `node creer-page-notion.js` a cree la base
  "Commentaires" reellement. **Bug trouve et corrige** : la vue "chart" echouait (`400`, "Chart
  views require a CHART directive") faute d'objet `configuration` -- corrige avec le schema reel
  de l'API (`x_axis`/`y_axis`, `group_by: 'week'`, `sort`), confirme par trois allers-retours
  avec l'API reelle.
- **Base remplie** avec les 5 vrais commentaires publies le 15/09, verifie en relisant les 5
  lignes via l'API. URL de la base : `references/mail-20260920-brouillon.md`.

## Bloc de comparaison hebdomadaire -- execution reelle (15/09/2026)

`ecrireBlocComparaisonHebdomadaire` execute reellement contre les 5 vraies lignes de la base :
bloc `table` cree (id `3dce7fe5-dbf8-81a5-805b-f7c6eaa401d7`), contenu relu et verifie via
l'API :
```
Semaine | Commentaires | Vues de profil | Demandes de contact
2026-S38 (a partir du 2026-09-14) | 5 | 0 | 0
```
(0/0 attendu -- stats a 3 jours pas encore renseignees). **Bug trouve et corrige** : la
conception initiale supposait que `pageId` pouvait etre l'ID de la base elle-meme -- faux,
confirme par un vrai `400 validation_error` ("Block does not support children") ; `pageId` doit
etre la page PARENTE de la base (`3dbe7fe5-dbf8-80af-b390-c2e62ff8ac46`, lue via `GET
/v1/databases/{id}`, champ `parent.page_id`). `dataSourceId` de "Commentaires" pour reference
future : `7a80342b-3ce9-416b-91c1-80deb64efb39` (identifiant, pas un secret).

## Regle 3 (capture d'ecran) -- pret des le 18/09/2026

3 jours apres la publication des 5 commentaires du 15/09 (voir `a-publier/README.md` pour
l'heure exacte de chacun). Rien a coder de plus : `mettre-a-jour-stats.js` fonctionne deja
(erreurs propres verifiees sans reseau). `NOTION_COMMENTAIRES_DATA_SOURCE_ID` (ou
`--dataSourceId`) et `NOTION_TOKEN` sont a re-exporter ce jour-la (jamais persistes entre
sessions). Reste a faire ce jour-la : ouvrir chacun des 5 posts sur LinkedIn, capturer les
chiffres reels, les coller dans la conversation pour lecture, lancer le script une fois par
personne visee.

## Blocage APIFY_TOKEN (12-14/09/2026, resolu)

`trouverPosts` ne pouvait recuperer aucun post reel sans `APIFY_TOKEN` dans l'environnement --
le pipeline entier (garde-fous, fraicheur, quota, redaction, validation) etait pret et teste sur
fixture, mais bloque sur donnees reelles. Resolu par export manuel de Nomena dans
l'environnement de la session (jamais une lecture automatisee d'un fichier de secrets).

## Canal de publication -- etat au 12/09/2026 (avant les garde-fous du 14/09)

- **Identite confirmee pour julien-agency** (`urn:li:person:aFqu-W7ClW`) -- voir
  `linkedin-carrousel-historique.md` pour la methode complete de decouverte. `julien-partners`
  reste non confirme.
- `publierCommentaire` (utilise `LINKEDIN_CREATE_COMMENT_ON_POST`, sans equivalent "brouillon" --
  un commentaire est visible des sa creation) n'a ete testee par un appel reel qu'a partir du
  15/09 (voir "Publication reelle" plus haut). Le canal MCP/l'identite avaient ete confirmes
  fonctionnels sur une action voisine (creation de post) avant cette date.
- Canal reellement fonctionnel : MCP via cle consumer, pas le canal REST initial de
  `lib/composio.js` (ecrit avant que ce canal MCP soit decouvert).

Etat des lieux complet des 3 skills linkedin-* : `references/etat-linkedin-20260912.md`.
