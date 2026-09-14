# Cinq commentaires reels -- prets, non publies (14/09/2026)

Produits en faisant reellement tourner le pipeline (`trouverPosts` reel sur les 16 comptes
valides par Julien, `trierPosts`, `filtrerPostsFrais`, redaction manuelle par la session Claude
comme prevu au point 3 du SKILL.md, puis `validerCommentaire` reel) -- voir
`commentaires-2026-09-14.json` pour le detail complet (post cible, `shareUrn`, genre, texte).
**Aucun appel a `publierCommentaire` n'a ete fait.**

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

## Les 5 commentaires

| # | Compte | Auteur cible | Fraicheur | Genre | Lien du post |
| --- | --- | --- | --- | --- | --- |
| 1 | julien-partners | Virginie Caurraze | 0.9h (frais) | vraie_question | [lien](https://www.linkedin.com/posts/virginie-caurraze_autoentrepreneur-risquesprofessionnels-accueilstagiaire-activity-7505178899685744640-z2Yd) |
| 2 | julien-partners | Theophile Burnet | 1.2h (frais) | information_chiffree | [lien](https://www.linkedin.com/posts/th%C3%A9ophile-burnet_voici-les-40-raccourcis-claude-code-la-plupart-activity-7505173186687299584-Fsu-) |
| 3 | julien-partners | Florent Pontiac | 71.4h (hors fenetre) | histoire_vecue | [lien](https://www.linkedin.com/posts/florent-pontiac_carcassonne-xiii-billetterie-boutique-activity-7504114241730408448-SNx6) |
| 4 | julien-partners | Valentin Muller | 74.5h (hors fenetre) | desaccord_argumente | [lien](https://www.linkedin.com/posts/valentin--muller_je-code-100-avec-lia-depuis-plus-dun-an-activity-7504067127067205632-NOpA) |
| 5 | julien-agency | Jean Zendji | 72.2h (hors fenetre) | histoire_vecue | [lien](https://www.linkedin.com/posts/jean-zendji-zenfia_arr%C3%AAtez-de-vouloir-r%C3%A9pondre-%C3%A0-tous-vos-avis-activity-7504102064814268416-FPQV) |

Texte complet de chaque commentaire dans `commentaires-2026-09-14.json` (champ `texte`), deja
valide par `lib/valider-commentaire.js` -- 2-4 phrases, aucun emoji/lien/puce, genre coherent
avec le contenu (chiffre present pour Theophile Burnet, question reelle pour Virginie Caurraze).

## En attente du GO de Julien

Rien n'a ete publie. Pour publier reellement un de ces 5 commentaires : `publierCommentaire({
actorUrn: <selon le compte>, targetUrn: <shareUrn ci-dessus>, message: <texte> })`, puis
`enregistrerCommentairePublie(compte, { date, auteurCible, postId })` pour que le quota
journalier en tienne compte des le prochain lancement.
