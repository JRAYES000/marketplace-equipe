# Conventions de ce dépôt

## Livraison : pousser sur `main` directement

Julien veut les changements en production tout de suite. Commiter et **pousser
sur `main`** — pas de branche d'attente, pas de PR en brouillon, pas de
« dis-moi si je peux pousser ». L'autorisation est donnée ici, une fois pour
toutes.

Ce qui reste obligatoire malgré la vitesse :

- **Bumper `version`** dans `plugins/skills-equipe/.claude-plugin/plugin.json`
  dès qu'une skill change. Claude compare des numéros, pas des contenus : sans
  bump, l'équipe garde l'ancienne version sans le savoir. Une nouvelle skill →
  mineur ; une correction → patch. L'Action `bump-version.yml` rattrape un
  oubli, mais elle ne devine pas l'ampleur du changement.
- **Valider le frontmatter** de chaque `SKILL.md` touché : `name` ≤ 64
  caractères en minuscules/chiffres/tirets et identique au nom du dossier,
  `description` ≤ 1024 caractères après pliage YAML.
- **Tenir le tableau du README à jour** : la version *et* la date de dernière
  mise à jour de chaque skill. La colonne *Version* est le numéro propre à
  chaque skill, pas celui du paquet.
- **Resynchroniser après le push, en trois temps.** Un push direct sur `main` ne
  déclenche aucune synchronisation côté claude.ai : la doc officielle réserve la
  synchronisation automatique aux PR fusionnées avec bump de version (« Direct
  pushes to the default branch don't trigger a sync »). Le réglage « Synchroniser
  automatiquement » du menu ne change rien à ça : il était actif le 13/09/2026 et
  le serveur pointait quand même 30 commits en arrière. L'app desktop et Cowork
  chargent cette copie serveur, jamais GitHub : sans les clics ci-dessous, tout le
  monde garde l'ancienne version sans le dire (vu le 08/09/2026 : serveur figé
  au 15/08, trois versions de retard).

  1. **Côté serveur, la marketplace** : dans claude.ai, Réglages → Plugins →
     bouton **Ajouter** (en haut à droite) → **Gérer les marketplaces** → ⋯ sur la
     ligne `marketplace-equipe` → **Rechercher des mises à jour**. La ligne affiche
     « Commit synchronisé : <sha> » : c'est le contrôle qui tranche, il doit
     montrer le sha qu'on vient de pousser.

     La fiche du plugin ne mène plus nulle part : « depuis marketplace-equipe » y
     est du texte inerte, pas un lien, et son menu ⋯ n'offre que « Modifier avec
     Claude » et « Supprimer ». Passer par *Ajouter*, pas par la fiche.

     **Préalable manqué le 15/09/2026, sur le compte de Nomena** : « Rechercher
     des mises à jour » suppose que la marketplace a déjà été **ajoutée** sur ce
     compte claude.ai précis — ce n'était pas le cas (Réglages → Plugins →
     « Vos plugins » affichait « Ajoutez vos premiers plugins », rien listé,
     recherche de `marketplace-equipe` sans résultat). Chaque compte claude.ai
     de l'équipe doit faire l'ajout **une fois**, avant de pouvoir jamais faire
     une simple mise à jour : Ajouter → **Ajouter une place de marché** →
     **Ajouter depuis un dépôt** → `JRAYES000/marketplace-equipe` → laisser
     « Synchroniser automatiquement » activé → **Synchro**. Un nouveau
     collaborateur qui ne voit rien dans « Vos plugins » n'a pas un problème de
     synchronisation en retard : il n'a simplement jamais fait ce geste.

  2. **Côté serveur, le plugin installé** — l'étape que tout le monde saute.
     Synchroniser la marketplace fait avancer le pointeur du dépôt, **pas** la
     version installée. Rouvrir la fiche du plugin et lire sa ligne d'en-tête
     (`<version> · <n> compétences`). Si la version n'a pas bougé, même après un
     rechargement complet de la page : **basculer l'interrupteur du plugin sur
     arrêt, puis sur marche**. La fiche repasse alors à la version poussée. Le
     desktop suit dans les 20 minutes ou au redémarrage.

     Vu le 13/09/2026 : marketplace passée à `84cc70d`, plugin resté à `1.13.0`
     avec 4 skills sur 7 pendant tout ce temps — et rien à l'écran ne le signalait.

     **Faux problème trouvé et corrige le 15/09/2026** : juste apres
     l'installation initiale du plugin (version 1.17.19 confirmee), la fiche
     affichait **6 competences sur 7** dans Reglages -> Plugins/Competences --
     `linkedin-carrousel` semblait absente. **Ce n'en etait pas une** : verifie
     ensuite par Julien directement depuis sa session (la skill apparait bien,
     avec sa description complete, aux cotes des deux autres) -- c'etait un
     decalage d'affichage/cache cote interface claude.ai, pas un defaut
     d'installation ni de `SKILL.md`. Mesure reelle a l'appui (longueur exacte
     de `name`/`description`, validite du YAML du front-matter, absence de BOM
     ou de caractere suspect) : les trois `SKILL.md` linkedin-* sont
     structurellement identiques sur ces criteres, rien a y corriger de ce
     cote. **A retenir** : si le compteur de competences d'une fiche plugin
     claude.ai semble en retard d'une unite juste apres une installation,
     revenir verifier depuis la liste des skills reellement disponibles dans
     une session avant de chercher un defaut dans le depot -- le decompte de
     la fiche peut mentir, le contenu charge, lui, fait foi.

  3. **Côté CLI** (clone local et paquet installé) :

     ```bash
     claude plugin marketplace update marketplace-equipe && claude plugin update skills-equipe@marketplace-equipe
     ```

  4. **Une session Claude Code déjà ouverte ne voit rien de tout ça.** Trouvé le
     15/09/2026 en testant les trois skills à froid : dans une session lancée
     avant un push, l'outil `Skill` continue de charger le `SKILL.md` de la
     version qui était installée **au démarrage de cette session précise**
     (ex. `1.17.7`), même si `installed_plugins.json` pointe déjà correctement
     vers `1.17.20`. Les trois étapes ci-dessus (marketplace, plugin, CLI) ne
     changent rien à une session déjà en cours — cohérent avec le README de
     l'équipe (« une conversation déjà commencée garde les skills qu'elle
     avait à son démarrage »), mais facile à oublier en plein travail. Réflexe
     à avoir : si le contenu chargé par `Skill` semble en retard sur le dépôt,
     ouvrir une session neuve plutôt que de chercher un problème de sync côté
     claude.ai — ou, pour tester un changement tout juste poussé, exécuter
     directement les fichiers du clone local (`node etat.js`, etc.) plutôt que
     de passer par l'outil `Skill`.

