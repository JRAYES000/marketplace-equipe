---
name: parallelisation-taches
description: Orchestre l'exécution parallèle de tâches indépendantes en assignant un modèle rapide (Haiku/Sonnet) à des sous-agents workers pendant que l'orchestrateur découpe, dispatche et synthétise. But : accélérer le wall-clock ET réduire le coût sur n'importe quel batch (extraction, classification, scraping, traduction, audit, recherche). À déclencher UNIQUEMENT sur demande explicite — FR : 'parallélise', 'fais en parallèle', 'lance des sous-agents', 'utilise un worker pool', 'dispatch en workers', 'éclate en sous-tâches' ; EN : 'parallelize', 'run in parallel', 'spawn workers', 'dispatch to subagents', 'use a worker pool'. NE PAS déclencher sur une simple tâche batch sans demande explicite. Une fois active, applique les bonnes pratiques (routage des modèles par rôle, fan-out par vagues 'all in a single message', workers isolés, gestion des échecs, pilot sur 3 items, vérification post-dispatch, handoffs à 75%, /schedule) et fournit les templates orchestrateur/worker.
---

# Parallélisation de tâches — Fan-out par vagues vers sous-agents

Cette skill encapsule la méthode pour exécuter en parallèle des batchs de tâches **indépendantes** dans Cowork/Claude Code. Le pattern réel n'est pas un pool « dynamique » (impossible à faire proprement en un seul message) mais un **fan-out par vagues** : l'orchestrateur (toi, le modèle de la session) lance une vague de workers d'un seul coup, attend leurs retours, puis lance la vague suivante jusqu'à épuisement du batch. Chaque worker tourne sur un **modèle plus rapide et moins cher** que l'orchestrateur.

> **Objectif n°1 de cette skill : être utilisable dans N'IMPORTE QUEL contexte.** Les exemples sont là pour illustrer, pas pour restreindre. Dès qu'une charge se découpe en unités indépendantes, le pattern s'applique — peu importe le domaine.

## Quand l'appliquer (et quand NE PAS l'appliquer)

**OUI, parallélise quand :**
- La demande de parallélisation est explicite (cf. triggers du frontmatter).
- La charge se découpe en N unités indépendantes (≥ 3) qui ne se référencent pas entre elles.
- Chaque unité prend > 30 secondes (sinon l'overhead d'init des sous-agents annule le gain).
- Il y a un bénéfice clair en wall-clock time **ou** en coût (workers sur modèle rapide).

**NON, n'applique pas la skill quand :**
- Tâches courtes (< 30s/unité) → l'overhead d'initialisation grignote tout le gain.
- Tâches séquentielles avec dépendances (chaque étape a besoin du résultat de la précédente).
- Tâches simples sans coordination réelle → coût en tokens injustifié.
- La parallélisation n'a pas été explicitement demandée → demande d'abord à l'utilisateur.

## Routage des modèles par rôle (cœur de la skill)

Ne JAMAIS faire tourner les workers sur le modèle de l'orchestrateur. Assigne le modèle le moins cher capable de faire la sous-tâche. Le paramètre `model` de l'outil `Agent` accepte les alias courts : `"haiku"`, `"sonnet"`, `"opus"`, `"fable"`.

| Type de sous-tâche (worker) | Modèle conseillé |
|---|---|
| Extraction, reformatage, scraping, conversion, application d'un format fixe | `haiku` |
| Classification, scoring sur grille, jugement léger, résumé court | `sonnet` |
| Arbitrage complexe, nuance forte, qualification subjective | `sonnet` (monter à `opus` seulement si vraiment nécessaire) |
| Orchestration : découpe, dispatch, synthèse, réconciliation | modèle de la session (souvent `opus`) — pas besoin de le spécifier |

**Type de sous-agent (`subagent_type`) :**
- Workers en **lecture seule** (recherche, extraction, fetch, audit) → `"Explore"` : moins cher, plus rapide, et il ne peut rien écrire ni casser.
- Workers qui doivent **écrire un fichier** (transformer puis sauvegarder) → `"general-purpose"`.

