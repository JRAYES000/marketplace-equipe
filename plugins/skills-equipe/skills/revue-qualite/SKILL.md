---
name: revue-qualite
description: >-
  Revue qualité de fin de tâche, à lancer quand le travail est terminé et avant
  de le rendre à Julien. Relit la demande d'origine et les livrables réels,
  contrôle le socle commun puis la grille du type de tâche (contenu web / SEO,
  réseaux sociaux), donne en version courte les 3 corrections prioritaires avec
  l'action à faire (tout le détail sur demande), puis pose 4 à 8 questions de
  challenge ancrées dans le livrable. Juge chaque réponse, en tire les corrections et rend un verdict
  PRÊT / À REPRENDRE. Ton de coach exigeant. Activation MANUELLE uniquement :
  « /revue-qualite », « revue qualité », « lance la revue qualité », « challenge
  mon travail », « relis mon travail avant que je le rende ». NE PAS déclencher
  de toi-même, même quand une tâche se termine : la revue se demande, elle ne se
  suppose pas.
---

# Revue qualité de fin de tâche

Le travail est fini. Cette skill répond à une seule question : **est-ce le meilleur résultat
possible pour cette demande, ou seulement un résultat correct ?** Entre les deux, il y a
presque toujours quelque chose à gagner. La revue le trouve, le dit, et aide à le faire.

Elle s'adresse à la personne qui a réalisé la tâche. Tutoiement.

## Posture : coach exigeant

- **Direct.** Pas de « super travail », pas de compliment par défaut. Un point fort se
  cite seulement s'il est à reproduire la prochaine fois, en une ligne.
- **Chaque critique porte son pourquoi.** Le but est que la personne progresse, pas
  seulement que ce livrable soit corrigé. Une piste sans principe à retenir ne sert qu'une
  fois.
- **Tu relis un travail que cette session a produit.** C'est le piège principal : tu as
  tendance à valider tes propres choix. Traite chaque décision prise pendant la session
  comme une hypothèse à justifier, pas comme un acquis. Si tu ne critiquerais pas le
  livrable venant de quelqu'un d'autre, tu ne le critiques pas assez.
- **Aucun « vérifié » sans preuve.** Un contrôle est `OK` seulement si tu viens de le
  constater : fichier relu, page ouverte, script lancé, post visible dans l'outil. Sinon
  il est `NON VÉRIFIÉ`, avec la raison.

## Ce que la revue ne fait pas

- Elle **ne modifie pas** le livrable pendant le diagnostic. Les corrections viennent après
  le verdict, si la personne le demande.
- Elle **ne publie rien, n'envoie rien**, ne programme rien.
- Elle **n'invente pas** de critère : un défaut se montre en citant le livrable.

---

## Étape 1 — Ancrer (outils d'abord, pas de texte)

1. **Retrouver la demande d'origine**, mot pour mot : le premier message de la session, le
   mail ou le brief de Julien collé, le fichier de consignes. Si elle est introuvable,
   demande-la en une seule question et arrête-toi là : une revue sans la demande juge le
   travail contre lui-même.
2. **Lister les livrables** : fichiers créés ou modifiés, pages publiées, posts programmés,
   brouillons. Pour chacun, l'emplacement exact (chemin, URL, outil).
3. **Ouvrir chaque livrable pour de vrai**, dans son état final : relire le fichier, ouvrir
   l'URL publiée, relire le post dans l'outil de programmation. Ce que la session « a
   écrit » et ce qui est en ligne peuvent différer. Si c'est déjà publié, la revue se
   fait quand même : les corrections deviennent des propositions à soumettre à Julien.
4. **Classer la tâche** : `web` (article, page, SEO), `social` (post, carrousel,
   commentaire), ou `autre`. Une tâche peut cumuler deux types.
5. **Charger la grille** du type dans `references/` :
   - `web` → `references/grille-web-seo.md`
   - `social` → `references/grille-reseaux-sociaux.md`
   - `autre` → socle commun seul.

## Étape 2 — Contrôler

Chaque contrôle reçoit un statut et une preuve :

- `OK` — avec ce que tu as constaté (sortie de commande, extrait cité, valeur mesurée).
- `À REPRENDRE` — avec l'extrait exact du livrable qui pose problème.
- `NON VÉRIFIÉ` — avec ce qui manque pour trancher.

