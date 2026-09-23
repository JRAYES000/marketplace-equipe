# Passation -- skills linkedin-commentaires / linkedin-veille-virale

## 22/09/2026 -- reporting Notion muet depuis le 17/09 : PAS UN BUG, diagnostic confirme par preuves brutes

**Question posee par Julien** : la page Notion "LinkedIn -- Veille & Commentaires" ne montre plus
aucune activite depuis le 17/09/2026 -- bug ou absence de declenchement manuel ?

**Diagnostic : absence de declenchement (et de jeton Notion en session), pas un bug de code.**

Preuves reunies dans cet ordre, chacune rejouee avec une sortie brute (pas un resume) :

1. **Notion "Veille & posts"** (lu en direct dans le navigateur, session Nomena authentifiee) :
   3 lignes seulement, la derniere datee du **17/09/2026** ("Croire en soi assez longtemps --
   adapte de Justin Welsh", julien-partners, statut "Programme"). Rien apres.
2. **Notion "Commentaires"** (meme methode) : 7 lignes, la derniere complete datee du
   **16/09/2026** (Emmanuel Brisseau). Une 7e ligne "Theo Meuriot -- 2026-09-16" existe mais est
   **vide** (aucune date, aucun genre, aucun lien -- page creee sans etre remplie). L'en-tete
   Notion affiche "Derniere modification : 17 sept." pour la page.
3. **`git log` depuis le 17/09** sur
   `plugins/skills-equipe/skills/linkedin-commentaires/` et `.../linkedin-veille-virale/` :
   uniquement des commits d'audit/correctifs de code (garde-fous, bugs de detection, rebranchement
   sur linkedin-mise-en-forme) et des publications manuelles via **Buffer** (Bernard Marr 18/09,
   Allie K. Miller et Andrew Ng le 21/09 -- voir `etat-linkedin-20260912.md`, Point n°21 et
   "Post #2/#3 de veille"). **Aucun commit ni mention n'indique un rappel de
   `node creer-page-notion.js` / `dry-run.js` avec ecriture Notion** apres le 17/09 -- les posts
   Buffer de la semaine suivante viennent d'un flux de selection manuelle distinct du pipeline
   `comptes_a_surveiller`/score qui alimente la base Notion, et n'y ecrivent jamais.
4. **Registre local `linkedin-commentaires/data/registre-commentaires.json`** (copie CLI,
   `~/.claude/plugins/marketplaces/marketplace-equipe/...`) : contient des commentaires **reels
   publies jusqu'au 18/09/2026** pour julien-partners (Alexis Combeaux, Theophile Burnet, Victor
   Partouche-Sebban -- correspond au Point n°19 de `etat-linkedin-20260912.md`) -- **jamais
   remontes sur Notion**. C'est la seule vraie divergence trouvee : une activite locale reelle non
   synchronisee, mais explicable (voir point 6) et non generalisable a un bug de synchro
   automatique, puisqu'aucune tentative d'ecriture Notion n'a ete documentee ce jour-la.
5. **Registre local `linkedin-veille-virale/data/registre-veille.json`** : s'arrete au 16/09/2026.
6. **`NOTION_TOKEN`** : absent de l'environnement de la session d'investigation du 22/09 --
   cohorent avec la regle du depot ("Aucun jeton (API) n'est jamais persiste entre sessions",
   `CLAUDE.md` racine) et avec l'activation strictement manuelle des skills (aucun hook, rien ne se
   declenche seul). La session du 18/09 qui a publie les 3 commentaires reels avait vraisemblablement
   les cles Composio (LinkedIn) mais pas `NOTION_TOKEN` exporte -- d'ou l'ecriture locale reussie
   (registre) sans repercussion sur Notion, sans que le code de `lib/notion.js` soit en cause.

**Conclusion explicite : pas de bug.** Personne n'a redeclenche le pipeline qui ecrit sur Notion
(`node creer-page-notion.js` / `dry-run.js` avec `NOTION_TOKEN`) depuis le 17/09/2026. Les
activites reelles des jours suivants (Buffer, carrousels, audits de code, commentaires du 18/09)
ne passent pas par ce pipeline ou n'avaient pas le jeton Notion en session.

