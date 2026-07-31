---
name: delegation-deepseek-openrouter
description: >-
  Skill à activation MANUELLE uniquement. Délègue les tâches de génération
  lourdes (résumés de documents longs, traductions, extraction ou reformatage
  de données, premiers jets volumineux) à DeepSeek V4 Flash via l'outil
  send-message du connecteur OpenRouter MCP, pour économiser les tokens Claude
  Pro. NE PAS déclencher automatiquement, même face à une grosse tâche de
  génération : utiliser UNIQUEMENT quand l'utilisateur le demande
  explicitement — par exemple « passe par DeepSeek », « délègue à DeepSeek »,
  « utilise le modèle bon marché », « économise mes tokens via OpenRouter »,
  « charge la skill délégation », « /delegation-deepseek », ou quand il
  demande d'installer ou configurer le connecteur OpenRouter MCP (« installe
  le MCP OpenRouter ») — voir alors references/installation.md. Une fois
  activée sur demande, appliquer la matrice de routage pour le reste de la
  conversation.
---

# Délégation DeepSeek via OpenRouter MCP

## Activation et notification obligatoire

Cette skill ne se déclenche que sur demande explicite de l'utilisateur —
jamais automatiquement. Une fois activée, appliquer la matrice de routage
ci-dessous jusqu'à la fin de la conversation (ou jusqu'à contre-ordre).

**Notification systématique, sans exception** : chaque réponse utilisant
cette skill (chargée ou `send-message` appelé) COMMENCE par une ligne visible :
« 🔁 Skill délégation DeepSeek utilisée — N appel(s) send-message. »
L'utilisateur doit toujours savoir quand un modèle tiers a produit une
partie du travail — jamais de délégation silencieuse. Si la skill s'est
déclenchée sans demande explicite, le signaler et demander confirmation
AVANT tout appel `send-message`.

## Objectif

Réduire la consommation de tokens Claude Pro. Claude reste l'orchestrateur
(comprendre, planifier, relire, intégrer) ; les tâches de génération lourdes
partent vers **DeepSeek V4 Flash** (`deepseek/deepseek-v4-flash-0731`,
0,14 $/M tokens d'entrée, 0,28 $/M en sortie — environ 35× moins cher en
entrée et 90× en sortie que Claude Opus) via l'outil `send-message` du
connecteur **OpenRouter MCP**.

Flash a remplacé V4 Pro le 31/07/2026 : il est **3,1× moins cher** et le
dépasse sur les trois indices Artificial Analysis (intelligence 49,9 contre
44,3 ; code 69,1 contre 59,4 ; agentique 45,7 contre 36,4). Ne pas revenir à
`deepseek-v4-pro` : il coûte plus cher pour un résultat moins bon.

## Réglage obligatoire : couper le raisonnement

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

## Matrice de routage

**Déléguer à DeepSeek V4 Flash** (via `send-message`) :

- résumés de documents longs (par section si le document est volumineux)
- traductions
- extraction, classification ou reformatage de données
- premiers jets de textes volumineux ou répétitifs
- toute génération > ~500 mots sans enjeu de qualité critique

**Garder pour Claude** (ne pas déléguer) :

- planification, analyse, raisonnement complexe, arbitrages
- relecture et intégration des résultats délégués
- contenu final client ou à fort enjeu (le poli final reste chez Claude)
- code non trivial
- tâches courtes : si la sortie attendue fait < 500 mots, la délégation coûte
  plus en aller-retour qu'elle n'économise — faire directement
- **données personnelles** (CVs, coordonnées de candidats ou de prospects,
  données clients identifiantes) : ne pas les envoyer à un modèle tiers sans
  accord explicite de l'utilisateur — anonymiser ou traiter en local

En cas de doute sur le niveau de qualité requis, demander à l'utilisateur.
Une consigne explicite de l'utilisateur (« fais-le toi-même » / « passe par
DeepSeek ») prime toujours sur cette matrice.

## Protocole de délégation

1. Découper la demande : isoler les sous-tâches déléguables.
2. Pour chaque sous-tâche, appeler `send-message` avec :
   - `model` : `deepseek/deepseek-v4-flash-0731`
   - `reasoning_effort` : `none` — obligatoire, voir la section ci-dessus
   - `max_tokens` : 2000 (à ajuster si la sortie attendue est plus longue)
   - **ne pas ajouter le suffixe `:floor`** : il route vers un fournisseur qui
     sert le modèle en quantification fp4, donc dégradé, avec environ 88 % de
     disponibilité sur 24 h contre 99,9 % pour l'endpoint par défaut. Les
     0,05 $/M économisés ne valent pas ce risque.
   - un prompt **autonome** : le modèle délégué ne voit pas la conversation.
     Inclure tout le contexte nécessaire, le texte source complet, et un
     format de sortie précis (« réponds uniquement avec… »).
3. Vérifier dans la réponse de l'outil que le champ `model` correspond bien au
   modèle demandé (OpenRouter peut basculer sur un autre fournisseur).
4. Relire systématiquement le résultat : corriger les erreurs, harmoniser le
   ton, puis intégrer dans la réponse finale. Ne jamais restituer une sortie
   déléguée sans relecture.
5. Afficher la notification obligatoire (voir section « Activation et
   notification obligatoire ») en tête de réponse, avec le nombre d'appels
   et ce qui a été délégué en une ligne.

## Pourquoi ça marche (et ses limites)

L'économie porte sur la **génération** : Claude relit au lieu de produire.
Gain maximal sur les sorties volumineuses, faible sur les tâches de pure
lecture/analyse — dans ce cas, ne pas déléguer. Chaque `send-message` est
facturé en crédits OpenRouter (suivi sur openrouter.ai/activity).

## Exemple

Demande : « Résume ce rapport de 40 pages et fais-moi une note d'une page. »

1. Claude découpe le rapport en sections.
2. `send-message` × N vers `deepseek/deepseek-v4-flash-0731`, avec
   `reasoning_effort: none` : « Résume la section suivante en 150 mots max,
   en français, format puces. Texte : … »
3. Claude relit les N résumés, rédige lui-même la note finale d'une page.

Coût : quelques centimes OpenRouter + une fraction des tokens Pro qu'aurait
coûté le résumé intégral par Claude.

## Test de validation

Pour vérifier que la chaîne fonctionne, appeler `send-message` avec
`model: deepseek/deepseek-v4-flash-0731`, `reasoning_effort: none` et le
prompt « Réponds uniquement par : DELEGATION-OK ». La réponse doit contenir
`DELEGATION-OK` et indiquer `model: deepseek/deepseek-v4-flash-0731`.

Si la réponse revient **vide** alors que des tokens de sortie ont été
consommés, c'est que le raisonnement n'a pas été coupé : reprendre l'appel
avec `reasoning_effort: none`.
