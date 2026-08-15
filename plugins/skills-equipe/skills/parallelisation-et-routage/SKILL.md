---
name: parallelisation-et-routage
description: >-
  Routeur modèle × effort et orchestrateur de parallélisation, à activation MANUELLE. Classe
  la demande en trois étages — Haiku (exécution mécanique), Sonnet (travail courant), Opus
  (raisonnement à enjeu) — puis exécute dans des sous-agents lancés au bon étage : un seul
  pour une tâche isolée, un fan-out par vagues pour un lot de N unités indépendantes. Posture
  par défaut : ne pas déléguer, ce modèle sur-délègue déjà. Déclencher UNIQUEMENT sur demande
  explicite — FR : « parallélise », « lance des sous-agents », « worker pool », « éclate en
  sous-tâches », « active le routeur », « quel modèle pour ça », « mode économie de tokens » ;
  EN : « parallelize », « spawn workers », « dispatch to subagents ». NE PAS déclencher de
  toi-même, même face à un gros lot manifestement parallélisable. Arrêt : « mode normal »,
  « arrête le routage ». Ne PAS utiliser pour une question factuelle, une micro-tâche, ou des
  étapes séquentielles dépendantes.
---

# Parallélisation et routage de modèle

Un seul principe : **l'orchestrateur ne fait lui-même que ce qu'aucun étage
inférieur ne peut faire.** Tout le reste part vers des sous-agents lancés sur le
modèle le moins cher capable de le faire.

Deux formes du même geste :

| Forme | Quand | Résultat |
|---|---|---|
| **A · Routage simple** | Une tâche isolée | 1 sous-agent au bon étage |
| **B · Fan-out par vagues** | N ≥ 3 unités indépendantes | vagues de 5-10 workers |

## Avant tout — le plancher, et pourquoi il passe en premier

Router a un coût fixe : classement, rédaction du brief, contrôle du retour. Et ce
modèle délègue **déjà plus volontiers qu'il ne le devrait** : le réglage à corriger
est presque toujours « moins », pas « plus ». Dans tous ces cas, répondre
directement sans rien router :

