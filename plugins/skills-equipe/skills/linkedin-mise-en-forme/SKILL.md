---
name: linkedin-mise-en-forme
description: >-
  Regles de forme obligatoires pour tout post LinkedIn de Julien, compte Claude
  Agency comme compte Claude Partners : accroche libre (question, position,
  chiffre ou situation) qui donne envie de cliquer sur « ... plus », 1 a 4 blocs
  avec ou sans titre, fin libre, 1 ou 2 passages en gras au maximum, niveau de
  lecture d'un enfant de 13 ans, tournures interdites, jamais deux posts de suite
  avec le meme schema, passe humanizer. Se combine avec contenu-linkedin (QUOI
  ecrire) : celle-ci definit COMMENT. Declencher des qu'il s'agit d'ecrire,
  reecrire, relire ou auditer un post LinkedIn, un brouillon dans sortants/ ou
  une accroche. Triggers : « ecris un post LinkedIn », « relis ce post », « mets
  ca en forme pour LinkedIn », « un post sur X ». NE PAS utiliser pour un
  commentaire (linkedin-commentaires), un carrousel (linkedin-carrousel), un
  e-mail ou un contenu de site.
---

# LinkedIn — mise en forme

Regles de forme decidees par Julien le 2026-09-18, **assouplies et completees le
2026-09-29** (mail de 22h08) : accroche libre, 1 a 4 blocs, fin libre, gras reduit a
1 ou 2 passages, trois tournures interdites de plus, et une regle de variete. Elles
s'appliquent aux **deux comptes**, Claude Agency et Claude Partners, au meme niveau.
Ce qui n'a pas change : le controle des accents (regle 2) et des anglicismes.

## Ordre de travail

**Note du 22/09/2026** : `contenu-linkedin` existe reellement, mais c'est une skill de PROJET
(dossier `.claude/skills/` du depot prive `visibilite-ops`), pas une skill de ce paquet
`skills-equipe` -- elle n'est donc chargeable que dans une session dont le dossier de travail
est ce depot-la. Verifie le 22/09/2026 en auditant les trois skills LinkedIn : ce n'est pas un
oubli ni un nom errone, juste une skill qui ne voyage pas avec ce paquet. Dans une session
ailleurs (comme celle qui a ecrit cette note), l'etape 1 ci-dessous n'est pas realisable telle
quelle -- rediger le fond a la main, sans le charger.

1. **Charger `contenu-linkedin`** pour le fond, les formules de hook et les
   regles d'algorithme 2026, si le dossier de travail le permet (voir note
   ci-dessus). Cette skill-ci ne remplace rien : elle se pose par-dessus.
2. Rediger le fond.
3. Appliquer les regles ci-dessous.
4. **Passe `humanizer`** — la skill, pas seulement le fichier de references de
   `contenu-linkedin`.
5. Passer le script de controle avant de deposer le brouillon : il retrouve seul le
   **post precedent du meme compte** (regle 7).

## 1. L'accroche : libre, mais elle fait cliquer

L'accroche peut etre **une question, une prise de position, un chiffre ou une
situation concrete**. Rien n'impose plus la question. Ce qui compte : **les deux
premieres lignes doivent donner envie de cliquer sur « ... plus »**. C'est le temps
de lecture qui decide de la distribution (15,6 % d'engagement au-dela d'une minute
contre 1,2 % en survol, mesure du 09/09).

    "Un recrutement lent coute plus cher qu'une mauvaise embauche."     ->  prise de position
    "Lundi, un candidat a relance mon equipe pour la quatrieme fois."  ->  situation concrete
    "Et si votre automatisation parlait au mauvais client ?"           ->  question

Contraintes qui restent :

- **140 caracteres au maximum** : c'est le seuil du « ... voir plus » sur mobile, et
  l'accroche doit tenir entiere avant le pli.
- **L'accroche n'enonce pas la reponse.** Le hook ouvre, le corps referme.
- Trois mots au moins : le script n'attrape que l'accroche vide ou reduite a un
  fragment. Si elle donne envie de cliquer, c'est a l'oeil qu'on le juge.

## 2. Gras : 1 ou 2 phrases importantes, sans accent

