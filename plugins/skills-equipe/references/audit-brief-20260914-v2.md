# Audit v2 -- ecart depot vs brief de Julien (10/09 + precisions du 14/09)

Ce fichier **remplace** `audit-brief-20260914.md` (v1), redige avant que Julien ne fournisse
des elements plus precis. La v1 reste en place pour l'historique, mais ne plus s'y referer --
les verdicts ci-dessous sont plus a jour.

**Limite de methode a lire avant tout le reste, pour la troisieme fois** : le texte integral
du brief de Julien (10/09) n'a toujours pas ete colle dans la conversation -- le placeholder
prevu pour ca est reste vide a nouveau. Cet audit s'appuie donc sur le resume detaille fourni
en prose dans la demande elle-meme, qui est plus riche que celui du 14/09 mais reste un resume,
pas le document verbatim. De plus, la section "LES CINQ REGLES D'USAGE" recue s'arrete apres le
point 3 -- **les regles 4 et 5 sont inconnues**, pas seulement leur formulation exacte.

Deux points ont ete traites en priorite comme demande, avant le reste de l'audit :

## Point A -- carrousel a 5 diapos au lieu de 10 (8-12 impose) -- MON AVIS

**Recommandation : ne pas supprimer le post existant. Produire un second carrousel conforme
(8 a 12 diapos, 10 par defaut) comme exemple reel du 20/09, et laisser le premier en l'etat.**

Pourquoi, dans cet ordre :