**Règle pratique :** si le worker exécute une procédure claire et retourne un format fixe → `haiku` + `Explore` (ou `general-purpose` s'il écrit). S'il doit interpréter → `sonnet`. L'orchestrateur reste sur le modèle de session.

## Bonnes pratiques

### 1. Fan-out par vagues : « all in a single message »

Pour un vrai parallélisme, **un seul message doit contenir plusieurs tool calls `Agent`** (même bloc). Lancés dans des messages séparés, ils s'exécutent séquentiellement et le gain est nul.

Mais ne lance pas 50 agents d'un coup. Découpe en **vagues de 5 à 10 workers** :
1. Vague 1 : 5-10 `Agent` dans un seul message.
2. Attends tous les retours, agrège.
3. Vague suivante, etc., jusqu'à épuisement du batch.

C'est ce découpage en vagues qui joue le rôle de « pool » : tu ne sursatures ni la concurrence ni ton propre contexte.

Dans le préambule, écris explicitement :
> « Launch all workers of this wave in a single message so they start concurrently. »

### 2. Workers simples : une tâche, un output

Chaque worker reçoit des instructions **minimales et précises** : une seule tâche, un seul format de sortie. Toute la logique (choix, arbitrage, synthèse, décisions de retry) reste chez l'orchestrateur.

- Mauvais : « Analyse cette page, décide si elle est intéressante, et si oui rédige un post dessus. »
- Bon : « Extrais le H1, la meta description et le nombre de mots de cette URL. Retourne un JSON `{h1, meta, word_count}`. »

### 3. Isolation : chemins de sortie uniques, pas de gros retours

- Chaque worker écrit dans un **chemin de sortie unique** (`out_<id>.json`, `out_<id>.md`) → jamais d'écrasement entre workers.
- Pour un gros output, le worker **écrit sur disque et ne retourne que le chemin + le statut**. Ne lui fais jamais recracher des milliers de lignes dans sa réponse : ça sature le contexte de l'orchestrateur.
- Passe explicitement au worker son dossier autorisé en entrée ET en sortie. Il ne touche à rien d'autre.

### 4. Gestion des échecs (ne jamais inventer)

Le worker renvoie toujours un statut. L'orchestrateur agit dessus :
- `SUCCESS` → intègre le résultat.
- `FAILURE` → **1 retry** (même worker, même prompt). Si ça échoue encore, marque l'item comme échoué et continue — ne bloque pas le batch.
- `AMBIGUOUS` → ne devine pas. Soit tu escalades cet item à un modèle supérieur (`sonnet`/`opus`), soit tu le remontes à l'utilisateur. Une donnée manquante ne doit JAMAIS être inventée.

### 5. Valider sur 3 items avant de scaler

Pour tout batch > 10 items, exécute d'abord un **pilot sur 3 items** : lance 3 workers, inspecte (format respecté ? qualité ? pas d'hallucination ?), confirme avec l'utilisateur, PUIS déroule le reste. Une erreur sur 3 items se corrige en 30 s ; la même sur 100 items est un désastre coûteux.

### 6. Vérification post-dispatch (avant de livrer)

Après agrégation, ne livre pas brut. Vérifie :
- **Échantillon** : relis 2-3 outputs workers au hasard → format conforme, pas d'invention.
- **Couverture** : autant d'outputs que d'items en entrée ? (détecte les items silencieusement perdus).
- **Collisions** : aucun fichier de sortie écrasé.
- **Cohérence** : les statuts FAILURE/AMBIGUOUS ont bien été traités (point 4).

C'est ton rôle d'orchestrateur — pas celui des workers.

### 7. Handoffs : gérer le contexte à 75%

Si l'orchestrateur atteint ~75% de sa fenêtre de contexte sur un batch long, il doit :
1. Écrire un fichier de handoff (`handoff_YYYYMMDD_HHMM.md`) avec : objectif global, état actuel (fait / reste), résultats partiels (paths des fichiers produits), prochaines étapes précises (lots restants, paramètres).
2. Demander à l'utilisateur de relancer une conversation fraîche en injectant ce handoff au début.

### 8. Récurrence → `/schedule`

Si la tâche parallèle est récurrente (rapport hebdo, veille, traitement de fichiers entrants), propose de la planifier en tâche récurrente (tâche planifiée Cowork, ou `/schedule` si la skill est disponible).

## Ce qu'il faut éviter (rappels)

- ❌ Faire tourner les workers sur le modèle de l'orchestrateur → coût inutile.
- ❌ Paralléliser des tâches < 30s → overhead > gain.
- ❌ Lancer une vague trop grosse (> ~10) ou les `Agent` calls dans des messages séparés.
- ❌ Donner aux workers accès à tout le système de fichiers → isole entrée/sortie.
- ❌ Mettre de la logique de décision dans le worker → garde-le idiot et déterministe.
- ❌ Inventer une donnée pour un item AMBIGUOUS → escalade ou remonte.
- ❌ Livrer sans vérification post-dispatch.

## Templates prêts à l'emploi

### Template orchestrateur (préambule à ta réponse)