**Reliquat identifie, pas corrige ce jour (NOTION_TOKEN absent de cette session)** : les 3
commentaires reels du 18/09 (julien-partners) et la ligne "Theo Meuriot" vide du 16/09 dans
Notion "Commentaires" ne refletent pas la realite. A completer/backfiller des qu'une session
dispose de `NOTION_TOKEN` -- fonctions deja pretes : `ajouterLigneCommentaire`
(`linkedin-commentaires/lib/notion.js`).

**Pour la prochaine session** : ne pas supposer qu'un silence Notion signale un bug -- verifier
d'abord (1) le contenu reel de la page Notion, (2) le `git log` depuis la derniere ligne connue,
(3) les registres locaux, (4) la presence de `NOTION_TOKEN` en session -- dans cet ordre, avec
sortie brute a chaque etape, avant de conclure.

## 22/09/2026 (suite, meme jour) -- backfill Notion fait, NOTION_TOKEN fourni par Julien pour cet usage ponctuel

**Jeton recu dans le message, jamais ecrit dans un fichier du depot** : passe uniquement en
variable d'environnement pour deux scripts ponctuels ecrits dans le scratchpad (hors depot),
supprimes juste apres execution. Conforme a la regle "Ce depot est public : aucune cle dedans" du
`CLAUDE.md` racine.

**Etendue reelle du reliquat, plus large que ce que le diagnostic du matin laissait supposer** :
en recomptant le registre local complet (pas seulement le Point n°19), 9 lignes manquaient dans
Notion "Commentaires", pas 3 -- toutes les entrees `julien-agency` du 16 et 17/09 (Theo Meuriot,
Yohann Nezri, Mehdi Stili, Leonel Adagbe) manquaient aussi, en plus des 3 `julien-partners` du
18/09 et d'une 4e (Victor Partouche-Sebban, 17/09) deja publiee mais jamais remontee non plus.

**Texte des commentaires : aucun n'etait sauvegarde localement** (les fichiers `a-publier/` du
15/09 ne couvrent pas ces dates). Recupere en lisant directement les 9 posts LinkedIn cibles dans
le navigateur (session Nomena authentifiee), texte du commentaire de Julien Rayes copie mot pour
mot depuis la page reelle -- jamais reconstitue de memoire. Genre (`vraie_question` /
`desaccord_argumente`) attribue par inference sur la forme du texte (presence ou non d'une
question finale a l'auteur), coherent avec les lignes deja en base (ex. "Georges Solutions" :
memes ingredients -- reformulation puis question -- deja classee `vraie_question`) -- **pas une
donnee d'origine retrouvee**, a signaler si Julien veut verifier.

**Ecrit reellement dans Notion "Commentaires"** (`dataSourceId`
`7a80342b-3ce9-416b-91c1-80deb64efb39`) :
- 1 page completee (la ligne vide "Theo Meuriot -- 2026-09-16", `Compte`/`Personne visee`/`Lien du
  post`/`Date`/`Texte`/`Genre` ajoutes -- page deja existante retrouvee par filtre `Date is_empty`,
  pas de doublon cree).
- 8 pages creees : Yohann Nezri (16/09), Mehdi Stili (16/09), Leonel Adagbe (16/09), Theo Meuriot
  (17/09), Victor Partouche-Sebban (17/09), Alexis Combeaux (18/09), Theophile Burnet (18/09),
  Victor Partouche-Sebban (18/09).

**Base "Veille & posts"** (`dataSourceId` `6a62dda7-58aa-41fd-9416-eccfaef04d4b`) : la ligne
Justin Welsh (17/09) etait bien bloquee a "Programme" alors que le post est reellement publie et
confirme en ligne depuis le 17/09 (`references/mail-20260918-brouillon.md`, ligne 224-229) --
verifie en rouvrant le permalien reel dans le navigateur avant d'ecrire (post toujours visible,
texte conforme). Mise a jour : `Etat` -> `Publie`, `Lien du post publie` renseigne, `Date de
publication` = 2026-09-17.

