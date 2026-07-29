# 🧩 Marketplace Équipe — nos skills Claude partagées

Ici, on range les **skills** de l'équipe. Une skill, c'est une notice que Claude lit tout seul pour mieux faire un travail précis.

Tu installes **une seule fois** le paquet `skills-equipe`. Ensuite, chaque nouvelle skill arrive **toute seule** chez toi. Tu n'as plus rien à télécharger.

## 🚀 Installation (une fois, 2 minutes)

Dans Claude, tape ces deux lignes :

```
/plugin marketplace add JRAYES000/marketplace-equipe
/plugin install skills-equipe@marketplace-equipe
```

Ou avec la souris : **Réglages → Capacités → Plugins → Ajouter une marketplace**, puis colle `JRAYES000/marketplace-equipe`.

![Écran « Ajouter une marketplace » dans Claude, avec l'URL JRAYES000/marketplace-equipe](ajouter-marketplace.png)

**Pour vérifier que ça a marché :** tu dois voir `fonce`, `delegation-deepseek-openrouter`, `phrase-magique` et `parallelisation-taches` dans tes capacités.

## 📦 Les skills de l'équipe

Une fois `skills-equipe` installé, les skills arrivent avec le paquet. Tu n'as rien à télécharger.

| Skill | Ce qu'elle fait |
|---|---|
| `fonce` | Le mode « je pars, tu gères ». Claude écrit d'abord noir sur blanc à quoi ressemblera « c'est fini » (un test qui passe, une page qui répond), puis il y va tout seul : aucune question, il tranche les doutes lui-même et te dit à la fin ce qu'il a supposé — tu corriges d'un mot si besoin. Il vérifie pour de vrai avant d'annoncer terminé. Tape `/fonce` suivi de ta demande. |
| `phrase-magique` | Le mode « travail soigné ». Quand ta demande est compliquée, Claude cadre avant de foncer, te dit ce que tu as oublié, vérifie vraiment son travail (il ouvre ce qu'il a produit au lieu de supposer que c'est bon) et te le dit s'il a raté quelque chose. Trois niveaux d'exigence, les 17 « phrases magiques », et les règles pour ne pas gaspiller de tokens. Tape `phrase magique` pour l'activer, `mode normal` pour l'arrêter. |
| `parallelisation-taches` | Pour les gros lots (50 documents à résumer, 60 lignes à classer, 12 pages à auditer) : Claude découpe le travail et le confie à plusieurs assistants rapides en même temps. Beaucoup plus vite, et moins cher. Dis simplement « parallélise ça ». |
| `delegation-deepseek-openrouter` | Fait faire les grosses tâches (résumés, traductions, gros volumes) par une IA moins chère. Tu économises tes messages Claude. |

> **Attention avec `fonce` :** il décide seul et va jusqu'au bout. Ne le lance pas sur quelque chose que tu ne saurais pas défaire toi-même (mettre le site en ligne, envoyer un message à un client). Pour ça, décris ta demande normalement — Claude te demandera confirmation.

> **Une nouvelle skill n'apparaît pas ?** Les mises à jour ne sont pas instantanées. Va dans **Réglages → Capacités → Plugins**, et rafraîchis (ou désinstalle puis réinstalle `skills-equipe`). Redémarrer Claude Desktop aide aussi.

## ⭐ Les modules à installer toi-même

Ceux-là ne sont pas dans notre paquet : ils appartiennent à Anthropic ou à d'autres gens, qui les mettent à jour de leur côté. Installe ceux qui servent à **ton** travail, pas tous.

Il y a deux façons de les installer :

- **Depuis le catalogue** — *Personnaliser → Plugins → Parcourir les plugins*, tu tapes le nom, tu cliques **Installer**. C'est tout.
- **En ajoutant un magasin** — *Personnaliser → Plugins → **+** → Ajouter une marketplace*, tu colles l'adresse `auteur/dépôt`, tu valides, puis **Installer**.

| Module | Ce qu'il fait | Où le trouver | Comment l'utiliser |
|---|---|---|---|
| **superpowers** | Claude réfléchit et fait un plan **avant** de travailler, puis vérifie ce qu'il a fait. Le plus utile de la liste. | Catalogue : `Superpowers`. Sinon, magasin `obra/superpowers-marketplace` | Rien à faire, il se lance tout seul quand le travail est compliqué |
| **frontend-design** | Fabrique des pages web qui ont l'air faites par un humain, pas par une IA | Catalogue : `frontend-design` | Écris `/frontend-design` |
| **impeccable** | Donne à Claude l'œil d'un vrai graphiste : polices, couleurs, espaces, animations. Il repère aussi ce qui est moche. Va bien avec frontend-design. | Magasin `pbakaus/impeccable` | `/impeccable polish`, `/impeccable audit`, `/impeccable critique` (tape `/` pour voir le reste) |
| **ponytail** | Force Claude à écrire le moins de code possible. Moins de code = moins de bugs. | Magasin `DietrichGebert/ponytail` | Rien à faire, il est actif tout le temps. `/ponytail-review` pour voir ce qu'on peut supprimer |
| **marketing** | Écrire des posts, préparer une campagne, regarder si ça a marché, garder le même ton partout | Catalogue : `Marketing` | Dis simplement ce que tu veux : « prépare une campagne », « écris un post » |
| **searchfit-seo** | Aide le site à sortir dans Google **et** à être cité par les IA (ChatGPT, Perplexity) | Catalogue : `searchfit` | Tape `/` pour voir les commandes, ou explique ce que tu veux |
| **deep-research** | Fait une vraie recherche : il va chercher plusieurs sources et vérifie avant de te répondre. Pratique pour écrire un article sans dire de bêtises. | Skills officielles Anthropic : *Réglages → Capacités → Skills*, tape `deep research` | `/deep-research` puis ta question |
| **doc-coauthoring** | T'accompagne pour écrire un long document ou un article, étape par étape | Skills officielles Anthropic : *Réglages → Capacités → Skills*, tape `doc` | Se lance quand tu écris un document |

> **Tu cherches un module pour écrire des textes de pages web ?** Il n'y en a pas à installer : c'est déjà dans **marketing**. Utilise `/draft-content` pour écrire, `/brand-review` pour faire relire.
>
> **Tu ne trouves pas un de ces modules ?** Dis-le à Julien. N'installe pas un autre module qui porte un nom qui ressemble.

## 🔌 Les connecteurs (pour brancher tes outils)

Les modules du dessus apprennent à Claude **comment travailler**. Les connecteurs, eux, lui donnent **accès à tes outils** : ton navigateur, le code du site, tes fichiers.

Pour tous : **Personnaliser → onglet Connecteurs → + → Parcourir**, tu tapes le nom, tu cliques **Connecter**.

### À installer

| Connecteur | Ce qu'il fait | Comment |
|---|---|---|
| **Notion** | Ouvrir les pages Notion de l'équipe | Parcourir → `Notion` → Connecter |
| **GitHub** | Lire et modifier le code du site, mettre en ligne | Parcourir → `GitHub` → Connecter. **Le compte et le mot de passe : demande-les à Julien**, ils ne sont pas écrits ici. C'est un compte partagé : ne change pas le mot de passe et ne l'utilise que pour le travail |
| **Claude in Chrome** | Laisser Claude utiliser ton navigateur : lire des pages, remplir des formulaires | Ce n'est pas un connecteur mais une **extension**. Va sur Chrome → Chrome Web Store → cherche « Claude for Chrome » (par Anthropic) → Ajouter à Chrome → connecte-la à ton compte Claude |
| **OpenRouter** | Un seul compte pour utiliser plein d'autres IA. On s'en sert surtout pour **fabriquer les images** des articles | D'abord, crée un compte gratuit sur [openrouter.ai](https://openrouter.ai). Ensuite, donne ta clé à Claude et demande-lui de la retenir |
| **context7** | Donne à Claude les manuels techniques **à jour** (utile dès qu'on touche à WordPress) | Parcourir → `context7`. Sinon : *Ajouter un connecteur personnalisé* → Nom `context7` → Adresse `https://mcp.context7.com/mcp` |
| **Composio** | Un seul branchement pour accéder à plein d'outils extérieurs, surtout ceux de Google | D'abord, crée ton compte sur [dashboard.composio.dev](https://dashboard.composio.dev) et branches-y tes outils. Ensuite : Parcourir → `Composio` → Connecter |

### Seulement si on te le demande

| Connecteur | Ce qu'il fait | Comment |
|---|---|---|
| **File System** | Laisser Claude lire et écrire des fichiers sur ton ordinateur | Le plus simple : dans ton projet, clique **Connecter un dossier** et choisis le dossier du site. Ça suffit presque toujours |
| **Playwright** | Ouvrir un navigateur invisible pour tester des pages ou prendre des captures | Parcourir → `Playwright`. S'il n'apparaît pas, demande à Julien |
| **Windows MCP** | Laisser Claude piloter ton ordinateur (ouvrir des applis, cliquer, taper) | Souvent absent du catalogue. Demande à Julien de te l'installer, et passe à la suite en attendant |

✅ **C'est bon quand** : dans *Personnaliser → Connecteurs*, tu vois ta liste et chacun est marqué **connecté**.

🆘 **Ça coince ?** Installe déjà ce qui marche — Notion, Claude in Chrome, OpenRouter et context7 sont les plus faciles. Dès qu'il faut un mot de passe ou un accès partagé, c'est Julien : envoie-lui ce qui te manque.

> Certains projets ont besoin d'accès en plus (WordPress, hébergeur, Search Console…). Ils ne sont pas dans la liste : Julien les branche seulement quand un projet en a besoin.

## ✍️ Proposer ta skill (le rituel du vendredi)

Tu as trouvé une bonne façon de faire avec Claude ? Partage-la, ça prend 5 minutes.

1. Dans Claude, écris : « *Transforme tout notre échange en une skill, avec ma demande de départ et tous mes retours, et exporte-la en fichier .skill.* »
2. Puis : « *Dépose cette skill sur le dépôt GitHub JRAYES000/marketplace-equipe : ajoute son dossier dans `plugins/skills-equipe/skills/` et augmente le numéro de version dans `plugins/skills-equipe/.claude-plugin/plugin.json`.* »
3. Fini. Toute l'équipe la reçoit automatiquement, personne n'a besoin de valider.

Le nom de la skill s'écrit en minuscules, sujet puis action : `seo-audit-page`. Il te faut un compte GitHub et l'invitation de Julien (une seule fois).

## ❓ Questions fréquentes

**Je ne vois pas les nouvelles skills.**
D'abord : **ouvre une nouvelle conversation.** Une conversation déjà commencée garde les skills qu'elle avait à son démarrage — même après une mise à jour, elle continue avec les anciennes. Si une conversation neuve ne suffit pas, relance Claude, puis tape `/plugin marketplace update marketplace-equipe`.

**Le bouton « Mettre à jour » est grisé.**
C'est normal : tu as déjà la dernière version (elle est affichée juste à côté, dans le panneau). Le bouton ne s'allume que si le dépôt annonce un numéro plus élevé que le tien.

**Est-ce que ça va effacer mes skills à moi ?**
Non, jamais. Les skills du dépôt sont rangées dans un dossier séparé et portent une étiquette devant leur nom : `skills-equipe:phrase-magique`, `superpowers:brainstorming`. Les tiennes ne bougent pas. Même si deux skills ont exactement le même nom, elles vivent chacune de leur côté — dis le nom complet avec l'étiquette pour choisir laquelle tu veux.

**J'ai déjà installé un de ces modules de mon côté ?**
Aucun souci, tant que tu ne l'installes qu'**une** fois. Évite juste d'installer le **même** module depuis deux magasins différents : tu te retrouverais avec tout en double.

**Une skill a l'air cassée.**
Préviens Julien. Il corrige une fois, et tout le monde reçoit le correctif.

**Je peux modifier une skill directement ici ?**
Oui, si tu sais te servir de GitHub : propose une pull request.

## 🔧 Pour Julien — mettre à jour

1. Ajouter ou modifier un dossier dans `plugins/skills-equipe/skills/` (un dossier = une skill avec son `SKILL.md`)
2. Augmenter `version` dans `plugins/skills-equipe/.claude-plugin/plugin.json` (0.1.0 → 0.2.0). **Jamais optionnel.** Claude compare des numéros de version, pas des contenus : si tu pousses une skill modifiée en laissant l'ancien numéro, il ne voit rien de neuf. Le bouton **Mettre à jour** reste grisé chez tout le monde, et le seul moyen de recevoir le changement devient désinstaller puis réinstaller
3. Commit + push. Les membres reçoivent la mise à jour au redémarrage de Claude, ou avec `/plugin marketplace update marketplace-equipe`
