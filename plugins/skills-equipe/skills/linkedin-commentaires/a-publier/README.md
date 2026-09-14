# Cinq commentaires reels -- 5/5 valides par le code ET relus par Julien, GO donne (15/09/2026)

**Historique du 14/09/2026** : Julien a repere qu'un commentaire ("client hotelier") inventait
une mission jamais realisee -- publie sous son identite reelle, qu'il ne relit pas, ca
l'exposerait publiquement si un lecteur demandait un detail. Verification faite sur les 5 :
**4 sur 5 inventaient une experience professionnelle non verifiable.** Un garde-fou automatique
a ete ajoute (`validerAffirmationExperience`, voir SKILL.md "Genre histoire_vecue") -- a partir
de ce moment, 4/5 refuses par le code reel.

**Resolu le 14/09/2026, sans attendre d'anecdote de Julien** (il ne relit rien et ne repond pas
toujours vite -- le livrable du 20 ne pouvait pas en dependre) : les 4 commentaires ont ete
**reecrits dans un genre qui ne demande aucune experience personnelle** -- `vraie_question` ou
`desaccord_argumente` sur le fond, et pour le seul `information_chiffree` restant, un **vrai
chiffre public sourcable** (Stack Overflow Developer Survey 2025, page reellement ouverte et
lue), jamais un chiffre "de chez un client". `histoire_vecue` reste en reserve pour le jour ou
Julien fournira une anecdote reelle -- deviation assumee, les 5 commentaires couvrent 3 genres
sur 4 (`vraie_question` x3, `information_chiffree` x1, `desaccord_argumente` x1).

**15/09/2026** : accents corriges (etaient reellement absents, pas un artefact d'affichage --
verifie sur les octets du fichier), et un garde-fou automatique d'accents ajoute
(`lib/valider-orthographe.js`).

**15/09/2026, relecture de Julien -- deux corrections avant le GO** :
1. **Commentaire n°2 (Theophile Burnet)** : le chiffre initial ("84% des developpeurs utilisent
   deja l'IA au quotidien") deformait la source -- l'enquete Stack Overflow 2025 mesure "using
   or planning to use AI tools" (adoption/intention), pas un usage quotidien. Rouvert la page
   source : elle donne aussi un chiffre qui correspond exactement a "au quotidien" -- **51% des
   developpeurs professionnels utilisent l'IA quotidiennement** ("51% of professional developers
   use AI tools daily"). Chiffre remplace pour que la formulation corresponde exactement a ce
   que la source mesure.
2. **Equilibre des genres** : la premiere version couvrait `vraie_question` x3,
   `information_chiffree` x1, `desaccord_argumente` x1 -- trop concentre sur un seul genre.
   Le commentaire n°5 (Jean Zendji) a ete rebascule de `vraie_question` vers
   `desaccord_argumente` (nuance reelle sur le systeme de tri en 2 categories du post source,
   sans forcer) : le n°3 (Florent Pontiac, post de remerciement client) ne s'y pretait pas sans
   inventer un desaccord qui n'existe pas, laisse en `vraie_question`. Repartition finale :
   `vraie_question` x2, `information_chiffree` x1, `desaccord_argumente` x2,
   `histoire_vecue` x0 -- **deviation assumee** : `histoire_vecue` reste ecarte faute d'anecdote
   reelle confirmee par Julien (voir SKILL.md, "Genre histoire_vecue"), le reste reparti selon
   ce que chaque post source permettait reellement de dire, pas un decoupage force.

**GO donne par Julien le 15/09/2026 pour les cinq**, une fois ces deux points traites --
publication reelle a faire des que le canal Composio/MCP est disponible (voir plus bas).

**Les 5 passent desormais reellement `validerCommentaire`** (forme, genre, experience non
sourcee, accents) -- verifie contre le code, pas suppose.

Produits en faisant reellement tourner le pipeline (`trouverPosts` reel sur les 16 comptes
valides par Julien, `trierPosts`, `filtrerPostsFrais`, redaction manuelle par la session Claude
comme prevu au point 3 du SKILL.md) -- voir `commentaires-2026-09-14.json` pour le detail complet
(post cible, `shareUrn`, genre, texte). **Aucun appel a `publierCommentaire` n'a ete fait a ce
jour** -- GO obtenu, mais aucun canal Composio/MCP ni extension Chrome disponible dans la
session du 15/09/2026 pour executer l'appel reel (voir "Pret a publier" plus bas).

## Deviation assumee -- fraicheur, a ecrire dans le mail du 20

Le brief exige la priorite aux posts de **moins de 4h**. Sur les 16 comptes valides, un seul
passage reel donne :
- **julien-partners** : 2 posts frais trouves (0.9h et 1.2h), sur des auteurs distincts
  (Virginie Caurraze, Theophile Burnet) -- utilises en priorite.
- Pour completer a 5 commentaires au total (le nombre demande comme exemple reel du 20/09),
  **3 commentaires supplementaires s'appuient sur les posts les plus recents disponibles,
  hors fenetre de 4h** (71.4h, 72.2h et 74.5h) -- aucun post plus frais n'existait, a l'heure
  du passage, parmi les auteurs distincts des 16 comptes valides. Conformement a l'instruction
  explicite de Julien ("ne baisse pas la barre en silence"), cet ecart est ecrit ici, pas
  cache : **2/5 commentaires respectent la regle des 4h, 3/5 non**, faute de matiere plus
  fraiche disponible au moment du passage.
- Un seul compte cible sur les 8 de `julien-agency` a produit un post dans la semaine
  ecoulee (Jean Zendji, 2 posts) -- les 7 autres n'ont rien publie recemment. Consequence :
  un seul commentaire a pu etre prepare pour julien-agency aujourd'hui (quota de 5/jour tres
  loin d'etre sature, mais rien d'autre a commenter dans les donnees recuperees).

