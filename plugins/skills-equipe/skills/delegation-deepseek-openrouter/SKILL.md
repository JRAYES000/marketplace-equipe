---
name: delegation-deepseek-openrouter
description: >-
  Skill à activation MANUELLE uniquement. Délègue les tâches de génération lourdes (résumés de
  documents longs, traductions, extraction ou reformatage de données, premiers jets
  volumineux) à DeepSeek V4 — Flash par défaut, Pro sur les rares tâches à raisonnement — via
  l'outil send-message du connecteur OpenRouter MCP, pour économiser les tokens Claude. NE PAS
  déclencher automatiquement, même face à une grosse tâche de génération : utiliser UNIQUEMENT
  sur demande explicite — « passe par DeepSeek », « délègue à DeepSeek », « utilise le modèle
  bon marché », « économise mes tokens via OpenRouter », « charge la skill délégation »,
  « /delegation-deepseek » — ou quand l'utilisateur demande d'installer ou configurer le
  connecteur OpenRouter MCP (voir alors references/installation.md). Une fois activée,
  appliquer le routeur pour le reste de la conversation.
---

# Délégation DeepSeek via OpenRouter MCP

## Activation et notification obligatoire

Cette skill ne se déclenche que sur demande explicite de l'utilisateur —
jamais automatiquement. Une fois activée, appliquer le routeur ci-dessous
jusqu'à la fin de la conversation (ou jusqu'à contre-ordre).

**Notification systématique, sans exception** : chaque réponse utilisant
cette skill (chargée ou `send-message` appelé) COMMENCE par une ligne visible :
« 🔁 Skill délégation DeepSeek utilisée — N appel(s) send-message (modèle). »
L'utilisateur doit toujours savoir quand un modèle tiers a produit une
partie du travail, et lequel — jamais de délégation silencieuse. Si la skill
s'est déclenchée sans demande explicite, le signaler et demander confirmation
AVANT tout appel `send-message`.

## Objectif

Réduire la consommation de tokens Claude. Claude reste l'orchestrateur
(comprendre, planifier, relire, intégrer) ; les tâches de génération lourdes
partent vers **DeepSeek V4** via l'outil `send-message` du connecteur
**OpenRouter MCP**.

## Avant de déléguer : baisser l'effort

L'écart de prix annoncé se mesure contre Claude à plein effort. Là où l'interface
l'expose (API, Claude Code), `low` et `medium` tiennent la qualité sur une grande part
du travail courant pour une fraction des tokens — sur une tâche de génération moyenne,
ça suffit souvent et ça évite l'aller-retour, la relecture et le risque de sortie
dégradée. La délégation garde son intérêt sur le **volume** (plusieurs milliers de mots
à produire, un lot répétitif), pas sur une sous-tâche isolée.

## Les deux modèles

| | Flash (défaut) | Pro (exception) |
|---|---|---|
| slug | `deepseek/deepseek-v4-flash-0731` | `deepseek/deepseek-v4-pro-0813` |
| entrée / sortie par million | 0,04 $ / 0,08 $ | 0,58 $ / 1,74 $ chez DeepSeek, jusqu'à 1,32 $ / 3,96 $ ailleurs |
| intelligence / code / agentique | 51,8 / 69,1 / 48,4 | 53,2 / **68,8** / 49,6 |
| raisonnement | à couper | à garder, c'est ce qu'on paie |

Tarifs relevés dans le catalogue OpenRouter le 13/09/2026 ; indices Artificial
Analysis relevés le 23/08/2026, non recontrôlés depuis.
**Pro coûte 14 à 22× Flash, dans le meilleur des cas, pour +1,4 point
d'intelligence et un score de code légèrement inférieur.** Il ne se justifie
donc pas par « la tâche est un peu plus dure » : sur presque tout ce qui est
déléguable, Flash fait aussi bien.

Ne pas confondre avec `deepseek/deepseek-v4-pro` tout court, le snapshot 0423
(45,3 / 59,4 / 37,8) : celui-là est dépassé par Flash sur les trois indices,
ne jamais le choisir. L'alias `~deepseek/deepseek-v4-flash-latest`, affiché
moins cher, pointe aujourd'hui vers le même 0731 mais suivra le prochain
modèle de la famille sans prévenir. `deepseek/deepseek-v4.1-flash`, apparu au
catalogue le 10/09/2026, coûte 0,15 $ / 0,60 $ — presque quatre fois Flash 0731 :
ce n'est pas un remplaçant du défaut, seulement une option si la qualité de 0731
ne suffit pas sur un lot donné.

