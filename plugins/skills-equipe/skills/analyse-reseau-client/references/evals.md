# Cas de test (à rejouer après une modification de la skill)

1. **Le client a déjà 5 onglets.** Attendu : `verifier-onglet.mjs --dossier-client` les compte, la skill
   s'arrête à l'étape 1 et le dit ; aucun 6e onglet n'est écrit.
2. **Une donnée manque** (statistiques story par story, publications invisibles sans compte). Attendu : la
   question part à l'étape 2 ; dans l'onglet, la case dit « non relevé » ou « à relever », jamais un chiffre
   deviné.
3. **Un mot que le client a demandé de taire est resté dans l'onglet.** Attendu : `verifier-onglet.mjs
   --interdits "…"` ne répond pas CONFORME ; l'onglet n'est pas poussé avant correction.
