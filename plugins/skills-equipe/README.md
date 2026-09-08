# Skills Équipe

Plugin regroupant les meilleures skills partagées de l'équipe.

## Skills incluses

**Toutes à activation manuelle.** Aucune ne se déclenche d'elle-même : chaque `description` porte la mention « activation MANUELLE » et l'interdiction explicite de s'auto-appliquer. Le plugin ne déclare aucun hook — rien ne s'installe dans la session au démarrage. C'est une règle du dépôt : une skill qui s'active sans qu'on l'ait demandée est un bug.

| Skill | Rôle |
|---|---|
| `fonce` | Mode autonome à condition d'arrêt : formule d'abord une condition de fin vérifiable (état mesurable, preuve visible dans la conversation, intangible incluant toute action sortante non demandée, borne en approches épuisées), l'écrit dans un fichier de bord `.fonce.md` hors git, puis exécute de bout en bout sans une seule question — décide seul sans élargir le périmètre, journalise ses hypothèses, exécute la seule preuve annoncée au contrat, ne rend qu'un récap final. Une action sortante que la demande ne nomme pas n'est jamais exécutée : elle va dans « Reste ». Se prolonge entre les tours avec `/goal`. Remplace l'ancien slash command `/fonce` |
| `parallelisation-et-routage` | Routeur de modèle et parallélisation : classe la demande en trois étages (Haiku / Sonnet / Opus) puis délègue à des sous-agents — un seul pour une tâche isolée, un fan-out par vagues pour un gros lot homogène (50 documents, 60 lignes, 12 pages). Posture par défaut : ne pas déléguer, et jamais pour vérifier son propre travail |
| `delegation-deepseek-openrouter` | Économiser les tokens Claude en déléguant les tâches lourdes à DeepSeek V4 via le connecteur OpenRouter MCP — après avoir vérifié qu'un simple abaissement de l'effort ne suffisait pas. Un routeur en trois questions arbitre entre Flash (transformation : résumer, traduire, reformater), Pro (le cas étroit du volume à raisonnement et faible enjeu) et Claude lui-même (sortie courte ou enjeu réel). Pro coûtant 8 à 16× Flash pour un gain d'indice marginal, le routeur le réserve à cette seule bande |
| `phrase-magique` | Disposition de travail exigeante tenue toute la session : limites signalées puis 4 questions de cadrage en un seul appel — avec un premier jet joint quand la tâche s'y prête —, critères de réussite binaires écrits d'avance **et repris un par un à la clôture**, plan sorti en fichier au-delà de trois étapes, arrêt après deux échecs sur le même point, routage ARTEFACT / PROSE / ANALYSE, contradicteur, jamais de « vérifié » sans signal déterministe, périmètre tenu. Calibrée pour Claude Opus 5 ; catalogue des 17 formulations et preuves dans `references/`, chargés à la demande |

## Installation

Via la marketplace d'équipe (recommandé) ou en glissant le fichier `.plugin` dans Claude.

## Contribuer une skill

1. Ajouter un dossier `skills/ma-skill/` contenant un `SKILL.md`
2. Incrémenter `version` dans `.claude-plugin/plugin.json`
3. Pousser sur le dépôt — tous les membres reçoivent la mise à jour