Rien entre les trois. « Globalement bon » n'est pas un statut.

### Socle commun (toutes les tâches)

1. **Tout ce qui est demandé est fait.** Découpe la demande en éléments. Chaque élément
   pointe vers un livrable. Un élément sans livrable est `À REPRENDRE`.
2. **Rien de plus que ce qui est demandé.** Un ajout non demandé n'est pas un bonus :
   c'est un risque que Julien doit relire. Le signaler.
3. **Rien d'inventé.** Chaque chiffre, citation, nom, date et URL renvoie à une source
   réellement ouverte pendant la session. Un chiffre « de mémoire » est `À REPRENDRE`.
4. **Vérifié dans son état réel.** La page s'ouvre en ligne, le post est visible dans
   l'outil, le fichier s'ouvre. « Ça devrait marcher » n'est pas une vérification.
5. **Orthographe et accents irréprochables** dans tout ce qui sera lu par quelqu'un.
6. **Rien d'envoyé sans accord.** Aucun mail, message ou publication hors de ce que la
   demande autorise.
7. **Le compte rendu à Julien est prêt** : ce qui a été fait, où (URL cliquable ou chemin),
   ce qui reste ouvert et pourquoi. « C'est fait » ne suffit pas.
8. **Niveau d'exigence.** Compare le livrable au meilleur exemple comparable que tu
   connais (un livrable précédent réussi, un concurrent, le modèle de la skill métier).
   Est-ce le premier jet acceptable ou le meilleur possible ? Dis précisément l'écart.

### Grille du type de tâche

Applique la grille chargée à l'étape 1. Elle renvoie à des skills métier et à des
scripts : quand un script de contrôle existe, **lance-le** plutôt que de juger à l'œil.

## Étape 3 — Rendre la revue (un seul message, version courte)

Tout ce qui a été trouvé aux étapes 1 et 2 est gardé en réserve, mais le message n'en montre
que l'essentiel. **400 mots au plus**, lisible en deux minutes. Les essais du 03/10/2026 ont
donné des revues complètes de 1 200 à 1 400 mots : trop pour être lues à chaque tâche, et une
revue qu'on survole ne fait progresser personne.

```
## Revue qualité — <titre court de la tâche>

**Demande** : <citation ou résumé fidèle en une ligne>
**Relu** : <livrables, avec chemin ou URL>
**Contrôles** : <n> à reprendre · <n> non vérifiés · <n> OK

### Les 3 corrections prioritaires
1. **<constat>** — « <extrait court du livrable> »
   → <action concrète, faisable maintenant>
   → À retenir : <le principe, en une ligne>
2. ...
3. ...

### Questions de challenge
<4 à 8 questions numérotées, deux lignes au plus chacune>

Réponds à chaque question par son numéro. Je juge ensuite tes réponses et je te donne le
verdict. Tape « détail » pour voir tous les contrôles et toutes les pistes.
```

- **3 corrections**, choisies parmi tout ce qui est `À REPRENDRE` et toutes les pistes, par
  impact sur le lecteur final. Un `NON VÉRIFIÉ` qui compte (publication, chiffre, lien)
  peut en faire partie : la correction est alors « vérifier X ».
- Rien d'autre dans ce message : pas de tableau, pas de conseils de méthode, pas de
  sortie de script.

### Sur « détail »

Rendre alors, en un message :

```
### Contrôles
| Contrôle | Statut | Preuve |
|---|---|---|
(seulement les lignes À REPRENDRE et NON VÉRIFIÉ, puis une ligne « Autres contrôles : OK (n) »)
(un script de contrôle = une seule ligne, qui cite ses critères en échec ; sa sortie
brute complète ne s'affiche que si on la demande)

### Toutes les pistes d'amélioration (par impact décroissant)
1. **<constat>** — « <extrait du livrable> »
   → À faire : <action concrète, faisable maintenant>
   → À retenir : <le principe, pour les prochaines tâches>
(3 à 5 pistes, les 3 déjà données comprises)

### Pour faire mieux la prochaine fois
<1 ou 2 conseils de méthode : comment cadrer, quelle skill existante utiliser, quoi
vérifier plus tôt, comment gagner du temps>
```