1. **Le premier post n'a pas de statut confirme.** La session precedente a execute l'appel
   `POST /rest/posts` (etape 4 de l'API Documents) avec succes technique apparent
   (`successful: true`, corps vide -- LinkedIn ne renvoie pas l'ID de post de maniere exploitable
   via `proxy_execute`), mais **Julien n'a pas encore confirme visuellement** que ce post existe
   reellement et s'affiche correctement (meme prudence que pour la tentative precedente, qui
   s'est revelee ne jamais avoir existe malgre un succes apparent identique). Décider de le
   "supprimer" suppose de savoir avec certitude qu'il existe -- ce n'est pas le cas aujourd'hui.
2. **Supprimer un post LinkedIn reel est irreversible et sortant** (action visible publiquement,
   potentiellement deja vue par des relations de Julien) : le faire sans certitude sur son
   existence, puis devoir refaire un carrousel de toute facon si finalement il n'existait pas,
   double le risque pour zero benefice.
3. **Produire un second carrousel conforme est la seule action qui avance dans tous les cas** :
   que le premier post existe ou non, l'exemple reel a 10 diapos attendu pour le 20/09 doit de
   toute facon exister. Le produire ne depend pas de trancher sur le premier.
4. **Cout marginal faible** : le contenu (`a-publier/julien-agency-2026-09-12.json`) est deja
   redige pour 5 diapos ; l'etoffer a 8-12 diapos (angle proche, plus de detail/structure) est
   un travail de contenu, pas un nouveau chantier technique -- le pipeline (generation PDF,
   upload, publication) est deja valide de bout en bout.

**Reste a Julien de trancher** : une fois qu'il aura confirme si le premier post existe, la
question retombe seule -- s'il n'existe pas, rien a supprimer, le second carrousel devient le
seul exemple reel. S'il existe, garder les deux (un post non conforme deja en ligne n'est pas
en soi un probleme vis-a-vis de LinkedIn, seulement vis-a-vis de la consigne du brief pour
*l'exemple de reference du 20/09*) ou le supprimer sont deux options encore ouvertes -- mais
la suppression n'est plus bloquante pour avancer.

## Point B -- nommage du fichier PDF -- CORRIGE

**Fait.** `generer-pdf.js` (et `generer-images.js`, aligne pour rester coherent) ne produisent
plus `sortants/<compte>/AAAA-MM-JJ-<slug>.pdf` mais `sortants/<compte>/<Titre lisible en
francais>.pdf` -- sans date, sans numero, casse et accents conserves (fonction
`nomFichierDepuisTitre`, testee : `"Pourquoi vos meilleurs candidats disparaissent avant
l'offre.pdf"` sur le contenu reel actuel). Anti-collision : suffixe `" (2)"`, `" (3)"` en dernier
recours (cas limite, pas la norme), jamais un numero colle au titre. Documente dans
`linkedin-carrousel/SKILL.md`. Version du plugin bumpee a `1.14.19` (correction de code).

---

## Audit skill par skill (conforme / non conforme / a arbitrer)

### CARROUSEL

| Regle (resume recu) | Etat reel | Verdict |
| --- | --- | --- |
| 8 a 12 diapos, 10 par defaut | 5 diapos dans le seul contenu reel existant | **NON CONFORME** (voir Point A ci-dessus) |
| 25 mots max (par diapo, presume) | Non verifie automatiquement -- aucune limite codee dans `generer-pdf.js`/templates | **NON CONFORME (absence de garde-fou dans le code)** ; contenu reel non mesure mot a mot dans cet audit -- a faire si le point devient prioritaire |
| Tailles de police | Fixees dans les templates HTML (`templates/*.html`), jamais comparees a une regle chiffree du brief -- **le texte exact du brief est necessaire** (quelles tailles, pour quels roles de diapo) | **IMPOSSIBLE A VERIFIER SANS LE TEXTE EXACT** |
| Numerotation / fleche | Numerotation `{{NUMERO}}` presente et injectee (`01`, `02`...) ; aucune fleche/indicateur "suite" trouve dans les templates | **A VERIFIER** -- necessite de voir un rendu ou le texte exact du brief sur la forme attendue |
| Nom de fichier derive du titre, francais lisible, sans date ni numero | Corrige (Point B) | **CONFORME (depuis ce jour)** |
| Sortie dans `sortants/` | Deja le cas | **CONFORME** |

### REGLES D'ECRITURE

Deja verifie en detail dans l'audit v1 (section 2) sur les 3 contenus reels -- **rien n'a
change depuis**, ces contenus n'ont pas ete retouches :

| Regle | carrousel | veille-virale | commentaires |
| --- | --- | --- | --- |
| Gras converti en unicode | Aucun gras utilise | Aucun gras | Aucun gras |
| 3-5 emojis, placement regle | 0 emoji | 0 emoji | 0 emoji |
| 1300-1900 caracteres | 316 (bien en-dessous) | 591 (en-dessous) | 392 (en-dessous) |
| Accroche/question dans les 140 premiers caracteres | Hook net, 68 car. | Premiere phrase 153 car., deborde | Premiere phrase deborde aussi |
| Cadence chiffre+detail / 100 mots | Non mesure automatiquement -- pas de regle codee | idem | idem |
| Limite de hashtags | Aucun hashtag dans les 3 contenus -- rien a limiter concretement | idem | idem |
| Formulations interdites (liste) | **Liste elle-meme inconnue** -- necessite le texte exact du brief | -- | -- |
| Chiffre non source refuse | Pas de chiffre externe cite sans source dans le texte du post lui-meme (le "dix outils" de veille-virale est documente en source dans le README, pas dans le post -- limite deja signalee) | -- | -- |

**Verdict global : NON CONFORME sur le format (les 3 contenus reels sont bien plus courts que
1300-1900 caracteres et sans emoji/gras), ET non codifie dans les 3 SKILL.md comme obligation
permanente pour tout contenu futur.** Ces regles ne sont ecrites nulle part comme contrainte de
generation -- elles ne s'appliqueront pas automatiquement au prochain contenu redige tant
qu'elles ne sont pas ajoutees aux SKILL.md.

### COMMENTAIRES

| Regle | Etat reel | Verdict |
| --- | --- | --- |
| 8-12 comptes par marque, fichier editable | `reglages-comptes.json` existe et est editable, mais `comptes_cibles` est **vide** pour les deux comptes (`julien-partners`, `julien-agency`) -- voir Point n°5 de `etat-linkedin-20260912.md` | **NON CONFORME (liste vide, decision editoriale de Julien/Nomena requise -- pas invente ici)** |
| Deux passages par jour | Aucune planification/cron codee dans le depot | **NON CONFORME (absent du code)** |
| Fraicheur <4h, priorite au temps pas a la popularite | `lib/trouver-posts.js`/`trierPosts` trie uniquement par date decroissante (pas de seuil horaire explicite verifie) et filtre par nombre de commentaires (`seuil_max_commentaires`) | **PARTIELLEMENT CONFORME** : le tri par date va globalement dans le sens de la fraicheur, mais aucun seuil `<4h` n'est code en dur -- rien ne rejette un post de 5h ou 10h |
| 5/jour max, jamais 2x la meme personne le meme jour | Aucun compteur journalier ni deduplication par auteur code | **NON CONFORME (absent du code)** |
| Quatre genres nommes | **Toujours introuvables nulle part dans le depot** -- recherche refaite sur `genre`, aucun resultat | **DONNEE MANQUANTE -- texte exact du brief necessaire** |
| 2-4 phrases, pas de listes/emoji/liens | Contenu reel (`a-publier/`) : 1 seul paragraphe de 2 phrases, pas de liste/emoji/lien | **CONFORME sur ce seul exemple** ; aucune regle codee pour le garantir sur du contenu futur |
| Page Notion avec colonnes | Connecteur Notion absent de cette session (verifie), donc rien cree | **NON CONFORME / BLOQUE (connecteur a activer)** |

### VEILLE-VIRALE

| Regle | Etat reel | Verdict |
| --- | --- | --- |
| 10 influenceurs americains, fichier texte hors code, partage entre 3 comptes | Aucune liste trouvee nulle part dans le depot (recherche refaite) | **NON CONFORME -- a fournir (liste editoriale, pas a moi de l'inventer)** |
| Un passage par jour | Aucune planification codee | **NON CONFORME (absent du code)** |
| Formule de score | `trierPosts` ne calcule aucun score (tri date + filtre commentaires seulement) | **NON CONFORME -- et la formule exacte manque pour l'implementer** |
| Max 3/semaine, jamais meme jour, jamais baisser le seuil pour completer le quota | Rien de code en ce sens | **NON CONFORME (absent du code)** |
| Adapter (pas traduire), original note | Contenu reel (`a-publier/`) rediges comme adaptation en francais, mais rien ne documente/marque systematiquement le post original dans le contenu genere lui-meme (seulement dans le `README.md` interne) | **PARTIELLEMENT CONFORME** -- pratique correcte mais pas tracee dans le livrable final |
| Page Notion "Veille & posts" + commande "bilan" (analyse 30 jours format/sujet par compte) | Connecteur Notion absent ; commande "bilan" introuvable ailleurs dans skills-equipe | **NON CONFORME / BLOQUE (connecteur) + A CONSTRUIRE (commande)** |

### OBLIGATIONS TRANSVERSES

| Point | Etat | Verdict |
| --- | --- | --- |
| Version du plugin | `1.14.19` (bumpee ce jour pour la correction du Point B) | **CONFORME** |
| Gabarit SKILL.md | Toujours aucun fichier-gabarit dedie trouve ; seules contraintes documentees = celles du `CLAUDE.md` racine (name/description). Format plus riche eventuellement attendu par le brief : **impossible a verifier sans le texte exact** | **CONFORME sur le connu ; le reste depend du brief** |
| Une ligne par skill dans le README du paquet | Verifie a nouveau (`grep -i linkedin` sur le README) -- **toujours aucune ligne** pour les 3 skills `linkedin-*` | **NON CONFORME (inchange depuis v1)** |
| "Activation manuelle" -- mention explicite dans le frontmatter | Toujours absente des 3 descriptions `linkedin-*` (rien ne s'auto-active dans les faits, mais la mention textuelle manque, contrairement a `fonce`/`phrase-magique`) | **CONFORME dans les faits, NON CONFORME dans la forme (inchange)** |

### LES CINQ REGLES D'USAGE

Seuls 3 points sur 5 ont ete recus (la demande s'arrete au milieu de la liste) :

1. Phrase courte de lancement + variantes, en haut du SKILL.md et dans le README -- **absente
   des 3 SKILL.md et README actuels**. NON CONFORME.
2. Point de situation en trois lignes des la premiere ligne -- **absent**. NON CONFORME.
3. Aucun chiffre a recopier a la main (lecture de capture d'ecran) -- rien dans le code actuel
   ne lit de capture d'ecran ni n'evite la recopie manuelle de chiffres. NON CONFORME.
4. **INCONNU** -- non recu.
5. **INCONNU** -- non recu.

**Il manque les points 4 et 5 pour clore ce bloc.**

### NOTION (transverse aux 3 skills)

- Deux pages a creer, partagees en modification avec `contact@claudeagency.fr`, colonnes
  listees dans le brief : connecteur absent de cette session (verifie a nouveau) -- rien ne
  peut etre cree tant qu'un membre de l'equipe ne l'a pas installe. **Contenu exact des
  colonnes toujours inconnu** (mentionne comme existant dans le brief mais pas reproduit dans
  le resume recu).
- Commande "bilan" : toujours introuvable ailleurs dans `skills-equipe`. A construire des que
  Notion sera disponible et que son format exact (analyse 30 jours par compte, format/sujet)
  sera confirme par le texte du brief.

---

## Recapitulatif

| # | Point | Verdict |
| --- | --- | --- |
| A | Carrousel 5 vs 8-12 diapos | NON CONFORME -- avis donne (2e carrousel conforme, ne pas supprimer le 1er tant que non confirme), decision finale a Julien |
| B | Nommage fichier PDF | **CORRIGE** aujourd'hui |
| Carrousel -- structure (mots/police/fleche) | NON CONFORME / impossible a verifier sans texte exact |
| Ecriture -- format (longueur/emoji/gras/accroche) | NON CONFORME sur le contenu deja redige, et non codifie dans les SKILL.md |
| Commentaires -- ciblage/frequence/genres | NON CONFORME sur le code ; genres = donnee manquante |
| Veille-virale -- influenceurs/score/frequence | NON CONFORME sur les trois |
| Version plugin | CONFORME |
| Gabarit SKILL.md | CONFORME sur le connu |
| Ligne README par skill | NON CONFORME |
| Activation manuelle (forme) | NON CONFORME dans la forme seulement |
| 5 regles d'usage (1-3 recues) | NON CONFORME sur les 3 ; points 4-5 inconnus |
| Notion (2 pages + "bilan") | BLOQUE (connecteur) + A CONSTRUIRE, details des colonnes inconnus |

**Blocages transverses qui empechent de finir cet audit a 100%** :
1. Texte integral du brief du 10/09 -- toujours pas recu (placeholder vide une troisieme fois).
2. Points 4 et 5 des "cinq regles d'usage" -- coupes dans le message recu.
3. Contenu exact des colonnes Notion attendues -- mentionne comme existant mais non transmis.

Aucune correction de code ou de contenu n'a ete faite au-dela des Points A (avis, pas de
decision prise) et B (corrige comme explicitement demande), conformement a la consigne "sans
rien corriger a ce stade" pour le reste.
