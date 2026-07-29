# Skills Équipe

Plugin regroupant les meilleures skills partagées de l'équipe.

## Skills incluses

| Skill | Rôle |
|---|---|
| `fonce` | Mode autonome à condition d'arrêt : formule d'abord une condition de fin vérifiable (état mesurable, preuve exécutable, borne de tours), puis exécute de bout en bout sans une seule question — décide seul, journalise ses hypothèses, vérifie sur le résultat réel, ne rend qu'un récap final. Se prolonge entre les tours avec `/goal`. Remplace l'ancien slash command `/fonce` |
| `parallelisation-taches` | Découper un gros lot homogène (50 documents, 60 lignes, 12 pages) et le confier à plusieurs sous-agents en parallèle |
| `delegation-deepseek-openrouter` | Économiser les tokens Claude Pro en déléguant les tâches lourdes à DeepSeek V4 Pro via le connecteur OpenRouter MCP |
| `phrase-magique` | Disposition de travail exigeante tenue toute la session : cadrage et critères de succès avant production, routage ARTEFACT / PROSE / ANALYSE, contradicteur, auto-critique contre les critères écrits, garde-fous de sobriété tokens, catalogue des 17 phrases d'amplification |

## Installation

Via la marketplace d'équipe (recommandé) ou en glissant le fichier `.plugin` dans Claude.

## Contribuer une skill

1. Ajouter un dossier `skills/ma-skill/` contenant un `SKILL.md`
2. Incrémenter `version` dans `.claude-plugin/plugin.json`
3. Pousser sur le dépôt — tous les membres reçoivent la mise à jour
