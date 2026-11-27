---
name: analyse-lundi-linkedin
description: >
  Analyse hebdomadaire des comptes LinkedIn Claude Agency et Claude Partners : relevé des
  chiffres, médianes par format (texte, image, carrousel) calculées par script, rapport à forme
  fixe, contrôle des créneaux du calendrier contre la file de publication. Pour « analyse du lundi »,
  « lance l'analyse LinkedIn », « où en est le test des formats », « vérifie les créneaux du
  calendrier ». Pas pour un compte client. Activation manuelle : sur
  demande explicite uniquement.
---

# Analyse du lundi LinkedIn

> **Compte `julien-partners` recyclé le 27/11/2026.** Le profil LinkedIn `linkedin.com/in/julien-rayes-claude-partners` est devenu `linkedin.com/in/julien-rayes-mesdroitschomage` et fait la promotion de Mes Droits Chômage (simulateur d'aides publiques). Ne plus rien y publier, commenter ni programmer au titre de Claude Partners sans l'accord écrit de Julien. Les posts déjà publiés restent en ligne. Ancien profil relevé dans `MESDROITSCHOMAGE/reseaux/linkedin/ancien-profil-claude-partners.md`.

Sommaire : Où sont les choses · Procédure du lundi · Point d'objectif ponctuel · Sources ·
Calculs faits en code · Forme du rapport · Pièges. Cas de test : [references/evals.md](references/evals.md).

Une procédure qui revient chaque lundi. Les calculs sont faits par les scripts, jamais « à la main »
et jamais de tête. Lecture seule : rien n'est écrit dans l'outil de publication.

**Publication et relevé par n8n** (Buffer est résilié) : toute publication passe par le n8n du VPS
(n8n.claudeagency.fr). Publication : workflow 38 (table `publications_linkedin`). **Relevé : workflow 39**,
chaque lundi 07:30 : réactions, commentaires et abonnés des posts publiés par le 38 depuis 28 jours, dans la
table n8n `stats_linkedin` (ScrapeCreators, 1 crédit par post). Détail : `../../references/publication-linkedin-n8n.md`.
**Limites** : ni impressions ni taux d'engagement (aucune source automatique : l'API
LinkedIn n'a que le droit d'écrire) ; les posts faits hors du workflow 38 ne sont pas relevés. Les impressions
se lisent à la main sous chaque post avec Claude in Chrome (`claude-in-chrome:navigate`, `get_page_text` :
« N impressions »). Ne jamais inventer un chiffre.
La table se convertit au format `releve-buffer-AAAA-MM-JJ.csv`
([references/releve-buffer.md](references/releve-buffer.md)) par `scripts/releve-depuis-n8n.mjs` (étape 2).

Indicateurs retenus, et eux seuls : impressions, réactions, commentaires, taux d'engagement.

## Où sont les choses

- Scripts de cette skill : `scripts/` (dossier du clone `marketplace-equipe`). Tests : `npm test`.
- Données du test (dépôt privé des livrables) : `linkedin/test-formats-2026-10/` dans
  `livrables-Claude-Agency` (variable `LIVRABLES_DIR` pour un autre emplacement) :
  `methode-comparaison.md` (méthode en vigueur), `PROTOCOLE.md` (ancien protocole), `plan-config.json`, `calendrier.json`, `calendrier.md`, `file-attente-buffer.txt`,
  `releve-buffer-AAAA-MM-JJ.csv`, `analyses/`.
- Anciens relevés : faits dans Buffer Insights par Claude in Chrome jusqu'au 21/11/2026 (méthode dans
  `references/releve-buffer.md`, historique).

## Procédure du lundi (dans l'ordre)

1. `git pull` dans `livrables-Claude-Agency` et dans le clone `marketplace-equipe`. Lire `NOTES.md`.
2. **Relevé des chiffres** : lire la table n8n `stats_linkedin` (MCP `n8n`, `get_data_table_rows`, table
   `gjmnMzoFEmbefCtE`, projet `2MVl33qcS1OYz0eZ`, 100 lignes par page : enregistrer chaque page telle quelle dans
   un tableau JSON), puis `node scripts/releve-depuis-n8n.mjs --entree stats.json` : il garde le relevé le plus
   récent (`--date AAAA-MM-JJ` pour un autre) et écrit `releve-buffer-<date>.csv` dans le dossier du test, sans
   jamais écraser un relevé existant (`--a-blanc` pour voir le CSV). Impressions et taux vides : le signaler
   dans le rapport. Table vide : s'arrêter et le signaler. Dépôt des livrables : trouvé seul
   (`~/OneDrive/Documents/GitHub`, `~/OneDrive/PERSO/GitHub`…, `../../lib/livrables.mjs`), sinon `LIVRABLES_DIR=<chemin>`.
3. **Lancer l'analyse** : `node scripts/analyse-lundi.mjs`
   - lit tous les relevés `releve-buffer-*.csv` du dossier du test (le plus récent l'emporte pour un même post,
     reconnu par son `id_buffer` : deux posts publiés à la même minute restent deux lignes), ou un seul avec
     `--buffer fichier.csv` ;
   - l'heure de référence est l'en-tête `Date` d'un serveur web (`n8n.claudeagency.fr`, abandon après 20 s), jamais l'horloge de la
     machine (Madagascar, UTC+3) ; à défaut, `--maintenant AAAA-MM-JJTHH:MM:SSZ` lu sur une source fiable ;
   - écrit `analyses/AAAA-MM-JJ-analyse.md` et `.json`.
   Options : `--date AAAA-MM-JJ` (le lundi analysé), `--a-blanc` (affiche posts et chiffres par compte, n'écrit
   rien), `--sortie dossier`, `--plan calendrier.json`.
