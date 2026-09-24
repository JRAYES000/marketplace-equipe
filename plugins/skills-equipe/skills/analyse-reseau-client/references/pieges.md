# Pièges déjà rencontrés (septembre 2026)

Chacun a coûté du temps une fois. La parade suit.

1. **Le site affiche 5 onglets au maximum par client.** Le 6e n'apparaît pas, sans erreur.
   Compte-les avant d'en créer un : `verifier-onglet.mjs --dossier-client`.
2. **Les onglets suivent l'ordre des chemins.** Un dossier `INSTAGRAM/` passe avant
   `YOUTUBE/` : un lien `#doc0` déjà envoyé au client peut changer de cible. Préviens
   l'équipe dans la note.
3. **Tout fichier hors `challenge-N` est visible par le client** : en onglet si c'est un
   `.md`, en téléchargement sinon. Relevés bruts, captures, scripts : dans un dossier
   temporaire, jamais dans le dépôt.
4. **L'envoi automatique de midi ne publie que `challenge-N`.** Un onglet se pousse à la main.
5. **Playwright écrit un dossier `.playwright-mcp/`** dans le dossier de travail (captures et
   journaux) : supprime-le avant de commiter.
6. **Instagram** :
   - publications invisibles sans compte connecté (limite d'âge de Meta) ;
   - refus 429 sur les points d'accès internes : lire les pages, lentement ;
   - onglet caché = rendu gelé, rien ne se charge : une capture d'écran de l'onglet le
     réveille ;
   - extension Chrome « not connected » : mettre la fenêtre Chrome au premier plan quelques
     secondes, puis réessayer. Après deux échecs, demander à la personne de relancer
     l'extension.
   Sur X :
   - l'appel JavaScript coupe au bout de 45 secondes : lancer la boucle de défilement sans
     l'attendre, puis l'interroger par des appels courts ;
   - le retour d'un appel JavaScript est tronqué vers 1 000 caractères : écrire les données
     dans un `<article>` de la page et les lire avec `get_page_text` ;
   - un `browser_batch` qui enchaîne des attentes a déconnecté l'extension : des appels
     séparés, une capture d'écran entre deux ;
   - changer de page (Posts → Replies) efface les variables `window` : sortir les données
     avant de naviguer ;
   - « Replying to » ne se repère pas de façon fiable dans le DOM : distinguer les réponses
     par l'adresse (`/<compte>/status/…`) absente de l'onglet Posts.
7. **Le budget de recherches web d'une session est partagé** entre tous les sous-agents :
   trois l'ont épuisé en une analyse. Donne un plafond à chacun.
8. **Un sous-agent peut lire une page de travers.** Un prix ou une règle qui porte une
   recommandation se relit soi-même sur la page officielle.
9. **Le dépôt partagé peut être occupé.** Si un fichier modifié par quelqu'un d'autre bloque
   le `pull`, ne tire pas, ne remise rien. Publie depuis un worktree jetable, à la racine du
   disque (les chemins longs échouent) :

   ```bash
   git worktree add --detach C:/wt-onglet origin/main
   # copie tes fichiers dedans, ajoute-les par leur nom, commit
   git -C C:/wt-onglet push origin HEAD:main
   git worktree remove --force C:/wt-onglet
   ```

   Sur un dépôt rangé dans OneDrive, `.git/worktrees/wt-onglet` peut rester verrouillé :
   supprime-le ensuite (PowerShell, `Remove-Item -Recurse -Force`). Efface enfin ta copie
   non suivie dans l'arbre partagé, sinon le prochain `pull` de l'autre personne échouera sur
   ce fichier.
10. **Le `CLAUDE.md` du client** : le haut est réécrit par le serveur à chaque mise à jour de
    la fiche. Seule la zone « Notes de l'équipe » survit, et elle finit par
    `<!-- NOTES-EQUIPE:FIN -->` : `inserer-note-equipe.mjs` écrit juste avant, en gardant les
    fins de ligne CRLF.
11. **Les questions ouvertes du `CLAUDE.md`** (« Ce qu'on ne sait pas encore ») ne changent
    que si le client modifie sa fiche. Une réponse reçue par mail ou message vit dans les
    notes d'équipe, pas là-haut.
12. **Les captures du Drive du client** donnent des chiffres globaux, pas le détail par
    publication ni par story.
13. **Une alerte de sécurité peut s'afficher dans le navigateur** pendant la lecture (fuite
    de mots de passe, connexion inhabituelle) : signale-la à la personne dont c'est le
    compte, n'y touche pas.
