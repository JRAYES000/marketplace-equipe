---
name: linkedin-carrousel
description: "(provisoire) Composer des carrousels LinkedIn soignes pour les comptes Claude Agency, Claude Partners et la page Claude"
---

# linkedin-carrousel

En construction. `generer-pdf.js` produit le PDF multi-page a partir des templates de
`templates/` et d'une liste de diapos (voir l'en-tete du script pour l'usage et la
convention de nommage des fichiers de sortie).

## Limites connues

- **(2026-09-11)** Le PDF fini atterrit dans `sortants/<compte>/AAAA-MM-JJ-<slug>.pdf`,
  mais rien ne le fait passer de la a la publication reelle sur LinkedIn : aucun dossier
  surveille, aucun point d'entree. Verifie a cette date : `sortants/instagram/` du depot
  `visibilite-ops` est vide (juste `.gitkeep`), et son pipeline de brouillons
  (`sortants/<canal>/*.md` + clic "Valider" de Julien) ne gere que du texte, pas un
  artefact binaire comme un PDF. A faire deposer/publier a la main pour l'instant, ou a
  outiller plus tard (ex. un sortant `.md` qui reference le chemin du PDF genere, avec le
  geste de publication -- upload document -- qui reste a construire cote Composio).