LinkedIn n'a pas d'editeur riche : le gras se fabrique avec les caracteres
Unicode Mathematical Sans-Serif Bold. **Ce bloc ne contient aucune lettre
accentuee.** Un segment accentue mis en gras rend `𝗺𝗲𝘀𝘂𝗿é` — l'accent
retombe en maigre au milieu du mot, visible et moche. Mesure sur le poste de
Julien le 2026-09-18.

La regle : **ne mettre en gras que des segments sans accent**. Si le segment qui
porte le message en contient un, le reformuler jusqu'a en trouver un qui n'en a
pas — pas le passer en gras quand meme.

    "La verite mesuree"  ->  reformuler en  "Trois mois pour rien"

**1 ou 2 passages en gras par post, 2 au maximum** (Julien, 2026-09-29, remplace
« au moins huit ») : la phrase qui porte la lecon, le chiffre qui frappe. Un titre de
bloc en gras compte dans ces deux passages. Le script refuse un troisieme.

Ce qui ne se met **pas** en gras : un paragraphe entier (ce n'est plus un accent,
c'est du bruit), et des mots isoles disperses sans rapport entre eux.

Jamais a la main, toujours par le script (le mapping fait 62 caracteres, une
erreur ne se voit pas a la relecture) :

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" gras "Trois mois pour rien"
```

Il refuse tout segment accentue, avec le caractere fautif. Sous Windows, chemin
en `C:/...` : node ne resout pas la forme `/c/Users/...`.

## 3. Un a quatre blocs, avec ou sans titre

Un post se lit en un coup d'oeil ou ne se lit pas. Il compte **1, 2, 3 ou 4 blocs**
(groupes de paragraphes), chacun **avec ou sans titre** — au choix, selon le sujet
(Julien, 2026-09-29).

- Un titre, s'il y en a un, est **court** et sur sa propre ligne. Il peut etre en
  gras (sans accent, et il compte dans les 2 passages de la regle 2) ou en texte
  simple.
- **Aucun titre ni emoji n'est impose** : plus de « 👉 ⚡ ✅ » obligatoires. Un post
  d'un seul bloc, sans titre, est valide.
- L'accroche vit **au-dessus** du premier bloc, avec une ou deux lignes de tension.
  Le pied commercial vit **sous** le dernier, sans titre.
- **La fin est libre** : une question, une prise de position, une phrase seche.
  « Et vous ? » n'est plus obligatoire, et il ne se met pas par reflexe.
- Le script ne voit que les titres en gras : il plafonne a 4, et un bloc sans titre
  ne laisse aucune trace a mesurer. Le « 1 a 4 blocs » des autres cas se juge a l'oeil.

## 4. Emojis : facultatifs, 6 au maximum, en tete de ligne

Plus aucun emoji n'est impose. S'il y en a, ils remplacent les tirets de liste ou
marquent un titre, poses **en debut de ligne**, jamais glisses au milieu d'une phrase
pour faire joli. Six au maximum sur tout le post : au-dela, le post passe pour un
gabarit.

## 5. Niveau de lecture : 13 ans

L'audience compte beaucoup de jeunes adultes qui veulent se lancer dans l'IA. On
se met a leur niveau — c'est aussi ce qui federe et ce qui fait les vues.

- **Phrases de 20 mots maximum**, 12 en moyenne. Une idee par phrase.
- **Paragraphes de 1 a 3 lignes**, separes par une ligne vide.
- **Aucun terme technique sans son explication a cote, en trois mots.**
  « un workflow » -> « une suite d'etapes automatiques ».
- **Voix active, verbes concrets.** « j'ai teste », pas « une phase de test a ete
  menee ».
- **Chiffres parlants** : « 4 fois plus » plutot que « une hausse de 300 % ».
- Pas de subordonnee dans une subordonnee. Si la phrase a deux virgules, la
  couper en deux.

Ce n'est pas la meme chose que la passe humanizer : humanizer chasse les tells
IA, celle-ci chasse la complexite. Les deux passent.

## 6. Arbitrage — l'anti-IA prime

Une accroche travaillee, du gras et des emojis, lus ensemble, peuvent faire « post
fabrique ». Quand le brouillon sonne artificiel apres la passe humanizer, **retirer de
la mise en forme**, dans cet ordre :

1. un emoji ;
2. un passage en gras ;
3. rien d'autre.

**Un chiffre source, une entite nommee ou un detail concret ne se coupent
jamais** pour gagner en simplicite : ce sont eux qui rendent le post credible.
Si la simplicite et la precision se heurtent, c'est la phrase qu'on reecrit, pas
le fait qu'on supprime.

## 7. Tournures interdites en plus, et regle de variete

Ajoutees le 2026-09-29 (mail de Julien de 22h08) a la banque des formulations
interdites (garde-fou 7 ci-dessous) : **« Notre lecture : »**, **« Testons-la. »**,
**« Suivons son regard. »**. Le script les refuse en clair comme deja converties en
gras Unicode.

**Regle de variete : ne jamais publier deux posts de suite sur un compte avec la
meme accroche, le meme nombre de blocs et la meme fin.** Le script en donne une
lecture mecanique, qui compare le brouillon au post precedent du meme compte :

- *type d'accroche* : question, chiffre (un chiffre dans la premiere ligne) ou
  affirmation (prise de position ou situation concrete, indiscernables par code) ;
- *nombre de blocs* : les titres en gras, ou 1 si le post n'en a pas ;
- *type de fin* : question, lien (URL ou claudeagency.fr) ou affirmation. Une ligne
  `Source : ...` ou de hashtags en dernier ne compte pas comme fin.

Les trois identiques : refus. Il suffit de varier **un** des trois.

**Etendue aux 5 derniers posts du compte (30/09/2026).** Le script compare le brouillon a
chacun des 5 derniers posts, pas seulement au precedent (critere « variete sur les 5 derniers
posts », n°1 = le plus recent). Il refuse, en nommant le post en cause :

- le **meme schema** (accroche, blocs, fin) qu'un de ces 5 posts ;
- les **trois premiers mots de l'accroche** identiques ;
- la **meme derniere ligne**, mot pour mot (accents et ponctuation ignores ; un lien ou une
  ligne `Source` ne compte pas) ;
- une **meme phrase en gras** (deux mots au moins), en markdown comme en gras Unicode.

Un meme *type* d'accroche ou de fin sur plusieurs posts reste permis : il n'y a que trois types,
et finir sur une vraie question est une consigne permanente. Pour passer : changer de debut
d'accroche, de derniere phrase ou de phrase en gras, ou varier le schema.

**Le post precedent se trouve tout seul** (30/09/2026, `scripts/precedent.mjs`). Le compte se
deduit du nom du brouillon (`a<N>.final.txt` = julien-agency, `p<N>.final.txt` =
julien-partners), sinon `--compte`. Recherche, dans l'ordre :

1. les **5 derniers** `.final.txt` **de ce compte** dans
   `livrables-Claude-Agency/linkedin/` (ordre : dossier date, puis numero). Si le brouillon est
   lui-meme dans ce dossier, on prend les posts **strictement avant lui** ;
2. sinon les 5 derniers posts publies via l'API Zernio (`GET /v1/posts?status=published&limit=5`,
   filtre sur le `zernio_account_id` du compte, lecture seule, cle `ZERNIO_API_KEY` de
   l'environnement ou du `.env` de `linkedin-carrousel`, jamais affichee). Dossier local et Zernio
   ne se completent pas : un post publie existe deja en `.final.txt`, les melanger le compterait
   deux fois ;
3. sinon un **AVERTISSEMENT** : la regle de variete n'est pas mesuree, le script n'echoue pas.

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" verif "C:/.../linkedin/2026-10-01/a8.final.txt"
```

Options : `--precedent <fichier>` (a la main, prioritaire ; un second chemin positionnel reste
accepte), `--compte <compte>`, `--dossier <dossier>` (sinon la variable
`LIVRABLES_LINKEDIN_DIR`, sinon `~/OneDrive/Documents/GitHub/livrables-Claude-Agency/linkedin`),
`--sans-precedent`.

## Guardrails — avant depot dans sortants/

Les criteres de `contenu-linkedin`, plus les suivants. Le script en mesure
quatorze (quinze quand un post precedent est trouve, seize quand il en trouve plusieurs, regle 7 ; les criteres 2 et 4 comptent
double, le gras accentue et l'accent manquant dans le gras sont deux mesures
distinctes) ; seul le niveau de lecture se relit :

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" verif "C:/chemin/vers/a8.final.txt"
```

1. L'accroche tient en **140 caracteres**, sans autre contrainte de forme (revu le
   29/09 : elle ne doit plus finir par un point d'interrogation).
2. **2 passages en gras au maximum**, aucun caractere accentue dedans, tous
   dans la **bonne police** (voir plus bas).
3. **4 titres de bloc en gras au maximum** ; un post sans titre est valide.
4. **6 emojis au maximum**, tous en tete de ligne ; aucun n'est impose.
5. Aucune phrase de plus de 20 mots ; aucun terme technique non explique.
6. **Longueur du corps entre 1 300 et 1 900 caracteres**, pied compris — la
   fourchette la plus engageante, mesuree le 09/09 sur le corpus de van der
   Blom. Une version anterieure de ce fichier disait 900-1 300 : c'est elle qui
   tirait les posts vers le bas, elle est abandonnee.
7. **Aucune formulation interdite** — banque reprise telle quelle de
   `linkedin-carrousel/lib/valider-post.js` (meme retour de Julien du
   10/09/2026) : demande d'engagement (« commentez OUI », « partagez si... »),
   exclamations en rafale, tiret long, « ce n'est pas X, c'est Y », « ravi de
   vous annoncer », « taguez quelqu'un », critique de LinkedIn, mot tout en
   MAJUSCULES. Ajoutee le 22/09/2026 : rien ne verifiait cette skill contre les
   formulations qui ont deja fait juger un carrousel « AI slop » ailleurs dans
   ce depot.
8. **Accroche non degeneree (3 mots minimum).** Ne mesure PAS si le hook est
   « irresistible » — ca reste un jugement de Julien, aucun code ne le
   remplace. Attrape seulement le cas degenere (« ? » seul, ou un mot suivi
   d'un point d'interrogation) qui passait les deux premiers controles avant
   ce critere. Ajoutee le 22/09/2026, apres avoir cherche un critere de
   longueur minimale plus fort et l'avoir ecarte : un hook court et vraiment
   percutant existe (« Et si tout s'arretait demain ? »), un plancher de
   caracteres l'aurait refuse a tort. La force d'un hook reste a l'oeil.
9. **Le gras Unicode deja converti doit etre dans la bonne police** —
   *Mathematical Sans-Serif Bold*, celle que fabrique `enGras()`. Ajoutee le
   22/09/2026 : verification reelle des deux premiers posts de veille publies
   (Bernard Marr le 18/09, Andrew Ng le 21/09) contre ces criteres — leur gras
   existe bien mais dans une AUTRE police Unicode, *Mathematical Bold avec
   empattement* (celle que produit `linkedin-carrousel/lib/valider-post.js`,
   sans lien avec cette skill-ci). Avant ce correctif, le script les comptait
   a tort comme « 0 gras trouve » — il ne reconnaissait qu'une seule des deux
   polices. Corrige dans `scripts/lib.mjs` : le comptage du critere 2
   reconnait desormais les deux polices (pour ne pas sous-compter un gras
   reel), et ce critere-ci signale specifiquement un gras dans la mauvaise
   police, avec le segment fautif. L'apostrophe (droite ou courbe) est traitee
   comme de la ponctuation courante dans un run gras, jamais comme un accent —
   corrige le 22/09/2026 apres qu'un titre "Ce que j'en retiens" ait casse ce
   critere (l'apostrophe n'a pas de forme grasse, comme un accent, ce qui
   coupait le run en deux).
10. **Aucun chiffre sans source** — reprise telle quelle de
    `linkedin-carrousel/lib/valider-post.js` (`validerChiffreSource`, meme
    fenetre de 80 caracteres avant / 60 apres, meme exemption pour un detail
    d'anecdote couvert par une ligne finale `Source : ...`, meme liste fermee
    de sources trop vagues). Ajoutee le 22/09/2026, trouvee par un test
    adversarial : un chiffre-preuve invente ("40% des recruteurs...") passait
    les douze criteres precedents sans encombre, rien ici ne verifiait le
    sourcage. Bug reel trouve PENDANT ce portage : la premiere version
    reutilisait les plages de caracteres gras completes (qui couvrent aussi
    les lettres) pour reperer un "chiffre", ce qui faisait matcher des mots
    entiers en gras ("offres", "en") comme des chiffres — corrige avec une
    plage chiffres-seuls dediee.
11. **Aucun anglicisme** — « process » au lieu de « processus », « deadline »,
    « feedback », « workflow », etc. Ajoute le 29/09/2026 apres le post A1 du
    28/09, publie avec « process ». Le controle n'est PAS une seconde liste : il
    importe `detecterAnglicismes` de `linkedin-carrousel/lib/valider-anglicismes.js`
    (`createRequire`, chemin relatif, les deux skills sont dans le meme paquet).
    Ajouter un mot se fait la-bas, une seule fois, et vaut pour les posts texte
    et les carrousels. Le texte est ramene en ASCII avant la mesure, donc un
    mot deja converti en gras Unicode n'y echappe pas. Le post est refuse avec le
    mot fautif et son equivalent (`"process" (dites plutot "processus")`).

Le script sort en code 1 si un critere echoue. Montrer sa sortie brute a Julien
avec le brouillon — ne jamais ecrire « guardrails passes » sans elle.

**Rebranchee sur `linkedin-veille-virale` le 22/09/2026** : cette skill importait
jusque-la seulement 3 criteres sur 12/13 via `linkedin-carrousel`. Verifie contre
les deux posts de veille deja publies (Bernard Marr 18/09, Andrew Ng 21/09) :
aucun des deux n'obtenait plus de 6 ou 7 sur 13 au vrai bareme. Voir
`linkedin-veille-virale/lib/valider-mise-en-forme.js` (le pont) et son SKILL.md
pour le detail du rebranchement.

**Limite sciemment non couverte, trouvee par test adversarial le 22/09/2026** :
un gras ecrit dans une TROISIEME police Unicode (ni Sans-Serif Bold, ni
Mathematical Bold avec empattement — ex. Double-Struck, Fullwidth, Fraktur) n'est
NI compte comme un gras existant, NI signale comme une police fautive : il
disparait silencieusement du calcul, comme s'il n'existait pas. Verifie avec un
segment en Double-Struck (`𝕡𝕣𝕠𝕔𝕖𝕤𝕤 𝕥𝕣𝕠𝕡 𝕝𝕖𝕟𝕥`) : le critere 2 continue de passer
tant que les AUTRES segments ne depassent pas le plafond de deux, sans jamais signaler
que ce segment-la ne rendra pas en gras sur LinkedIn. Pas corrige : il existe
plus d'une dizaine de styles Unicode "alphanumeriques stylises" (Double-Struck,
Fullwidth, Fraktur, Script, Sans Italic, Monospace...) — en couvrir un troisieme
sans preuve qu'il circule reellement dans le corpus (contrairement au Mathematical
Bold avec empattement, trouve deux fois en usage reel) serait un garde-fou
fragile et disproportionne. A rouvrir seulement si un post reel l'utilise.

**Confirme comme un comportement voulu, pas une faille (test adversarial du
22/09/2026)** : une accroche redigee dans une autre langue que le francais et
finissant par "?" passe le critere — le controle est mecanique (un point
d'interrogation dans les 140 premiers caracteres), il ne restreint aucune
langue et n'a jamais pretendu le faire.

**Bornes de longueur verifiees exactement le 22/09/2026** : 1 300 et 1 900
caracteres sont tous deux INCLUS (`nu >= 1300 && nu <= 1900`), 1 299 et 1 901
sont refuses. Comportement voulu, desormais verrouille par un test.

**Le brouillon se donne sous l'une ou l'autre forme** : le markdown `**ainsi**`
d'un brouillon de `sortants/`, ou le texte deja converti en gras Unicode quand on
relit un post publie. Les deux rendent les memes mesures — verifie le 18/09,
accroche a 106 caracteres et 9/9 des deux cotes. Tout ce qui se compte en
caracteres se compte **en points de code** : une lettre en gras Unicode occupe
deux unites UTF-16, et une mesure naive refusait une accroche de 110 signes en
la comptant 193.

**Le lien vers le site part dans le corps du post**, jamais en premier
commentaire : consigne de Julien du 03/09, reaffirmee le 09/09 en connaissance
du cout mesure (un lien externe coute de 18,8 % a 60 % de portee). Ne pas
proposer de le retirer, et ne pas le compter comme un defaut de forme.

## Ce que cette skill ne fait pas

Elle ne publie pas. Dans `visibilite-ops`, le brouillon va dans
`sortants/linkedin/` : le clic « Valider » de Julien le publie, et un
`publier_le:` le fait partir seul a sa date. Dans les autres projets, il va dans
`docs/prive/sortants/` et attend sa validation.
