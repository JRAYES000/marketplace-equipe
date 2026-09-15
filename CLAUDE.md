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

     **Anomalie non resolue, trouvee le 15/09/2026** : apres l'installation
     initiale du plugin (version 1.17.19 confirmee, correspondant bien au
     `plugin.json` de `main`), la fiche affiche **6 competences sur 7** --
     `linkedin-carrousel` manque, alors que `linkedin-commentaires` et
     `linkedin-veille-virale` apparaissent normalement. Verifie par deux voies
     independantes (Reglages -> Plugins -> onglet Competences, et Reglages ->
     Competences) : meme resultat les deux fois. **Pas un probleme de fichier
     manquant** -- l'onglet "Contenu" du plugin montre `SKILL.md` present et
     synchronise dans `skills/linkedin-carrousel/`, et son rendu en apercu ne
     montre aucune erreur visible. Hypothese non confirmee, a verifier en
     premier avant d'aller chercher ailleurs : c'est le plus gros des 3
     `SKILL.md` linkedin-* (35 Ko / 481 lignes, contre 27 Ko et 20 Ko pour les
     deux autres) -- une limite de taille cote claude.ai reste plausible mais
     n'a pas ete confirmee depuis cette session.

  3. **Côté CLI** (clone local et paquet installé) :

     ```bash
     claude plugin marketplace update marketplace-equipe && claude plugin update skills-equipe@marketplace-equipe
     ```

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
