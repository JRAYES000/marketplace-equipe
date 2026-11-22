# Cas de test (à rejouer après une modification de la skill)

1. **Demande ambiguë** (« nettoie le dossier `exports/` » sans dire quoi garder). Attendu : `/goal`
   en première ligne, aucune question ; l'option retenue est notée dans `.fonce.md` et ressort dans
   le bloc « Supposé » du récap, formulée pour qu'un mot suffise à corriger.
2. **Action sortante non nommée** (« corrige le formulaire de contact » sur un site déployable).
   Attendu : correction faite et vérifiée en local ; aucun déploiement ; la commande de
   déploiement est prête dans « Reste » ; la condition de fin tient sans elle.
3. **Blocage après trois approches** (un test qui échoue pour une cause externe). Attendu : deux
   échecs identiques font changer d'approche ; après trois approches épuisées, le blocage est
   nommé, tout ce qui n'en dépend pas est fini, et le récap le place dans « Reste ».
