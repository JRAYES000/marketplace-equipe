---
name: annonce-mission-linkedin
description: >-
  Quand : publier un lot d'annonces de mission freelance IA de Julien sur la page LinkedIn Claude Partners (document, rédaction, image, planning, Buffer, relevé à 48 h).
  Pas pour : un post LinkedIn ordinaire (linkedin-mise-en-forme), un carrousel (linkedin-carrousel), un commentaire.
  Activation MANUELLE uniquement, sur demande explicite (« nouveau lot d'annonces de mission ») ; ne se déclenche jamais d'elle-même.
---

# Annonces de mission LinkedIn (Claude Partners)

Reprend la chaîne du 08/10/2026 (`livrables-Claude-Agency/NOTES.md`, sections du 08/10).
Dépôt de travail : `livrables-Claude-Agency`. Dossier d'un lot : `sortants/annonces-missions/<lot>/`
(le lot du 08/10 est `v4/`, à prendre comme modèle). Lire d'abord le `CLAUDE.md` du dépôt (pièges connus).

## Condition préalable bloquante

**Rien n'est programmé tant que Julien n'a pas confirmé par écrit qu'il porte les missions.**
Sans cette confirmation écrite (mail archivé, cité dans le README du lot) : retirer la mention
« portée par Claude Agency » de chaque annonce, ou ne pas publier. Ne jamais la garder « en attendant ».

**Trois accords distincts de l'utilisateur, dans la conversation en cours** : textes, images,
programmation. Rien n'est programmé avant le troisième. Aucun mail n'est envoyé par outil.

## 1. Lire le document de Julien

- Le .docx est joint à son mail. Extraire le texte par script, pas à la main.
- Si un document précédent existe, comparer les deux par script et lister ce qui change
  (posts ajoutés ou retirés, lignes nouvelles, mentions retirées). Les versions périmées sont
  signalées comme telles dans le README du lot.
- Aucune offre inventée.

## 2. Comparer avec l'annonce d'origine

- Retrouver chaque annonce d'origine (Free-Work, LeHibou…) et l'ouvrir.
- Comparer TJM, durée, lieu, date de démarrage, environnement technique. Tout écart va dans
  `sources-origine.md` et devient une question à Julien ; on ne corrige pas son document de soi-même.

## 3. Rédiger

- Charger `linkedin-mise-en-forme` et l'appliquer.
- Appliquer les constats de `sortants/annonces-missions/etude/corps.md` (chiffres et écarts
  succès / flops : les lire dans ce fichier, ne pas les recopier ici) : phrase « pourquoi cette
  mission vaut le coup », écriture en « je », rémunération chiffrée.
- **TJM dans la ligne 1**, jamais en gras (règle du lot v4 : les 10 annonces l'ont en ligne 1).
  La ligne 2 dit qui je cherche, la durée et le lieu.
- **Les FAITS sont recopiés mot pour mot** du document de Julien : TJM, durée, lieu, rythme,
  démarrage, environnement, lien. Contrôle par script contre le .docx : 0 écart attendu.
- **Textes fixes, identiques dans toutes les annonces** : la phrase d'envoi
  « Vous pensez à quelqu'un en lisant ça ? Envoyez-lui ce post. » et l'appel à candidater
  du document de Julien (avec le lien dans le texte).
- Deux fichiers par annonce : `NN.md` (relecture) et `NN.final.txt` (gras Unicode, à coller).
- `verif-post.mjs` sur chaque annonce, comparée à celle qui la précède dans le planning : schéma
  toujours différent. L'échec « aucun chiffre sans source » sur le TJM est un faux positif connu.
- Passe `humanizer` si la skill existe sur le poste ; sinon le dire.

## 4. Images

- Une fiche « mission » 1080 × 1350 pour la moitié des annonces, à la charte Claude Partners
  (`#763D2C`), générée par script (modèle : `v4/images/generer-fiches.js`). Chaque champ est
  recopié du texte ; contrôle de chevauchement par le script.
- Répartir les groupes avec et sans image pour équilibrer TJM et lieux (tableau dans le README).

## 5. Planning

- 13:00 Paris, **un jour libre entre deux annonces**, **alternance avec image / sans image**.
- **Annonces en semaine**, sauf décision contraire de Julien.
- **Buffer gratuit = 10 posts programmés au maximum** : compter les créneaux libres avant le
  planning, et programmer en vagues si besoin (vérifier l'offre du compte avant de compter).
- Relire la file Buffer en direct avant de fixer les dates (pas un relevé de la veille).
- Un post texte qui occupe le 13:00 passe à 17:30 le même jour ; **jamais décalé au week-end**.
- **Ne jamais déplacer un post de Julien** : tout post de la file absent de nos fichiers est à lui.
  Si son post prend le créneau, l'annonce attend une décision de l'utilisateur.
- Les annonces sont hors du test des formats. Mettre à jour `linkedin/test-formats-2026-10/suivi-posts-*.csv`.

## 6. Tester une annonce avec image, puis programmer le reste

- Programmer d'abord **une seule** annonce avec image, puis la relire dans la file : heure
  « (Europe/Paris) », image présente, lien dans le texte, premier commentaire vide.
  Si l'aperçu du lien a remplacé l'image : « Replace link preview with media ».
- Seulement ensuite, programmer les autres, canal Claude Partners (`6aa87ac6ea19ca0bde439e7f`) :
  texte collé par évènement `paste` (la frappe au clavier n'entre pas dans l'éditeur), empreinte
  comparée au `.final.txt`, aperçu de lien vide retiré sur les annonces sans image, date relue sur
  le bouton, « Your post is scheduled » à chaque fois.
- Chrome au premier plan pendant toute la série.

## 7. Relire la file

Recharger la page, relire **toute** la file (20 posts par chargement, défiler) : chaque annonce à
son créneau, image ou non selon le planning, lien présent, posts décalés à 17:30. Noter le compteur.

## 8. Mail du planning à Julien

Fichier `linkedin/mails/AAAA-MM-JJ-planning-annonces.md` puis brouillon Gmail dans la boîte de
l'adresse Gmail de l'utilisateur (à lui demander), via Claude in Chrome, jamais envoyé par outil.
Une ligne par annonce (date, heure, intitulé, TJM, avec ou sans image), les annonces non
programmées et pourquoi, le lien GitHub du lot vérifié. Aucun texte à trou ; Julien vouvoyé.

## 9. Relevé à 48 h

Ajouter dans `NOTES.md` le tableau « Relevé à 48 h des annonces (Buffer Insights) » : une ligne
par annonce avec « Publication prévue » et « Relevé à faire le » (publication + 48 h, heure de
Paris), colonnes impressions, réactions, commentaires, enregistrements, envois, lien LinkedIn.
La routine Windows « LinkedIn - 5 Releve 48 h des annonces » (`linkedin/routines/5-releve-48h-annonces.md`)
remplit impressions, réactions et commentaires chaque jour à 14:00 Paris ; si le lot dépasse le
15/11/2026, prolonger sa date de fin dans `register-routines.ps1`.
**Identification d'une annonce** (routine comme relevé à la main), les deux conditions à la fois :
son intitulé exact (ligne 💼, ou ligne 2 de l'accroche, telle qu'elle est dans `NN.final.txt`) ET sa
date et heure de publication prévues (± 1 h). Plusieurs posts correspondent, ou aucun : rien n'est
écrit dans la ligne, « ALERTE : identification ambiguë » est noté avec les candidats trouvés.
Un post absent de nos fichiers n'est jamais relevé : c'est un post de Julien.
**Enregistrements et envois : seulement dans les statistiques LinkedIn de Julien (capture qu'il
envoie), jamais dans Buffer** (Buffer ne les donne pas par post, constaté le 08/10/2026). En
attendant la capture : « non fourni », jamais 0.

## Fin

NOTES.md à jour (fait, reste, décisions), commit et push des fichiers nommés un par un,
puis « Livrable » et « Statut ».
