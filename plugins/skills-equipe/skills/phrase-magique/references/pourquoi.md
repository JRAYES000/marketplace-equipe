# Pourquoi ces règles — preuves et sources

Sommaire : [Calibrage Claude Opus 5](#calibrage-claude-opus-5) · [Ce qui est étayé](#ce-qui-est-étayé) · [Ce qui est réfuté](#ce-qui-est-réfuté) · [Ce qui reste une hypothèse](#ce-qui-reste-une-hypothèse) · [Réserves de portée](#réserves-de-portée) · [Sources](#sources)

## Calibrage Claude Opus 5

Ce skill est écrit pour Claude Opus 5, dont la documentation officielle change ce qu'il faut prescrire.

**Retiré parce que le modèle le fait déjà.** « Claude Opus 5 verifies its own work without being told to. If your prompt contains explicit verification instructions […] remove them : instructions like these cause over-verification […] removing them reduces wasted tokens with no loss in quality. » La system card ajoute que le modèle produit parfois « elaborate verification pipelines that distract from the primary task ». La passe de vérification explicite a donc été supprimée du skill. **Ce qui reste, c'est la règle d'honnêteté du socle** — ne pas annoncer « vérifié » sans signal constaté — qui répond à un travers documenté ailleurs dans la même system card : « a surprising number of cases in which Opus 5 confidently stated an answer about which it was in fact unsure ».

**Retiré pour la même raison** : « réfléchis étape par étape ». Le raisonnement est natif et adaptatif ; la doc note qu'« a prompt like "think thoroughly" often produces better reasoning than a hand-written step-by-step plan ».

**Conservé parce que le modèle ne le corrige pas seul.** La verbosité : « Claude Opus 5's default user-facing responses run longer than prior Opus models' » — et l'effort ne la réduit pas, il faut la demander explicitement. D'où la règle dure anti-verbosité.

**Ajouté à cause de travers documentés.** L'élargissement de périmètre (« can also expand the scope of a task, adding steps that weren't requested »), la sur-délégation à des sous-agents (« delegates to subagents more readily than prior models »), et la sur-narration.

**Cohérent avec le cadrage.** La doc recommande de donner « the complete task specification up front » et de laisser le modèle dérouler : c'est exactement ce que produisent les 4 questions posées en un seul tour.

**Forme des règles.** « Positive examples of the communication style you want tend to be more effective than instructions about what not to do » — d'où la conversion d'une partie des interdits en formulations positives. Les interdits restants visent des travers qui résistent sous pression (persona, auto-notation, second tour de questions).

