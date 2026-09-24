# Skills Équipe

Plugin regroupant les meilleures skills partagées de l'équipe.

## Skills incluses

**Toutes à activation manuelle.** Aucune ne se déclenche d'elle-même : chaque `description` porte la mention « activation MANUELLE » et l'interdiction explicite de s'auto-appliquer. Le plugin ne déclare aucun hook — rien ne s'installe dans la session au démarrage. C'est une règle du dépôt : une skill qui s'active sans qu'on l'ait demandée est un bug.

| Skill | Rôle |
|---|---|
| `fonce` | Mode autonome à condition d'arrêt : formule d'abord une condition de fin vérifiable (état mesurable, preuve visible dans la conversation, intangible incluant toute action sortante non demandée, borne en approches épuisées), l'écrit dans un fichier de bord `.fonce.md` hors git, puis exécute de bout en bout sans une seule question — décide seul sans élargir le périmètre, journalise ses hypothèses, exécute la seule preuve annoncée au contrat, ne rend qu'un récap final. Une action sortante que la demande ne nomme pas n'est jamais exécutée : elle va dans « Reste ». Se prolonge entre les tours avec `/goal`. Remplace l'ancien slash command `/fonce` |
| `parallelisation-et-routage` | Routeur de modèle et parallélisation : classe la demande en trois étages (Haiku / Sonnet / Opus) puis délègue à des sous-agents — un seul pour une tâche isolée, un fan-out par vagues pour un gros lot homogène (50 documents, 60 lignes, 12 pages). Posture par défaut : ne pas déléguer, et jamais pour vérifier son propre travail |
| `delegation-deepseek-openrouter` | Économiser les tokens Claude en déléguant les tâches lourdes à DeepSeek V4 via le connecteur OpenRouter MCP — après avoir vérifié qu'un simple abaissement de l'effort ne suffisait pas. Un routeur en trois questions arbitre entre Flash (transformation : résumer, traduire, reformater), Pro (le cas étroit du volume à raisonnement et faible enjeu) et Claude lui-même (sortie courte ou enjeu réel). Pro coûtant 8 à 16× Flash pour un gain d'indice marginal, le routeur le réserve à cette seule bande |
| `phrase-magique` | Disposition de travail exigeante tenue toute la session : limites signalées puis 4 questions de cadrage en un seul appel — avec un premier jet joint quand la tâche s'y prête —, critères de réussite binaires écrits d'avance **et repris un par un à la clôture**, plan sorti en fichier au-delà de trois étapes, arrêt après deux échecs sur le même point, routage ARTEFACT / PROSE / ANALYSE, contradicteur, jamais de « vérifié » sans signal déterministe, périmètre tenu. Calibrée pour Claude Opus 5.5 ; catalogue des 17 formulations et preuves dans `references/`, chargés à la demande |
| `linkedin-mise-en-forme` | Les règles de forme d'un post LinkedIn, sur les deux comptes : accroche en question, au moins huit passages en gras sans accent, trois sections à titre en gras, 3 à 6 emojis en tête de ligne, phrases de 20 mots, corps de 1 300 à 1 900 caractères. Un script mesure douze critères avant le dépôt (dont une banque de formulations interdites et une détection des deux polices « gras » Unicode réellement en usage) et fabrique le gras Unicode. Se pose par-dessus `contenu-linkedin` |
| `linkedin-carrousel` | « Fais-moi un carrousel » : compose un carrousel LinkedIn (PDF de 8 à 12 pages, 10 par défaut) pour Claude Agency ou Claude Partners à partir d'un sujet, avec ses propres garde-fous — nombre et longueur des diapos, règles d'écriture du texte du post (longueur, gras, emojis, accroche, chiffres sourcés) — qui refusent tout contenu hors des règles plutôt que de le signaler seulement. `node etat.js` donne un point de situation avant de commencer |
| `linkedin-commentaires` | « Les commentaires du jour » : trouve les posts récents (moins de 4h) sous des comptes cibles et rédige un commentaire dans l'un de quatre genres (info chiffrée, désaccord argumenté, histoire vécue, vraie question) pour Claude Agency ou Claude Partners. Garde-fous qui refusent un brouillon hors forme (2 à 4 phrases, sans puce/emoji/lien), un commentaire vide type « super post », ou un quota du jour dépassé (5 max, jamais deux fois la même personne). `node etat.js` donne le point de situation |
| `linkedin-veille-virale` | « Fais la veille du jour » : surveille des comptes LinkedIn suivis, repère le post le plus engageant (score reproductible : réactions + commentaires×3 + partages×5, rapporté aux abonnés) et rédige un post recyclé/inspiré (jamais traduit mot à mot) pour Claude Agency ou Claude Partners. Garde-fou qui refuse de publier plus de 3 fois par semaine ou deux fois le même jour, et n'abaisse jamais le seuil de score pour remplir le quota. `node etat.js` donne le point de situation |
| `analyse-reseau-client` | « Analyse le compte Instagram du client X », « fais l'onglet YouTube de Y » : relève les chiffres du compte publication par publication, repère ce qui marche et ce qui ne marche pas, compare à des comptes du même métier, conseille des outils avec leur prix du jour, et écrit l'onglet que le client lit dans son espace — rien d'interne dedans. `scripts/verifier-onglet.mjs` contrôle l'onglet avant le push (structure, tableaux, mots interdits, 5 onglets maximum), `scripts/inserer-note-equipe.mjs` laisse une note datée dans le `CLAUDE.md` du client. Instagram et YouTube pour l'instant. 15 tests (`npm test`) |

## Installation

Via la marketplace d'équipe (recommandé) ou en glissant le fichier `.plugin` dans Claude.

## Contribuer une skill

1. Ajouter un dossier `skills/ma-skill/` contenant un `SKILL.md`
2. Incrémenter `version` dans `.claude-plugin/plugin.json`
3. Pousser sur le dépôt — tous les membres reçoivent la mise à jour
