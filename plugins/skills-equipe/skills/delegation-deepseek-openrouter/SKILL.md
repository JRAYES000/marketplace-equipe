---
name: delegation-deepseek-openrouter
description: >-
  Économise les tokens de l'abonnement Claude Pro en déléguant les tâches de
  génération lourdes (résumés de documents longs, traductions, extraction ou
  reformatage de données, premiers jets volumineux, génération de masse) à
  DeepSeek V4 Pro via l'outil chat-send du connecteur OpenRouter MCP, pendant
  que Claude garde la planification, le raisonnement et l'intégration finale.
  Utilise cette skill dès que l'utilisateur demande — explicitement ou
  implicitement — d'économiser ses tokens, de déléguer à un modèle bon marché,
  de « passer par DeepSeek », d'utiliser chat-send ou OpenRouter, OU dès qu'une
  tâche implique une grosse génération déléguable (plus de ~500 mots de sortie sans
  enjeu critique) et que le connecteur OpenRouter MCP est disponible. Trigger
  aussi quand l'utilisateur veut installer ou configurer le connecteur
  OpenRouter MCP dans Claude Desktop (« installe le MCP OpenRouter », « comment
  économiser mes tokens Claude Pro ») — voir alors references/installation.md.
---

# Délégation DeepSeek via OpenRouter MCP

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
4. Mentionner brièvement à l'utilisateur ce qui a été délégué (transparence),
   sans détailler chaque appel.

## Pourquoi ça marche (et ses limites)

L'économie porte sur la **génération** : Claude ne produit pas lui-même les
milliers de tokens de sortie, il les relit (l'entrée pèse moins lourd dans les
limites Pro que la génération). Le gain est donc maximal sur les tâches à
sortie volumineuse, et faible sur les tâches surtout « lecture/analyse » —
dans ce dernier cas, ne pas déléguer. Chaque `chat-send` est facturé sur les
crédits OpenRouter de l'utilisateur (suivi sur openrouter.ai/activity).

## Exemple

Demande : « Résume ce rapport de 40 pages et fais-moi une note d'une page. »

1. Claude découpe le rapport en sections.
2. `chat-send` × N vers `deepseek/deepseek-v4-pro` : « Résume la section
   suivante en 150 mots max, en français, format puces. Texte : … »
3. Claude relit les N résumés, rédige lui-même la note finale d'une page.

Coût : quelques centimes OpenRouter + une fraction des tokens Pro qu'aurait
coûté le résumé intégral par Claude.
