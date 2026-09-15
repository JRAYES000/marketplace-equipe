# Marche à suivre — suivi à 3 jours des 5 commentaires (18/09/2026)

Préparé le 15/09/2026 pour que le 18/09 soit rapide : rien à re-décider ce jour-là, juste
exécuter dans l'ordre. Les 5 commentaires ont tous été publiés le 15/09/2026 (voir
`skills/linkedin-commentaires/a-publier/README.md`) — le suivi à 3 jours (règle 3 du brief) tombe
donc pour les 5 le même jour, 18/09/2026.

## 0. Avant de commencer (une fois)

1. Ouvrir une session Claude Code **neuve** (une session déjà ouverte garde la version de skill
   qu'elle avait à son démarrage — voir CLAUDE.md du dépôt).
2. Exporter les deux variables d'environnement (jamais persistées entre sessions) :
   ```
   NOTION_TOKEN=<jeton de l'intégration Notion>
   NOTION_COMMENTAIRES_DATA_SOURCE_ID=7a80342b-3ce9-416b-91c1-80deb64efb39
   ```
   (Le `dataSourceId` ci-dessus est celui déjà documenté dans
   `references/linkedin-commentaires-historique.md` — un identifiant, pas un secret. Si le
   script signale "aucune ligne trouvée" malgré tout, revérifier cet ID dans Notion avant
   d'aller plus loin.)
3. Se placer dans le dossier de la skill :
   ```
   cd plugins/skills-equipe/skills/linkedin-commentaires
   ```

## 1. Les deux chiffres globaux (à relever une seule fois, pas par commentaire)

**Écran LinkedIn n°1 : "Qui a consulté votre profil"**
`https://www.linkedin.com/me/profile-views/`
Relever le nombre total affiché.

**Écran LinkedIn n°2 : invitations reçues**
`https://www.linkedin.com/mynetwork/invitation-manager/`
Relever le nombre de nouvelles demandes de connexion/contact reçues.

**Limite assumée, à ne pas dissimuler** : LinkedIn n'attribue ni les vues de profil ni les
demandes de contact à un commentaire précis — ce sont des compteurs globaux du compte, pas une
mesure par commentaire. Le même couple de chiffres (vues de profil, demandes de contact) sera
donc utilisé sur les 5 lignes ci-dessous : un instantané global reporté cinq fois, pas cinq
mesures indépendantes. Coller ces deux captures d'écran **en premier**, avant celles des 5
posts, pour que ces chiffres soient lus une fois pour toutes.

## 2. Les 5 posts — un écran par commentaire, dans cet ordre

Pour chacun des 5, ouvrir le lien du **post cible** (pas le profil de la personne), dérouler les
commentaires jusqu'à trouver celui de Julien Rayes (repérable par les premiers mots donnés
ci-dessous), puis capturer et coller une capture d'écran montrant : le nombre de **J'aime** sur
CE commentaire précis, le nombre de **réponses** à ce commentaire, et si l'auteur du post en
personne a répondu.

| # | Personne visée (exactement, pour `--auteur`) | Lien du post | Début du commentaire à repérer |
| --- | --- | --- | --- |
| 1 | `Jean ZENDJI` | https://www.linkedin.com/posts/jean-zendji-zenfia_arr%C3%AAtez-de-vouloir-r%C3%A9pondre-%C3%A0-tous-vos-avis-activity-7504102064814268416-FPQV | « Le tri en deux catégories simplifie peut-être trop la priorité. Un avi... » |
| 2 | `Georges Solutions` | https://www.linkedin.com/feed/update/urn:li:activity:7502065436709208064/ | « Le point qui me semble le plus dur à industrialiser, ce n'est pas la r... » |
| 3 | `Romain Charissou` | https://www.linkedin.com/feed/update/urn:li:activity:7485756946306801664/ | « Est-ce que ce genre de bascule vous oblige à revoir une partie du cont... » |
| 4 | `Benjamin Lacroix` | https://www.linkedin.com/feed/update/urn:li:activity:7475427556272472064/ | « Le chiffrage en semaines de développement et en euros d'infrastructure... » |
| 5 | `Raphael Mizrahi` | https://www.linkedin.com/feed/update/urn:li:activity:7478126544679374848/ | « Vous dites avoir été architecte de systèmes de support automatisés qui... » |

Tous les 5 sont sur le compte **julien-agency**, publiés le **2026-09-15** — `--date 2026-09-15`
lève toute ambiguïté si `retrouverLigneCommentaire` trouve plusieurs lignes pour la même
personne.

## 3. Après chaque capture collée, lancer la commande correspondante

Remplacer `<J'aime>`, `<réponses>` et `<true|false>` (l'auteur a-t-il répondu ?) par ce qui est
réellement lu sur la capture — les deux chiffres globaux (`--vuesProfil`, `--demandesContact`)
restent identiques sur les 5 commandes (voir section 1) :

```
node mettre-a-jour-stats.js --auteur "Jean ZENDJI" --date 2026-09-15 \
  --jaime <J'aime> --reponses <réponses> --reponseAuteur <true|false> \
  --vuesProfil <vues> --demandesContact <demandes>

node mettre-a-jour-stats.js --auteur "Georges Solutions" --date 2026-09-15 \
  --jaime <J'aime> --reponses <réponses> --reponseAuteur <true|false> \
  --vuesProfil <vues> --demandesContact <demandes>

node mettre-a-jour-stats.js --auteur "Romain Charissou" --date 2026-09-15 \
  --jaime <J'aime> --reponses <réponses> --reponseAuteur <true|false> \
  --vuesProfil <vues> --demandesContact <demandes>

node mettre-a-jour-stats.js --auteur "Benjamin Lacroix" --date 2026-09-15 \
  --jaime <J'aime> --reponses <réponses> --reponseAuteur <true|false> \
  --vuesProfil <vues> --demandesContact <demandes>

node mettre-a-jour-stats.js --auteur "Raphael Mizrahi" --date 2026-09-15 \
  --jaime <J'aime> --reponses <réponses> --reponseAuteur <true|false> \
  --vuesProfil <vues> --demandesContact <demandes>
```

Chaque commande imprime `Statistiques mises a jour pour "<auteur>" : <url>` en cas de succès —
ouvrir cette URL une fois les 5 lancées pour confirmer visuellement les 5 lignes dans Notion,
plutôt que de supposer que la commande a fonctionné.

## 4. Une fois les 5 lignes mises à jour

- Mettre à jour le tableau de comparaison hebdomadaire (`creerVueComparaisonHebdomadaire`/
  `ecrireBlocComparaisonHebdomadaire`, déjà exécuté une fois le 15/09 — voir
  `references/linkedin-commentaires-historique.md`) si le brief du 20 en a besoin.
- Rien d'autre à publier avant le 20 sur ce lot — passer directement à la relecture du mail
  (voir `references/mail-20260920-brouillon.md`).
