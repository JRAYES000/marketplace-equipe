---
name: analyse-lundi-linkedin
description: >
  Analyse hebdomadaire des comptes LinkedIn Claude Agency et Claude Partners : relevé Buffer
  Insights, médianes par format (texte, image, carrousel) calculées par script, rapport à forme
  fixe, contrôle des créneaux du calendrier contre la file Buffer. Pour « analyse du lundi »,
  « lance l'analyse LinkedIn », « où en est le test des formats », « vérifie les créneaux du
  calendrier ». Pas pour un compte client (analyse-reseau-client). Activation manuelle : sur
  demande explicite uniquement.
---

# Analyse du lundi LinkedIn

Sommaire : Où sont les choses · Procédure du lundi · Point d'objectif ponctuel · Sources ·
Calculs faits en code · Forme du rapport · Pièges.

Une procédure qui revient chaque lundi. Les calculs sont faits par les scripts, jamais « à la main »
et jamais de tête. Rien n'est écrit dans Buffer : lecture seule.

**Source unique : Buffer Insights** (décision de Julien). Indicateurs retenus, et eux seuls : impressions,
réactions, commentaires, taux d'engagement (« Eng. Rate » de Buffer).

## Où sont les choses

- Scripts de cette skill : `scripts/` (dossier du clone `marketplace-equipe`). Tests : `npm test`.
- Données du test (dépôt privé des livrables) : `linkedin/test-formats-2026-10/` dans
  `livrables-Claude-Agency` (variable `LIVRABLES_DIR` pour un autre emplacement) :
  `methode-comparaison.md` (méthode en vigueur), `PROTOCOLE.md` (ancien protocole), `plan-config.json`, `calendrier.json`, `calendrier.md`, `file-attente-buffer.txt`,
  `releve-buffer-AAAA-MM-JJ.csv`, `analyses/`.
- Aucune clé : Buffer se lit dans Claude in Chrome (`claude-in-chrome:navigate`, `claude-in-chrome:get_page_text`),
  connecté à `publish.buffer.com`.

## Procédure du lundi (dans l'ordre)

