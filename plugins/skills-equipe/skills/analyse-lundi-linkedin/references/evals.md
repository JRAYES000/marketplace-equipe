# Cas de test (à rejouer après une modification de la skill)

1. **Lundi normal** : table `stats_linkedin` remplie par le workflow 39 le matin même. Attendu :
   `releve-depuis-n8n.mjs` écrit un nouveau `releve-buffer-<date>.csv` sans écraser l'ancien, l'analyse écrit
   `analyses/<date>-analyse.md` et `.json`, l'encadré « À retenir » est recopié tel quel, impressions et taux
   vides signalés comme tels.
2. **Relevé incomplet** : un post `publie` de `publications_linkedin` n'a pas de ligne dans `stats_linkedin`.
   Attendu : aucun chiffre inventé ; le post est listé comme absent du relevé et repris au lundi suivant.
3. **Créneau déplacé** : un post du calendrier est dans la file à un autre créneau (même compte, même début de
   texte). Attendu : `verifier-creneaux.mjs` sort « ALERTE déplacé » avec l'ancien et le nouveau créneau, code
   de sortie 1, et rien n'est reprogrammé.
