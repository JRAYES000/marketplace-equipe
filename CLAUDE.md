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