4. **Contrôler le calendrier restant** : enregistrer la réponse de `get_data_table_rows` (MCP `n8n`, table
   `GCjlt3vNRlqbBfUB`, filtre `statut = a_publier`, limite 100) dans `file.json`, puis
   `node scripts/file-depuis-n8n.mjs --entree file.json` réécrit `file-attente-buffer.txt` (nom conservé) dans le
   dossier du test (`--a-blanc` pour voir sans écrire). Puis `node scripts/verifier-creneaux.mjs` — contre cette seule file (code de sortie 1 s'il reste un écart). Un créneau absent de la file est « manquant », un post de la file absent du
   calendrier est « hors plan » ; même compte et même début de texte = « ALERTE déplacé », avec l'ancien et le nouveau
   créneau. Rien n'est jamais reprogrammé.
5. Recopier dans la conversation : l'encadré « À retenir » du rapport, tel quel, les posts publiés absents du
   relevé (lignes `publie` de `publications_linkedin` sans ligne dans `stats_linkedin`), puis les points qui demandent une décision de Julien. Ne rien ajouter que le rapport ne contienne.
6. Mettre à jour `NOTES.md` (date, verdict, alertes), commiter en nommant les fichiers un par un.

## Point d'objectif ponctuel

`node scripts/objectif-julien.mjs` calcule la médiane des impressions d'un compte sur une période contre un
seuil et une référence (options `--compte --du --au --seuil --reference`, `--a-blanc`) et écrit
`analyses/<date>-objectif-julien-<compte>.md` et `.json`. Le verdict ne porte que sur les posts mûrs (48 h).
Le point du 28/10/2026 et ses chiffres : [references/objectif-2026-10-28.md](references/objectif-2026-10-28.md).

## Sources et chiffres relevés

| Source | Chiffres | Usage |
|---|---|---|
| Table n8n `stats_linkedin` (workflow 39, ScrapeCreators) | réactions, commentaires, abonnés, lien, format, date | source des chiffres (pas d'impressions) |
| Table n8n `publications_linkedin` (workflow 38), lignes `publie` | liste des posts envoyés | contrôle de complétude du relevé, pas de chiffre |
| Table n8n `publications_linkedin`, lignes `a_publier` | posts programmés, dont les annonces de Julien | contrôle des créneaux ; jamais modifiés |
| Buffer Insights (jusqu'au 21/11/2026) | anciens relevés `releve-buffer-*.csv` | historique |

## Calculs faits en code

La méthode suit le calendrier (`methodeDuPlan`, `scripts/lib/lundi.mjs`) :

- **Méthode d'octobre** (`methode-comparaison.md`, 05/10/2026), dès que `calendrier.json` a des créneaux image de
  comparaison (ou `meta.methode: "formats"`) : texte, image et carrousel, sur les seuls créneaux
  `comparaison: true` mûrs. Par format : taux d'engagement calculé (réactions + commentaires) / impressions
  (médiane, min, max), impressions, réactions et commentaires médians, posts à zéro. Un format ne bat le texte que
  si taux médian, impressions médianes ET part de posts à zéro sont meilleurs (`deciderFormats`) ; avant la fin
  du test, verdict « provisoire » et simple indication.
- **Ancien protocole** (`PROTOCOLE.md`), sinon : géré par `methodeDuPlan` (`decider`, constante `REGLES`).

Dans les deux cas : un post entre dans les médianes 48 h après sa publication ; conversion de l'heure relevée
en UTC et en heure de Paris. Changer une règle = changer la méthode écrite en même temps, et le dire à Julien.

## Forme du rapport (toujours la même)

1. À retenir (verdict, avancement, semaine écoulée, alertes) · 2. Semaine écoulée, tous formats ·
3. Test des formats par compte (si commencé) · 4. Week-end, à part · 5. Historique par format ·
6. Détail des posts du test · 7. Hors plan · 8. Écarts au plan · 9. Limites.

## Pièges

- Ne jamais lire l'heure sur l'horloge de la machine pour dire qu'un post est « en retard » (voir `CLAUDE.md` du dépôt).
- Anciens relevés Buffer : heure en **Europe/Minsk** (UTC+3), recopiée telle quelle, le script convertit.
- Les statistiques LinkedIn se mettent à jour avec retard : un post envoyé peut manquer pendant plus d'un jour. Jamais de chiffre
  inventé pour le combler ; le signaler et le relever au lundi suivant.
- Le lundi matin, les chiffres du week-end et de la veille sont incomplets : le rapport les marque « non mûrs ».
- Une médiane sur 8 posts bouge avec un seul post viral, sur 4 carrousels encore plus : ne jamais annoncer un
  gagnant avant la fin du test ni sans les trois mesures de la méthode (taux, impressions, posts à zéro).
- Deux posts peuvent partir à la même minute : relever `id_buffer` pour chaque
  ligne, sinon le relevé suivant ne sait pas lequel mettre à jour.
- Le week-end ne fait jamais partie du test ; ses posts sont listés à part, sans règle tirée.
- Buffer (résilié) et Zernio (abandonné) ne servent plus de source, même en secours.
