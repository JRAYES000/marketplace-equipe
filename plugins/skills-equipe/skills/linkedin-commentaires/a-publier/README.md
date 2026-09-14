# Cinq commentaires reels -- 5/5 valides par le code, prets, non publies (mis a jour le 15/09/2026)

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

**Les 5 passent desormais reellement `validerCommentaire`** (forme, genre, experience non
sourcee, accents) -- verifie contre le code, pas suppose.

Produits en faisant reellement tourner le pipeline (`trouverPosts` reel sur les 16 comptes
valides par Julien, `trierPosts`, `filtrerPostsFrais`, redaction manuelle par la session Claude
comme prevu au point 3 du SKILL.md) -- voir `commentaires-2026-09-14.json` pour le detail complet
(post cible, `shareUrn`, genre, texte). **Aucun appel a `publierCommentaire` n'a ete fait.**

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

| # | Compte | Auteur cible | Fraicheur | Genre final | Resultat `validerCommentaire` |
| --- | --- | --- | --- | --- | --- |
| 1 | julien-partners | Virginie Caurraze | 0.9h (frais) | vraie_question | **ACCEPTE** (inchange depuis le 14/09) |
| 2 | julien-partners | Theophile Burnet | 1.2h (frais) | information_chiffree | **ACCEPTE** -- reecrit : chiffre reel sourcable (Stack Overflow Developer Survey 2025), plus de claim client |
| 3 | julien-partners | Florent Pontiac | 71.4h (hors fenetre) | vraie_question | **ACCEPTE** -- reecrit : question reelle sur le site livre, plus de "client sportif" invente |
| 4 | julien-partners | Valentin Muller | 74.5h (hors fenetre) | desaccord_argumente | **ACCEPTE** -- reecrit : argument sur le fond, plus de "on a livre" |
| 5 | julien-agency | Jean Zendji | 72.2h (hors fenetre) | vraie_question | **ACCEPTE** -- reecrit : question reelle sur le systeme de tri, plus de "client hotelier" invente (l'incident signale par Julien) |

Texte complet de chaque commentaire dans `commentaires-2026-09-14.json` (champ `texte`).

## En attente du GO de Julien

Rien n'a ete publie. Les 5 sont techniquement prets (forme + fond + accents, verifie par le code
reel) mais restent en attente du GO explicite. Pour publier reellement un commentaire une fois le
GO recu : `publierCommentaire({ actorUrn: <selon le compte>, targetUrn: <shareUrn ci-dessus>,
message: <texte> })`, puis `enregistrerCommentairePublie(compte, { date, auteurCible, postId })`
pour que le quota journalier en tienne compte des le prochain lancement.
