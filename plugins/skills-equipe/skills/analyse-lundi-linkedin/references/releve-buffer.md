# Relevé Buffer : formats de fichier et méthode

## Publications envoyées : `releve-buffer-AAAA-MM-JJ.csv`

Une ligne par post publié, en-tête obligatoire, séparateur virgule, aucun champ entre guillemets :

```
compte,date_paris,heure_paris,format,impressions,portee,reactions,commentaires,taux_eng_buffer_pct
julien-partners,2026-09-28,18:31,T,1399,956,4,0,0
```

- `compte` : `julien-partners` ou `julien-agency`. Dates et heures de **Paris**.
- `format` : `T` texte, `C` carrousel (PDF), `I` image, `L` lien, `S` slides, `?` inconnu. Toute autre lettre est refusée.
- Une mesure absente reste vide (le post est alors ignoré des médianes).
- Quand Zernio connaît le post, son format remplace l'étiquette : l'analyse liste ces corrections.

Méthode : Chrome connecté à Buffer, Publish > Sent, fuseau Paris, canal par canal. Reporter date, heure,
impressions, portée, réactions, commentaires de chaque post. Écrire dans un nouveau fichier daté.

## File d'attente : `file-attente-buffer.txt`

Une ligne par post en attente, heure de Paris ; l'UTC est calculé par le script :

```
# commentaire
2026-10-05 13:00 julien-partners
```

Méthode : Publish > Queue. Le canal se lit dans la barre latérale (le compteur du canal concerné = nombre
d'entrées). Ne modifier aucune offre : elles relèvent de Julien.
