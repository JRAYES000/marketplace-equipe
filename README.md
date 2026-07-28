# 🧩 Marketplace Équipe — nos skills Claude partagées

Ce dépôt est le **magasin de skills de l'équipe**. Il remplace l'ancien dossier OneDrive « SHARED SKILLS ».

Il contient le plugin **`skills-equipe`**, qui regroupe nos meilleures skills. Vous l'installez **une seule fois**, et ensuite chaque nouvelle skill (ou mise à jour) arrive **automatiquement** dans votre Claude — plus rien à télécharger.

## 🚀 Installation (une seule fois, 2 minutes)

Dans Claude Desktop (ou Claude Code), tapez :

```
/plugin marketplace add JRAYES000/marketplace-equipe
/plugin install skills-equipe@marketplace-equipe
```

Ou via l'interface : **Réglages → Capacités → Plugins → Ajouter une marketplace** avec l'adresse `JRAYES000/marketplace-equipe`.

Voici l'écran « Ajouter une marketplace » — collez exactement cette URL :

![Écran « Ajouter une marketplace » dans Claude, avec l'URL JRAYES000/marketplace-equipe](ajouter-marketplace.png)

C'est tout. Vérifiez : les skills `delegation-deepseek-openrouter` et `phrases-magiques` doivent apparaître dans vos capacités.

## 📦 Skills de l'équipe (plugin `skills-equipe`)

Celles-ci arrivent **toutes seules** une fois `skills-equipe` installé.

| Skill | À quoi ça sert | Auteur |
|---|---|---|
| `delegation-deepseek-openrouter` | Économiser vos tokens Claude Pro en déléguant les grosses tâches (résumés, traductions, gros volumes) à DeepSeek V4 Pro via OpenRouter | Julien |
| `phrases-magiques` | Améliorer la pertinence des réponses de Claude : sur les demandes complexes, il reformule, propose un plan à valider, joue le contradicteur, signale vos angles morts et s'auto-critique avant de livrer | Julien |

## ⭐ Plugins recommandés (à installer vous-même, 1 minute chacun)

Ceux-là ne sont **pas** dans `skills-equipe` : ils sont maintenus par Anthropic ou par leurs auteurs, et se mettent donc à jour tout seuls de leur côté. On les recommande à toute l'équipe. Installez ceux qui servent à votre poste, dans l'ordre qui vous parle.

Deux chemins d'installation seulement :

- **Catalogue officiel** — *Personnaliser → Plugins → Parcourir les plugins*, tapez le nom, **Installer**. Rien d'autre à faire.
- **Marketplace à ajouter** — *Personnaliser → Plugins → **+** → Ajouter une marketplace*, collez le slug `auteur/dépôt`, validez, puis **Installer** le plugin.

| # | Plugin | À quoi ça sert | Où le trouver | Comment s'en servir |
|---|---|---|---|---|
| 4 | **superpowers** | Méthode de travail complète : Claude réfléchit et planifie avant d'agir, puis vérifie son travail. La plus utile des neuf. | Catalogue officiel (`Superpowers`). À défaut : marketplace `obra/superpowers-marketplace` | Se déclenche tout seul dès qu'un travail est un peu complexe |
| 5 | **frontend-design** | Génère des interfaces web soignées et distinctives, évite le rendu « IA générique » | Catalogue officiel (`frontend-design`) | `/frontend-design` dans le chat |
| 6 | **impeccable** | Vocabulaire de vrai designer : typo, couleur, espacement, motion, détection d'anti-patterns. 1 skill + 23 commandes. Respecte votre charte existante. Complète frontend-design. | Marketplace `pbakaus/impeccable` | `/impeccable polish`, `/impeccable audit`, `/impeccable critique` (tapez `/` pour les 23) |
| 7 | **ponytail** | Pousse Claude à écrire le moins de code possible : d'abord se demander si c'est nécessaire, préférer le standard et une ligne à cinquante. Moins de code = moins de bugs et de dette. Sans rogner sur la sécurité, l'accessibilité ni la validation. | Marketplace `DietrichGebert/ponytail` | Actif à chaque session ; `/ponytail-review` pour repérer ce qu'on peut supprimer, `/ponytail-help` pour le reste |
| 8 | **marketing** | Créer du contenu, planifier des campagnes, analyser la performance, garder une voix de marque cohérente | Catalogue officiel (`Marketing`) | Décrivez la tâche : « planifie une campagne », « rédige un post », « analyse ces résultats » |
| 9 | **searchfit-seo** | Boîte à outils SEO : clustering de mots-clés, briefs de contenu, schema, maillage interne — et suivi de visibilité dans les IA (AI Overviews, ChatGPT, Perplexity) | Catalogue officiel (`searchfit`) | Tapez `/` pour voir ses commandes, ou décrivez la tâche (audit, brief, schema…) |
| 10 | **deep-research** | Rapports de recherche multi-sources et fact-checkés. Pour fonder articles et contenus de prospection sur des sources vérifiées. | Skill officielle Anthropic : onglet Plugins (ou *Réglages → Capacités → Skills*), tapez `deep research` | `/deep-research` suivi de votre question |
| 11 | *copywriting* | Textes de pages qui convertissent (accueil, landing, titres, CTA, propositions de valeur) | ⚠️ **Rien à installer** : c'est déjà dans le plugin **marketing** (n° 8) | `/draft-content` ou `/content-creation` pour rédiger, `/brand-review` pour faire relire |
| 12 | **doc-coauthoring** | Workflow guidé pour co-rédiger des articles et documents longs : cadrage, itérations, vérification que ça marche pour le lecteur | Skill officielle Anthropic : onglet Plugins (ou *Réglages → Capacités → Skills*), tapez `doc` | Se déclenche quand vous rédigez, ou décrivez votre demande |

> La numérotation commence à 4 : les n° 1 à 3 d'une liste plus large n'ont pas été retenus.
>
> Vous ne trouvez pas une de ces entrées dans votre catalogue ? Signalez-le à Julien plutôt que d'installer un plugin au nom approchant trouvé ailleurs.

## 🔌 Connecteurs MCP recommandés (Claude Desktop)

Les plugins ci-dessus apprennent à Claude **comment travailler**. Les connecteurs, eux, lui donnent **accès à vos outils** : le site, le dépôt de code, votre navigateur, vos données SEO. Les deux sont complémentaires.

Chemin d'installation commun : **Personnaliser → onglet Connecteurs → + → Parcourir**, cherchez le nom, **Connecter**.

### À installer

| Connecteur | À quoi ça sert | Comment |
|---|---|---|
| **Notion** | Accéder à l'espace Notion de l'équipe (comptes rendus, suivi) | Parcourir → `Notion` → Connecter |
| **GitHub** | Lire et modifier le code du site, gérer les versions et les mises en ligne | Parcourir → `GitHub` → Connecter. **Identifiants du compte GitHub du projet et jeton d'écriture : demandez-les à Julien** — ils ne sont pas publiés ici. Compte partagé : ne changez pas le mot de passe, ne l'utilisez que pour le travail sur le site |
| **Claude in Chrome** | Laisser Claude naviguer et agir dans votre navigateur (remplir des formulaires, lire des pages, agir dans l'admin WordPress en dernier recours) | C'est une **extension**, pas un connecteur : Google Chrome → Chrome Web Store → « Claude for Chrome » (par Anthropic) → Ajouter à Chrome → connectez l'extension à votre compte Claude |
| **OpenRouter** | Accéder à des centaines de modèles d'IA (texte et image) de tous les fournisseurs — Anthropic, OpenAI, Google, Meta, Mistral… — avec **un seul compte et une seule clé**. Sert surtout à **générer les visuels** des articles et des pages, et à comparer plusieurs modèles | ⚠️ Créez d'abord un compte gratuit sur [openrouter.ai](https://openrouter.ai) (catalogue : [openrouter.ai/models](https://openrouter.ai/models)). Puis demandez à Claude de se connecter à votre compte en lui donnant votre clé API, et de la garder en mémoire |
| **Google Search Console** | Suivre les performances SEO du site : requêtes, clics, indexation | Parcourir → `Google Search Console` → Connecter. Accès fournis par Julien |
| **context7** | Donner à Claude la documentation technique **à jour** des outils (utile dès qu'on touche au thème WordPress, à Yoast, à du PHP) | Parcourir → `context7`. Sinon : *Ajouter un connecteur personnalisé* → Nom `context7` → URL `https://mcp.context7.com/mcp` → validez |
| **Composio** | Brancher des centaines d'outils externes via **un seul** connecteur sécurisé — chez nous surtout **Google Ads, Google Analytics et Google Search Console**, pilotés en langage naturel | ⚠️ Créez d'abord votre compte sur [dashboard.composio.dev](https://dashboard.composio.dev) et branchez-y vos outils Google. Puis Parcourir → `Composio` → Connecter |

> 💡 **Composio et Google Search Console font doublon — c'est voulu.** Composio va plus loin (Ads + Analytics en plus). Gardez le connecteur GSC natif et utilisez Composio en complément.

### Optionnels (à installer seulement si une tâche le demande)

| Connecteur | À quoi ça sert | Comment |
|---|---|---|
| **File System** | Laisser Claude lire et écrire des fichiers sur votre ordinateur | Le plus simple : dans le projet, utilisez **Connecter un dossier** et choisissez le dossier du site — c'est souvent suffisant. Si on vous demande le connecteur dédié : Parcourir → `Filesystem` → autorisez le dossier de travail |
| **Playwright** | Automatiser un navigateur « invisible » : tester des pages, extraire des données, prendre des captures | Parcourir → `Playwright`. S'il n'apparaît pas, demandez à Julien — c'est plus technique |
| **Windows MCP** | Piloter le bureau Windows (ouvrir des applications, cliquer, taper) | En général **absent du catalogue**. Demandez à Julien de vous l'installer. Notez-le et passez au suivant si vous êtes seul |

✅ **Résultat attendu** : dans *Personnaliser → Connecteurs*, vous voyez la liste installée, chacun marqué **connecté**.

🆘 **Bloqué ?** Installez ce qui marche — Notion, Claude in Chrome, OpenRouter et context7 sont les plus faciles. Pour **WordPress, Hostinger et Search Console**, c'est **Julien** qui fournit et branche les accès : envoyez-lui ce qui vous manque.

## ✍️ Proposer une skill (le rituel du vendredi)

1. Dans Claude : « *Transforme tout notre échange en une skill, incluant ma demande initiale et tous mes feedbacks, et exporte-la en fichier .skill.* »
2. Déposez-la vous-même : demandez à Claude « *Dépose cette skill sur le dépôt GitHub JRAYES000/marketplace-equipe : ajoute son dossier dans plugins/skills-equipe/skills/ et incrémente la version dans plugins/skills-equipe/.claude-plugin/plugin.json* ». Nom de la skill en minuscules : `sujet-action` (ex. `seo-audit-page`). Prérequis (une seule fois) : un compte GitHub + l'invitation « Collaborator » de Julien acceptée.
3. C'est tout — toute l'équipe la reçoit automatiquement, aucune validation nécessaire.

## 🔧 Pour le mainteneur (Julien) — mettre à jour

1. Ajouter/modifier un dossier dans `plugins/skills-equipe/skills/` (un dossier = une skill avec son `SKILL.md`)
2. Incrémenter `version` dans `plugins/skills-equipe/.claude-plugin/plugin.json` (ex. 0.1.0 → 0.2.0)
3. Commit + push — les mises à jour se propagent aux membres (au besoin : `/plugin marketplace update marketplace-equipe`)

## ❓ FAQ

**Je ne vois pas les nouvelles skills ?** Relancez Claude, ou tapez `/plugin marketplace update marketplace-equipe`.

**Est-ce que ça va écraser mes skills à moi ?** Non. Les skills d'un plugin sont installées dans un dossier séparé (`~/.claude/plugins/…`) et portent un préfixe : `skills-equipe:phrases-magiques`, `superpowers:brainstorming`. Vos skills personnelles (`~/.claude/skills/`) ne sont ni touchées ni renommées. Même si une skill du dépôt porte exactement le même nom que l'une des vôtres, les deux coexistent — précisez le nom complet avec le préfixe pour lever l'ambiguïté.

**Et si j'ai déjà installé un de ces plugins de mon côté ?** Aucun problème tant que vous ne l'installez qu'**une** fois. Éviter en revanche d'installer le **même** plugin depuis deux magasins différents : ses skills se retrouveraient en double sous le même préfixe.

**Une skill me semble buguée ?** Dites-le à Julien — il corrige dans le dépôt et tout le monde profite du correctif.

**Je peux modifier une skill directement ici ?** Oui si vous êtes à l'aise avec GitHub : proposez une pull request.
