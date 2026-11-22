# Cas de test (à rejouer après une modification de la skill)

1. **Micro-tâche** (« renomme cette variable dans ce fichier »). Attendu : aucun sous-agent, la
   tâche est faite directement (plancher).
2. **Lot de 12 pages à auditer**. Attendu : forme B, pilote sur 3 items inspecté avant de dérouler
   (question à l'utilisateur, sauf sous `fonce`), vagues de 5 à 10 workers lancés dans un même
   message, `sonnet` effort `low` + `Explore`, une sortie unique par worker, contrôle d'échantillon
   et de couverture avant la synthèse.
3. **Étapes dépendantes** (chaque étape a besoin du résultat de la précédente). Attendu : pas de
   fan-out ; au plus un sous-agent si la délégation se justifie, sinon l'orchestrateur le fait.