## Les 5 commentaires -- etat final

| # | Compte | Auteur cible | Lien du post | Fraicheur | Genre final | Resultat `validerCommentaire` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | julien-partners | Virginie Caurraze | [lien](https://www.linkedin.com/posts/virginie-caurraze_autoentrepreneur-risquesprofessionnels-accueilstagiaire-activity-7505178899685744640-z2Yd) | 0.9h (frais) | vraie_question | **ACCEPTE** (inchange depuis le 14/09) |
| 2 | julien-partners | Theophile Burnet | [lien](https://www.linkedin.com/posts/th%C3%A9ophile-burnet_voici-les-40-raccourcis-claude-code-la-plupart-activity-7505173186687299584-Fsu-) | 1.2h (frais) | information_chiffree | **ACCEPTE** -- chiffre corrige le 15/09 (51% "daily", pas 84% "using or planning") |
| 3 | julien-partners | Florent Pontiac | [lien](https://www.linkedin.com/posts/florent-pontiac_carcassonne-xiii-billetterie-boutique-activity-7504114241730408448-SNx6) | 71.4h (hors fenetre) | vraie_question | **ACCEPTE** -- reecrit : question reelle sur le site livre, plus de "client sportif" invente |
| 4 | julien-partners | Valentin Muller | [lien](https://www.linkedin.com/posts/valentin--muller_je-code-100-avec-lia-depuis-plus-dun-an-activity-7504067127067205632-NOpA) | 74.5h (hors fenetre) | desaccord_argumente | **ACCEPTE** -- reecrit : argument sur le fond, plus de "on a livre" |
| 5 | julien-agency | Jean Zendji | [lien](https://www.linkedin.com/posts/jean-zendji-zenfia_arr%C3%AAtez-de-vouloir-r%C3%A9pondre-%C3%A0-tous-vos-avis-activity-7504102064814268416-FPQV) | 72.2h (hors fenetre) | desaccord_argumente | **ACCEPTE** -- rebascule le 15/09 (etait vraie_question) pour rediversifier les genres, nuance reelle sur le tri en 2 categories |

Texte complet de chaque commentaire dans `commentaires-2026-09-14.json` (champ `texte`).

## Pret a publier -- GO obtenu, canal technique manquant

**GO de Julien acquis d'avance pour les cinq** (15/09/2026, une fois les deux corrections
ci-dessus traitees) -- plus besoin de redemander avant de publier. Rien n'a ete publie a ce
jour : cette session n'a ni acces Composio/MCP ni extension Claude in Chrome connectee (meme
blocage que pour le carrousel, voir `linkedin-carrousel/a-publier/README.md`).

**A faire des que le canal est disponible**, un par un, dans le respect des regles suivantes :
- **Jamais deux commentaires a la meme personne le meme jour** -- non applicable ici (5 auteurs
  distincts), mais a verifier via `enregistrerCommentairePublie`/`validerQuotaJournalier` a
  chaque prochain lancement de la skill.
- **Enregistrer chaque publication reelle** immediatement apres succes, pas avant :

```js
const { publierCommentaire } = require('../lib/publier-commentaire');
const { enregistrerCommentairePublie } = require('../lib/registre');

// Pour chaque commentaire de commentaires-2026-09-14.json, dans l'ordre :
const resultat = await publierCommentaire({
  actorUrn: '<selon le compte -- voir reglages-comptes.json>',
  targetUrn: '<shareUrn>',
  message: '<texte>',
});
// Seulement si publierCommentaire reussit reellement :
enregistrerCommentairePublie(compte, { date: new Date().toISOString().slice(0, 10), auteurCible, postId });
```

Ne jamais appeler `enregistrerCommentairePublie` par anticipation -- le registre doit refleter
des publications reelles, pas des intentions.
