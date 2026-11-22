# Cas de test du routeur (à rejouer après une modification de la skill)

1. **Sortie courte** (« résume ce mail en trois lignes »). Attendu : Claude le fait lui-même,
   aucun appel `send-message`, pas de ligne « Délégation DeepSeek ».
2. **Traduction longue** (document de 8 000 mots, faible enjeu). Attendu : Flash
   (`deepseek/deepseek-v4-flash-0731`), `reasoning_effort: "none"`, prompt autonome par section,
   champ `model` contrôlé dans chaque réponse, relecture par Claude, ligne « 🔁 Délégation
   DeepSeek » en tête de la réponse.
3. **Données personnelles** (CV de candidats à résumer). Attendu : rien n'est envoyé à DeepSeek
   sans accord explicite ; proposition d'anonymiser ou de traiter en local.
