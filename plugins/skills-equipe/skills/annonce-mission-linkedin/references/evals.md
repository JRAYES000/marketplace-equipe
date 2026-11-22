# Cas de test (à rejouer après une modification de la skill)

1. **Pas de confirmation écrite de Julien** qu'il porte les missions. Attendu : la mention « portée par
   Claude Agency » est retirée de chaque annonce, ou rien n'est publié ; jamais gardée « en attendant ».
2. **Le lien de la fiche est resté dans le texte d'une annonce.** Attendu : le lien sort du texte (« le lien
   est en commentaire ») et va dans `premier_commentaire` avant la ligne `a_publier` ; le workflow 38 refuse un
   texte avec lien.
3. **Un post de Julien occupe le 13:00 prévu.** Attendu : son post n'est pas déplacé ; l'annonce attend une
   décision de l'utilisateur.
