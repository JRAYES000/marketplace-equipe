---
name: linkedin-commentaires
description: "Trouve des posts LinkedIn recents et frais (<4h) sous des comptes cibles et redige un commentaire sur mesure, dans l'un des quatre genres du brief, pour julien-partners ou julien-agency. Activation MANUELLE uniquement : ne se declenche jamais d'elle-meme, seulement sur demande explicite (ex. 'fais les commentaires du jour', 'commentaires LinkedIn pour julien-agency')."
---

# linkedin-commentaires

**Activation MANUELLE uniquement.** Cette skill ne se lance jamais d'elle-meme -- seulement sur
demande explicite.

**Phrase de lancement** : « les commentaires du jour ».
Variantes probables : « fais les commentaires du jour », « commentaires LinkedIn pour
julien-agency/julien-partners », « lance la veille commentaires », « qu'est-ce qu'on commente
aujourd'hui ».

## Ce que fait la skill

1. `lib/trouver-posts.js` (`trouverPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes listes dans `comptes_cibles` de
   `reglages-comptes.json`. **Champ obligatoire : `targetUrls`, pas `profiles`** -- avec
   `profiles` l'acteur renvoie zero post sans aucune erreur.
2. `trierPosts` ecarte les carrousels (`document.totalPageCount` present -- commenter dessus
   reviendrait a commenter un post non lu) et les posts au-dela de `seuil_max_commentaires`,
   trie par date decroissante.
3. `lib/planifier-commentaires.js` (`filtrerPostsFrais`) ne garde que les posts publies il y a
   moins de 4 heures. `validerQuotaJournalier` refuse un nouveau commentaire si le quota du jour
   (5) est atteint, ou si la meme personne a deja ete commentee aujourd'hui.
4. La session Claude qui invoque cette skill **ecrit elle-meme** le commentaire, dans le ton de
   `reglages-comptes.json`, en choisissant l'un des quatre genres du brief -- `information_chiffree`,
   `desaccord_argumente`, `histoire_vecue`, `vraie_question` (`GENRES` dans
   `lib/valider-commentaire.js`) -- ce n'est pas une generation automatique en JS.
5. `lib/valider-commentaire.js` (`validerCommentaire`) **refuse** tout brouillon hors des regles
   de forme ou dont le genre declare ne correspond pas au contenu (voir "Garde-fous").
6. `lib/publier-commentaire.js` (`publierCommentaire`) est le **seul** point d'appel qui publie
   reellement : `targetUrn` doit etre le `shareUrn` du post (jamais `urn:li:activity:`, refuse
   par l'API).
7. Une fois publie, `lib/registre.js` (`enregistrerCommentairePublie`) l'ajoute a
   `data/registre-commentaires.json` (gitignore) -- ce registre fait respecter le quota d'un
   lancement a l'autre.
8. `node dry-run.js` (**sans argument** -- il boucle automatiquement sur tous les comptes de
   `reglages-comptes.json`, il n'y a pas de filtre par compte) execute les etapes 1-5 sans
   jamais appeler `publierCommentaire`. Bascule sur le jeu fixture des que `APIFY_TOKEN` est
   absent (a lui seul, meme si `comptes_cibles` est rempli) et/ou que `comptes_cibles` est vide.

## Point de situation

Lancer `node etat.js [compte]` avant toute chose -- affiche en trois lignes le dernier
commentaire publie, le quota du jour deja utilise, et l'etat des comptes cibles. `dry-run.js` et
`etat.js` proposent un repli concret des que rien n'est disponible (aucun post frais, aucun
compte cible, quota atteint) -- jamais les mains vides.

## Comptes cibles

`comptes_cibles` est rempli dans `reglages-comptes.json` : 16 profils LinkedIn francais reels
(8 par marque -- le brief demande "8 a 12 comptes PAR MARQUE"). Detail et methode de
verification : `references/comptes-cibles-proposition-20260914.md`.

## Variables d'environnement (`.env.example`)

- **`APIFY_TOKEN`** -- requis pour `trouverPosts` ; sans lui, repli fixture (voir plus haut).
- **`NOTION_TOKEN`** + **`NOTION_PARENT_PAGE_ID`** -- pour la base "Commentaires" (suivi a 3
  jours). `NOTION_PARENT_PAGE_ID` est l'ID de la page Notion **deja partagee avec
  l'integration** (bouton "..." de la page -> "Connexions") sous laquelle creer la base.
- **`COMPOSIO_API_KEY`** -- repli REST statique, pas la voie qui sert reellement a publier (voir
  `linkedin-carrousel/SKILL.md`, section "Publication reelle", pour la voie qui fonctionne).

## Garde-fous automatiques (refus explicite, jamais un avertissement)

### Structure et frequence -- `lib/planifier-commentaires.js`

- **Fraicheur** : seuls les posts de moins de 4h sont retenus. Sur des comptes peu actifs
  (moins de quelques posts/semaine chacun), un passage donne legitimement 0 post frais -- pas un
  signe de panne, le repli documente (poster le plus recent en le signalant) est alors la norme.
- **Quota journalier (5/jour)** et **jamais deux fois la meme personne le meme jour** --
  verifie contre `data/registre-commentaires.json`, pas une simple limite documentee.

### Contenu du commentaire -- `lib/valider-commentaire.js`

- **2 a 4 phrases**, aucune puce/liste numerotee, aucun emoji, aucun lien.
- **Formulations creuses refusees** ("super post", "tellement vrai", "top", "merci du partage").
- **Genre coherent avec le contenu** : `information_chiffree` exige un chiffre dans le texte,
  `vraie_question` exige que le texte se termine par "?".
- **Aucune experience personnelle non sourcee** : un commentaire qui affirme a la premiere
  personne ("on"/"nous"/"j'ai") avoir vecu une experience professionnelle concrete (client,
  mission, resultat) est **refuse**, sauf si `anecdoteSourcee: true` est passe explicitement --
  ce que seule une confirmation reelle de Julien ou Nomena autorise. **Ne jamais inventer une
  anecdote pour remplir le genre `histoire_vecue`** (ou toute autre affirmation d'experience) :
  sans anecdote confirmee, choisir un autre genre. Voir `references/` pour l'incident qui a
  motive cette regle.
- **Accents manquants** (`lib/valider-orthographe.js`) : refuse tout texte contenant un mot
  d'une liste fermee de mots toujours accentues en francais standard -- heuristique
  volontairement imparfaite (mots ambigus type "a"/"à" exclus pour eviter les faux positifs).

`node --test` : 49 tests.

## Suivi a 3 jours (regle 3 du brief -- lecture par capture d'ecran)

Aucun OCR : c'est la **session Claude** qui lit les chiffres visibles sur la capture d'ecran
collee dans la conversation, puis appelle le script avec ce qu'elle a lu :
```
node mettre-a-jour-stats.js --auteur "Jean ZENDJI" --date 2026-09-15 \
  --jaime 4 --reponses 1 --reponseAuteur true --vuesProfil 12 --demandesContact 0
```
`retrouverLigneCommentaire` refuse explicitement si plusieurs lignes correspondent au meme
auteur (preciser `--date` leve l'ambiguite).

**Comparaison hebdomadaire** ("le coeur de la skill" selon le brief : commentaires de la semaine
cote a cote avec vues de profil et demandes de contact) : `creerVueComparaisonHebdomadaire`
cree un graphique Notion (nombre de commentaires par semaine seul -- l'API Notion n'accepte
qu'un axe Y par vue). `ecrireBlocComparaisonHebdomadaire` complete avec un **bloc tableau natif**
sur la page (les 3 chiffres cote a cote, une ligne par semaine) : **`pageId` doit etre la page
PARENTE de la base "Commentaires"** (jamais l'ID de la base elle-meme -- une base de donnees
Notion n'accepte pas de blocs enfants). A relancer pour rafraichir (pas une vue qui se met a
jour seule).

## Regles d'usage (brief du 10/09/2026, section 2) -- etat actuel

1. **Phrase de lancement** : faite.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]`.
3. **Lecture des chiffres depuis une capture d'ecran** : mecanisme pret et fonctionnel (voir
   "Suivi a 3 jours") -- premiere execution reelle prevue une fois les posts publies depuis
   3 jours (voir `references/` pour la date exacte).
4. **Rien ne plante a vide** : `validerCommentaire`/`validerQuotaJournalier` refusent avec un
   message explicite ; `etat.js` et `dry-run.js` gerent le cas "rien de disponible".
5. **Jamais les mains vides** : `dry-run.js` et `etat.js` proposent un repli concret des que
   rien n'est disponible.

## Historique et incidents

Decisions de conception, incidents reels (dont l'invention d'une anecdote inexistante, a
l'origine de la regle "jamais d'experience non sourcee"), blocages Notion resolus, publications
reelles : `references/linkedin-commentaires-historique.md`. Etat des lieux transverse aux 3
skills : `references/etat-linkedin-20260912.md`.
