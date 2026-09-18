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

1. **Charger `contenu-linkedin`** pour le fond, les formules de hook et les
   regles d'algorithme 2026. Cette skill-ci ne remplace rien : elle se pose
   par-dessus.
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

Les criteres de `contenu-linkedin`, plus les six suivants. Le script les mesure
tous sauf le niveau de lecture, qui se relit :

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" verif "C:/chemin/vers/brouillon.txt"
```

1. L'accroche tient en **140 caracteres** et **se termine par un point
   d'interrogation**.
2. **Au moins huit passages en gras**, aucun caractere accentue dedans.
3. **Trois titres de section**, chacun sur sa ligne, en gras, precede d'un emoji.
4. Entre 3 et 6 emojis, tous en tete de ligne.
5. Aucune phrase de plus de 20 mots ; aucun terme technique non explique.
6. **Longueur du corps entre 1 300 et 1 900 caracteres**, pied compris — la
   fourchette la plus engageante, mesuree le 09/09 sur le corpus de van der
   Blom. Une version anterieure de ce fichier disait 900-1 300 : c'est elle qui
   tirait les posts vers le bas, elle est abandonnee.

Le script sort en code 1 si un critere echoue. Montrer sa sortie brute a Julien
avec le brouillon — ne jamais ecrire « guardrails passes » sans elle.

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
