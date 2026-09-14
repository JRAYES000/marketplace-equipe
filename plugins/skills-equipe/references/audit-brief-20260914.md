# Audit -- ecart depot vs brief de Julien du 14/09/2026

**Limite de methode a lire avant tout le reste** : le texte integral du brief n'a jamais ete
colle dans la conversation (placeholder laisse vide, deux fois, y compris en mode `/fonce`).
Cet audit s'appuie donc sur le resume que la demande elle-meme contenait (chiffres et
exigences cites en prose), pas sur le document verbatim. Partout ou la formulation exacte du
brief change la reponse (definition precise d'"accroche", contenu exact des "quatre genres",
format exact attendu pour Notion/"bilan"), c'est signale explicitement ci-dessous comme
verification impossible sans le texte complet -- pas devine.

Aucune correction de code ou de contenu n'a ete faite pendant cet audit, comme demande.

## 1. linkedin-carrousel -- nombre de diapos

**NON CONFORME, A ARBITRER AVEC JULIEN (ne pas trancher seul, comme demande).**

- Brief (resume) : 10 diapos.
- Reel : `a-publier/julien-agency-2026-09-12.json` contient **5 diapos**.
- Ce carrousel de 5 est celui dont la publication reelle a ete tentee la session precedente
  (upload du PDF confirme `AVAILABLE`, appel `POST /rest/posts` execute avec succes technique
  apparent -- voir `references/etat-linkedin-20260912.md`, en attente de confirmation visuelle
  de Julien).
- Question a trancher par Julien : le carrousel de 5 deja engage compte-t-il comme l'exemple
  reel attendu malgre l'ecart avec le brief, ou faut-il en refaire un a 10 diapos (et si oui,
  le post deja publie reste-t-il en ligne ou doit-il etre remplace) ?

## 2. Regles d'ecriture du brief

**NON CONFORME sur le contenu deja redige, ET non codifie dans les SKILL.md.**

Verifie sur les 3 textes reels dans `a-publier/` (julien-agency, 12/09/2026) :

| Regle (resumee) | carrousel | veille-virale | commentaires |
| --- | --- | --- | --- |
| Gras sans accent | Aucun gras utilise | Aucun gras | Aucun gras |
| 3 a 5 emojis | 0 emoji | 0 emoji | 0 emoji |
| 1300-1900 caracteres | 316 caracteres | 591 caracteres | 392 caracteres |
| Accroche dans les 140 premiers caracteres | Hook net ("Vos meilleurs candidats ne partent presque jamais pour le salaire.", 68 car.) | Premiere phrase = 153 caracteres, deborde si "accroche" = phrase complete | Premiere phrase deborde aussi les 140 caracteres au sens strict |
| Aucun chiffre sans source | "3 signes" = structurel, pas une donnee chiffree externe | "dix outils" cite sans source inline dans le texte publie (la source reelle existe, mais seulement documentee dans le `README.md`, pas dans le post lui-meme) | Pas de chiffre cite dans le texte lui-meme |

**Codification en SKILL.md** : recherche exhaustive (`emoji`, `1300`, `1900`, `gras`,
`accroche`, `sans accent`) sur les 3 SKILL.md concernes -- **aucune trace**. Ces regles ne sont
inscrites nulle part comme obligation permanente pour un contenu futur.

## 3. linkedin-commentaires -- fraicheur, ciblage concurrent, "quatre genres"

**NON CONFORME sur le code ; donnee manquante sur les "quatre genres".**

- "Quatre genres" : aucune definition trouvee nulle part dans le depot (recherche sur
  `genre`, tous fichiers `skills-equipe`). Aucun fichier "brief du 10 septembre" n'existe dans
  ce depot non plus. **Il faut le texte exact du brief pour connaitre ces quatre genres** --
  rien a verifier tant qu'ils ne sont pas donnes noir sur blanc.
- Fraicheur `<4h` : absente du code. `lib/trouver-posts.js` / `trierPosts` trie uniquement par
  date decroissante et filtre sur le nombre de commentaires -- aucun seuil horaire nulle part.
- Ciblage concurrent (pas le propre profil de Julien) : absent du code. `comptes_cibles` est
  vide dans `reglages-comptes.json` (deja documente, voir Point n°5 de
  `references/etat-linkedin-20260912.md`), et rien dans le code n'empeche techniquement de
  cibler le propre profil de l'auteur -- les exemples reels rediges jusqu'ici l'ont d'ailleurs
  fait, faute d'alternative (deja signale comme limite dans `a-publier/README.md`).

## 4. linkedin-veille-virale -- 10 influenceurs, score, Notion

**NON CONFORME sur les trois points.**

- Liste de 10 influenceurs americains : absente. Recherche sur `influenceur` dans tout
  `skills-equipe` -- aucune trace, aucune liste nulle part.
- Logique de score par rapport aux abonnes : absente du code (`trierPosts` ne calcule aucun
  score, seulement un tri par date et un filtre par nombre de commentaires).
