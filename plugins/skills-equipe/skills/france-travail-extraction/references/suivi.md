# Suivi des leads dans Notion, après l'extraction

Sorti de `SKILL.md` le 2026-11-25, mot pour mot.

Hors du run : la skill n'écrit que `A importer` et ne touche à aucun des champs ci-dessous. Le
suivi se tient à la main dans la base, par la personne qui contacte le candidat.

- **Statuts de suivi** : `Contacte`, `A repondu`, `Inscrit`, `Pas interesse`, posés à chaque
  changement. Jamais par un script de la skill.
- **`Dernier contact`** : mis à jour à chaque contact, quel que soit le canal.
- **`Information RGPD donnee`** : cochée au premier contact, une fois le candidat informé du
  responsable du traitement, de la finalité et de ses droits.
- **Relance à 7 jours** (règle, Julien, 23/11/2026) : un lead resté `Contacte` 7 jours après
  `Dernier contact` est à relancer. La vue « À relancer » le montre : `Statut` = `Contacte` et
  `Dernier contact` au plus tard il y a une semaine, du plus ancien au plus récent. Une fiche
  `Contacte` sans `Dernier contact` n'y apparaît pas. Réponse reçue → `A repondu`, la fiche sort
  de la vue. Nombre de relances, canal et texte : pas décidés.
- **Aucun message ne part sans l'accord de Julien**, relance comprise : la vue désigne des
  fiches, elle n'autorise aucun envoi.
- **`Demande de suppression`** : date de la demande ; fiche à supprimer (vue « RGPD - à
  supprimer »). Sinon, suppression au plus tard 24 mois après le dernier contact (convention).
- **`A supprimer avant`** (formule) : 24 mois après `Dernier contact`, et après `Date extraction`
  quand `Dernier contact` est vide. Ce repli est l'état de la formule, choix non validé, pas une
  règle de la convention.
