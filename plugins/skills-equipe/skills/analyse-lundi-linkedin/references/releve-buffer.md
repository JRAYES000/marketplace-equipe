# Relevé Buffer : formats de fichier et méthode

Buffer Insights est la **source unique** des chiffres (consigne de Julien du 08/10/2026 : « Vos objectifs reposent
uniquement sur les métriques de Buffer »). Même méthode de lecture que la routine 5 du dépôt des livrables
(`linkedin/routines/5-releve-48h-annonces.md`). Lecture seule : ne rien programmer, modifier ni supprimer.

## Publications : `releve-buffer-AAAA-MM-JJ.csv`

Une ligne par post publié, en-tête obligatoire, séparateur virgule, aucun champ entre guillemets :

```
compte,publie_le,fuseau_affiche,format,impressions,reactions,commentaires,taux_eng_buffer_pct,id_buffer,lien
julien-partners,2026-10-05 14:00,Europe/Minsk,T,114843,277,165,0.38,6aaac5b46140e9c38a701cd4,https://www.linkedin.com/feed/update/urn:li:share:7512829524213153792
```

- `compte` : `julien-partners` ou `julien-agency`.
- `publie_le` et `fuseau_affiche` : la date et l'heure **telles que Buffer les affiche**, avec le fuseau écrit
  à côté (constaté le 08/10/2026 : « Published on Oct 5, 2:00 PM (Europe/Minsk) »). Ne rien convertir à la
  main : le script calcule l'UTC et l'heure de Paris. L'année n'est pas affichée : prendre celle de la plage.
- `format` : `T` texte, `C` carrousel (PDF), `I` image, `L` lien, `S` slides, `V` vidéo, `?` inconnu. Lu sur le
  détail du post ; en cas de doute, `?` (le post est gardé, mais jamais compté comme anomalie de format).
- Indicateurs : **seulement** ceux fixés par Julien (NOTES.md, mails des 03/10 et 08/10/2026) : impressions,
  réactions, commentaires, taux d'engagement. Pas de portée, ni enregistrements, ni envois (Buffer ne les donne
  pas par post). Une mesure absente reste vide.
- `taux_eng_buffer_pct` : la colonne « Eng. Rate » du **tableau** (deux décimales, sans « % ») ; le détail du post
  l'arrondit à l'entier.
- `id_buffer` (l'identifiant de l'adresse `/posts/<id>`) et `lien` (bouton « Go to post ») : facultatifs.
- Les anciens relevés (`date_paris,heure_paris`, en heure de Paris) restent lisibles.

L'analyse lit **tous** les relevés du dossier, du plus ancien au plus récent : pour un même post (même compte,
même minute), le relevé le plus récent l'emporte. On n'écrase jamais un ancien fichier, on en crée un nouveau daté.

### Méthode (Chrome connecté à Buffer, onglet neuf)

1. Pour chaque compte, ouvrir la vue Insights du canal (la page `insights?dateRange=…` sans canal mélange tout) :
   - Claude Partners : `https://publish.buffer.com/insights/6aa87ac6ea19ca0bde439e7f?dateRange=last-7-days`
   - Claude Agency : `https://publish.buffer.com/insights/6aa87a19ea19ca0bde439c6b?dateRange=last-7-days`
   (`last-30-days` pour une plage plus longue). Les deux canaux s'appellent « Julien Rayes » : seul l'identifiant
   de l'adresse fait foi.
2. Tableau « Performance per Post » : **10 posts par page**, lire toutes les pages (flèches sous le tableau).
   Le nombre « Posts » du résumé doit égaler le nombre de lignes relevées.
3. Pour chaque ligne : relever Eng. Rate dans le tableau, puis cliquer le post. Le détail donne l'heure et le
   fuseau, Reactions, Comments, Impressions, le bouton « Go to post » et le format (visuel joint ou non).
   Fermer le détail avant le post suivant.
4. **Contrôle de complétude** : comparer avec Publish > Sent (fuseau Paris affiché en haut à droite). Insights se
   met à jour avec retard (« Refreshed … ago » dans le détail) : le 08/10/2026 à 17 h 20 Paris, des posts envoyés
   les 06 et 08/10 n'y figuraient pas encore. Un post absent d'Insights n'est pas relevé (pas de chiffre inventé) :
   le noter dans les alertes du compte rendu et le relever au passage suivant.

## File d'attente : `file-attente-buffer.txt`

Seule référence des posts programmés pour `verifier-creneaux.mjs`. Une ligne par post en attente, heure de
Paris ; l'UTC est calculé par le script :

```
# commentaire
2026-10-05 13:00 julien-partners
```

Méthode : Publish > Queue, fuseau Paris. Les deux canaux « Julien Rayes » se distinguent par leur identifiant dans
l'adresse (`/channels/<id>/…`). Ne modifier aucun post de la file, en particulier les annonces de Julien.
À relever de nouveau avant chaque contrôle : une file ancienne fait passer des conflits inaperçus.