**Non fait, hors perimetre demande** : les posts de veille publies via le flux Buffer manuel
(Bernard Marr 18/09, Allie K. Miller et Andrew Ng 21/09 -- voir Point n°21 de
`etat-linkedin-20260912.md`) ne sont dans aucune des deux bases Notion. Ce sont un flux de
selection editoriale distinct du pipeline `comptes_a_surveiller`/score qui alimente "Veille &
posts", pas une reprise de ce pipeline -- ne pas les y ajouter sans decision de Julien/Nomena sur
si ce flux doit desormais y ecrire aussi.

**Verification finale, nouvelle lecture directe (pas la sortie des scripts)** : les deux pages
Notion relues dans le navigateur apres ecriture. "Commentaires" affiche 15 lignes completes (11
julien-agency, 4 julien-partners) -- correspond exactement au bilan du brouillon de mail du 18/09
("15 commentaires reellement en ligne -- 11 sur Claude Agency ... et 4 sur Claude Partners").
"Veille & posts" affiche 3 lignes, toutes `Publie`.

**Pour la prochaine session** : le pipeline reste a activation manuelle -- ce backfill ne relance
rien, il corrige seulement des donnees passees. Prochain declenchement reel (commentaires ou
veille du jour) : sur demande explicite de Julien, comme toujours.

## 22/09/2026 (suite) -- verification du genre des 9 commentaires backfilles : aucune correction necessaire

Julien a demande de reverifier le genre des 9 lignes backfillees plus haut, attribue lors du
backfill par inference sur la forme (texte termine par "?" ou non), pas retrouve dans une donnee
d'origine. Verification demandee sur le fond, pas la forme.

**Methode** : relecture directe de Notion "Commentaires" (les 9 lignes, genre actuel), puis
reouverture reelle des 9 permaliens LinkedIn cibles (nouvel appel navigateur, pas la memoire de la
session precedente) pour juger chaque commentaire dans son contexte complet -- post cible et
reponses eventuelles de l'auteur ou de tiers, pas le texte isole.

**Resultat, genre avant / genre apres (identiques pour les 9 -- aucune correction ecrite dans
Notion)** :

