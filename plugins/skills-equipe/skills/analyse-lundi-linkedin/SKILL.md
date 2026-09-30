---
name: analyse-lundi-linkedin
description: >-
  Analyse du lundi des deux comptes LinkedIn de Julien (Claude Agency, Claude
  Partners) et suivi du test des formats texte / carrousel sur 4 semaines : une
  commande lit les chiffres dans Zernio, les croise avec le relevé Buffer, calcule
  en code médianes, intervalle et paires de même sujet, et écrit un rapport de
  forme constante (semaine écoulée, verdict provisoire ou final, week-end à part).
  Contrôle aussi les créneaux du calendrier contre Zernio et la file Buffer.
  Activation MANUELLE uniquement : ne se déclenche jamais d'elle-même, seulement
  sur demande explicite (« analyse du lundi », « lance l'analyse LinkedIn »,
  « où en est le test des formats », « vérifie les créneaux du calendrier »).
  NE PAS utiliser pour écrire un post (linkedin-mise-en-forme), programmer, ni
  pour un compte client (analyse-reseau-client).
---

# Analyse du lundi LinkedIn

Une procédure qui revient chaque lundi. Les calculs sont faits par les scripts, jamais « à la main »
et jamais de tête. Rien n'est écrit dans Zernio ni dans Buffer : lecture seule.

## Où sont les choses

- Scripts de cette skill : `scripts/` (dossier du clone `marketplace-equipe`). Tests : `npm test` (17 tests).
- Données du test (dépôt privé des livrables) : `linkedin/test-formats-2026-10/` dans
  `livrables-Claude-Agency` (variable `LIVRABLES_DIR` pour un autre emplacement) :
  `PROTOCOLE.md`, `plan-config.json`, `calendrier.json`, `calendrier.md`, `file-attente-buffer.txt`,
  `releve-buffer-AAAA-MM-JJ.csv`, `analyses/`.
- Clé : `ZERNIO_API_KEY`, lue dans l'environnement, sinon dans le `.env` de cette skill, sinon dans celui
  de `linkedin-carrousel`. Jamais affichée, jamais dans le dépôt.

## Procédure du lundi (dans l'ordre)

1. `git pull` dans `livrables-Claude-Agency` et dans le clone `marketplace-equipe`. Lire `NOTES.md`.
2. **Relevé Buffer** (Chrome connecté à Buffer) : suivre `references/releve-buffer.md` pour ajouter les posts
   publiés depuis le dernier relevé au fichier `releve-buffer-AAAA-MM-JJ.csv` (nouveau fichier daté, on ne
   modifie pas l'ancien), et relever la file d'attente dans `file-attente-buffer.txt`.
3. **Lancer l'analyse** : `node scripts/analyse-lundi.mjs`
   - lit Zernio (`GET /v1/analytics`) ; l'heure de référence est celle du **serveur Zernio**, jamais
     l'horloge de la machine (Madagascar, UTC+3) ;
   - prend le relevé Buffer le plus récent du dossier du test (ou `--buffer fichier.csv`) ;
   - écrit `analyses/AAAA-MM-JJ-analyse.md` et `.json`.
   Options : `--date AAAA-MM-JJ` (rejouer un lundi), `--hors-ligne analytics.json`, `--sortie dossier`.
4. **Contrôler le calendrier restant** : `node scripts/verifier-creneaux.mjs` (code de sortie 1 s'il reste un
   conflit). À refaire avant chaque programmation de la semaine.
5. Recopier dans la conversation : l'encadré « À retenir » du rapport, tel quel, puis les points qui demandent
   une décision de Julien. Ne rien ajouter que le rapport ne contienne.
6. Mettre à jour `NOTES.md` (date, verdict, alertes), commiter en nommant les fichiers un par un.

## Sources et chiffres relevés

| Source | Chiffres | Usage |
|---|---|---|
| Zernio `GET /v1/analytics` | impressions, portée, réactions, commentaires, partages, clics, format réel | source principale, mise à jour une fois par jour |
| Buffer (Publish > Sent) | mêmes chiffres, posts publiés hors Zernio, historique d'avant le 25/09 | référence de départ et contrôle croisé (écart > 15 % signalé) |
| Buffer (Publish > Queue) | offres de mission de Julien (lundi et jeudi 13 h, canal Claude Partners) | seulement pour éviter les conflits d'horaires ; jamais modifiées |

Le format vient de Zernio : un carrousel y est typé « image » avec un PDF en pièce jointe. Quand Zernio et
Buffer ne sont pas d'accord sur le format, Zernio l'emporte et le rapport le signale.

## Calculs faits en code

Médianes et quartiles (impressions, portée, réactions, commentaires, engagement) par compte et par format ;
un post entre dans les médianes 48 h après sa publication ; rapport des médianes carrousel / texte ;
intervalle de confiance à 90 % par bootstrap (10 000 tirages, graine fixe) ; test des signes exact sur les
paires de même sujet ; règle de décision du protocole (`scripts/lib/analyse.mjs`, constante `REGLES`).
Changer une règle = changer `PROTOCOLE.md` en même temps, et le dire à Julien.

## Forme du rapport (toujours la même)

1. À retenir (verdict, avancement, semaine écoulée, alertes) · 2. Semaine écoulée, tous formats ·
3. Test des formats par compte (si commencé) · 4. Week-end, à part · 5. Historique par format ·
6. Détail des posts du test · 7. Hors plan · 8. Écarts au plan · 9. Contrôle croisé Buffer · 10. Limites.

## Pièges

- Ne jamais lire l'heure sur l'horloge de la machine pour dire qu'un post est « en retard » (voir `CLAUDE.md` du dépôt).
- Le lundi matin, les chiffres du week-end et de la veille sont incomplets : le rapport les marque « non mûrs ».
- Une médiane sur 8 posts bouge avec un seul post viral : ne jamais annoncer un gagnant sans les trois signaux
  (rapport ≥ 1,25, intervalle qui exclut 1, ≥ 75 % des paires dans le même sens).
- Le week-end ne fait jamais partie du test ; ses posts sont listés à part, sans règle tirée.
- Si l'API répond 202, le script attend et relance (synchronisation LinkedIn en cours).
