# Skills Équipe

Plugin regroupant les meilleures skills partagées de l'équipe.

## Skills incluses

| Skill | Rôle |
|---|---|
| `fonce` | Mode autonome à condition d'arrêt : formule d'abord une condition de fin vérifiable (état mesurable, preuve exécutable, borne de tours), puis exécute de bout en bout sans une seule question — décide seul, journalise ses hypothèses, vérifie sur le résultat réel, ne rend qu'un récap final. Se prolonge entre les tours avec `/goal`. Remplace l'ancien slash command `/fonce` |
| `parallelisation-et-routage` | Routeur de modèle et parallélisation : classe la demande en trois étages (Haiku / Sonnet / Opus) puis délègue à des sous-agents — un seul pour une tâche isolée, un fan-out par vagues pour un gros lot homogène (50 documents, 60 lignes, 12 pages) |
| `delegation-deepseek-openrouter` | Économiser les tokens Claude Pro en déléguant les tâches lourdes à DeepSeek V4 Pro via le connecteur OpenRouter MCP |
| `phrase-magique` | Disposition de travail exigeante tenue toute la session : limites signalées puis 4 questions de cadrage en un seul appel — avec un premier jet joint quand la tâche s'y prête —, critères de réussite binaires écrits d'avance **et repris un par un à la clôture**, plan sorti en fichier au-delà de trois étapes, arrêt après deux échecs sur le même point, routage ARTEFACT / PROSE / ANALYSE, contradicteur, jamais de « vérifié » sans signal déterministe, périmètre tenu. Calibrée pour Claude Opus 5 ; catalogue des 17 formulations et preuves dans `references/`, chargés à la demande |

## Installation

Via la marketplace d'équipe (recommandé) ou en glissant le fichier `.plugin` dans Claude.

## Contribuer une skill

1. Ajouter un dossier `skills/ma-skill/` contenant un `SKILL.md`
2. Incrémenter `version` dans `.claude-plugin/plugin.json`
3. Pousser sur le dépôt — tous les membres reçoivent la mise à jour