Sources : [Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5) · [Prompting best practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [Effort](https://platform.claude.com/docs/en/build-with-claude/effort) · [Claude Opus 5 System Card (24/07/2026)](https://www.anthropic.com/news/claude-opus-5)

Revue faite le 31/07/2026. Chaque référence a été contrôlée au texte intégral — titre, date et chiffre cité — par un vérificateur adversarial. Sur neuf références remontées, neuf existaient, mais deux se voyaient attribuer des conclusions absentes du texte : un identifiant arXiv plausible ne prouve rien.

Ouvrir ce fichier quand une règle du `SKILL.md` est contestée, ou avant de le modifier. Jamais autrement.

## Ce qui est étayé

**Critères de réussite binaires écrits avant de produire.** Décomposer en critères binaires porte l'accord avec le jugement humain de 46,4 % à 52,2 %, et l'auto-amélioration guidée par une liste de critères gagne +7,8 points sur LiveBench reasoning et +6,3 sur WildBench. → arXiv:2410.03608

**Vérification par exécution réelle.** Désactiver la validation par exécution provoque +131,7 % de réparations inutiles et −9,56 points de succès de bout en bout ; la validation élimine 61,24 % des faux positifs. Anthropic recommande de s'appuyer sur les signaux déterministes du projet — vérificateurs de types, linters, tests, erreurs d'exécution. → arXiv:2604.10800 et le billet Anthropic du 22/07/2026

**Citer les passages exacts avant de raisonner.** Sélectionner les segments sources avant de rédiger produit des citations plus courtes et réduit le temps de vérification humaine de plus de moitié, sans perte de qualité. → arXiv:2403.17104

**Donner des exemples de ce qui est excellent.** Le levier le plus fort mesuré : MATH +21,0 points, GPQA +18,2, traduction +15,3. La pertinence prime sur le volume — 50 exemples bien choisis valent 250 exemples aléatoires — et des exemples qui contredisent la consigne dégradent le résultat. → arXiv:2404.11018

## Ce qui est réfuté

**L'auto-critique en boucle fermée.** Sur GSM8K, sans retour externe, GPT-4 passe de 95,5 % à 91,5 % puis 89,0 % après deux rondes d'auto-correction. Avec un signal externe indiquant quelles réponses sont fausses, il monte à 97,5 %. D'où la règle : une seule passe, branchée sur un signal extérieur au modèle. → arXiv:2310.01798

**La note globale sur 10.** La notation holistique directe est un mauvais instrument face aux critères binaires (46,4 % contre 52,2 % d'accord humain). → arXiv:2410.03608
Second argument, qui relève du raisonnement et non de la mesure : un prompt présupposant un défaut appartient à la famille des prompts auto-challengeants, et sous contradiction explicite Claude Sonnet 4.5 tombe de 131 à 49 bonnes réponses sur 200. L'étude teste « tu as tort » et « tu es sûr ? », pas une demande d'auto-notation — le rapprochement est une inférence. → arXiv:2603.03330

**La persona experte.** Pour cinq des six modèles testés, aucune persona experte n'a montré d'amélioration statistiquement significative, et neuf différences négatives significatives ont été observées. Gemini 2.0 Flash fait exception. → arXiv:2512.05858

**« Réfléchis étape par étape » sur un modèle à raisonnement.** Sur GPQA Diamond : o3-mini +2,9 points, o4-mini +3,1, Gemini Flash 2.5 −3,3, pour 20 à 80 % de temps en plus. Sur un modèle sans raisonnement intégré, le gain reste net (Sonnet 3.5 : +11,7). → arXiv:2506.07142

**La génération systématique de N alternatives.** Sur HotpotQA, +0,4 % pour environ vingt fois le coût en tokens ; dégradation au-delà de quinze échantillons sur MATH-500. → arXiv:2511.00751

## Ce qui reste une hypothèse

**Les 4 questions de cadrage systématiques.** Aucune étude ne valide ni n'infirme ce format précis. Un benchmark de juillet 2026 semble limiter la clarification à « 1 à 1,5 » : c'est un contresens. Il mesure des **tours de conversation**, son protocole en autorise cinq, son modèle de coût est en tokens et ne pénalise jamais le regroupement de questions. Poser 4 questions en un seul tour n'y est ni testé ni condamné, et le papier note lui-même que « dans les contextes à fort enjeu, une confirmation supplémentaire peut être préférable à une interaction minimale ». → arXiv:2607.21143

À traiter comme un choix de conception assumé : le format groupé neutralise le coût des allers-retours, ce qui est le seul reproche mesuré fait aux questions de clarification.

Le nombre, lui, n'est plus discutable : `AskUserQuestion` plafonne à **4 questions par appel** (`maxItems: 4` dans son schéma). Au-delà, il faut un second appel — interdit par la skill — ou un message texte qui perd l'interface à cliquer. D'où la règle de densification : ce qu'on veut savoir en plus passe par `multiSelect`, par les `preview` et par des options qui croisent deux axes, jamais par une cinquième question.

## Réserves de portée

L'étude sur la validation par exécution porte sur l'analyse de vulnérabilités logicielles : la généralisation à tout type de livrable est revendiquée par ses auteurs, pas démontrée. Le chiffre « +0,4 % pour 20× le coût » est mesuré sur un seul modèle léger. Les données de référence sur les exemples few-shot datent de modèles antérieurs à 2026.

## Sources

- Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet*, arXiv:2310.01798 (03/10/2023) — https://arxiv.org/abs/2310.01798
- *TICKing All the Boxes: Generated Checklists Improve LLM Evaluation and Generation*, arXiv:2410.03608 (04/10/2024) — https://arxiv.org/abs/2410.03608
- *Attribute First, then Generate*, arXiv:2403.17104 (2024) — https://arxiv.org/abs/2403.17104
- *Many-Shot In-Context Learning*, arXiv:2404.11018 (2024) — https://arxiv.org/abs/2404.11018
- Meincke, Mollick et al., *Prompting Science Report 2: The Decreasing Value of Chain of Thought in Prompting*, arXiv:2506.07142 (08/06/2025) — https://arxiv.org/abs/2506.07142
- *Self-Consistency Is Losing Its Edge*, arXiv:2511.00751 (02/11/2025) — https://arxiv.org/abs/2511.00751
- *Prompting Science Report 4: Playing Pretend — Expert Personas Don't Improve Factual Accuracy*, arXiv:2512.05858 (05/12/2025) — https://arxiv.org/abs/2512.05858
- *Certainty Robustness: Evaluating LLM Stability under Self-Challenging Prompts*, arXiv:2603.03330 (10/02/2026) — https://arxiv.org/abs/2603.03330
- *Verify Before You Fix*, arXiv:2604.10800 (12/04/2026) — https://arxiv.org/abs/2604.10800
- *One More Turn, Less Regret*, arXiv:2607.21143 (23/07/2026) — https://arxiv.org/abs/2607.21143
- Anthropic, *Building verification loops in Claude Code with skills* (22/07/2026) — https://claude.com/blog/building-verification-loops-in-claude-code-with-skills
- Anthropic, *Agent Skills — Best practices* — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
