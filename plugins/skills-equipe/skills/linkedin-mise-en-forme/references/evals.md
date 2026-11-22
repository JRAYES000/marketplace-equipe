# Cas de test (à rejouer après une modification de la skill)

Les évals de déclenchement sont dans `evals/evals.json`. Cas de comportement :

1. **Lien dans le corps du post.** Attendu : `verif-post.mjs verif` et `controle-avant-publication.mjs`
   échouent (règle 5) ; le lien part en premier commentaire, le post peut dire « le lien est en
   commentaire ».
2. **Troisième post du jour sur le même compte.** Attendu : `controle-avant-publication.mjs` sort
   `ALERTE regle 1` (code 1) ; le post change de jour, rien n'est programmé.
3. **Accroche entièrement en gras.** Attendu : critère 2 en échec ; le gras se réduit au chiffre ou au
   TJM de la ligne 1.
