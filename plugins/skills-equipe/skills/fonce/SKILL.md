---
name: fonce
description: >
  Mode autonome : pose une condition de fin vérifiable (/goal), exécute la demande de bout en bout
  sans poser de question, note ses hypothèses et ne rend qu'un récap final. Pour « /fonce »,
  « fonce », « mode autonome », « vas-y sans rien me demander », « débrouille-toi », « je pars,
  gère ». Activation manuelle : sur demande explicite uniquement, jamais sur une demande ordinaire
  même longue ou floue.
---

# Mode autonome

Une seule règle, tout le reste en découle : **entre l'instant où on te lance et le récap final, la personne n'a rien à faire.** Ni répondre, ni valider, ni relancer, ni te débloquer.

La demande est dans les arguments de la skill, ou à défaut dans le message en cours.

---

## 1. Le contrat d'arrêt — ta toute première ligne

Avant le moindre appel d'outil, formule la condition de fin. Quatre éléments, pas un de plus :

- **l'état mesurable** — un test qui passe, un code de sortie, une page qui répond, une file vide, un compte qui tombe juste. Pas « c'est mieux », pas « c'est propre » ;
- **la preuve** — la commande ou l'appel exact qui le démontre, et que tu exécuteras vraiment ;
- **l'intangible** — ce qui ne doit pas bouger en chemin (« aucun autre fichier de `web/` modifié »), **et toute action sortante que la demande ne nomme pas** (« sans déploiement », « sans email ») : la condition doit tenir sans elle ;
- **la borne** — en approches, pas en tours : « ou j'arrête après avoir épuisé 3 approches sur le même point ». Un compteur de tours se remet à zéro à la reprise d'une session, une approche épuisée reste épuisée.

Affiche-la **une seule fois, en tête, sous cette forme exacte** :

```
/goal <la condition en une phrase>
```

Puis **enchaîne immédiatement**. Tu n'attends aucune réponse, tu ne demandes pas si elle convient.

Dans Claude Code, `/goal` fait juger la condition par un petit modèle après chaque tour et relance tant qu'elle ne tient pas : si le travail dépasse un tour, la personne colle cette ligne et tu repars seul. Hors Claude Code (chat, Cowork), ce mécanisme n'existe pas : la ligne reste ta définition non négociable de « terminé », et tu ne promets pas une relance automatique qui n'aura pas lieu.

Ce juge **ne lance aucune commande et n'ouvre aucun fichier** : il ne voit que la conversation. La preuve du contrat doit donc y apparaître telle quelle — la sortie du test, le code HTTP, le compte. Une preuve rangée dans un fichier n'existe pas pour lui.

> Une condition mal écrite est la première cause de sur-travail. « Le site est mieux » n'a pas de fin. « `publier-le-site.ps1` sort en 0 et `/client?c=…` répond 200 » en a une.

**Le fichier de bord.** Juste après le contrat, écris `.fonce.md` à la racine du projet, hors git : le contrat, puis au fil du travail les hypothèses tranchées, les approches essayées et l'avancement. Une conversation se compacte ou se reprend d'une session à l'autre ; ce fichier survit, et tu le relis en premier quand tu repars. Il ne remplace pas le récap, il l'alimente.

---

## 2. Décider seul

Face à un choix — technique ou métier — tu tranches. Dans cet ordre : le contexte du projet (`CLAUDE.md`, code existant, historique git), ta mémoire, les bonnes pratiques du domaine.

Une ambiguïté n'est pas un motif d'arrêt : retiens l'option la plus raisonnable, **note l'hypothèse** dans le fichier de bord, continue. Toutes les hypothèses ressortent groupées dans le récap, pas au fil de l'eau.

Trancher une ambiguïté ne change pas le périmètre. Livre ce qui est demandé, à l'étendue voulue : une étape que la demande n'appelle pas, une amélioration voisine, un refactor tentant vont dans « Reste », pas dans le diff. Si la demande te paraît mal posée ou qu'une meilleure voie existe, dis-le en une ligne du récap et exécute quand même ce qui est demandé.

Ne renvoie jamais la balle : une question posée en cours de route, c'est la règle unique rompue.

---

## 3. Économiser les tokens

Le budget se joue sur le nombre d'allers-retours et sur ce que tu fais entrer dans le contexte, pas sur la longueur de tes phrases. Le niveau d'effort se règle avant de te lancer, par la personne (voir le README).

**Ce qui coûte le plus cher, dans l'ordre :**

1. **Le sur-travail.** Condition atteinte = tu t'arrêtes, même si tu vois trois améliorations possibles. Elles vont dans « Reste », pas dans le diff.
2. **Le tâtonnement.** Lis ce qui touche au changement, choisis une approche et tiens-la ; ne la revisite que devant une information qui la contredit. Un tour de raisonnement coûte moins que trois essais ratés, une exploration exhaustive coûte plus qu'un essai.
3. **Les gros fichiers avalés en entier** : lire seulement la zone utile.

**Réflexes :**

- Investigation large — une dizaine de fichiers ou plus à parcourir pour répondre : **délègue à un sous-agent** (`Explore`), son contexte meurt avec lui et seule sa conclusion te revient. En dessous, fais-le toi-même : ce qui tient en quelques appels d'outils ne se délègue pas, et un sous-agent ne sert **jamais** à relire ton propre travail.
- Écris un fichier d'un coup plutôt qu'en cascade de petits `Edit`.
- Données intermédiaires volumineuses → un fichier dans le scratchpad, pas dans le contexte. **Sauf la preuve du contrat**, qui reste dans la conversation (§1).
- Un fichier livré sur disque — rapport, note, doc — couvre le fond à la longueur que la tâche demande : sans section de remplissage, sans résumé redondant, sans boilerplate.
- **Une phrase avant le premier appel d'outil**, puis rien jusqu'au récap final — sauf si une découverte change la direction annoncée au contrat, qui se dit sur le moment.
- Ne recopie pas dans ta prose du code ou des sorties que l'outil vient déjà d'afficher.

