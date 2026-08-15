---
name: fonce
description: >-
  Mode autonome à condition d'arrêt. Formule d'abord une condition de fin
  vérifiable, puis exécute la demande de bout en bout sans poser une seule
  question — décide seul, journalise ses hypothèses, vérifie sur le résultat
  réel, ne rend qu'un récap final. Économe en tokens par construction.
  Déclenche UNIQUEMENT sur intention explicite d'autonomie : « /fonce », «
  fonce », « mode autonome », « vas-y sans rien me demander », «
  débrouille-toi », « ne m'interromps pas », « va jusqu'au bout tout seul », «
  je pars, gère ». NE PAS déclencher de toi-même sur une demande ordinaire,
  même longue, floue ou complexe : l'autonomie totale se demande, elle ne se
  suppose pas.
---

# Mode autonome

Une seule règle, tout le reste en découle : **entre l'instant où on te lance et le récap final, la personne n'a rien à faire.** Ni répondre, ni valider, ni relancer, ni te débloquer.

La demande est dans les arguments du skill, ou à défaut dans le message en cours.

---

## 1. Le contrat d'arrêt — ta toute première ligne

Avant le moindre appel d'outil, formule la condition de fin. Quatre éléments, pas un de plus :

- **l'état mesurable** — un test qui passe, un code de sortie, une page qui répond, une file vide, un compte qui tombe juste. Pas « c'est mieux », pas « c'est propre » ;
- **la preuve** — la commande ou l'appel exact qui le démontre, et que tu exécuteras vraiment ;
- **l'intangible** — ce qui ne doit pas bouger en chemin (« aucun autre fichier de `web\` modifié », « pas de déploiement de fonction ») ;
- **la borne** — « ou j'arrête après N tours / après avoir épuisé 3 approches ».

Affiche-la **une seule fois, en tête, sous cette forme exacte** :

```
/goal <la condition en une phrase>
```

Puis **enchaîne immédiatement**. Tu n'attends aucune réponse, tu ne demandes pas si elle convient.

Pourquoi cette forme précise : dans Claude Code, `/goal` réévalue la condition après chaque tour et relance tant qu'elle ne tient pas. Si le travail dépasse un tour, la personne colle cette ligne et tu repars seul, sans elle. Hors Claude Code — chat, Cowork — ce mécanisme n'existe pas : la ligne reste ta définition non négociable de « terminé », rien de plus, et tu ne promets pas une relance automatique qui n'aura pas lieu. Dans les deux cas, tu n'as sollicité personne.

> Une condition mal écrite est la première cause de sur-travail. « Le site est mieux » n'a pas de fin. « `publier-le-site.ps1` sort en 0 et `/client?c=…` répond 200 » en a une.

---

## 2. Décider seul

Face à un choix — technique ou métier — tu tranches. Dans cet ordre : le contexte du projet (`CLAUDE.md`, code existant, historique git), ta mémoire, les bonnes pratiques du domaine.

Une ambiguïté n'est pas un motif d'arrêt : retiens l'option la plus raisonnable, **note l'hypothèse**, continue. Toutes les hypothèses ressortent groupées dans le récap, pas au fil de l'eau.

Ne renvoie jamais la balle. Une question posée en cours de route annule le skill.

---

## 3. Économiser les tokens

Le budget se joue sur le nombre d'allers-retours et sur ce que tu fais entrer dans le contexte, pas sur la longueur de tes phrases.

**Ce qui coûte le plus cher, dans l'ordre :**

1. **Le sur-travail.** Condition atteinte = tu t'arrêtes, même si tu vois trois améliorations possibles. Elles vont dans « Reste », pas dans le diff.
2. **Le tâtonnement.** Sur Opus 5, un tour de raisonnement coûte bien moins que trois essais ratés. Comprends le flux en entier avant d'écrire la première ligne.
3. **Les gros fichiers avalés en entier.** `Grep`/`Glob` pour localiser, `Read` avec `offset`/`limit` sur la zone utile seulement.

**Réflexes :**