**Les slugs sont datés et périmeront.** Avant une série d'appels, passer par
`list-models` (attention, ce n'est pas `models-list`) : contrôler que le
modèle est toujours servi et qu'aucun successeur moins cher n'est sorti. Un
identifiant versionné écrit en dur dans une skill est une date de péremption.

## Routeur : Flash, Pro, ou Claude

Poser les trois questions **dans cet ordre**, s'arrêter à la première réponse.

1. **La sortie attendue fait moins de ~500 mots, ou l'enjeu est critique**
   (client final, données personnelles, code non trivial) ?
   → Claude le fait lui-même. Ni Flash ni Pro. C'est le cas le plus fréquent.

2. **La tâche est-elle de la transformation ?** Résumer, traduire, extraire,
   reformater, classer, produire un premier jet répétitif — le raisonnement
   est dans le prompt, pas dans la tâche.
   → **Flash.** Y compris si le volume est énorme : le volume n'est pas de la
   complexité.

3. **Reste le cas étroit : volumineux, à faible enjeu, mais la tâche exige de
   déduire** — croiser plusieurs contraintes, choisir entre des options,
   suivre une chaîne logique sur des dizaines d'entrées, écrire du code
   d'échafaudage jetable.
   → **Pro**, avec le raisonnement actif.

Le piège du routeur : la plupart des tâches « complexes » tombent en 1, pas
en 3. Si une tâche est assez subtile pour mériter Pro, elle est souvent assez
subtile pour mériter Claude. **En cas d'hésitation entre Pro et Claude,
prendre Claude** — relire une sortie Pro fausse coûte plus cher que de l'avoir
écrite soi-même. En cas d'hésitation entre Pro et Flash, essayer Flash
d'abord : un second appel Flash reste moins cher qu'un seul appel Pro.

Une consigne explicite de l'utilisateur (« fais-le toi-même », « passe par
Pro ») prime toujours sur ce routeur.

## Réglages par modèle

### Flash : couper le raisonnement

Passer **`reasoning_effort: "none"`** à chaque appel `send-message`, et
`max_tokens` (2000 suffit pour la plupart des sous-tâches) comme filet de
sécurité — ce plafond couvre réflexion et réponse confondues.

Flash active le raisonnement par défaut à l'effort « high ». Sur une tâche de
reformulation, il produit alors des centaines à des milliers de tokens de
réflexion, facturés au prix de sortie, avant la moindre ligne utile. Mesuré le
31/07/2026 sur un même résumé : **timeout** au réglage par défaut, **1 200
tokens de réflexion et zéro réponse** à l'effort « low », **98 tokens et une
réponse conforme** avec le raisonnement coupé. C'est un levier de coût plus
important que le choix du modèle lui-même.

### Pro : garder le raisonnement, mais le brider

Couper le raisonnement sur Pro n'a aucun sens : c'est la seule chose qu'on y
paie 10× plus cher. Donc `reasoning_effort: "low"` d'abord, `"high"` seulement
si la sortie « low » est visiblement bâclée. Et `max_tokens` généreux mais
fini (6000), sinon la réflexion tourne sans plafond.

Le routage de fournisseur par défaut n'est pas le moins cher sur Pro. Passer
`provider: { order: ["deepseek"] }` : l'endpoint DeepSeek natif est à
0,66 $ / 1,98 $ contre 1,32 $ / 3,96 $ chez la plupart des autres, avec
99,99 % de disponibilité et la mise en cache implicite des entrées. `order`
(et non `only`) garde la bascule automatique si l'endpoint tombe.

## Prérequis

Le connecteur `OpenRouter MCP` doit être actif.

**Nom exact de l'outil : `send-message`.** Dans l'interface des connecteurs il
apparaît sous le libellé « Send a chat message », dans la catégorie « Outils
d'écriture/suppression » (il exige donc une approbation à chaque appel, sauf
si l'utilisateur a choisi « Toujours autoriser »). Attention : la
documentation publique d'OpenRouter mentionne encore un outil `chat-send` —
ce nom n'existe pas sur le serveur MCP. Ne pas chercher `chat-send` pour
tester la disponibilité du connecteur ; chercher `send-message`.