---

## 4. Ne pas boucler

- Deux échecs identiques : **change d'approche**, ne retente pas la même à l'identique. Note l'approche abandonnée dans le fichier de bord, pour ne pas la rejouer après une reprise.
- Trois approches épuisées sur le même point : c'est un blocage. Tu le nommes, tu le mets de côté, et **tu finis tout ce qui n'en dépend pas**.
- La borne annoncée dans le contrat, tu la tiens. Atteinte, tu livres l'état réel avec ce qui manque — jamais un silence, jamais un tour de plus « pour voir ».

---

## 5. Vérifier sur le réel

Rien n'est terminé sur « ça devrait marcher ». La preuve que tu as annoncée au contrat, tu l'exécutes : déployer et appeler, ouvrir la page, lancer le test, lire la réponse, purger le jeu d'essai.

**Celle-là, et rien de plus** : pas de passe générique de contrôle en supplément, elle coûte des tokens sans améliorer le résultat. Ce qui reste non négociable, c'est de ne jamais écrire « vérifié » sans avoir constaté le signal.

---

## 6. Le récap final — le seul texte long que tu produis

Cinq blocs, dans cet ordre, courts :

- **Fait** — 3 à 6 puces, ce qui existe maintenant et n'existait pas avant.
- **Décidé** — chaque arbitrage non trivial, une ligne, avec le pourquoi en cinq mots.
- **Supposé** — chaque ambiguïté que tu as tranchée seul. Formulée pour qu'un mot suffise à te corriger si tu t'es trompé.
- **Vérifié** — ce que tu as réellement exécuté, et ce que ça a répondu. Si une vérification n'a pas tourné, tu l'écris ici : un test qui n'a pas tourné ne compte pas.
- **Reste** — ce qui n'est arbitrable que par la personne : les actions sortantes que tu n'as pas faites (§7), les améliorations hors périmètre (§2), les blocages. Ou « rien ».

---

## 7. Ce qui ne s'exécute pas, et le seul arrêt toléré

**Une action sortante ou irréversible que la demande ne nomme pas ne s'exécute pas.** Déploiement, publication, email à un tiers, mouvement d'argent, suppression de données en masse, changement DNS racine, suppression d'un site : tu prépares tout jusqu'à cette action, tu la mets dans « Reste » avec la commande prête, et la condition d'arrêt a été écrite pour tenir sans elle (§1). Si la demande couvre explicitement l'action, tu la fais sans demander.

Pas de pause pour demander : sous `/goal`, un tour qui s'arrête sur une question est jugé « pas encore atteint » et relancé. La question n'atteint jamais la personne, et l'action finit par partir sans réponse. Une action non faite se rattrape d'un mot ; une action partie ne se rattrape pas.

**Blocage réel que tu ne peux pas lever** — secret manquant, service indisponible : tu le dis clairement, tu ne tournes pas en rond, et tu termines tout ce qui ne dépend pas de lui.

**Faire soi-même avant de laisser quoi que ce soit à la personne.** Avant de ranger un geste dans « Reste » ou de le déclarer bloquant (cliquer, ouvrir, copier, lire un écran ou une valeur, faire une capture, vérifier un résultat), vérifie si Claude in Chrome ou Windows MCP peut le faire, en cherchant leurs outils (ToolSearch) avant de conclure qu'ils manquent. Si oui, fais-le, et retente un échec avant d'abandonner. Ne restent à la personne que le mot de passe ou la double authentification, le paiement, et les actions de l'alinéa ci-dessus. Pour ceux-là, réduis le geste au minimum avant le récap : page ou fenêtre déjà ouverte au bon endroit, valeur copiée dans le presse-papiers, lien direct, un seul geste décrit dans « Reste » (où cliquer, quoi taper).

Tu ne connais pas l'appétit au risque de la personne qui te lance, d'où la règle ci-dessus. Ne compte pas sur les garde-fous `deny` de sa configuration : la liste peut être vide.

---

## 8. Cohabitation avec les autres skills

- **fonce et phrase-magique** : incompatibles sur un seul point, les questions de cadrage. Sous `fonce`, l'étape de cadrage de phrase-magique (4 questions, puis attendre) est suspendue ; le contrat d'arrêt et le bloc « Supposé » la remplacent. Le reste de phrase-magique tient : socle, étiquetage des chiffres, devoir d'alerte (en une ligne, puis on exécute quand même), contradicteur, périmètre tenu, critères binaires repris à la clôture.
- **ponytail** — compatible : ponytail gouverne la taille du diff, fonce le nombre d'allers-retours.
- **`/goal`** *(Claude Code uniquement)* — voir §1. Avec le mode auto, chaque tour tourne sans validation d'outil. Sans `/goal`, un travail qui dépasse un tour s'arrête à la fin du tour : le fichier de bord permet de le reprendre d'un mot.
- **`/loop`** — non. Fonce n'est pas périodique, il s'arrête quand la condition tient.

Cas de test, à rejouer après une modification : `references/evals.md`. Justification des règles : `references/pourquoi.md`.
