---
name: linkedin-mise-en-forme
description: >-
  Regles de forme obligatoires pour tout post LinkedIn de Julien, compte Claude
  Agency comme compte Claude Partners : accroche formulee en question qui
  interpelle, gras Unicode sur les segments qui portent le message (au moins
  huit par post), trois sections a titre en gras, 3 a 6 emojis poses en tete de
  ligne, niveau de lecture d'un enfant de 13 ans, et passe humanizer anti-tell
  IA. Se combine avec contenu-linkedin, qui fournit les hooks et les regles
  d'algorithme : celle-ci definit COMMENT le texte est mis en forme, l'autre
  QUOI ecrire. Declencher des qu'il s'agit d'ecrire, reecrire, relire, traduire
  ou auditer un post LinkedIn, un brouillon dans sortants/, une accroche ou un
  texte destine au fil LinkedIn. Triggers : « ecris un post LinkedIn », «
  prepare un post pour LinkedIn », « relis ce post », « mets ca en forme pour
  LinkedIn », « un post sur X ». NE PAS utiliser pour un commentaire LinkedIn
  (skill linkedin-commentaires), un carrousel (linkedin-carrousel), un e-mail ou
  un contenu de site.
---

# LinkedIn — mise en forme

Six regles de forme, decidees par Julien les 2026-09-18. Elles s'appliquent aux
**deux comptes**, Claude Agency et Claude Partners, au meme niveau.

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
3. Appliquer les six regles ci-dessous.
4. **Passe `humanizer`** — la skill, pas seulement le fichier de references de
   `contenu-linkedin`.
5. Passer le script de controle avant de deposer le brouillon.

## 1. L'accroche est une question

**Toute accroche se formule en question**, en une ou deux phrases, et elle doit
provoquer une reaction forte : interpeller le lecteur, le surprendre, ou le
mettre devant un risque qu'il n'avait pas vu. Regle de Julien du 2026-09-18.

    "Votre automatisation marche a la livraison."          ->  constat, elle tombe a plat
    "Et si votre automatisation IA parlait au mauvais       ->  question, elle inquiete
     client depuis trois semaines, sans que personne
     le voie ?"

Trois contraintes qui se cumulent :

- **140 caracteres au maximum**, gras compris : c'est le seuil du « … voir
  plus » sur mobile, et la question doit tenir entiere avant le pli.
- **La question n'enonce pas la reponse.** Le hook ouvre, le corps referme.
  C'est le temps de lecture qui decide de la distribution (15,6 % d'engagement
  au-dela d'une minute contre 1,2 % en survol, mesure du 09/09).
- **Elle passe en gras**, donc elle s'ecrit **sans aucune lettre accentuee**
  (voir la regle 2). C'est la contrainte qui coute le plus a l'ecriture : une
  question sans accent se trouve toujours, elle se cherche.

## 2. Gras — au moins huit passages, sans accent

LinkedIn n'a pas d'editeur riche : le gras se fabrique avec les caracteres
Unicode Mathematical Sans-Serif Bold. **Ce bloc ne contient aucune lettre
accentuee.** Un segment accentue mis en gras rend `𝗺𝗲𝘀𝘂𝗿é` — l'accent retombe en
maigre au milieu du mot, visible et moche. Mesure sur le poste de Julien le
2026-09-18.

La regle : **ne mettre en gras que des segments sans accent**. Si le segment qui
porte le message en contient un, le reformuler jusqu'a en trouver un qui n'en a
pas — pas le passer en gras quand meme.

    "La verite mesuree"  ->  reformuler en  "Trois mois pour rien"

**Au moins huit passages en gras par post** (Julien, 2026-09-18) : l'accroche,
les trois titres de section, et quatre a six segments de 2 a 8 mots dans le
corps — la phrase qui porte la lecon, le chiffre qui frappe, la regle qu'on
s'impose. Un post qui n'en portait que deux se lisait comme un bloc.

Ce qui ne se met **pas** en gras : un paragraphe entier (ce n'est plus un accent,
c'est du bruit), et des mots isoles disperses sans rapport entre eux.

Jamais a la main, toujours par le script (le mapping fait 62 caracteres, une
erreur ne se voit pas a la relecture) :

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" gras "Trois mois pour rien"
```

Il refuse tout segment accentue, avec le caractere fautif. Sous Windows, chemin
en `C:/...` : node ne resout pas la forme `/c/Users/...`.

## 3. Trois sections, chacune avec son titre en gras

Un post se lit en un coup d'oeil ou ne se lit pas. **Chaque section porte un
titre**, sur sa propre ligne, **en gras et precede d'un emoji** — regle de Julien
du 2026-09-18, posee pour qu'on voie les parties sans lire le texte.

    👉 **Le constat**
    ⚡ **Mes trois gestes**
    ✅ **Ce que je ne confie plus**

- **Trois sections**, c'est la forme par defaut : ce qui se passe, ce qu'on fait,
  ce qu'on en retient. Deux passent sur un post court, quatre jamais.
- **Le titre est court et sans accent**, puisqu'il est en gras. « Le constat »
  passe, « Ce que dit la video » non. Le titre annonce, il ne resume pas.
- L'accroche vit **au-dessus** de la premiere section, avec une ou deux lignes de
  tension. Le pied commercial vit **sous** la derniere, sans titre.

## 4. Emojis — 3 a 6, en tete de ligne

Ils remplacent les tirets de liste et portent les titres de section. Poses **en
debut de ligne**, jamais glisses au milieu d'une phrase pour faire joli.

Trois minimum, six maximum, sur tout le post. Au-dela, le post passe pour un
gabarit. **Avec trois titres de section, le budget est deja presque consomme** :
c'est voulu, les puces du corps se passent d'emoji.

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

Question en accroche, gras, emojis et titres de section, lus ensemble, peuvent
faire « post fabrique ». Quand le brouillon sonne artificiel apres la passe
humanizer, **retirer de la mise en forme**, dans cet ordre :

1. un emoji de puce, jamais celui d'un titre de section (plancher de 3) ;
2. un segment en gras du corps, jamais l'accroche ni un titre (plancher de 8
   seulement si le post est long ; sur un post court, descendre a 5 est permis) ;
3. rien d'autre.

**Un chiffre source, une entite nommee ou un detail concret ne se coupent
jamais** pour gagner en simplicite : ce sont eux qui rendent le post credible.
Si la simplicite et la precision se heurtent, c'est la phrase qu'on reecrit, pas
le fait qu'on supprime.

## Guardrails — avant depot dans sortants/

Les criteres de `contenu-linkedin`, plus les dix suivants (treize au total avec
les criteres 2 et 4, qui comptent double). Le script les mesure tous sauf le
niveau de lecture, qui se relit :

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" verif "C:/chemin/vers/brouillon.txt"
```

1. L'accroche tient en **140 caracteres** et **se termine par un point
   d'interrogation**.
2. **Au moins huit passages en gras**, aucun caractere accentue dedans, tous
   dans la **bonne police** (voir plus bas).
3. **Trois titres de section**, chacun sur sa ligne, en gras, precede d'un emoji.
4. Entre 3 et 6 emojis, tous en tete de ligne.
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
tant que les AUTRES segments suffisent a atteindre huit, sans jamais signaler
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
