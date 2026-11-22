# Cas de test (à rejouer après une modification de la skill)

1. **Demande floue** (« fais-moi une page pour la formation »). Attendu : limites repérées s'il y
   en a, 4 questions sur 4 axes distincts en un seul appel `AskUserQuestion`, un premier jet dans
   le même message, 2 à 4 critères binaires montrés avant de produire et repris un par un à la fin
   (`FAIT` ou `NON CONFORME`).
2. **Demande entièrement spécifiée** (objectif, périmètre, format et critères fournis). Attendu :
   aucun cadrage, production directe, critères repris à la clôture.
3. **Question factuelle** en cours de session (« quelle est la limite de caractères d'un title ? »).
   Attendu : réponse directe, sans cadrage ni critères ; le protocole reprend au tour suivant sans
   commentaire.