- Integration Notion : absente de ce depot et de cette session. Le README racine de
  `marketplace-equipe` mentionne Notion comme connecteur **installable** par un membre de
  l'equipe ("Parcourir → Notion → Connecter"), mais aucun outil Notion n'est charge dans cette
  session (verifie par recherche d'outils differes -- aucun resultat), et aucune skill
  `linkedin-*` ne l'utilise dans son code.

## 5. Obligations transverses

- **Version du plugin** : deja a `1.14.17`, au-dela de la plage `1.13.0 → 1.14.0` mentionnee --
  **CONFORME**, rien a faire (confirme ce que l'utilisateur avait deja constate).
- **Gabarit de SKILL.md** : aucun fichier-gabarit dedie trouve dans ce depot. La seule
  contrainte documentee est celle du `CLAUDE.md` racine de `marketplace-equipe` : `name` ≤ 64
  caracteres (minuscules/chiffres/tirets, identique au nom du dossier) et `description` ≤ 1024
  caracteres apres pliage YAML. Les 3 SKILL.md `linkedin-*` la respectent deja
  (**CONFORME** sur ce point precis). Si le brief attend un format plus riche (sections
  obligatoires, structure imposee), **impossible a verifier sans le texte exact**.
- **Une ligne par skill dans le README du paquet** : **NON CONFORME**. Le tableau de
  `plugins/skills-equipe/README.md` ne contient **aucune ligne** pour `linkedin-carrousel`,
  `linkedin-veille-virale` ou `linkedin-commentaires` -- verifie par recherche directe.
- **"Activation manuelle uniquement"** : **conforme dans les faits, non conforme dans la
  forme**. Aucun hook, aucun mecanisme d'auto-declenchement n'existe dans le paquet (pas de
  fichier `hooks` dans `.claude-plugin`) -- rien ne s'active seul. Mais aucune des 3
  descriptions de frontmatter `linkedin-*` ne porte la mention explicite "activation MANUELLE"
  comme le font les autres skills de `skills-equipe` (`fonce`, `phrase-magique`, etc.).

## 6. Exigences d'usage ("phrase courte pour lancer", "point de situation en trois lignes", "aucun chiffre a retaper", "rien ne plante a vide")

**Verifie : ce n'est PAS une convention d'equipe preexistante.** Recherche exhaustive
(`capture d'ecran`, `screenshot`, `point de situation`, `plante a vide`, `phrase courte`) sur
l'ensemble de `skills-equipe`, y compris `fonce` et `phrase-magique` -- **aucune trace nulle
part**. Ces exigences semblent specifiques a ce chantier precis, pas une convention a
retrouver ailleurs. A confirmer avec Julien que ce sont bien de nouvelles exigences (probable),
pas une reference a un document que je n'aurais pas trouve.

## 7. Notion -- deux pages, partage, commande "bilan"

**NON CONFORME / MANQUANT sur les deux plans.**

- Connecteur Notion disponible dans cette session : **non** -- verifie par recherche d'outils
  differes, aucun outil `notion` charge. A activer par un membre de l'equipe avant de pouvoir
  creer/partager quoi que ce soit sur Notion (voir README racine pour la procedure
  d'installation du connecteur).
- Commande "bilan" utilisee ailleurs dans skills-equipe : **non trouvee**, recherche faite sur
  tout le depot. Rien a reutiliser ; le comportement exact attendu de cette commande n'est
  connu que par le resume donne dans la demande -- **le texte exact du brief est necessaire**
  pour l'implementer correctement (contenu des deux pages, portee de "modification" partagee
  avec `contact@claudeagency.fr`).

## Recapitulatif

| # | Point | Verdict |
| --- | --- | --- |
| 1 | Carrousel 10 vs 5 diapos | NON CONFORME -- a arbitrer avec Julien |
| 2 | Regles d'ecriture (contenu + SKILL.md) | NON CONFORME sur les deux plans |
| 3 | Commentaires : genres/fraicheur/ciblage | NON CONFORME (code) + donnee manquante (genres) |
| 4 | Veille : influenceurs/score/Notion | NON CONFORME sur les trois |
| 5a | Version plugin | CONFORME |
| 5b | Gabarit SKILL.md | CONFORME sur les contraintes connues ; le reste depend du brief |
| 5c | Ligne README par skill | NON CONFORME |
| 5d | Activation manuelle (forme) | CONFORME dans les faits, NON CONFORME dans la forme |
| 6 | Exigences d'usage | NON CONFORME, et confirme ne pas etre une convention existante |
| 7 | Notion + "bilan" | MANQUANT (connecteur) + NON CONFORME (commande) |

**Blocage transverse** : plusieurs reponses precises (les quatre genres, la definition exacte
d'"accroche", le contenu exact attendu des pages Notion et de la commande "bilan") exigent le
texte integral du brief, jamais fourni dans cette conversation. Le reste de l'audit -- tout ce
qui compare l'etat du code/contenu aux chiffres et exigences deja resumes dans la demande --
est complet et ne depend pas de ce texte.
