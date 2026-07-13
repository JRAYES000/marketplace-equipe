---
name: delegation-deepseek-openrouter
description: >-
  Skill à activation MANUELLE uniquement. Délègue les tâches de génération
  lourdes (résumés de documents longs, traductions, extraction ou reformatage
  de données, premiers jets volumineux) à DeepSeek V4 Pro via l'outil
  chat-send du connecteur OpenRouter MCP, pour économiser les tokens Claude
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
cette skill (chargée ou `chat-send` appelé) COMMENCE par une ligne visible :
« 🔁 Skill délégation DeepSeek utilisée — N appel(s) chat-send. »
L'utilisateur doit toujours savoir quand un modèle tiers a produit une
partie du travail — jamais de délégation silencieuse. Si la skill s'est
déclenchée sans demande explicite, le signaler et demander confirmation
AVANT tout appel `chat-send`.

## Objectif

Réduire la consommation de tokens Claude Pro. Claude reste l'orchestrateur
(comprendre, planifier, relire, intégrer) ; les tâches de génération lourdes
partent vers **DeepSeek V4 Pro** (`deepseek/deepseek-v4-pro`, ~0,435 $/M tokens
d'entrée, ~0,87 $/M sortie — 10 à 25× moins cher que les modèles Claude haut
de gamme) via l'outil `chat-send` du connecteur **OpenRouter MCP**.

## Prérequis

Le connecteur `OpenRouter MCP` doit être actif (outil `chat-send` visible).
S'il ne l'est pas, ne pas improviser : guider l'utilisateur avec
`references/installation.md` (installation en 5 min, reconnexion hebdomadaire
car la clé OAuth expire au bout de 7 jours).

## Matrice de routage

**Déléguer à DeepSeek V4 Pro** (via `chat-send`) :

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

En cas de doute sur le niveau de qualité requis, demander à l'utilisateur.
Une consigne explicite de l'utilisateur (« fais-le toi-même » / « passe par
DeepSeek ») prime toujours sur cette matrice.

## Protocole de délégation

1. Découper la demande : isoler les sous-tâches déléguables.
2. Pour chaque sous-tâche, appeler `chat-send` avec :
   - `model` : `deepseek/deepseek-v4-pro` (variantes : `:floor` pour le prix
     minimum, `:free` si une version gratuite existe et que la tâche le permet)
   - un prompt **autonome** : le modèle délégué ne voit pas la conversation.
     Inclure tout le contexte nécessaire, le texte source complet, et un
     format de sortie précis (« réponds uniquement avec… »).
3. Relire systématiquement le résultat : corriger les erreurs, harmoniser le
   ton, puis intégrer dans la réponse finale. Ne jamais restituer une sortie
   déléguée sans relecture.
4. Afficher la notification obligatoire (voir section « Activation et
   notification obligatoire ») en tête de réponse, avec le nombre d'appels
   et ce qui a été délégué en une ligne.

## Pourquoi ça marche (et ses limites)

L'économie porte sur la **génération** : Claude relit au lieu de produire.
Gain maximal sur les sorties volumineuses, faible sur les tâches de pure
lecture/analyse — dans ce cas, ne pas déléguer. Chaque `chat-send` est
facturé en crédits OpenRouter (suivi sur openrouter.ai/activity).

## Exemple

Demande : « Résume ce rapport de 40 pages et fais-moi une note d'une page. »

1. Claude découpe le rapport en sections.
2. `chat-send` × N vers `deepseek/deepseek-v4-pro` : « Résume la section
   suivante en 150 mots max, en français, format puces. Texte : … »
3. Claude relit les N résumés, rédige lui-même la note finale d'une page.

Coût : quelques centimes OpenRouter + une fraction des tokens Pro qu'aurait
coûté le résumé intégral par Claude.