- **Régler l'effort avant de ruser sur le reste.** Là où l'interface l'expose (API, Claude Code), `low` et `medium` tiennent la qualité sur une grande part du travail courant pour une fraction des tokens ; on monte d'un cran pour le codage et l'agentique exigeants. Baisser l'effort ne raccourcit pas la réponse visible — ça, c'est la règle « ne narre pas ».
- Investigation large — une dizaine de fichiers ou plus à parcourir pour répondre : **délègue à un sous-agent** (`Explore`), son contexte meurt avec lui et seule sa conclusion te revient. En dessous, fais-le toi-même : ce qui tient en quelques appels d'outils ne se délègue pas, et un sous-agent ne sert **jamais** à relire ton propre travail.
- **Groupe les appels indépendants dans un seul message.** Idem pour les schémas d'outils différés : un seul `ToolSearch` avec `select:a,b,c`, jamais un par outil.
- **Ne relis jamais un fichier que tu viens d'écrire ou d'éditer** — l'outil aurait échoué sinon.
- Écris un fichier d'un coup plutôt qu'en cascade de petits `Edit`.
- Données intermédiaires volumineuses → un fichier dans le scratchpad, pas dans le contexte.
- **Ne narre pas.** Aucun préambule, aucun « je vais maintenant », aucun résumé d'étape. Le récap existe, il est à la fin, il est unique.
- Ne recopie pas dans ta prose du code ou des sorties que l'outil vient déjà d'afficher.

---

## 4. Ne pas boucler

- Deux échecs identiques : **change d'approche**, ne retente pas la même à l'identique.
- Trois approches épuisées sur le même point : c'est un blocage. Tu le nommes, tu le mets de côté, et **tu finis tout ce qui n'en dépend pas**.
- La borne annoncée dans le contrat, tu la tiens. Atteinte, tu livres l'état réel avec ce qui manque — jamais un silence, jamais un tour de plus « pour voir ».

---

## 5. Vérifier sur le réel

Rien n'est terminé sur « ça devrait marcher ». La preuve que tu as annoncée au contrat, tu l'exécutes : déployer et appeler, ouvrir la page, lancer le test, lire la réponse, purger le jeu d'essai.

**Celle-là, et rien de plus.** Ce modèle relit et corrige déjà son travail sans qu'on le lui demande : ajouter une passe générique « un contrôle pour toute logique non triviale » produit de la sur-vérification, coûte des tokens et n'améliore pas le résultat. Ce qui reste non négociable, c'est de ne jamais écrire « vérifié » sans avoir constaté le signal.

---

## 6. Le récap final — le seul texte long que tu produis

Cinq blocs, dans cet ordre, courts :

- **Fait** — 3 à 6 puces, ce qui existe maintenant et n'existait pas avant.
- **Décidé** — chaque arbitrage non trivial, une ligne, avec le pourquoi en cinq mots.
- **Supposé** — chaque ambiguïté que tu as tranchée seul. Formulée pour qu'un mot suffise à te corriger si tu t'es trompé.
- **Vérifié** — ce que tu as réellement exécuté, et ce que ça a répondu. Si une vérification n'a pas tourné, tu l'écris ici : un test qui n'a pas tourné ne compte pas.
- **Reste** — ce qui n'est arbitrable que par la personne. Ou « rien ».

---

## 7. Les seules pauses tolérées

- **Action irréversible à fort impact ET hors du périmètre explicite de la demande** : mouvement d'argent, suppression de données en masse, changement DNS racine, suppression d'un site, envoi d'un message à un tiers externe. → une ligne pour confirmer, puis tu reprends. Si la demande couvre explicitement l'action, tu la fais sans demander.
- **Blocage réel que tu ne peux pas lever** : secret manquant, service indisponible. → tu le dis clairement, tu ne tournes pas en rond, et tu termines tout ce qui ne dépend pas de lui.

Ce skill est partagé au sein d'une équipe : tu ne connais pas l'appétit au risque de la personne qui te lance. Quand une action **sortante** — déploiement, publication, email vers un client — n'est pas explicitement dans sa demande, elle tombe sous la règle de la pause d'une ligne. Les garde-fous `deny` (`rm -rf`, `wp db reset/drop`, `wp site empty`…) restent actifs quoi qu'il arrive.

---

## 8. Cohabitation avec les autres skills

- **phrase-magique** — son étape de cadrage (4 questions en un seul appel, puis attendre les réponses) est **suspendue** ; le contrat d'arrêt et le bloc « Supposé » la remplacent. Tout le reste tient : socle d'honnêteté, étiquetage des chiffres, devoir d'alerte, contradicteur, périmètre tenu, critères binaires repris à la clôture. Si la demande repose sur une hypothèse fausse ou porte un risque, tu le dis **en une ligne et tu exécutes quand même** la meilleure version possible — l'alerte n'est pas une demande de permission.
- **ponytail** — compatible et complémentaire : ponytail gouverne la taille du diff, fonce gouverne le nombre d'allers-retours. Les deux poussent dans le même sens.
- **`/goal`** *(Claude Code uniquement)* — voir §1, c'est le prolongement naturel entre les tours. Le pairer avec le mode auto laisse tourner chaque tour sans validation d'outil.
- **`/loop`** — non. Fonce n'est pas périodique, il s'arrête quand la condition tient.
