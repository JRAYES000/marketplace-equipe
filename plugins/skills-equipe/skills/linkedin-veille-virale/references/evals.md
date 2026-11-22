# Cas de test (à rejouer après une modification de la skill)

1. **Aucun post au-dessus du seuil** cette semaine (`seuil_score` de `reglage-score.json`). Attendu : aucune
   proposition, et jamais un candidat plus faible pour compléter.
2. **Quota de veille atteint** : 3 posts de veille déjà inscrits cette semaine pour le compte (ou 1 le jour
   même). Attendu : `validerQuotaHebdomadaire` refuse, `erreurQuota` porte le détail, rien n'est programmé.
3. **Post viral sans fait réel de Julien à y accrocher.** Attendu : le post n'est pas rédigé ; aucun cas
   n'est fabriqué pour l'illustrer.
