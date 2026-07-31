# Catalogue des 17 phrases d'amplification

Sommaire : [Comment s'en servir](#comment-sen-servir) · [Les 17 phrases](#les-17-phrases) · [Sélection rapide](#sélection-rapide) · [Les quatre phrases réfutées](#les-quatre-phrases-réfutées)

Ouvrir ce fichier dans deux cas seulement : l'utilisateur soumet un prompt à améliorer (mode coach de prompt), ou il demande la liste pour la réutiliser ailleurs. Le reste du temps, les règles du `SKILL.md` suffisent.

## Comment s'en servir

**En coach de prompt** : rendre le prompt réécrit prêt à copier-coller, plus une ligne de justification par technique intégrée. Rien de plus.

**En auto-application** : n'appliquer que les phrases pertinentes, jamais toutes mécaniquement. Ne jamais combiner deux phrases 🔴.

Colonne « Preuve » : 🟩 étayé par la mesure · ⬜ plausible, non mesuré · 🟥 réfuté par la mesure — voir [la section dédiée](#les-quatre-phrases-réfutées) avant de l'employer. Colonne « Coût » : 🟢 négligeable · 🟡 modéré · 🔴 élevé.

## Les 17 phrases

| # | Phrase (à adapter) | Quand | Preuve | Coût |
|---|---|---|---|---|
| 1 | « Pose-moi toutes les questions nécessaires à ta bonne compréhension de mes attentes. » | Toute demande complexe ou ambiguë | ⬜ | 🟢 |
| 2 | « Transforme tout notre échange en un prompt / une skill, incluant ma demande initiale et tous mes feedbacks. » | Fin de conversation réussie | ⬜ | 🟢 |
| 3 | « Réfléchis étape par étape, aussi longtemps que nécessaire. » | Modèle **sans** raisonnement intégré uniquement | 🟥 | 🟡 |
| 4 | « Fais-moi 5 propositions distinctes, triées par pertinence. » | Créatif, choix ouvert — jamais sur une tâche à réponse juste | 🟥 | 🔴 |
| 5 | Donner le début (post, liste, modèle) puis « continue ». | Idée amorcée | ⬜ | 🟡 |
| 6 | « Sois mon contradicteur, pas mon assistant. Cherche activement où mon raisonnement est faux. » | Vrai avis, challenge d'idée | ⬜ | 🟢 |
| 7 | « Note ta réponse sur 10. Dis pourquoi ce n'est pas 10, puis corrige-la. » | — | 🟥 | 🔴 |
| 8 | « Sépare ce que tu sais de ce que tu supposes, et donne ton niveau de confiance point par point. » | Sujet où l'erreur coûte cher | ⬜ | 🟢 |
| 9 | « Voici pourquoi je te demande ça : [objectif]. Optimise ta réponse pour cet objectif. » | Tout prompt qui gagne à expliciter l'intention | ⬜ | 🟢 |
| 10 | « Voici 2-3 exemples de ce que je considère comme excellent : [...]. Calque ce niveau et ce format. » | Style ou format précis à reproduire | 🟩 | 🔴 |
| 11 | « Donne-moi ton plan en 3-5 étapes avant de produire. Je valide, puis tu exécutes. » | Tâche longue, multi-étapes, vibe coding | ⬜ | 🟡 |
| 12 | « Tu es [métier] senior. Public : [audience]. Juge ta qualité selon : [2-3 critères]. » | Garder la 2ᵉ moitié, jeter la 1ʳᵉ | 🟥 | 🟢 |
| 13 | « Ne te limite pas au minimum. Couvre autant d'angles pertinents que possible. » | Audit, checklist, inventaire uniquement | ⬜ | 🔴 |
| 14 | « Avant de résoudre, génère 2-3 exemples types du raisonnement attendu, puis applique ce schéma. » | Problème de logique | ⬜ | 🟡 |
| 15 | « Est-ce exhaustif ? » | Après une réponse compilant beaucoup d'infos | ⬜ | 🟢 |
| 16 | « Qu'est-ce que je ne te demande pas et que je devrais te demander ? Liste mes angles morts. » | Prise de hauteur sur la demande | ⬜ | 🟢 |
| 17 | « Avant de répondre, cite les passages exacts pertinents, puis raisonne uniquement à partir d'eux. » | Document fourni — anti-hallucination, vérifiable au Ctrl+F | 🟩 | 🟡 |

## Sélection rapide

| Situation | Phrases |
|---|---|
| Demande ambiguë ou complexe | 1, 9 |
| Tâche longue ou code | 11 |
| Style d'écriture précis | 10 |
| Décision à enjeu (juridique, financier, santé, réglementaire) | 8, 6 |
| Document fourni | 17, puis 15 |
| Créatif, brainstorm | 4 ou 5, 16 |
| Livrable expert à polir | critères binaires écrits d'avance, **pas** la 7 |
| Fin de workflow réussi | 2 |

## Les quatre phrases réfutées

Conservées ici pour mémoire, et parce que savoir *pourquoi* une technique populaire ne marche pas vaut mieux que la voir disparaître sans explication. Chiffres et sources complètes dans [`pourquoi.md`](pourquoi.md).

**7 — « Note ta réponse sur 10, dis pourquoi ce n'est pas 10 ».** Deux défauts. La notation globale n'atteint que 46,4 % d'accord avec le jugement humain, contre 52,2 % pour des critères binaires décomposés. Et un prompt qui présuppose un défaut appartient à la famille des prompts auto-challengeants, qui font basculer massivement des réponses correctes vers l'erreur. **Remplacer par** : des critères binaires écrits avant de produire, cochés après.

**12 — « Tu es [métier] senior ».** Sur six modèles testés, cinq sans amélioration statistiquement significative, et neuf dégradations significatives. La persona déplace le registre de langue, elle n'ajoute aucune connaissance. **Garder** la seconde moitié de la phrase — public visé et critères de jugement — qui est du cadrage, lui bien étayé.

**3 — « Réfléchis étape par étape ».** Sur un modèle à raisonnement intégré : environ +3 points, parfois −3, pour 20 à 80 % de temps en plus. Sur un modèle sans raisonnement, le gain reste réel (jusqu'à +11,7 points) : la phrase garde donc un usage, mais pas avec les modèles Claude récents. **Remplacer par** : rien, ou la 11 si le besoin réel est de voir le plan.

**4 — « Fais-moi 5 propositions distinctes ».** Sur une tâche à réponse juste, générer et agréger N variantes rapporte +0,4 % pour environ vingt fois le coût en tokens. **Garder** uniquement quand la diversité *est* le livrable : naming, angles éditoriaux, pistes créatives — là, les 5 propositions ne servent pas à trouver la bonne réponse mais à donner le choix.

**Une nuance qui compte** : l'auto-critique n'est pas réfutée en soi, seulement en boucle fermée. Branchée sur un signal externe — un test, une page ouverte, une source relue, des critères écrits d'avance — elle redevient efficace. C'est exactement la forme retenue dans le `SKILL.md`.
