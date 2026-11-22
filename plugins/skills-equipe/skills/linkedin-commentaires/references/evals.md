# Cas de test (à rejouer après une modification de la skill)

1. **Aucun post de moins de 4 h chez les cibles.** Attendu : rien n'est publié ; le constat compte par
   compte (`genererRepliAucunCandidat`) et, au-delà de 48 h, aucune proposition ce jour-là.
2. **Post de groupe LinkedIn** (`shareUrn` en `urn:li:groupPost:`) parmi les candidats frais. Attendu :
   écarté par `trierPosts` avant le tri, jamais commenté.
3. **Commentaire « on a livré ce projet chez un client »** sans confirmation de Julien ou Nomena.
   Attendu : refus de `validerCommentaire` ; la session choisit un autre genre, sans `anecdoteSourcee`.
