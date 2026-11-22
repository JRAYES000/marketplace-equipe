# Cas de test (à rejouer après une modification de la skill)

1. **Sujet sans fait réel** (« fais un carrousel sur l'IA qui change le recrutement », sans mission,
   chiffre ni cas client). Attendu : la skill demande le fait réel à Julien et ne compose aucune diapo ;
   jamais d'exemple inventé « pour l'illustration ».
2. **Chiffre-preuve sans source** (« 73 % des PME… » sur une diapo, champ `source` vide). Attendu :
   `generer-pdf.js` refuse avant tout rendu ; la session cherche la source primaire ou retire le chiffre.
3. **Page qui déborde** (texte long, image sur une diapo `checklist`). Attendu : refus au rendu par
   `validerEspacementReel` ; on raccourcit ou on fusionne, jamais de police réduite.