```
PLAN DE PARALLÉLISATION
- Mission : <ce que demande l'utilisateur>
- Découpage : N = <nombre> unités indépendantes
- Vagues : <N / taille_vague> vagues de <5-10> workers
- Modèle worker : haiku (mécanique) | sonnet (jugement)
- subagent_type : Explore (lecture seule) | general-purpose (écrit un fichier)
- Output attendu par worker : <format précis, ex. JSON {field1, field2}>
- Dossier sortie : <path> — un fichier unique par worker (out_<id>.ext)
- Pilot : oui sur 3 items (si batch > 10) / non

Launch all workers of this wave in a single message so they start concurrently.
```

### Template prompt worker (à coller dans `Agent.prompt`)

```
Tu es un worker. Une seule tâche, un seul output.

CONTEXTE MINIMAL :
<3-5 lignes max — le worker n'a pas besoin de plus>

TÂCHE :
<action atomique unique, ex. "Extrais H1, meta description et nombre de mots de l'URL ci-dessous">

ENTRÉE :
<input précis : URL, file path, ID…>

CONTRAINTES :
- N'écris/modifie aucun fichier hors de <dossier autorisé>.
- Si tu produis un gros output, écris-le dans <dossier>/out_<id>.<ext> et retourne seulement son chemin.
- Ne fais aucun arbitrage : si c'est ambigu, retourne AMBIGUOUS sans deviner.
- N'utilise que ces outils : <liste minimale, ex. WebFetch, Read>.

OUTPUT (format strict, et rien d'autre) :
{
  "status": "SUCCESS" | "FAILURE" | "AMBIGUOUS",
  "data": <ton résultat OU le chemin du fichier produit>,
  "error": <null, ou string si FAILURE/AMBIGUOUS>
}
```

### Configuration de l'outil `Agent`

```
Agent({
  description: "<3-5 mots, ex. 'Extract metadata from URL'>",
  subagent_type: "Explore",      // lecture seule ; "general-purpose" si le worker écrit
  model: "haiku",                // CRITIQUE : modèle rapide pour le worker, pas celui de l'orchestrateur
  prompt: "<prompt worker selon template ci-dessus>"
})
```

Dans la même réponse, place tous les `Agent` de la vague dans **un seul bloc** d'appels.

## Exemples (illustratifs — le pattern marche dans tout contexte)

### Exemple générique A — Résumer un lot de documents
« Parallélise le résumé de ces 40 documents en 5 puces chacun. »
N = 40, vagues de 8, worker `haiku` + `Explore`, output `{status, data: out_<id>.md}`. Pilot sur 3. Synthèse : index global des 40 résumés.

### Exemple générique B — Classifier des lignes
« Lance un worker pool pour classer ces 60 tickets par catégorie + urgence. »
N = 60, vagues de 10, worker `sonnet` (jugement) + grille de classification en entrée, output `{status, data:{categorie, urgence}}`. Pilot sur 3. Orchestrateur : CSV trié.

### Exemple métier — Audit SEO multi-pages
« Parallélise un audit on-page sur ces 12 pages et sors les top 3 problèmes communs. »
N = 12, une vague de ~8 puis le reste, worker `haiku` + `Explore` (fetch + extraction title/meta/Hn/word count/canonical/schema → JSON). Pilot sur 3. Synthèse Opus : patterns récurrents, top 3 priorisés.

### Exemple métier — Qualification de candidatures (PDF)
« Worker pool pour qualifier ces 25 candidats : extrais nom/email/tél/diplôme du PDF + score de match. »
N = 25, vagues de 8, worker `sonnet` (scoring) + grille en entrée, output `out_<id>.json`. Pilot sur 3. Orchestrateur : CSV fusionné trié par score.

## Workflow attendu de l'orchestrateur (toi)

1. **Annonce le plan** (template orchestrateur) avant de lancer quoi que ce soit.
2. **Demande validation** si N > 10 ou mission ambiguë.
3. **Pilot** : 3 workers si batch > 10 items, attends le retour de l'utilisateur.
4. **Déroule par vagues** : 5-10 `Agent` par message, modèle worker assigné, paths de sortie uniques.
5. **Gère les échecs** : retry les FAILURE (×1), escalade/remonte les AMBIGUOUS, ne bloque pas le batch.
6. **Agrège et synthétise** (pas de simple copier-coller des sorties brutes).
7. **Vérifie** (point 6) avant de livrer.
8. **Surveille le contexte** : handoff à ~75%.
9. **Propose `/schedule`** si la tâche est récurrente.

## Note sur les modèles

Utilise toujours les **alias courts** du paramètre `model` : `"opus"`, `"sonnet"`, `"haiku"`, `"fable"`. N'écris jamais d'identifiant versionné en dur (ils périment). L'orchestrateur tourne sur le modèle de la session courante — tu ne spécifies `model` que pour les sous-agents.