| Commentaire | Date | Genre avant | Genre apres verification |
| --- | --- | --- | --- |
| Alexis Combeaux | 18/09 | vraie_question | vraie_question -- confirme (l'auteur repond directement a la question posee) |
| Theophile Burnet | 18/09 | desaccord_argumente | desaccord_argumente -- confirme (position argumentee, aucune question, "neuf" reprend le compte du post lui-meme -- pas un chiffre externe) |
| Victor Partouche-Sebban (17/09) | 17/09 | vraie_question | vraie_question -- confirme (l'auteur repond directement) |
| Victor Partouche-Sebban (18/09) | 18/09 | vraie_question | vraie_question -- confirme (l'auteur repond directement, "156" reprend le titre du post -- pas un chiffre externe) |
| Theo Meuriot | 16/09 | desaccord_argumente | desaccord_argumente -- confirme (l'auteur repond "Exactement", aucune question posee) |
| Theo Meuriot | 17/09 | vraie_question | vraie_question -- confirme (l'auteur repond directement a la question) |
| Leonel Adagbe | 16/09 | vraie_question | vraie_question -- confirme (un tiers, "Chief IA Officer", repond concretement a la question posee -- preuve la plus forte que la question est lue comme sincere) |
| Mehdi Stili | 16/09 | desaccord_argumente | desaccord_argumente -- confirme (position argumentee, aucune question) |
| Yohann Nezri | 16/09 | vraie_question | vraie_question -- confirme (question concrete et actionnable, sans reponse visible mais sincere sur le fond) |

**Aucun des 9 ne relevait de `information_chiffree`** : verifie explicitement pour Theophile
Burnet ("neuf abonnements", "neuf outils") et les deux Victor Partouche-Sebban ("156 editions",
"156e rendez-vous") -- ces nombres reprennent tous un chiffre deja present dans le post cible
lui-meme, pas une information externe apportee par le commentaire. Le genre le plus a risque du
brief (regle SKILL.md du 18/09) ne s'applique a aucun des 9 -- correctement evite des le backfill.
Aucun ne relevait non plus de `histoire_vecue` (aucune experience personnelle affirmee).

**Conclusion : dossier ferme, aucune ecriture Notion necessaire pour cette verification.** Les 9
genres attribues lors du backfill etaient corrects sur le fond, pas seulement coherents en forme.

**Rien d'autre fait** : pas d'ajout des posts Buffer, pas de relance du pipeline quotidien --
conforme a la demande.

## 23/09/2026 -- posts Buffer ajoutes a Notion "Veille & posts", sur accord explicite du client

Le client (Ecole de Naturopathie & Sophrologie, thread Gmail "Page Veille & Posts") a repondu
"OUI JE VEUX BIEN, MERCI" (23/09/2026, 12h20) a la proposition faite par Nomena le meme jour
(08h06) d'integrer au reporting Notion les posts de veille publies via Buffer, restes hors du
pipeline `comptes_a_surveiller`/score qui alimente "Veille & posts".

**Verification de la liste, pas seulement reprise de la memoire de session precedente** :
1. Relecture de Buffer (`publish.buffer.com`, onglet Sent, canal Julien Rayes / Claude Agency) :
   83 posts envoyes au total, parcourus jusqu'au 15/09 en remontant depuis aujourd'hui -- aucun
   post de veille recyclee (contenu repris d'un tiers) trouve en dehors des trois deja identifies
   dans ce fichier (Bernard Marr 18/09, Allie K. Miller et Andrew Ng 21/09). Rien de nouveau entre
   le 21/09 et aujourd'hui.
2. Lecture directe de la base Notion "Veille & posts" avant ecriture : 3 lignes existantes
   (Codie A. Sanchez 15/09, Jason Feifer 16/09, Justin Welsh 17/09), aucune des trois ne
   correspond aux posts Buffer -- confirme que rien n'etait deja importe.

**3 lignes ajoutees dans "Veille & posts"** (memes colonnes que les lignes existantes, statut
reel "Publie" avec lien -- pas "Programme") :

| Titre | Auteur | Compte | Date de publication | Lien du post publie |
| --- | --- | --- | --- | --- |
| Vos equipes foncent sur l'IA agentique -- adapte de Bernard Marr | Bernard Marr | julien-agency | 18 septembre 2026 | linkedin.com/feed/update/urn:li:share:7506789066315649024/ |
| Qui a dit qu'il fallait etre ingenieur pour construire un agent IA -- adapte de Allie K. Miller | Allie K. Miller | julien-agency | 21 septembre 2026 | linkedin.com/feed/update/urn:li:share:7507683335079473152/ |
| Qui audite le logiciel qui entoure votre modele d'IA -- adapte de Andrew Ng | Andrew Ng | julien-agency | 21 septembre 2026 | linkedin.com/feed/update/urn:li:share:7507774928880885760/ |

**Champs volontairement laisses "Vide" -- pas invente** : `Abonnes`, `Commentaires`, `Partages`,
`Reactions` et `Lien d'origine` (statistiques et lien du post ORIGINAL de l'auteur source) ne
sont pas renseignes pour ces trois lignes. Contrairement aux lignes du pipeline automatique
(Sanchez/Feifer/Welsh), qui capturent ces donnees au moment de la selection via
`comptes_a_surveiller`/score, le flux Buffer manuel ne les a jamais captees -- aucune trace dans
`data/registre-veille.json` (qui s'arrete au 16/09) ni dans les brouillons locaux. Aucune de ces
valeurs n'a ete recherchee a posteriori ni estimee : conforme a la regle du depot "aucun chiffre
sans source reellement ouverte et lue". A signaler a Julien/Nomena si ces stats doivent
malgre tout etre retrouvees (ouverture des posts originaux des trois auteurs).

**Verification finale, nouvelle lecture directe (pas la sortie de l'edition)** : la base "Veille &
posts" relue apres ecriture affiche 6 lignes, toutes correctes (3 anciennes inchangees + les 3
nouvelles ci-dessus, dates et comptes conformes).

**Pour la prochaine session** : le flux Buffer manuel reste distinct du pipeline automatique --
cette integration est un rattrapage ponctuel, pas un branchement permanent. Si Buffer publie de
nouveaux posts de veille recyclee, ils n'apparaitront pas automatiquement dans Notion.