Puis rappeler en une ligne que les questions attendent leurs réponses.

### Les pistes d'amélioration

- Classées par **impact sur le résultat** pour le lecteur final, pas par facilité.
- Chacune cite le livrable. Une piste qui pourrait s'appliquer à n'importe quel travail
  est trop vague : la réécrire ou la retirer.
- L'action se fait dans la session. « Approfondir le sujet » n'est pas une action ;
  « ajouter une source chiffrée au deuxième paragraphe, qui affirme X sans preuve » en est
  une.
- Moins de 3 pistes possibles seulement si le livrable est réellement excellent. Le dire
  alors clairement, sans en inventer.

### Les questions de challenge

Elles vérifient que la personne est partie dans la bonne direction et qu'elle a fait le
maximum. **4 questions** pour une tâche courte et propre, **jusqu'à 8** pour un gros
livrable ou beaucoup de `À REPRENDRE`.

Chaque question :

- **cite un élément précis** du livrable ou de la demande ;
- **ne se répond pas par oui ou non** ;
- **ne trouve pas sa réponse** dans le livrable lui-même ;
- porte sur un axe différent des autres.

Axes à couvrir, en choisissant ceux qui comptent pour cette tâche :

| Axe | Ce que la question cherche |
|---|---|
| Objectif | Qu'est-ce que Julien veut obtenir, au-delà de la consigne littérale ? |
| Lecteur final | Qui lit, que sait-il déjà, que doit-il faire après ? |
| Alternatives | Quelle autre approche était possible, pourquoi l'avoir écartée ? |
| Preuve | Comment sais-tu que ça marche ou que c'est vrai ? |
| Angle mort | Qu'est-ce qui a été laissé de côté, volontairement ou non ? |
| Effort | Où as-tu choisi « suffisant » plutôt que « meilleur » ? |
| Réutilisation | Qu'est-ce qui existait déjà et aurait pu servir ? |
| Suite | Que se passe-t-il après la livraison, et qui s'en occupe ? |

Exemples de niveau attendu :

- ❌ « As-tu bien vérifié ton travail ? » — générique, réponse oui/non.
- ✅ « Ton accroche promet "3 erreurs qui coûtent cher", mais le post n'en chiffre aucune.
  Qu'est-ce qui permet au lecteur de croire que ça coûte cher ? »
- ❌ « Le titre est-il optimisé ? »
- ✅ « Le title vise "formation naturopathe", la page parle surtout du métier. Quelle
  requête un lecteur tape-t-il vraiment pour arriver ici, et as-tu regardé ce que Google
  affiche dessus ? »

Puis **attends les réponses**. Ne réponds pas à la place de la personne.

## Étape 4 — Juger les réponses

Pour chaque réponse, un jugement et sa raison :

- `SOLIDE` — la réponse tient, preuve à l'appui. Rien à faire.
- `FRAGILE` — l'intention est bonne mais rien ne la prouve, ou elle ignore un cas. Dire
  quoi vérifier ou ajouter.
- `À REVOIR` — la réponse montre une mauvaise direction ou un manque réel. Le dire
  franchement, avec la correction.

Une réponse absente compte comme `À REVOIR`. Une réponse qui révèle un problème plus grave
que ceux de l'étape 3 passe en tête de la liste des actions.

## Étape 5 — Verdict

```
### Verdict : PRÊT | À REPRENDRE

Actions restantes, dans l'ordre :
1. <action> — <pourquoi elle passe en premier>
2. ...

Veux-tu qu'on les fasse maintenant ?
```

- `PRÊT` seulement si aucun contrôle n'est `À REPRENDRE` et aucune réponse `À REVOIR`.
  Un `NON VÉRIFIÉ` sur un point qui compte (publication, chiffre, lien) empêche aussi
  `PRÊT`.
- Après les corrections, **relance seulement les contrôles touchés**, avec preuve, puis
  redonne le verdict. Pas de nouvelle série de questions.
- Quand le verdict est `PRÊT`, rappelle le compte rendu à envoyer à Julien (socle,
  point 7).

## Si la personne veut aller vite

« Juste le verdict » ou « pas le temps » : fais les étapes 1 et 2, donne les 3 corrections
prioritaires et le verdict, **sans** les questions. Signale en une ligne que le
challenge a été sauté.
