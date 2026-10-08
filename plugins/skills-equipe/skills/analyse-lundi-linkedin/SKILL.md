---
name: analyse-lundi-linkedin
description: >-
  Analyse du lundi des deux comptes LinkedIn de Julien (Claude Agency, Claude
  Partners) et suivi du test des formats texte / carrousel sur 4 semaines : les
  chiffres sont relevés dans Buffer Insights (source unique), puis une commande
  calcule en code médianes, intervalle et paires de même sujet et écrit un
  rapport de forme constante (semaine écoulée, verdict provisoire ou final,
  week-end à part) sur les seuls indicateurs de Julien : impressions, réactions,
  commentaires, taux d'engagement. Contrôle aussi les créneaux du calendrier
  contre la file Buffer. Activation MANUELLE uniquement : ne se déclenche jamais
  d'elle-même, seulement sur demande explicite (« analyse du lundi », « lance
  l'analyse LinkedIn », « où en est le test des formats », « vérifie les créneaux
  du calendrier »). NE PAS utiliser pour écrire un post (linkedin-mise-en-forme),
  programmer, ni pour un compte client (analyse-reseau-client).
---

# Analyse du lundi LinkedIn

Une procédure qui revient chaque lundi. Les calculs sont faits par les scripts, jamais « à la main »
et jamais de tête. Rien n'est écrit dans Buffer : lecture seule.

**Source unique : Buffer Insights.** Consigne de Julien du 08/10/2026 (15 h 55 Paris) : « Vos objectifs reposent
uniquement sur les métriques de Buffer. » Indicateurs retenus, et eux seuls : impressions, réactions,
commentaires, taux d'engagement (« Eng. Rate » de Buffer).

## Où sont les choses

- Scripts de cette skill : `scripts/` (dossier du clone `marketplace-equipe`). Tests : `npm test` (19 tests).
- Données du test (dépôt privé des livrables) : `linkedin/test-formats-2026-10/` dans
  `livrables-Claude-Agency` (variable `LIVRABLES_DIR` pour un autre emplacement) :
  `PROTOCOLE.md`, `plan-config.json`, `calendrier.json`, `calendrier.md`, `file-attente-buffer.txt`,
  `releve-buffer-AAAA-MM-JJ.csv`, `analyses/`.
- Aucune clé : Buffer se lit dans Chrome (extension Claude connectée à `publish.buffer.com`).

## Procédure du lundi (dans l'ordre)

1. `git pull` dans `livrables-Claude-Agency` et dans le clone `marketplace-equipe`. Lire `NOTES.md`.
2. **Relevé Buffer Insights** (Chrome, onglet neuf) : suivre `references/releve-buffer.md`, canal par canal,
   toutes les pages du tableau « Performance per Post », détail de chaque post pour l'heure affichée et son
   fuseau. Écrire un nouveau fichier `releve-buffer-AAAA-MM-JJ.csv` (on ne modifie pas l'ancien), puis contrôler
   la complétude contre Publish > Sent. Relever aussi la file d'attente dans `file-attente-buffer.txt`.
3. **Lancer l'analyse** : `node scripts/analyse-lundi.mjs`
   - lit tous les relevés `releve-buffer-*.csv` du dossier du test (le plus récent l'emporte pour un même post),
     ou un seul avec `--buffer fichier.csv` ;
   - l'heure de référence est l'en-tête `Date` du **serveur Buffer** (abandon après 20 s), jamais l'horloge de la
     machine (Madagascar, UTC+3) ; à défaut, `--maintenant AAAA-MM-JJTHH:MM:SSZ` lu sur une source fiable ;
   - écrit `analyses/AAAA-MM-JJ-analyse.md` et `.json`.
   Options : `--date AAAA-MM-JJ` (le lundi analysé), `--a-blanc` (affiche posts et chiffres par compte, n'écrit
   rien), `--sortie dossier`, `--plan calendrier.json`.
4. **Contrôler le calendrier restant** : `node scripts/verifier-creneaux.mjs` — contre la seule file Buffer
   (code de sortie 1 s'il reste un conflit). À refaire avant chaque programmation de la semaine.
5. Recopier dans la conversation : l'encadré « À retenir » du rapport, tel quel, les posts absents d'Insights
   (étape 2), puis les points qui demandent une décision de Julien. Ne rien ajouter que le rapport ne contienne.
6. Mettre à jour `NOTES.md` (date, verdict, alertes), commiter en nommant les fichiers un par un.

## Sources et chiffres relevés

| Source | Chiffres | Usage |
|---|---|---|
| Buffer Insights, vue du canal, « Performance per Post » + détail du post | impressions, réactions, commentaires, taux d'engagement, heure de publication, lien, format | source unique des chiffres |
| Buffer Publish > Sent (fuseau Paris) | liste des posts envoyés | contrôle de complétude du relevé, pas de chiffre |
| Buffer Publish > Queue | posts programmés, dont les annonces de Julien | contrôle des créneaux ; jamais modifiés |

## Calculs faits en code

Médianes et quartiles (impressions, réactions, commentaires, taux d'engagement) par compte et par format ;
un post entre dans les médianes 48 h après sa publication ; rapport des médianes carrousel / texte ;
intervalle de confiance à 90 % par bootstrap (10 000 tirages, graine fixe) ; test des signes exact sur les
paires de même sujet ; règle de décision du protocole (`scripts/lib/analyse.mjs`, constante `REGLES`) ;
conversion de l'heure affichée par Buffer en UTC et en heure de Paris.
Changer une règle = changer `PROTOCOLE.md` en même temps, et le dire à Julien.

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
- Une médiane sur 8 posts bouge avec un seul post viral : ne jamais annoncer un gagnant sans les trois signaux
  (rapport ≥ 1,25, intervalle qui exclut 1, ≥ 75 % des paires dans le même sens).
- Le week-end ne fait jamais partie du test ; ses posts sont listés à part, sans règle tirée.
- Zernio est abandonné depuis le 08/10/2026 : il ne voit pas les posts publiés par Buffer. Ne pas s'en servir
  comme source, même en secours.
