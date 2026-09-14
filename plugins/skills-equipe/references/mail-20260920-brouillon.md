# Brouillon du mail du 20/09/2026

Rédigé le 15/09/2026, 5 jours avant l'échéance. Ce fichier n'est pas le mail lui-même — c'est le
texte prêt à copier-coller dans le client mail, avec les emplacements explicitement marqués
`[A COMPLETER]` pour ce qui dépend encore de Julien ou de Nomena (partage des pages Notion) et
des GO de publication. Tout le reste ci-dessous est déjà rédigé, pas un placeholder.

Format volontairement "mail", pas "rapport" : liens cliquables, pas de renvoi au dépôt pour
comprendre une phrase, pas de pièce jointe.

---

**Objet : Trois skills LinkedIn — carrousel, commentaires, veille (bilan et livrables)**

Bonjour,

Voici le point sur le chantier des trois skills LinkedIn (carrousel, commentaires, veille
virale), avec les liens vers tout ce qui est prêt.

## Carrousel — republication en cours

Le premier carrousel publié le 14/09 contenait un vrai défaut : le texte (diapos et post) était
en ligne sans accents — environ 68 mots sur 484 concernés (près d'un mot sur sept), dont 9
directement dans les titres, en gros caractères. Visible au premier coup d'œil, pas un détail.
**Décision prise : republier proprement plutôt que laisser en l'état.**

Le contenu est corrigé et le PDF déjà régénéré via le pipeline réel (10 diapos, vérifiées une
par une : accents corrects, mise en page intacte). Reste la publication effective et le retrait
des deux anciens posts (celui du 14/09 à accents fautifs, et celui du 12/09 — 5 diapos, jamais
conforme au brief — qui n'ont pas leur place sur le profil).

`[A COMPLETER]` **Lien du nouveau carrousel** — publication en attente d'un canal technique
(voir note ci-dessous).

## Commentaires — cinq relus et validés, GO donné

Cinq commentaires réels sont rédigés, validés par le code, et **relus et validés par moi** :
[voir le détail des cinq
commentaires](https://github.com/JRAYES000/marketplace-equipe/blob/main/plugins/skills-equipe/skills/linkedin-commentaires/a-publier/README.md)
(texte intégral, compte, post ciblé, genre, pour chacun).

**Déviation assumée sur la fraîcheur** : le brief demande de commenter des posts de moins de
4h. Sur les 16 comptes validés, un seul passage réel a trouvé 2 posts frais (0.9h et 1.2h) ;
les 3 autres commentaires s'appuient sur les posts les plus récents disponibles, hors fenêtre
(71.4h, 72.2h, 74.5h), faute de matière plus fraîche au moment du passage. Pas caché : 2 sur 5
respectent la règle des 4h, 3 sur 5 non.

**Déviation assumée sur les genres** : le brief prévoit quatre genres de commentaire, dont
"histoire vécue". Un premier brouillon dans ce genre inventait une expérience professionnelle
qui n'a jamais eu lieu — repéré avant publication, corrigé en réécrivant les commentaires
concernés dans un genre qui ne demande aucune expérience personnelle. Répartition finale sur
les cinq : deux questions réelles, une information chiffrée, deux désaccords argumentés sur le
fond — trois genres sur quatre ; "histoire vécue" reste en réserve pour le jour où une anecdote
réelle sera disponible, plutôt que d'en forcer une.

**Une correction faite en relecture** : un chiffre cité (adoption de l'IA chez les
développeurs) déformait sa source — la formulation initiale laissait entendre un usage
quotidien alors que le chiffre mesurait l'adoption/l'intention d'usage. Remplacé par le chiffre
de la même étude qui mesure réellement l'usage quotidien, pour que le commentaire dise
exactement ce que la source dit.

`[A COMPLETER]` **Lien(s) des commentaires réellement publiés sur LinkedIn** — GO donné,
publication en attente d'un canal technique (voir note ci-dessous).

## Veille — trois posts adaptés, prêts à publier

Le pipeline de veille tourne réellement : 35 posts récupérés sur les 10 comptes suivis, 15
retenus par le score d'engagement. Trois ont été adaptés en post prêt à publier — un par
compte concerné, choisis parmi les meilleurs scores : [voir le détail des trois posts
adaptés](https://github.com/JRAYES000/marketplace-equipe/blob/main/plugins/skills-equipe/skills/linkedin-veille-virale/a-publier/README.md)
(texte intégral, post source noté pour chacun, chiffre français vérifié).

Adaptés, pas traduits : structure et angle du post source conservés, exemples et chiffres
remplacés par des références françaises vérifiées (Insee, Bpi France Le Lab/Rexecode,
Stratégies — pages ouvertes et lues, pas de chiffre de mémoire).

`[A COMPLETER]` **Lien(s) des posts réellement publiés sur LinkedIn** — en attente du GO. Règle
à respecter au moment de publier : trois maximum, jamais deux le même jour.

## Canal de publication — en cours de rétablissement

Le carrousel corrigé et les cinq commentaires validés n'ont pas encore été publiés
techniquement : l'accès qui permet de publier réellement sur LinkedIn (côté Composio) n'est
plus actif dans la session de travail actuelle. Nomena doit reconnecter l'accès (même méthode
que le 14/09) avant que ces publications puissent se faire. Rien d'autre ne bloque — le contenu
est prêt des deux côtés.

## Notion — bloqué sur le partage de la page parente

Le code des deux pages Notion ("Veille & posts" et suivi des commentaires) est prêt et testé,
mais aucune des deux n'a pu être créée : il manque une page Notion partagée avec l'intégration
(le jeton fonctionne, mais aucune page ordinaire ne lui est accessible).

`[A COMPLETER]` **Lien de la page Notion "Veille & posts"** — en attente que Nomena partage la
page parente et fournisse son ID.
`[A COMPLETER]` **Lien de la page Notion de suivi des commentaires** — même blocage.

## Dépense

Estimation traçable depuis le code et les comptes de posts réellement récupérés (pas un relevé
de facturation, à confirmer sur la console Apify) : 59 posts facturés au plus sur l'ensemble du
chantier à ce jour, soit environ **0,12 $** — très largement sous le plafond de 50 € fixé au
départ.

## Comment relancer chaque skill

Trois phrases suffisent, dans Claude Code :
- **« fais-moi un carrousel »** pour composer un nouveau carrousel.
- **« les commentaires du jour »** pour trouver et rédiger de nouveaux commentaires.
- **« fais la veille du jour »** pour surveiller les comptes suivis et proposer un nouveau post.

## Arbitrage

Aucune des trois skills n'a été sacrifiée : les trois ont un livrable réel à ce jour (carrousel
corrigé et prêt à republier, cinq commentaires relus et validés, trois posts de veille adaptés
sur données réelles). Les points encore ouverts ne dépendent plus du travail sur les skills
elles-mêmes, mais de deux accès externes : le canal de publication LinkedIn (Nomena) et le
partage de la page Notion (Nomena également).

N'hésite pas à revenir vers moi si tu veux qu'on creuse un point en particulier.

Bien à toi,
Julien
