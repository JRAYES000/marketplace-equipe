# Plan -- accent couleur sur la diapo hook (retour de Julien, 18/09/2026)

Contexte : Julien a envoyé 3 carrousels LinkedIn de référence qu'il juge réussis
(Théophile Burnet, Sébastien Grillot, Benoît Dubos), consigne « s'en inspirer,
itérer ». Cadrage fait via `/phrase-magique` -- réponses retenues :

- **Palette** : garder les couleurs de marque actuelles (ocre/vert/terracotta),
  augmenter le contraste + accent sur le mot-clé -- pas de rupture de charte.
- **Visuel hook** : rester 100% typographique (pas de photo/icône, pas de
  source d'image fiable disponible) -- renforcer l'impact par la couleur.
- **Garde-fou codé** : nouveau champ obligatoire `accent` sur la diapo hook
  dans `lib/valider-diapos.js`.
- **Validation** : re-rendre les 3 carrousels déjà publiés
  (julien-agency 14/09→15/09, julien-partners 18/09) avec le nouveau template,
  comparer visuellement à l'identique à ce qui est en ligne.

## Patterns retenus des 3 références (diapo hook uniquement, inspectée réellement)

- Contraste fort systématique (aucune des 3 n'est en teintes douces).
- **Un seul mot/chiffre du titre est coloré**, jamais tout le titre dans une
  seule teinte (Dubos : "200"/"11" en vert vif sur fond clair ; Grillot :
  "ChatGPT" en pastille jaune sur fond rouge ; Burnet : pas d'accent couleur,
  mais contraste noir/blanc maximal).
- Retenu : l'accent couleur sur UN segment du titre. Écarté : palette vive
  hors charte, photo/icône (voir cadrage), flèche/CTA sur le hook (déjà réservé
  à `contexte: "carrousel"`, pas touché ici).

## Étapes

- [x] Ouvrir et inspecter les 3 posts de référence (diapo hook).
- [x] Comparer aux templates actuels (`templates/*.html`) et aux garde-fous
      (`lib/valider-diapos.js`).
- [x] Cadrage `/phrase-magique` (4 questions, réponses ci-dessus).
- [x] Coder le champ `accent` : `lib/valider-diapos.js` (`validerDiapos`)
      refuse si la diapo hook n'a pas de champ `accent` non vide, ou si
      `accent` n'est pas une sous-chaîne exacte de `titre`.
- [x] Templates (les 3 : julien-partners, julien-agency, page-claude) :
      nouvelle classe CSS `.accent-mot` (couleur = `--accent-text` existant,
      déjà propre à chaque marque -- pas de nouvelle couleur inventée).
- [x] `generer-pdf.js` (`injecterDiapo`, `titreAvecAccent`) : injecte le titre
      avec le segment `accent` entouré du `<span>`, reste identique sinon.
- [x] Fixtures existantes mises à jour (`diapos-exemple.json`,
      `diapos-10-conformes.json`, `diapos-test-julien-partners-ia-pme.json`,
      et les deux fichiers `a-publier/*.json` réellement publiés) avec un
      champ `accent` cohérent.
- [x] Tests : `valider-diapos.test.js` (2 nouveaux cas), nouveau
      `test/accent-hook.test.js` (rendu HTML du span), 2 tests adversariaux
      corrigés (accent ajouté aux diapos hook qu'ils construisent).
- [x] Rendu comparatif réel généré (`sortants/_comparaison-accent-18-09/`)
      pour julien-agency et julien-partners, avant/après vus directement
      (Read image) -- accent bien visible et sur la bonne couleur de marque.
- [x] Documenté dans `SKILL.md` : les 3 références, ce qui a été retenu/écarté
      et pourquoi, le changement fait, avant/après.
- [x] `npm test` vert (92/92, sortie brute) ; bump version + commit à suivre.

## Critères de réussite (binaires)

1. La diapo hook affiche un segment du titre dans une couleur distincte de
   `--ink`, visible sur le rendu PNG réel -- pas juste en gras/taille.
2. Les 86 tests existants + les nouveaux passent (`npm test`, sortie brute).
3. Le rendu comparatif avant/après est réellement généré (fichiers PNG sur
   disque) pour les 3 carrousels déjà publiés, pas juste décrit.
4. Aucun champ `accent` absent sur une diapo hook ne passe `validerDiapos`
   silencieusement -- refus explicite si absent ou si pas une sous-chaîne du
   titre.