1. `git pull` dans `livrables-Claude-Agency` et dans le clone `marketplace-equipe`. Lire `NOTES.md`.
2. **Relevé Buffer Insights** (Chrome, onglet neuf) : suivre `references/releve-buffer.md`, canal par canal,
   toutes les pages du tableau « Performance per Post », détail de chaque post pour l'heure affichée et son
   fuseau. Écrire un nouveau fichier `releve-buffer-AAAA-MM-JJ.csv` (on ne modifie pas l'ancien), puis contrôler
   la complétude contre Publish > Sent. Relever aussi la file d'attente dans `file-attente-buffer.txt`.
3. **Lancer l'analyse** : `node scripts/analyse-lundi.mjs`
   - lit tous les relevés `releve-buffer-*.csv` du dossier du test (le plus récent l'emporte pour un même post,
     reconnu par son `id_buffer` : deux posts publiés à la même minute restent deux lignes), ou un seul avec
     `--buffer fichier.csv` ;
   - l'heure de référence est l'en-tête `Date` du **serveur Buffer** (abandon après 20 s), jamais l'horloge de la
     machine (Madagascar, UTC+3) ; à défaut, `--maintenant AAAA-MM-JJTHH:MM:SSZ` lu sur une source fiable ;
   - écrit `analyses/AAAA-MM-JJ-analyse.md` et `.json`.
   Options : `--date AAAA-MM-JJ` (le lundi analysé), `--a-blanc` (affiche posts et chiffres par compte, n'écrit
   rien), `--sortie dossier`, `--plan calendrier.json`.
4. **Contrôler le calendrier restant** : `node scripts/verifier-creneaux.mjs` — contre la seule file Buffer
   (code de sortie 1 s'il reste un écart). Un créneau absent de la file est « manquant », un post de la file absent du
   calendrier est « hors plan » ; même compte et même début de texte = « ALERTE déplacé », avec l'ancien et le nouveau
   créneau. La routine 1 (contrôle quotidien Buffer) le lance chaque matin. Rien n'est jamais reprogrammé.
5. Recopier dans la conversation : l'encadré « À retenir » du rapport, tel quel, les posts absents d'Insights
   (étape 2), puis les points qui demandent une décision de Julien. Ne rien ajouter que le rapport ne contienne.
6. Mettre à jour `NOTES.md` (date, verdict, alertes), commiter en nommant les fichiers un par un.

## Point d'objectif ponctuel

`node scripts/objectif-julien.mjs` calcule la médiane des impressions d'un compte sur une période contre un
seuil et une référence (options `--compte --du --au --seuil --reference`, `--a-blanc`) et écrit
`analyses/<date>-objectif-julien-<compte>.md` et `.json`. Le verdict ne porte que sur les posts mûrs (48 h).
Le point du 28/10/2026 et ses chiffres : [references/objectif-2026-10-28.md](references/objectif-2026-10-28.md).

## Sources et chiffres relevés

| Source | Chiffres | Usage |
|---|---|---|
| Buffer Insights, vue du canal, « Performance per Post » + détail du post | impressions, réactions, commentaires, taux d'engagement, heure de publication, lien, format | source unique des chiffres |
| Buffer Publish > Sent (fuseau Paris) | liste des posts envoyés | contrôle de complétude du relevé, pas de chiffre |
| Buffer Publish > Queue | posts programmés, dont les annonces de Julien | contrôle des créneaux ; jamais modifiés |

## Calculs faits en code

La méthode suit le calendrier (`methodeDuPlan`, `scripts/lib/lundi.mjs`) :

- **Méthode d'octobre** (`methode-comparaison.md`, 05/10/2026), dès que `calendrier.json` a des créneaux image de
  comparaison (ou `meta.methode: "formats"`) : texte, image et carrousel, sur les seuls créneaux
  `comparaison: true` mûrs. Par format : taux d'engagement calculé (réactions + commentaires) / impressions
  (médiane, min, max), impressions, réactions et commentaires médians, posts à zéro. Un format ne bat le texte que
  si taux médian, impressions médianes ET part de posts à zéro sont meilleurs (`deciderFormats`) ; avant la fin
  du test, verdict « provisoire » et simple indication.
- **Ancien protocole** (`PROTOCOLE.md`), sinon : géré par `methodeDuPlan` (`decider`, constante `REGLES`).

Dans les deux cas : un post entre dans les médianes 48 h après sa publication ; conversion de l'heure affichée par
Buffer en UTC et en heure de Paris. Changer une règle = changer la méthode écrite en même temps, et le dire à Julien.

## Forme du rapport (toujours la même)

1. À retenir (verdict, avancement, semaine écoulée, alertes) · 2. Semaine écoulée, tous formats ·
3. Test des formats par compte (si commencé) · 4. Week-end, à part · 5. Historique par format ·
6. Détail des posts du test · 7. Hors plan · 8. Écarts au plan · 9. Limites.

## Pièges

- Ne jamais lire l'heure sur l'horloge de la machine pour dire qu'un post est « en retard » (voir `CLAUDE.md` du dépôt).
- Le détail d'un post Insights affiche l'heure en **Europe/Minsk** (UTC+3), pas en heure de Paris : recopier
  l'heure et le fuseau tels quels, le script convertit.
- Le tableau n'affiche que 10 posts par page : sans parcourir toutes les pages, le relevé est incomplet.
- Insights se met à jour avec retard : un post envoyé peut manquer pendant plus d'un jour. Jamais de chiffre
  inventé pour le combler ; le signaler et le relever au lundi suivant.
- Le lundi matin, les chiffres du week-end et de la veille sont incomplets : le rapport les marque « non mûrs ».
- Une médiane sur 8 posts bouge avec un seul post viral, sur 4 carrousels encore plus : ne jamais annoncer un
  gagnant avant la fin du test ni sans les trois mesures de la méthode (taux, impressions, posts à zéro).
- Deux posts peuvent partir à la même minute : relever `id_buffer` pour chaque
  ligne, sinon le relevé suivant ne sait pas lequel mettre à jour.
- Le week-end ne fait jamais partie du test ; ses posts sont listés à part, sans règle tirée.
- Zernio est abandonné : il ne voit pas les posts publiés par Buffer. Ne pas s'en servir
  comme source, même en secours.
