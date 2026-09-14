# Audit v3 -- ecart depot vs brief integral de Julien (10/09/2026)

Ce fichier **remplace** `audit-brief-20260914-v2.md`, redige a partir du texte integral et
verbatim du brief de Julien, recu ce jour. Les v1 et v2 restent en place pour l'historique
(elles montrent ce qui etait deductible avant d'avoir le texte complet), mais ne plus s'y
referer pour le detail -- tout ce qui suit est plus precis et corrige les points qui etaient
marques "impossible a verifier" faute du texte.

## Decisions actees dans cette session

- **Point A (carrousel 5 vs 8-12 diapos)** : Julien tranche -- ne rien supprimer. Un second
  carrousel conforme (10 diapos) est produit comme exemple reel du 20/09. Le sort du premier
  (5 diapos, existence meme non confirmee) reste ouvert jusqu'a confirmation visuelle de
  Julien. **Fait** : `a-publier/julien-agency-2026-09-14-v2.json` (10 diapos) +
  `a-publier/julien-agency-2026-09-14-v2.commentary.txt` (texte du post, regles d'ecriture
  appliquees -- detail plus bas) + PDF genere reellement via `generer-pdf.js`
  (`sortants/julien-agency/Pourquoi vos meilleurs candidats disparaissent-ils avant
  l'offre.pdf`, 10 pages verifiees, 81 564 octets, nom de fichier conforme au Point B).
  **Non fait a ce stade** : la publication reelle sur LinkedIn -- pas de "GO" recu pour cet
  acte irreversible dans ce message-ci ; en attente.
- **Point B (nommage du fichier PDF)** : deja corrige la session precedente (`1.14.19`).

---

## 1. AVANT D'ECRIRE UNE LIGNE DE CODE (section 1 du brief)

| Exigence du brief | Etat reel | Verdict |
| --- | --- | --- |
| Composio d'abord, Apify en dernier recours | Respecte pour le carrousel (aucune donnee tierce necessaire). Pour veille-virale et commentaires, Apify a ete utilise (`APIFY_TOKEN`) car Composio n'expose pas d'action de lecture des posts d'un tiers (confirme dans `references/actions-composio.md`, 24 actions listees, aucune ne lit les posts d'un compte non connecte) | **CONFORME** -- l'usage d'Apify est justifie exactement comme prevu par le brief ("aucune interface officielle ne donne ca") |
| Revue des 24 actions Composio dans `references/actions-composio.md` | Fichier existant, 24 actions documentees une a une (nom, description verbatim, parametres, scopes, portee compte propre/tiers), conforme au format demande | **CONFORME** |
| Test decisif `LINKEDIN_CREATE_COMMENT_ON_POST` sur un post tiers, resultat note | Documente en detail dans le meme fichier -- mais le test reste **bloque** (aucun compte LinkedIn connecte n'a ete trouve sous la cle testee le 11/09), pas resolu en succes/echec definitif a cette date-la | **PARTIELLEMENT CONFORME** -- le tour d'horizon est fait et le blocage est bien documente comme demande ("Tu tranches seul et tu notes le resultat"), mais **ce diagnostic du 11/09 est perime** : la session du 12/09 a confirme que le compte julien-agency (`urn:li:person:aFqu-W7ClW`) est bien connecte et fonctionnel en ecriture (publication carrousel reussie techniquement). **A remettre a jour** : reexecuter le test du commentaire sur un post tiers avec la connexion desormais fonctionnelle, et trancher enfin architecture automatique vs collage manuel pour `linkedin-commentaires`. |
| Cle OpenRouter -- clarification du role | Note comprise (modele pas cher pour reecrire les textes), mais **aucun usage d'OpenRouter constate dans le depot** a ce jour | **NON CONFORME (non utilise) mais pas bloquant** -- rien dans le brief n'oblige a l'utiliser immediatement, seulement a comprendre son role |
| Garde-fou `installer-garde-fou.sh` | A verifier -- **hors perimetre technique de cette session** (hook git local a la machine qui execute les commits, pas un etat du depot) | **NON VERIFIABLE DEPUIS ICI** -- a confirmer par la personne qui commite localement qu'elle l'a bien lance une fois |
| `.env.example` + variables d'environnement documentees par skill | `linkedin-carrousel` : a verifier precisement (aucune cle necessaire pour la generation PDF pure, la publication passe par Composio/session, pas par une variable d'env classique) ; `linkedin-veille-virale`/`linkedin-commentaires` : utilisent `APIFY_TOKEN`, lu depuis l'environnement (confirme dans le code des scripts de recuperation), mais **aucun `.env.example` trouve dans ces deux skills** | **NON CONFORME sur les 2 skills recentes -- a ajouter** |
| Aucune cle dans le depot public | Verifie a nouveau -- aucune cle en clair trouvee dans les fichiers commit du dossier `skills-equipe` | **CONFORME** |

## 2. OU DEPOSER, LES QUATRE OBLIGATIONS DU DEPOT

| Obligation | Etat reel | Verdict |
| --- | --- | --- |
| 1.13.0 -> 1.14.0 | Deja largement depasse (`1.14.19` a ce jour) | **CONFORME** |
| En-tete SKILL.md (name/description) | Verifie sur les 3 SKILL.md `linkedin-*` -- respectent la contrainte `name` ≤ 64 caracteres/minuscules-tirets identique au dossier, `description` ≤ 1024 caracteres | **CONFORME** |
| Une ligne par skill dans le README du paquet | Verifie de nouveau (`grep -i linkedin` sur `plugins/skills-equipe/README.md`) -- **toujours aucune ligne** pour les 3 skills | **NON CONFORME (inchange depuis v1/v2) -- a faire** |
| Mise a jour en 2 temps apres push (claude.ai + CLI) | Actions humaines/interface web, hors de ce que cette session peut verifier depuis le depot | **NON VERIFIABLE DEPUIS ICI** |
| "Activation MANUELLE" + interdiction de se lancer seule + liste des phrases declencheuses, dans CHAQUE description | Verifie sur les 3 frontmatter `linkedin-*` : **aucune des 3 ne porte cette mention**, contrairement a `fonce`/`phrase-magique` | **NON CONFORME -- a corriger sur les 3 SKILL.md, obligatoire, pas seulement recommande** |

## 3. LES CINQ REGLES D'USAGE (section 2 du brief) -- desormais completes

Les points 4 et 5, manquants dans les messages precedents, sont maintenant connus.

| # | Regle | Etat reel | Verdict |
| --- | --- | --- | --- |
| 1 | Phrase courte de lancement + variantes, en tete du SKILL.md et dans le README | Absente des 3 SKILL.md et du README | **NON CONFORME** |
| 2 | Point de situation en 3 lignes des la premiere ligne (ex. "Dernier post publie : il y a 6 jours") | Rien de code en ce sens dans les 3 skills -- aucune n'a de logique d'ouverture qui resume un etat courant | **NON CONFORME** |
| 3 | Aucun chiffre a recopier a la main -- lecture d'une capture d'ecran des stats LinkedIn | Aucune lecture d'image/capture d'ecran codee nulle part dans le depot | **NON CONFORME** |
| 4 | Rien ne plante au premier lancement (tableau Notion vide -> le dit et continue ; liste de comptes vide -> en propose une ; cle manquante -> dit laquelle et ou la mettre) | `reglages-comptes.json` a des `comptes_cibles` vides et rien dans le code ne "propose une liste" a la place -- les scripts plantent ou tournent a vide sans message explicite selon les cas (a verifier script par script, pas fait dans cet audit) | **NON CONFORME (au moins sur le cas verifie : comptes_cibles vide)** |
| 5 | Jamais les mains vides -- si rien trouve, proposer un repli (sujet gagnant passe, angle different), jamais "rien a signaler" | Aucune logique de repli codee dans `trierPosts`/`recupererPosts` (linkedin-veille-virale) ni ailleurs | **NON CONFORME** |

**Verdict global : NON CONFORME sur les 5 points.** Ce ne sont pas des ameliorations
cosmetiques -- le brief les nomme explicitement comme la condition pour qu'une skill "serve
vraiment" plutot que d'etre "abandonnee au bout de trois semaines". A traiter avec le meme
serieux que les regles d'ecriture, skill par skill, dans l'ordre de priorite annonce.

## 4. REGLES D'ECRITURE (section 3 du brief)

Verifie sur les 3 contenus reels dans `a-publier/` (12/09/2026, avant la correction de ce
jour) + sur le nouveau contenu produit ce jour pour le second carrousel :

| Regle | carrousel (12/09) | veille-virale (12/09) | commentaires (12/09) | carrousel v2 (14/09, ce jour) |
| --- | --- | --- | --- | --- |
| Gras (2 etoiles -> unicode sans accent, post sans gras refuse) | **0 gras -- aurait du etre refuse** | **0 gras -- aurait du etre refuse** | **0 gras -- aurait du etre refuse** | 2 passages en gras unicode (`𝐓𝐫𝐨𝐢𝐬 𝐬𝐢𝐠𝐧𝐞𝐬`, `𝐩𝐥𝐮𝐬 𝐯𝐢𝐭𝐞`), aucun accent dans les mots choisis -- **CONFORME** |
| 3 a 5 emojis, tete de bloc/fin de ligne, jamais au milieu, jamais 2 de suite | 0 emoji -- **hors fourchette, aurait du etre refuse** | 0 emoji -- **hors fourchette** | 0 emoji -- **hors fourchette** | 4 emojis, chacun en tete de bloc, aucun consecutif -- **CONFORME** |
| 1300-1900 caracteres | 316 caracteres -- **tres en-dessous, aurait du etre refuse** | 591 caracteres -- **en-dessous** | 392 caracteres -- **en-dessous** | 1413 caracteres (verifie par script) -- **CONFORME** |
| Accroche = question, dans les 140 premiers caracteres, ne donne pas la reponse | Hook affirmatif ("Vos meilleurs candidats ne partent presque jamais pour le salaire."), pas une question -- **NON CONFORME** | Affirmatif, pas une question, 153 caracteres -- **NON CONFORME (forme ET longueur)** | Affirmatif, deborde aussi les 140 caracteres -- **NON CONFORME** | "Pourquoi vos meilleurs candidats disparaissent-ils avant meme de recevoir votre offre ?" -- question reelle, 87 caracteres, ne donne pas la reponse -- **CONFORME (verifie par script)** |
| Chiffre precis + detail vecu / 100 mots, jamais sans source | Aucun chiffre externe cite (le "3 signes" est structurel, pas une donnee) | "dix outils" cite sans source **dans le post lui-meme** (la source existe mais seulement dans le README interne, jamais lu par le lecteur du post) -- **NON CONFORME** | Pas de chiffre cite | Aucun chiffre externe invente pour ce post -- **volontairement absent plutot que fabrique** : je n'ai pas de statistique verifiable et sourcable sur ce sujet precis a disposition dans cette session, et le brief est explicite ("elle refuse de publier un post dont un chiffre n'a pas de source"). Choix assume : pas de chiffre plutot qu'un chiffre invente. **A completer par un vrai chiffre source si Julien en a un sous la main** (etude RH, donnee interne verifiable) |
| 0 a 2 hashtags, en fin | 0 (dans la fourchette mais jamais teste au-dela) | 0 | 0 | 2 (`#recrutement #rh`), en toute fin -- **CONFORME** |
| Interdits (demande d'engagement, tirets longs, "ce n'est pas X c'est Y", "ravi de vous annoncer", "taguez quelqu'un", MAJUSCULES/! en rafale, denigrer LinkedIn) | Aucun trouve | **Tiret long `--` trouve, 2 occurrences -- NON CONFORME, formulation interdite reellement presente dans un contenu prepare pour publication** | **Tiret long `--` trouve, 1 occurrence, ET tournure proche de "ce n'est pas X mais Y"** -- NON CONFORME | Aucun tiret long, aucune formulation de la liste -- verifie par script -- **CONFORME** |
| Codification en SKILL.md comme obligation permanente | Recherche refaite (`emoji`, `1300`, `1900`, `gras`, `accroche`, `tiret`) sur les 3 SKILL.md -- **toujours aucune trace** | idem | idem | -- |

**Verdict global : les 3 contenus reels du 12/09 (deja prepares pour publication, l'un
techniquement publie sous reserve de confirmation) violent une majorite des regles
d'ecriture du brief -- longueur trop courte, zero gras, zero emoji, accroche non
interrogative, ET, pour veille-virale et commentaires, des tirets longs explicitement
interdits sont bel et bien presents dans le texte tel qu'il a ete prepare. Le second
carrousel produit ce jour (14/09) est le premier contenu du depot verifie conforme sur
l'ensemble de ces regles.** Aucune de ces regles n'est codifiee dans les SKILL.md : rien
n'empechera un futur contenu de retomber dans les memes ecarts tant qu'un garde-fou
(validation automatique refusant un contenu hors regles, comme le brief le demande
explicitement : "la skill refuse ... et propose une autre formulation") n'est pas ecrit.
**Ce garde-fou reste a construire** -- non fait dans cette session, qui a verifie et corrige
manuellement le contenu, pas encore automatise le refus.

## 5. SKILL LINKEDIN-CARROUSEL (section 4 du brief)

| Regle | Etat reel | Verdict |
| --- | --- | --- |
| Pas de generation d'images par IA, PDF de pages typographiees via Playwright/Puppeteer | `generer-pdf.js` utilise Playwright, rend des pages HTML/CSS -- aucune IA generative d'image | **CONFORME** |
| Pages 1080x1350px | Confirme dans le code (`viewport: { width: 1080, height: 1350 }`) et dans les templates | **CONFORME** |
| Un fichier de style par compte | 3 templates distincts existent (`page-claude.html`, `julien-agency.html`, `julien-partners.html`) | **CONFORME** |
| 10 diapos, jamais moins de 8 ni plus de 12 | Contenu du 12/09 : 5 diapos -- **NON CONFORME** (Point A, traite : second carrousel a 10 diapos produit ce jour). Aucune validation automatique n'empeche un futur contenu de retomber sous 8 ou au-dessus de 12 -- **garde-fou a coder** | **NON CONFORME sur le contenu du 12/09 ; CORRIGE sur le nouvel exemple ; garde-fou automatique absent** |
| Diapo 1 accroche seule sans logo ; diapo 2 le gain ; diapos 3-9 une idee chacune ; derniere une action | Templates : `data-role="hook"` masque bien le logo (`display: none`) -- structure geree cote rendu. Contenu 12/09 : structure non respectee (5 diapos seulement, pas de diapo "gain" dediee). Contenu du 14/09 (nouveau) : structure exacte respectee (hook seul, gain, 7 idees, action finale) | **NON CONFORME sur l'ancien contenu ; CONFORME sur le nouveau** |
| 25 mots max par diapo, refus si depassement (jamais reduire la police) | Contenu 12/09 : 2 diapos sur 5 depassaient 25 mots (29 et 26 mots) -- **NON CONFORME, viole aussi le "jamais reduire la police" puisque rien n'a ete raccourci ni refuse**. Contenu 14/09 : verifie par script, toutes les diapos entre 16 et 19 mots -- **CONFORME**. Aucune validation automatique de ce seuil n'existe dans le code -- **garde-fou a coder** | **NON CONFORME sur l'ancien ; CONFORME sur le nouveau ; garde-fou absent** |
| Titres >=64px, texte >=40px, fort contraste | Verifie dans le CSS : titre 76px (88px pour le hook), texte 44px -- **CONFORME**, au-dela meme du minimum demande | **CONFORME** |
| Numero sur chaque diapo, fleche sur la premiere | `{{NUMERO}}` injecte sur toutes les diapos ; `.swipe-hint svg` present et conditionne par `data-role="hook"` | **CONFORME** |
| Nom de fichier PDF derive du titre, francais lisible, sans date ni numero | Corrige ce jour (`nomFichierDepuisTitre`) -- teste sur le nouveau carrousel, produit `Pourquoi vos meilleurs candidats disparaissent-ils avant l'offre.pdf` | **CONFORME** |
| Sortie dans `sortants/` | Confirme, PDF + texte du post cote a cote dans `a-publier/`+`sortants/` | **CONFORME** |

## 6. SKILL LINKEDIN-VEILLE-VIRALE (section 5 du brief)

| Regle | Etat reel | Verdict |
| --- | --- | --- |
| 10 influenceurs americains, fichier texte hors code, une seule liste partagee entre les 3 comptes | **Toujours absente** -- recherche refaite, aucune liste nulle part dans le depot | **NON CONFORME -- decision editoriale requise (Julien/Nomena), pas une chose que je peux inventer sans lien reel vers des comptes existants** |
| Recuperation Composio si possible, sinon Apify, un passage par jour | Apify utilise (justifie, Composio ne lit pas les posts de tiers -- section 1). Aucune planification "un passage par jour" codee | **PARTIELLEMENT CONFORME (choix de l'outil) ; NON CONFORME (frequence non codee)** |
| Score = (reactions + 3×commentaires + 5×partages) / abonnes, seuil + fenetre 7 jours en reglage | `trierPosts` ne calcule aucun score : tri par date decroissante, filtre par `seuil_max_commentaires` uniquement -- **formule totalement absente du code** | **NON CONFORME -- a coder, la formule exacte est maintenant connue et non ambigue** |
| Ne jamais baisser le seuil pour remplir le quota ; annoncer "une seule proposition cette semaine" si besoin | Rien de code en ce sens | **NON CONFORME** |
| Adapter pas traduire, poste d'origine toujours note, max 3/semaine jamais 2 le meme jour | Contenu reel : adaptation en francais (pas une traduction mot a mot) -- **bonne pratique respectee dans les faits**, mais le poste d'origine n'est note que dans le `README.md` interne, pas dans le livrable final destine a Notion | **PARTIELLEMENT CONFORME** |
| Page Notion "Veille & posts", 1 page/3 comptes/3 vues filtrees, colonnes precises (liste complete maintenant connue : Titre, Compte, Lien d'origine, Auteur, Abonnes, Date d'origine, Reactions, Commentaires, Partages, Score, Sujet, Format, Etat, Date de publication, Lien du post publie, Vues/Reactions/Commentaires a 7 jours, Bilan) | Connecteur Notion absent de cette session (verifie a nouveau) -- rien cree | **NON CONFORME / BLOQUE -- connecteur a installer par un membre de l'equipe avant toute action** |
| Commande "bilan" (analyse 30 jours, formats/sujets par compte) | Introuvable ailleurs dans skills-equipe | **NON CONFORME -- a construire, comportement maintenant precisement specifie par le brief** |

## 7. SKILL LINKEDIN-COMMENTAIRES (section 6 du brief)

| Regle | Etat reel | Verdict |
| --- | --- | --- |
| 8-12 comptes par marque, fichier modifiable | `reglages-comptes.json` existe, editable, mais `comptes_cibles` vide pour les 2 comptes | **NON CONFORME (liste vide -- decision editoriale requise)** |
| 2 passages par jour | Aucune planification codee | **NON CONFORME** |
| Priorite aux posts <4h, tri par heure pas par popularite | `trierPosts` trie par date decroissante (va dans le bon sens) mais aucun seuil `<4h` explicite, et le filtre principal reste `seuil_max_commentaires` (popularite), pas la fraicheur | **NON CONFORME -- le tri actuel privilegie implicitement autre chose que la fraicheur pure** |
| 5/jour max, jamais 2× la meme personne le meme jour | Aucun compteur journalier ni deduplication par auteur code | **NON CONFORME** |
| Quatre genres nommes -- desormais connus : (1) information chiffree en plus, (2) desaccord poli argumente, (3) histoire vecue, (4) vraie question. Commentaires vides interdits ("super post", "tellement vrai") | **Enfin connus.** Aucun des 4 genres n'est nomme ni implemente dans le code ; le seul commentaire reel prepare (`a-publier/`) ne se rattache explicitement a aucun des 4 (il ressemble le plus a "information/constat", pas exactement au genre 1 qui exige un chiffre) | **NON CONFORME -- a coder maintenant que la specification est complete** |
| 2-4 phrases, ton naturel, pas de puces/emoji/lien | Contenu reel : 1 paragraphe de 2 phrases, pas de puce/emoji/lien | **CONFORME sur ce seul exemple** ; rien ne garantit ca automatiquement sur du contenu futur |
| Page Notion, colonnes precises (Compte, personne visee, lien du post, date, texte, genre, puis a 3 jours : J'aime/reponses/reponse de l'auteur oui-non/vues de profil/demandes de contact) | Connecteur Notion absent | **NON CONFORME / BLOQUE** |
| Vue croisant nombre de commentaires/semaine et vues de profil + demandes de contact ; arret de la routine si aucun lien au bout de 6 semaines | Rien de code, logique meme pas esquissee | **NON CONFORME -- a construire, mais ne peut raisonnablement s'evaluer qu'apres 6 semaines de donnees reelles** |

## 8. CE QUE JULIEN ATTEND LE 20 SEPTEMBRE (section 7 du brief)

| Exigence | Etat |
| --- | --- |
| 3 skills poussees, version augmentee, README a jour, 2 mises a jour faites | Seul `linkedin-carrousel` existe reellement comme dossier structure avec code de generation ; `linkedin-veille-virale` et `linkedin-commentaires` n'ont que des dossiers `a-publier/`+`data/` (contenu et donnees), **pas de skill executable, pas de SKILL.md dedie a une logique automatisee** -- a verifier precisement dans la prochaine passe (l'audit precedent le supposait, a reconfirmer) |
| 2 pages Notion creees et partagees avec `contact@claudeagency.fr` | Non fait -- connecteur absent |
| Exemple reel par skill, produit en lancant vraiment la skill | Carrousel : 2 exemples reels existent maintenant (5 diapos, existence a confirmer par Julien ; 10 diapos, produit ce jour, PDF genere, non publie). Veille-virale et commentaires : contenu prepare a partir de vraies donnees Apify, mais **jamais deposes dans Notion** (le connecteur n'existe pas), donc l'exemple reel demande ("trois posts adaptes dans Notion", "cinq commentaires ecrits" avec le tableau de suivi) **n'est pas complet au sens du brief** |
| Livraison par email, uniquement des liens cliquables, 3 phrases de lancement dans le corps | Rien envoye a ce jour -- pas encore le moment (echeance le 20/09, 6 jours restants) |

---

## Recapitulatif global

| Domaine | Verdict |
| --- | --- |
| Section 1 -- Composio/Apify/actions | Globalement CONFORME sur la methode ; test decisif a rejouer (perime) ; `.env.example` manquant sur 2 skills |
| Section 2 -- 4 obligations du depot | CONFORME sur version et frontmatter ; NON CONFORME sur README et mention "activation MANUELLE" |
| Section 2bis -- 5 regles d'usage | NON CONFORME sur les 5, aucune exception |
| Section 3 -- regles d'ecriture | NON CONFORME sur les 3 contenus du 12/09 (dont 2 avec formulation explicitement interdite) ; CONFORME sur le nouveau carrousel du 14/09 ; aucun garde-fou automatique nulle part |
| Section 4 -- carrousel | NON CONFORME sur la structure/diapos du contenu du 12/09 ; CORRIGE sur le nouvel exemple (10 diapos) ; CONFORME sur tout le reste du pipeline technique (format, police, nommage, sortie) |
| Section 5 -- veille-virale | NON CONFORME sur la quasi-totalite (liste, score, Notion, frequence, quota) |
| Section 6 -- commentaires | NON CONFORME sur la quasi-totalite (ciblage, frequence, genres, Notion) |
| Section 7 -- livrable du 20/09 | Trop tot pour statuer definitivement ; en l'etat, incomplet sur les 3 skills |

**Priorisation confirmee par le brief lui-meme** ("Ordre de priorite : le carrousel d'abord,
les commentaires ensuite, la veille en dernier" -- "mieux vaut deux skills finies que trois a
moitie faites") : la suite du travail doit se concentrer sur `linkedin-carrousel` jusqu'a
conformite complete (garde-fous automatiques d'ecriture et de structure, mention d'activation
manuelle, ligne README, `.env.example`, phrase de lancement, point de situation, repli si
vide) avant de reprendre `linkedin-commentaires`, puis seulement si le temps le permet
`linkedin-veille-virale`.

Aucune correction de code au-dela de ce qui a ete explicitement demande (Point A : contenu +
PDF du second carrousel ; Point B : deja fait) n'a ete effectuee dans cet audit -- le reste
attend l'arbitrage de priorisation.