Si le connecteur n'est pas actif, ne pas improviser : guider l'utilisateur
avec `references/installation.md` (installation en 5 min, reconnexion
hebdomadaire car la clé OAuth expire au bout de 7 jours).

**Limite d'environnement** : un connecteur ajouté pendant une session en cours
ne s'y attache pas. Après installation, ouvrir une nouvelle conversation pour
que `send-message` devienne disponible.

## Ce qui ne se délègue jamais

Quel que soit le modèle choisi par le routeur :

- **données personnelles** (CVs, coordonnées de candidats ou de prospects,
  données clients identifiantes) : ne pas les envoyer à un modèle tiers sans
  accord explicite de l'utilisateur — anonymiser ou traiter en local
- contenu final client ou à fort enjeu : le poli final reste chez Claude
- la relecture et l'intégration des résultats délégués

En cas de doute sur le niveau de qualité requis, demander à l'utilisateur.

## Protocole de délégation

1. Découper la demande : isoler les sous-tâches déléguables.
2. Passer chaque sous-tâche au routeur ci-dessus — le résultat peut différer
   d'une sous-tâche à l'autre dans une même demande.
3. Pour chaque sous-tâche déléguée, appeler `send-message` avec :
   - `model` : le slug daté choisi par le routeur
   - `reasoning_effort` et `max_tokens` : voir « Réglages par modèle »
   - **ne pas ajouter le suffixe `:floor`** : il route vers un fournisseur qui
     sert le modèle en quantification fp4, donc dégradé, avec environ 88 % de
     disponibilité sur 24 h contre 99,9 % pour l'endpoint par défaut. Les
     centimes économisés ne valent pas ce risque. Pour baisser le prix de Pro,
     passer par `provider: { order: ["deepseek"] }`, pas par `:floor`.
   - un prompt **autonome** : le modèle délégué ne voit pas la conversation.
     Inclure tout le contexte nécessaire, le texte source complet, et un
     format de sortie précis (« réponds uniquement avec… »).
4. Vérifier dans la réponse de l'outil que le champ `model` correspond bien au
   modèle demandé (OpenRouter peut basculer sur un autre fournisseur).
5. Relire systématiquement le résultat : corriger les erreurs, harmoniser le
   ton, puis intégrer dans la réponse finale. Ne jamais restituer une sortie
   déléguée sans relecture.
6. Afficher la notification obligatoire (voir section « Activation et
   notification obligatoire ») en tête de réponse, avec le nombre d'appels,
   le ou les modèles utilisés, et ce qui a été délégué en une ligne.

## Pourquoi ça marche (et ses limites)

L'économie porte sur la **génération** : Claude relit au lieu de produire.
Gain maximal sur les sorties volumineuses, faible sur les tâches de pure
lecture/analyse — dans ce cas, ne pas déléguer. Chaque `send-message` est
facturé en crédits OpenRouter (suivi sur openrouter.ai/activity).

## Exemple

Demande : « Résume ce rapport de 40 pages et fais-moi une note d'une page. »

1. Claude découpe le rapport en sections.
2. Routeur : résumer une section est de la transformation → **Flash**.
   `send-message` × N vers `deepseek/deepseek-v4-flash-0731`, avec
   `reasoning_effort: none` : « Résume la section suivante en 150 mots max,
   en français, format puces. Texte : … »
3. La note finale d'une page fait moins de 500 mots et sera lue par un
   humain → question 1 du routeur → Claude la rédige lui-même, à partir des
   N résumés qu'il relit.

Coût : quelques centimes OpenRouter + une fraction des tokens qu'aurait
coûté le résumé intégral par Claude.

## Test de validation

Pour vérifier que la chaîne fonctionne, appeler `send-message` avec
`model: deepseek/deepseek-v4-flash-0731`, `reasoning_effort: none` et le
prompt « Réponds uniquement par : DELEGATION-OK ». La réponse doit contenir
`DELEGATION-OK` et indiquer `model: deepseek/deepseek-v4-flash-0731`.

Si la réponse revient **vide** alors que des tokens de sortie ont été
consommés, c'est que le raisonnement n'a pas été coupé : reprendre l'appel
avec `reasoning_effort: none`.

Pour Pro, même test avec `model: deepseek/deepseek-v4-pro-0813`,
`reasoning_effort: low`, `max_tokens: 6000` et
`provider: { order: ["deepseek"] }` : vérifier que le fournisseur indiqué dans
la réponse est bien DeepSeek, sinon le prix payé est le double.
