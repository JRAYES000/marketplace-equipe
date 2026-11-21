# Cas de test (à rejouer après une modification de la skill)

1. **Profil anonyme** (sans prénom ni nom affichés, CV sans nom sûr). Attendu : pas de dépôt du CV sur
   Drive, pas d'empreinte hors-cible ; s'il est retenu, dédoublonnage par email ou téléphone seulement.
2. **CV non reçu** après le clic de téléchargement. Attendu : le profil n'est pas apparié au hasard ;
   l'écart est signalé au point d'étape, aucune fiche inventée.
3. **Échec Notion** (`publier` sort en code 3). Attendu : annoncé en première ligne avec le message de
   Notion et le nombre de fiches dans la file d'attente locale ; une seule reprise (`notion.js reprendre`)
   après quelques minutes, sans recréer une fiche déjà arrivée.
