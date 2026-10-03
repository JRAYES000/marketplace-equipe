# Grille — contenu web et SEO

Article de blog, page, fiche, métadonnées, maillage. Les règles de fond d'un site ont
priorité sur cette grille : si une skill dédiée au site existe dans la session (par exemple
`seo-blog-ecole-naturo` ou `wordpress-ops-ecole-naturo`), **charge-la et applique ses
critères**. Elle fournit des critères, pas la forme de la sortie : son score, son
journal et son rapport complet n'entrent pas dans la revue, qui garde le format court de
`SKILL.md`. Cette grille sert de filet quand elle manque, et de rappel des oublis
fréquents.

Chaque contrôle se fait sur la **page en ligne**, pas sur le brouillon : ouvre l'URL
publiée. Pour lire le code source :

```bash
curl -s -A "Mozilla/5.0" "<URL>" -o page.html
```

Puis cherche dans `page.html` le `<title>`, la `meta name="description"`, les `<h1>`,
`<h2>`, `robots`, `canonical` et `application/ld+json`.

## Intention et fond

1. **Intention de recherche.** Quelle requête vise la page ? Le contenu répond-il à ce que
   cherche quelqu'un qui la tape (s'informer, comparer, s'inscrire) ? Regarder les
   premiers résultats Google sur cette requête est le contrôle qui tranche.
2. **Réponse directe en haut.** La réponse principale tient dans les deux premiers
   paragraphes. C'est aussi ce que reprennent les réponses IA (AI Overviews, ChatGPT,
   Perplexity).
3. **Valeur ajoutée.** Qu'apporte la page que les dix premiers résultats n'ont pas ?
   Exemple vécu, chiffre propre, méthode, tableau, cas concret. « Rien » est
   `À REPRENDRE`.
4. **Santé et bien-être (YMYL).** Sources fiables citées et liées, aucune promesse de
   guérison, mention de ne pas remplacer un avis médical, auteur identifié avec sa
   qualification.

## Balises

5. **Title** : unique, mot-clé principal au début, 60 caractères au plus.
6. **Meta description** : 120 à 155 caractères, donne une raison de cliquer.
7. **Un seul H1**, puis des H2/H3 qui suivent un plan logique. Un lecteur qui ne lit que
   les intertitres comprend la page.
8. **URL** courte, en minuscules, sans accent, avec le mot-clé.
9. **Indexable** : pas de `noindex` involontaire, `canonical` vers elle-même.

## Liens et médias

10. **Maillage interne** : au moins 3 liens vers des pages proches du même site, avec une
    ancre qui décrit la page cible (jamais « cliquez ici »). Et au moins une page
    existante qui pointe vers la nouvelle.
11. **Liens sortants** vers des sources d'autorité, qui s'ouvrent (pas de 404).
12. **Images** : texte alternatif descriptif, nom de fichier explicite, poids raisonnable.

## Lecture et conversion

13. **Lisible** : paragraphes courts, phrases simples, listes quand il y a une suite
    d'éléments.
14. **Appel à l'action** clair et unique, adapté à l'intention (s'inscrire, télécharger,
    prendre contact).
15. **Mobile** : la page s'affiche sans débordement à 390 px de large.
16. **Données structurées** pertinentes (Article, FAQ, Course…) quand le type de page s'y
    prête.

## Questions de challenge typiques

- Sur quelle requête précise cette page doit-elle se classer, et qu'as-tu vu sur la
  première page de Google pour cette requête ?
- Quelles pages existantes du site renvoient maintenant vers celle-ci ?
- Quel passage de la page ne pourrait se trouver chez aucun concurrent ?
- Quelle source soutient l'affirmation la plus forte de la page ?