- Question factuelle, conversation, micro-tâche (moins d'une trentaine de secondes).
- Travail qui tient en quelques appels d'outils : le faire soi-même.
- Unités de moins de 30 s en fan-out : l'overhead d'initialisation annule le gain.
- Étapes séquentielles dépendantes (chacune a besoin du résultat de la précédente).
- **Tâche qui dépend lourdement du contexte de la conversation.** Un sous-agent
  démarre à vide : tout ce qu'il doit savoir doit être réécrit dans son brief. Si
  le briefing pèse plus lourd que la tâche, ne pas déléguer.
- Tâche nécessitant un aller-retour avec l'utilisateur en cours de route.
- **Vérifier son propre travail.** Jamais un sous-agent pour ça : la vérification
  reste dans la boucle principale, et ce modèle la fait déjà seul.

Quand la délégation est justifiée : **si un seul sous-agent suffit, un seul.**
Garder le nombre de lancements bas, et préférer un chantier large et réellement
indépendant à cinq petits.

## Ce que cette skill peut et ne peut pas faire

**Ne peut pas** changer le modèle de la session en cours. Le modèle du fil
principal est fixé au démarrage (Cowork : au lancement de la tâche ; Claude Code :
`/model`) et n'est pas modifiable depuis une skill.

**Peut** exécuter le travail dans des sous-agents lancés explicitement en Haiku
ou en Sonnet. C'est là qu'est l'économie, et elle est immédiate quel que soit le
modèle du fil principal.

## Activation et arrêt

Sur déclencheur explicite uniquement. Confirmer en une ligne, puis router chaque
demande suivante jusqu'à l'arrêt : « mode normal », « arrête le routage ».

---

## Étape 1 — Choisir l'étage

| Étage | Nature | Exemples |
|---|---|---|
| **`haiku`** | Exécution mécanique, zéro jugement | extraction, reformatage, conversion, scraping, résumé factuel, recherche/grep/inventaire, traduction littérale, classification sur critères explicites fournis, application d'un gabarit connu |
| **`sonnet`** | Travail courant, jugement borné *(défaut)* | rédaction courante, code de taille moyenne, correctif ciblé, refactor localisé, audit sur grille fournie, scoring, synthèse de plusieurs sources, automatisation multi-étapes claire |
| **`opus`** | Raisonnement à enjeu | architecture et choix structurant, stratégie, débogage à cause inconnue, livrable long où la cohérence d'ensemble compte, décision à conséquence (juridique, financière, santé, réputation), demande ambiguë à cadrer |

**Trancher en trois secondes :**

1. **Compter les inconnues, pas la longueur.** Trois lignes avec quatre inconnues :
   Opus. Quarante lignes entièrement spécifiées : Haiku.
2. **Test du stagiaire** : « saurais-je écrire la procédure exacte en cinq lignes ? »
   Oui → Haiku. À peu près → Sonnet. Non → Opus.
3. **Coût de l'erreur** : réversible en une minute → descendre d'un cran. Part
   chez un client ou en production → monter d'un cran.

Dans le doute entre deux étages : **prendre le plus bas et vérifier le retour.**
Une escalade coûte moins cher qu'un Opus systématique.

**Deuxième dimension : l'effort.** L'étage n'est que la moitié du réglage. Là où
l'interface l'expose (API, Claude Code), l'effort de réflexion se règle indépendamment
du modèle, et `low`/`medium` tiennent la qualité sur une grande part du travail courant
pour une fraction des tokens. Conséquence pratique : **un Opus à effort bas est souvent
un meilleur choix qu'un Sonnet à effort haut**, à coût comparable. Descendre l'effort
avant de descendre d'étage.

**Type de sous-agent (`subagent_type`) :**

- Lecture seule (recherche, extraction, fetch, audit) → `"Explore"` : moins cher,
  plus rapide, et il ne peut rien casser.
- Doit écrire un fichier → `"general-purpose"`.

L'orchestrateur, lui, reste sur le modèle de la session : découpe, dispatch,
arbitrage, synthèse, réconciliation. On ne spécifie `model` que pour les
sous-agents.

---

## Étape 2 — Choisir la forme

**Forme B (fan-out) si et seulement si :** la charge se découpe en **N ≥ 3**
unités indépendantes qui ne se référencent pas entre elles, **et** chaque unité
prend plus de 30 secondes. Sinon, forme A.

---

## Le brief autonome (règle commune, non négociable)

Le sous-agent ne voit ni la conversation, ni les fichiers déjà lus, ni les
décisions déjà prises. Un brief incomplet produit un travail à refaire et
l'économie s'inverse. Tout brief contient :

1. **Objectif** en une phrase — le résultat attendu, pas une procédure vague.
2. **Entrées** : chemins absolus, URLs, ou contenu collé. Jamais « le fichier dont on parlait ».
3. **Format de sortie** exact.
4. **Critères d'acceptation** : à quoi on reconnaît que c'est réussi.
5. **Interdits** : ce qu'il ne doit pas modifier, inventer ou décider seul.

Garder le worker **idiot et déterministe** : une tâche, un output. Toute la
logique de décision reste chez l'orchestrateur.

- Mauvais : « Analyse cette page, décide si elle est intéressante, et si oui rédige un post. »
- Bon : « Extrais le H1, la meta description et le nombre de mots de cette URL. Retourne `{h1, meta, word_count}`. »

---

## Forme A — Routage simple

```
Agent({
  description: "<3-5 mots>",
  subagent_type: "Explore",   // "general-purpose" s'il écrit un fichier
  model: "haiku",             // ou "sonnet" — jamais le modèle de l'orchestrateur
  prompt: "<brief autonome>"
})
```

**Au retour**, l'orchestrateur contrôle le résultat contre les critères avant de
le rendre. Ne jamais transmettre une sortie de sous-agent sans l'avoir regardée :
c'est le seul point où une économie mal placée devient une erreur livrée.

**Escalade sur échec** : un cran à la fois, jamais deux. Haiku échoue → relancer
en Sonnet **avec le diagnostic de l'échec ajouté au brief**. Relancer le même
modèle sur le même prompt ne produit rien de nouveau. Après deux échecs,
l'orchestrateur reprend la main et le dit.

---

## Forme B — Fan-out par vagues

### 1. « All in a single message »

Pour un vrai parallélisme, **un seul message doit contenir plusieurs appels
`Agent`**. Lancés dans des messages séparés, ils s'exécutent séquentiellement et
le gain est nul. Écrire explicitement dans le préambule :

> « Launch all workers of this wave in a single message so they start concurrently. »

Ne pas lancer 50 agents d'un coup : **vagues de 5 à 10 workers**, agrégation
entre chaque. Ce découpage joue le rôle de pool — il ne sature ni la concurrence
ni le contexte de l'orchestrateur.

### 2. Isolation

- Chemin de sortie **unique** par worker (`out_<id>.json`) → aucun écrasement.
- Gros output : le worker **écrit sur disque et ne retourne que le chemin + le
  statut**. Jamais des milliers de lignes dans sa réponse.
- Passer explicitement le dossier autorisé en entrée ET en sortie. Rien d'autre.

### 3. Statuts et échecs (ne jamais inventer)

- `SUCCESS` → intégrer.
- `FAILURE` → **1 retry**. Si ça échoue encore, marquer l'item échoué et continuer — ne pas bloquer le batch.
- `AMBIGUOUS` → ne pas deviner. Escalader l'item d'un cran, ou le remonter à
  l'utilisateur. Une donnée manquante ne s'invente jamais.

### 4. Pilot sur 3 items

Pour tout batch de plus de 10 items : lancer 3 workers d'abord, inspecter (format
respecté ? qualité ? pas d'invention ?), confirmer avec l'utilisateur, PUIS
dérouler. Une erreur sur 3 items se corrige en 30 s ; la même sur 100 items est
un désastre coûteux.

### 5. Vérification post-dispatch

Après agrégation, ne pas livrer brut :

- **Échantillon** : relire 2-3 outputs au hasard → format conforme, pas d'invention.
- **Couverture** : autant d'outputs que d'items en entrée ? (détecte les items perdus silencieusement).
- **Collisions** : aucun fichier écrasé.
- **Statuts** : les `FAILURE` / `AMBIGUOUS` ont bien été traités.

Ce contrôle est fait par l'orchestrateur sur des sorties **qui ne sont pas les
siennes** : c'est un signal externe, il est légitime. Rien à voir avec le fait de
lancer un sous-agent pour relire son propre travail, qui reste interdit (voir le
plancher).

### 6. Handoff à 75 % de contexte

Si l'orchestrateur atteint ~75 % de sa fenêtre sur un batch long : écrire
`handoff_YYYYMMDD_HHMM.md` (objectif global, fait / reste, chemins des fichiers
produits, prochaines étapes précises), puis demander à l'utilisateur de relancer
une conversation fraîche en l'injectant au début.

### 7. Récurrence

Si la tâche revient (rapport hebdo, veille, traitement de fichiers entrants),
proposer de la planifier en tâche récurrente.

---

## Templates

### Préambule orchestrateur (forme B)

```
PLAN DE PARALLÉLISATION
- Mission : <ce que demande l'utilisateur>
- Découpage : N = <nombre> unités indépendantes
- Vagues : <N / taille> vagues de <5-10> workers
- Étage worker : haiku (mécanique) | sonnet (jugement)
- subagent_type : Explore (lecture seule) | general-purpose (écrit un fichier)
- Output par worker : <format précis>
- Dossier sortie : <path> — un fichier unique par worker (out_<id>.ext)
- Pilot : oui sur 3 items (si N > 10) / non

Launch all workers of this wave in a single message so they start concurrently.
```

### Prompt worker

```
Tu es un worker. Une seule tâche, un seul output.

CONTEXTE MINIMAL :
<3-5 lignes max>

TÂCHE :
<action atomique unique>

ENTRÉE :
<input précis : URL, chemin absolu, ID…>

CONTRAINTES :
- N'écris/modifie aucun fichier hors de <dossier autorisé>.
- Gros output → écris-le dans <dossier>/out_<id>.<ext> et retourne seulement son chemin.
- Aucun arbitrage : si c'est ambigu, retourne AMBIGUOUS sans deviner.
- N'utilise que ces outils : <liste minimale>.

OUTPUT (format strict, et rien d'autre) :
{
  "status": "SUCCESS" | "FAILURE" | "AMBIGUOUS",
  "data": <résultat OU chemin du fichier produit>,
  "error": <null, ou string si FAILURE/AMBIGUOUS>
}
```

### Annonce (forme A)

Une ligne, sans cérémonie, puis exécuter :

```
→ haiku · extraction mécanique sur fichier fourni
```

Ne pas expliquer le routeur, ne pas justifier le choix sur un paragraphe, ne pas
récapituler la matrice.

---

## Plafonds déterministes

Une consigne se contourne, un plafond non. Sur Claude Code et l'Agent SDK — version
**2.1.217 ou plus récente**, mettre à jour un SDK épinglé avant de le pointer sur ce
modèle :

- `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` — profondeur de spawn (un sous-agent qui en
  lance un autre).
- `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` — nombre de workers simultanés ; c'est le vrai
  garde-fou de la taille des vagues, plus fiable que la consigne « 5 à 10 ».
- `max_budget_usd` (option du SDK) — plafond de dépense de la tâche.

Sur un lot facturé, les poser **avant** la première vague, pas après avoir vu la note.

## Session entière mal calibrée

Si l'essentiel du travail prévu tient dans un seul étage, le signaler **une fois**,
en une ligne, sans insister :

- **Claude Code** : `/model haiku` (ou `sonnet`, `opus`) change le fil principal immédiatement.
- **Cowork** : le modèle se choisit au lancement de la tâche — il faut en relancer une.

---

## Exemples (illustratifs — le pattern marche dans tout contexte)

**Forme A** — « Reformate ce CSV de 400 lignes en JSON groupé par catégorie. »
→ `haiku` + `general-purpose`, brief avec chemin absolu et schéma de sortie, contrôle du retour sur 3 lignes au hasard.

**Forme B** — « Parallélise un audit on-page sur ces 12 pages et sors les 3 problèmes communs. »
→ N = 12, une vague de 8 puis le reste, worker `haiku` + `Explore` (fetch, extraction title/meta/Hn/word count/canonical/schema → JSON). Pilot sur 3. Synthèse par l'orchestrateur : patterns récurrents, top 3 priorisés.

**Forme B avec jugement** — « Worker pool pour qualifier ces 25 candidats : nom/email/tél/diplôme + score de match. »
→ N = 25, vagues de 8, worker `sonnet` (scoring) + grille fournie en entrée, output `out_<id>.json`. Pilot sur 3. Orchestrateur : CSV fusionné trié par score.

---

## À éviter

- Faire tourner un sous-agent sur le modèle de l'orchestrateur → surcoût pur.
- Router une micro-tâche, ou paralléliser des unités de moins de 30 s.
- Lancer une vague de plus de ~10 workers, ou les appels `Agent` dans des messages séparés.
- Donner aux workers accès à tout le système de fichiers.
- Mettre de la logique de décision dans le worker.
- Lancer un sous-agent pour vérifier ce qu'on vient de produire soi-même.
- Lancer plusieurs sous-agents là où un seul suffirait.
- Inventer une donnée pour un item `AMBIGUOUS`.
- Livrer une sortie de sous-agent sans l'avoir regardée.
- Écrire un identifiant de modèle versionné en dur : toujours les alias courts
  `"haiku"`, `"sonnet"`, `"opus"`, `"fable"` — les identifiants versionnés périment.

## Auto-contrôle

- Ai-je essayé de **baisser l'effort** avant de router quoi que ce soit ?
- Ai-je classé l'étage **avant** de commencer, plutôt qu'après ?
- Suis-je au-dessus du plancher, ou en train de payer un routage pour rien ?
- Le brief tient-il debout **sans** la conversation ?
- Ai-je regardé les retours avant de livrer (échantillon, couverture, statuts) ?