## Méthode de travail — règles non négociables

Ces règles ont été redemandées à chaque session pendant quatre jours de chantier (11-15/09/2026).
Elles vivent ici maintenant, une fois pour toutes, pour ne plus avoir à les retaper.

- **Vérifier, ne jamais supposer.** Toute affirmation sur l'état d'un fichier, d'une skill, d'un
  compte ou d'un service s'appuie sur une sortie brute de commande ou une lecture directe faite
  **dans la session en cours** — jamais sur la foi d'un résumé de session précédente, d'une
  intuition, ou de ce qui « devrait » être vrai. Conclure chaque vérification par **FAIT** ou
  **NON CONFORME**, jamais par une formule floue du type « globalement bon » ou « ça a l'air ok »
  — ça ne dit pas si le contrôle a réellement eu lieu.
- **Rien de public sans feu vert explicite.** Publier un post, supprimer un contenu en ligne,
  envoyer un message ou un mail, modifier un réglage partagé : toujours attendre un accord
  explicite donné **dans la conversation en cours**, jamais déduit d'un accord donné une fois
  dans le passé pour un cas différent.
- **Ne jamais inventer.** Aucun chiffre sans source réellement ouverte et lue (pas un chiffre "de
  mémoire", pas une estimation présentée comme un fait) ; aucune expérience professionnelle
  attribuée à Julien qui n'a pas réellement eu lieu ; aucune URL non vérifiée. Voir l'incident du
  14/09/2026 (genre `histoire_vecue`, `linkedin-commentaires/SKILL.md`) qui a motivé cette règle.
- **Accents corrects dès la première frappe**, dans tout contenu destiné à publication — jamais
  une correction a posteriori. Seule exception : le gras en caractères Unicode (`𝐜𝐨𝐦𝐦𝐞 𝐜𝐞𝐜𝐢`),
  qui exclut les accents par construction (aucune forme accentuée n'existe dans ce jeu de
  caractères) — voir l'incident du carrousel du 14/09/2026 dans `linkedin-carrousel/SKILL.md`.
- **Ne pas relancer une piste déjà bloquée** en espérant un résultat différent sans information
  ou accès nouveau. Un blocage constaté (ex. endpoint qui n'existe pas, compte non connecté,
  classifieur qui refuse un geste) se documente et se contourne autrement, ou attend une donnée
  nouvelle — il ne se retente pas à l'identique.
- **Committer et pousser au fur et à mesure**, pas en un seul lot en fin de session. Chaque
  correction ou chaque étape validée part immédiatement, avec son propre message de commit.
- **Signaler une erreur commise plutôt que la taire.** Y compris une action accidentelle sans
  conséquence réelle (ex. suppression puis restauration immédiate d'un fichier) — le signalement
  fait partie du travail, pas seulement la correction.

### Pièges spécifiques déjà rencontrés sur ce dépôt

- **Session Claude Code déjà ouverte = version périmée invisible.** Voir point 4 plus bas dans
  « Resynchroniser après le push » — une session lancée avant un push continue de charger le
  `SKILL.md` de la version installée à son démarrage, même après un push et une resynchronisation
  réussie côté claude.ai et CLI.
- **La marketplace doit être ajoutée une fois par compte claude.ai** avant qu'une mise à jour ait
  un sens — voir point 1 plus bas. Un compte qui ne voit rien dans « Vos plugins » n'a pas un
  problème de synchronisation en retard, il n'a simplement jamais fait cet ajout initial.
- **Aucun jeton (API) n'est jamais persisté entre sessions.** `APIFY_TOKEN`, `NOTION_TOKEN`, etc.
  vivent dans l'environnement d'une session précise et disparaissent avec elle — à réexporter à
  chaque nouvelle session qui en a besoin, jamais lus automatiquement depuis un fichier de
  secrets (voir « Ce dépôt est public » ci-dessous). Une session qui ne voit pas de jeton doit le
  traiter comme réellement absent, pas comme un oubli à corriger soi-même.
- **Un changement de compte via `/login` en cours de session coupe l'extension Claude in
  Chrome.** Vu le 15/09/2026 : un `/login` qui bascule d'un compte claude.ai à un autre pendant
  une session déconnecte l'extension navigateur, même si elle fonctionnait juste avant. Symptôme :
  `tabs_context_mcp` répond « Browser extension is not connected ». Ce n'est pas un problème à
  résoudre en retentant à l'identique — la reconnexion se fait côté utilisateur (rouvrir/relancer
  l'extension), à demander explicitement plutôt qu'à deviner ou contourner.
- **Décalage horaire Madagascar/Paris — à convertir avant toute vérification "un post aurait dû
  être en ligne".** Nomena est à Madagascar (UTC+3, pas de changement d'heure dans l'année).
  Paris (le fuseau réel de Buffer, celui utilisé pour programmer tous les posts) est à UTC+2 en
  septembre (heure d'été) — **Madagascar est donc en avance d'1h sur Paris**. Une heure de
  programmation Paris ne se lit jamais telle quelle sur une horloge Madagascar sans cette
  conversion. **Incident réel trouvé le 15/09/2026** : le post Codie Sanchez, programmé 19h00
  Paris (= 20h00 Madagascar), a été vérifié « en ligne ou pas » à 19h15 heure de Madagascar —
  c'est-à-dire 18h15 Paris, **45 minutes avant** l'heure réelle de publication. Conclusion écrite
  à tort : le post serait « bloqué en file d'attente, sans cause identifiée ». Faux : il n'était
  simplement pas encore l'heure. Toujours convertir explicitement (+1h Paris → Madagascar en
  septembre) avant de qualifier un post de « en retard » ou « bloqué » — et laisser une marge de
  quelques minutes après l'heure réelle avant de vérifier, pas pile dessus. Détail et horaires
  convertis pour les posts en cours :
  `plugins/skills-equipe/skills/linkedin-veille-virale/a-publier/README.md`.

## Ce dépôt est public : aucune clé dedans

Les clés d'API de l'équipe vivent dans `JRAYES000/claude-config` (privé), fichier
`env/secrets.md`. Elles n'en sortent pas. Une skill qui a besoin d'un accès le lit
dans une **variable d'environnement**, documentée dans son `SKILL.md`, avec un
`.env.example` aux valeurs vides à côté.

Deux garde-fous, et le premier ne s'installe pas tout seul :

- **Hook pre-commit** — `bash scripts/installer-garde-fou.sh`, une fois par clone.
  Un hook git ne se transmet pas avec le dépôt : sans cette commande, tu n'es pas
  protégé. Il refuse le commit avant qu'il existe.
- **Action `scan-secrets.yml`** — tourne à chaque push et chaque pull request, sur
  l'arbre courant *et* sur tout l'historique. Elle attrape ce qui est passé malgré
  tout, mais après le push : à ce moment la clé a déjà été publiée.

Si une clé part quand même : **la révoquer sur le service**. Réécrire l'historique
ne la désactive pas, la valeur a été lue.

## Activation des skills : manuelle, toujours

Aucune skill de `skills-equipe` ne s'active d'elle-même. Chaque `description`
porte la mention « activation MANUELLE » **et** l'interdiction explicite de se
déclencher seule. Le paquet ne déclare aucun hook : rien ne s'installe dans la
session au démarrage.

Une skill qui se déclenche sans qu'on l'ait demandée est un bug.

**Cette règle ne vaut que pour nos skills.** Les modules externes listés dans le
README — `superpowers` en particulier, qui se lance seul quand le travail est
compliqué — peuvent s'activer automatiquement. C'est accepté et ce n'est pas à
corriger.

## Ton des README

Ils s'adressent à des collaborateurs non techniques. Phrases courtes, pas de
jargon non expliqué, tutoiement, et on dit ce qui se passe concrètement à
l'écran plutôt que le mécanisme sous-jacent.
