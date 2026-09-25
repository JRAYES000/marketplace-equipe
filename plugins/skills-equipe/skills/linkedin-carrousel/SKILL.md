---
name: linkedin-carrousel
description: "Compose et publie des carrousels LinkedIn (PDF de plusieurs pages, garde-fous d'ecriture inclus) pour Claude Agency ou Claude Partners a partir d'un sujet. Activation MANUELLE uniquement : ne se declenche jamais d'elle-meme, seulement sur demande explicite (ex. 'fais-moi un carrousel', 'genere le carrousel du jour', 'carrousel LinkedIn sur <sujet>')."
---

# linkedin-carrousel

**Activation MANUELLE uniquement.** Cette skill ne se lance jamais d'elle-meme -- seulement sur
demande explicite.

**Phrase de lancement** : « fais-moi un carrousel ».
Variantes probables : « genere le carrousel du jour », « carrousel LinkedIn sur <sujet> »,
« carrousel pour julien-agency/julien-partners », « prepare le carrousel de la semaine ».

## Refonte du design -- 6 modeles de page (24/09/2026, demande de Julien)

Avant cette date, les gabarits `julien-agency.html`/`julien-partners.html` n'avaient qu'un seul
modele (titre + texte), un fond crème, les polices Fraunces/Inter ("font IA", retirees du site
claudeagency.fr), aucune image, et le logo masque sur la diapo 1 (`.slide[data-role="hook"] .logo
{ display: none }`). Julien a demande une refonte complete du dessin (le moteur HTML+Playwright,
lui, reste inchange) :

- **6 modeles de page**, choisis par le champ `modele` d'une diapo (voir l'en-tete de
  `generer-pdf.js` pour le detail des champs de chacun) : `accroche` (gabarit historique),
  `gros-chiffre`, `comparaison` (deux colonnes), `checklist`, `citation`, `cta` (fermeture).
  `modele` absent retombe sur le rendu d'avant cette refonte (`accroche` implicite sur le hook,
  titre+texte generique sinon) -- **aucune regression sur un carrousel existant**.
- **Logo, photo et couleurs de marque sur CHAQUE page, page 1 comprise** -- avant cette refonte,
  seul un nom de marque textuel apparaissait, jamais sur le hook. Logo et photo vivent dans
  `assets/` (voir plus bas) et sont injectes en base64 au chargement du gabarit
  (`lib/assets.js`, `chargerGabarit`), jamais bakes a la main dans le HTML -- remplacer un fichier
  ne demande aucun changement de template ni de code.
- **Polices Bricolage Grotesque (titres) + Schibsted Grotesk (corps)**, a la place de
  Fraunces/Inter -- confirme reellement les memes sur les deux marques : `DESIGN.md` du depot
  `JRAYES000/CLAUDEAGENCY` pour Claude Agency, `getComputedStyle` releve en direct sur
  claudepartners.fr pour Claude Partners (les deux sites partagent la meme base typographique).
  Polices variables completes, fichiers dans `assets/fonts/` (telechargees depuis Google Fonts,
  auto-hebergees ensuite -- aucun CDN charge au rendu).
- **Chartes de couleur mesurees, pas inventees** :
  - Claude Agency (`DESIGN.md`) : fond `#FBF7F1`, encre `#2B2724`, accent terracotta `#CC785C` /
    `#934E3A`, fond sombre de bandeau `#934E3A` (hook et `cta`).
  - Claude Partners (mesure live sur claudepartners.fr, variables CSS `--brand-600`/`--sand`/etc.) :
    fond `#FBF7F1`, encre `#2B2724`, texte attenue `#584F45`, accent `#CC785C` / `#9C503A`, fond
    sombre `#763D2C` -- volontairement distinct de celui de Claude Agency (mesure reelle, pas la
    meme teinte), meme si les deux marques partagent la meme base cream/ink/police.
- **Emplacement image optionnel, tout modele** : champ `image` (chemin reel, une fois fal.ai
  accessible) ou `imageEmplacement: true` (encadre en pointilles "Emplacement image IA (fal.ai) —
  a generer", jamais un vide silencieux). fal.ai n'etait pas encore accessible au 24/09/2026 --
  aucune image reelle generee, uniquement l'emplacement signale.

### Fichiers de marque (`assets/`)

| Fichier | Contenu | Remplacement |
|---|---|---|
| `logo-claude-agency-512.png` | Logo reel Claude Agency (soleil 8 branches, terracotta), 512x512, depuis `JRAYES000/CLAUDEAGENCY` (`app/public/logo.png`) | Remplacer le fichier suffit |
| `logo-claude-partners.svg` | Logo reel Claude Partners (medaille, coche evidee), vectoriel, releve en direct sur claudepartners.fr (`header svg`) | Remplacer le fichier suffit |
| `photo-julien-rayes.png` | Photo de Julien, affichee en medaillon <=240px de large (96px reel dans les gabarits) sur chaque diapo | **Provisoire au 24/09/2026** : capture d'ecran de son profil LinkedIn (`linkedin.com/in/julien-rayes`), ~362x389px -- pas le fichier original (son URL contient des jetons que l'outil de navigation bloque d'extraire, mesure de confidentialite). Suffisant pour un medaillon <=240px (verifie visuellement, aucun flou a 96px), mais A REMPLACER par le fichier source des que Julien le fournit -- remplacer ce meme fichier suffit, aucun changement de template |
| `fonts/bricolage-grotesque-variable.woff2`, `fonts/schibsted-grotesk-variable.woff2` | Polices variables completes (poids 200-900 / 400-900) | -- |

### Correction du 24/09/2026 (retour de Julien sur le premier carrousel de test)

Quatre corrections demandees apres inspection du premier carrousel de test des 6 modeles :

1. **Limite de mots relevee a 60 (avant : 25), et comptee sur TOUS les champs visibles** -- pas
   seulement `titre`+`texte`. `lib/modeles.js` (`champsVisibles`) liste, pour le modele resolu
   d'une diapo, exactement les champs que le gabarit affiche vraiment (`chiffre`, `items` de
   checklist/comparaison, `citation`+`auteur`, `bouton`...) ; `lib/valider-diapos.js` les compte
   tous, ainsi que les accents (`validerAccents` s'applique desormais au meme texte complet).
   Avant cette correction, une checklist a items tres longs pouvait passer la validation en
   debordant reellement de la diapo -- voir `test/valider-diapos.test.js` pour la preuve directe.
2. **Nombre de diapos ramene a [6, 10]** (avant : [8, 12]) -- conforme au brief initial de Julien
   du 24/09/2026, qui l'avait deja specifie sans que le garde-fou soit mis a jour en consequence.
3. **Numero de page reformule en "N/Total"** (ex. "3/10"), a la place de "01"/"03" a deux chiffres
   fixes -- cite par Julien parmi les defauts du dessin (trop technique/pesant). Fonction partagee
   par les 3 gabarits (`injecterDiapo`, `generer-pdf.js`) : `page-claude` en herite aussi, meme si
   la refonte des 6 modeles ne le touche pas par ailleurs (compte en pause).
4. **Modele "citation" : `titre` n'est plus jamais requis** -- ce modele ne l'affiche pas (voir
   `templates/*.html`, `.layout-citation`), l'exiger forcait a fournir un champ invisible rien que
   pour passer la validation (c'est ce qui s'est produit sur le carrousel de test initial).

### Correction du 25/09/2026 (retour de Julien sur le premier carrousel publie)

Six corrections demandees par mail apres relecture du premier carrousel reel
(`urn:li:ugcPost:7509117168333287425`, sujet "l'IA declarative") -- les deux premieres corrigees
dans les gabarits (profitent a tous les futurs carrousels), pas seulement sur ce carrousel :

1. **Photo d'ordinateur a l'ecran vide retiree** (page 5, modele checklist) -- diapo sans valeur
   ajoutee, simple decor. Le champ `image` de cette diapo est desormais absent dans le JSON source
   -- `blocImage()` (`generer-pdf.js`) ne reserve un emplacement que si `image`/`imageEmplacement`
   est fourni, donc retirer le champ suffit, aucun changement de gabarit necessaire pour CE point.
2. **Titre qui touchait le trait decoratif du haut, corrige dans les DEUX gabarits** -- cause reelle :
   sur les modeles "checklist"/"comparaison" avec une image, le total titre+items+image (a 480px de
   haut) depassait l'espace vertical disponible de `.content`, et le centrage vertical
   (`justify-content: center`) faisait deborder le contenu par le haut ET par le bas -- confirme par
   rendu reel (page 5 ET page 7, cette derniere deja tres serree en bas avant tout changement).
   Un premier correctif (ancrer `.content` en haut, `justify-content: flex-start`) a semble
   corriger le haut mais a en realite deplace tout le debordement vers le bas -- confirme par rendu
   reel sur la page 7 (image rognee, chevauchant le pied de page). Corrige en reduisant plutot
   `.image-slot` de 480px a 380px dans `templates/julien-agency.html` ET
   `templates/julien-partners.html` : le total tient desormais dans l'espace disponible, centrage
   vertical inchange (reste correct pour les diapos sans image).
3. **Texte de soutien des pages "gros-chiffre" trop petit et trop clair, corrige dans les DEUX
   gabarits** -- `.chiffre-legende` : 40px/`var(--muted)` -> 46px/`var(--ink)`, meme gabarits que le
   point 2.
4. **Accents manquants ("declaratif au reel" dans le post, "L'IA declarative" dans le
   documentTitle) -- garde-fous elargis, pas seulement corriges sur ce carrousel.** Faille reelle :
   un mot de la liste fermee des mots toujours accentues (`lib/valider-orthographe.js`), ecrit SANS
   son accent a l'interieur d'un passage `**en gras**`, n'etait detecte ni par `convertirGras`
   (qui ne refusait qu'un accent DEJA present, pas son absence) ni par `validerAccents` (execute
   APRES conversion en gras Unicode, ou le mot devient invisible a sa regex). Corrige en trois
   endroits : (a) `declaratif`/`declaratifs`/`declarative`/`declaratives` et
   `reel`/`reels`/`reelle`/`reelles` ajoutes a la liste fermee de `lib/valider-orthographe.js` ;
   (b) `convertirGras` (`lib/valider-post.js`) verifie desormais aussi CHAQUE mot d'un passage en
   gras contre cette liste, pas seulement la presence d'un accent ; (c) `documentTitle`, jamais
   verifie par aucun garde-fou jusqu'ici (transmis tel quel en argument CLI), passe desormais par
   `validerAccents()` dans `publierDocumentZernio()` (`lib/publier-zernio.js`) avant tout envoi.
   Voir `test/adversarial-25-09.test.js`, qui rejoue exactement les deux erreurs.
5. **Texte du post : 5 lignes maximum, accroche/promesse/appel a l'action -- voir
   "Texte du post" ci-dessous.**
6. **Une page utile ajoutee** ("Comment choisir votre premier process", modele checklist) --
   carrousel passe de 8 a 9 diapos, toujours dans la fourchette [6, 10].

**Bug d'environnement trouve en publiant reellement ce jour-la (sans rapport avec les 6 points
ci-dessus)** : `chargerEnvLocal()` (`publier-zernio.js`) coupait le `.env` sur `\n` seul -- un
`.env` a fins de ligne Windows (CRLF) laisse un `\r` colle a la fin de chaque valeur, que
`(.*)$ ` (sans le flag `s`) ne consomme jamais en JavaScript, donc la ligne entiere ne matchait
plus du tout, silencieusement (`ZERNIO_API_KEY absente de l'environnement` alors que la cle etait
bien presente). Corrige en coupant sur `/\r?\n/`.

### Regle de contenu -- aucune citation ni temoignage invente

**Jamais de citation, de temoignage ou de propos attribue a une personne (nommee ou non, reelle ou
generique comme "un dirigeant de PME") qui n'a pas reellement eu lieu ou n'est pas reellement
source.** Incident reel : le premier carrousel de test (24/09/2026) contenait une citation
inventee attribuee a "un dirigeant de PME, secteur services" -- signale par Nomena avant
publication, jamais publie. Le modele "citation" reste utilisable sans attribution (`auteur`
absent -- voir `templates/*.html`, `.citation-auteur:empty`) pour un propos editorial general, ou
avec une citation reelle et sa source verifiee. Meme famille de regle que "Ne jamais inventer"
dans le CLAUDE.md racine du depot, precisee ici pour ce cas specifique aux carrousels
(temoignages/citations attribues a des tiers, pas seulement des chiffres ou l'experience de
Julien).

## Retours du mail de Julien du 25/09/2026 (deuxieme mail du jour)

Cinq retours transformes en regles, et en garde-fous automatiques partout ou c'etait possible --
a appliquer sur TOUS les prochains carrousels, julien-agency comme julien-partners, pas seulement
les prochains testes ce jour-la.

1. **Francais, pas d'anglicismes.** "processus" et non "process" -- meme famille de defaut que
   les accents manquants (voir "Accents manquants" plus bas). Nouveau module
   `lib/valider-anglicismes.js` : liste FERMEE d'anglicismes de vocabulaire professionnel courants
   (process, deadline, feedback, workflow, business, brief, benchmark, reporting, roadmap,
   kickoff, mindset, insight, targets, networking) vers leur equivalent francais, refuse
   explicitement des qu'un mot de la liste est trouve -- meme philosophie que
   `lib/valider-orthographe.js` (liste fermee, pas une detection generale d'anglais ; "email",
   "planning", "week-end" volontairement exclus, entres dans l'usage courant du francais). Appele
   sur les MEMES 3 surfaces que le controle d'accents : les diapos (`lib/valider-diapos.js`), le
   `documentTitle` (`lib/publier-zernio.js`) et le texte du post (`lib/valider-post.js`, verifie
   sur le brouillon AVANT conversion du gras -- meme raison que `verifierMotsAccentuesEnGras`,
   sinon un anglicisme a l'interieur d'un `**gras**` deviendrait invisible une fois converti en
   Unicode). Voir `test/regles-mail-25-09.test.js`.
2. **Une page "Comment..." ou "methode" contient toujours un exemple concret** (l'exemple de
   Julien : la relance des devis). Nouveau garde-fou dans `lib/valider-diapos.js`
   (`validerExempleSurPageMethode`) : declenche sur un `titre` qui commence par "Comment" ou
   contient "methode"/"méthode", exige alors un marqueur d'exemple explicite ("exemple", "ex :")
   quelque part dans les champs visibles de la diapo (texte, items...) -- refuse sinon. **Limite
   assumee**, meme famille que le hook (voir plus bas) : verifie la presence d'un MARQUEUR, pas
   que l'exemple est reellement concret et pertinent -- seule une relecture le juge.
3. **Citation jamais seule sur une page qui se lit vide.** Le modele "citation" des deux gabarits
   (`templates/julien-agency.html`, `templates/julien-partners.html`) passe desormais sur le meme
   fond contraste plein que hook/cta (`var(--bg-sombre)`, ajoute au meme groupe de selecteurs),
   avec guillemet decoratif agrandi (160px -> 220px) et texte de citation agrandi (58px -> 66px) --
   une citation courte occupe donc une page visuellement pensee, pas un reste de blanc. **Verifie
   par rendu Playwright reel**, pas seulement decrit : `test/regles-mail-25-09.test.js` mesure que
   le fond rendu de la diapo "citation" differe reellement du fond de page par defaut, et que le
   guillemet mesure au moins 200px, sur les deux comptes. Rendu visuel de reference genere le
   25/09/2026 : `sortants/_test-regles-mail-25-09/diapo-05.png`.
4. **Images : uniquement si elles illustrent l'idee de la page, jamais une photo decorative sans
   message** (exemples cites par Julien : clavier, ordinateur/ecran vide). `imagePrompt` devient
   OBLIGATOIRE des qu'une diapo porte un champ `image` reel (`lib/valider-diapos.js`,
   `validerImagePrompt`) -- sans lui, rien ne trace ce qui a ete demande a fal.ai. Liste FERMEE de
   sujets generiques interdits (`SUJETS_IMAGE_INTERDITS`) verifiee dans ce prompt : clavier, ecran
   vide/eteint, ordinateur seul sans contexte, bureau vide, souris d'ordinateur -- refuse
   explicitement si l'un d'eux y figure. **Limite assumee** : il n'existe pas encore de script
   d'appel a fal.ai dans ce depot (generation manuelle via navigateur, voir plus bas) -- ce
   garde-fou verifie le PROMPT declare par l'operateur, pas l'image reellement generee ; rien
   n'empeche une image differente du prompt d'etre glissee a la place. A renforcer le jour ou un
   appel API fal.ai existe reellement dans ce depot.
5. **Rappel des regles deja en place, a ne jamais oublier** (le post Claude Partners du 25/09/2026
   ne les respectait pas au depart) : texte du post 5 lignes maximum (`LIGNES_MAX`, voir "Texte du
   post" plus bas) et accents corrects sur les diapos, le titre du document ET le texte du post
   (`lib/valider-orthographe.js`, appele depuis les 3 memes surfaces que le nouveau controle
   d'anglicismes ci-dessus). Non-regression verrouillee par `test/regles-mail-25-09.test.js`, en
   plus des tests existants de chaque garde-fou.

**Carrousel de test genere localement le 25/09/2026, jamais publie** (preuve que les 5 regles
s'appliquent reellement, pas seulement documentees) : `a-publier/julien-agency-2026-09-25-test-regles-mail.json`
(8 diapos : hook, gros-chiffre, checklist "Comment choisir votre premier processus à automatiser"
avec un exemple explicite, comparaison, citation, checklist avec emplacement image, contenu simple,
cta), rendu en PDF (`sortants/julien-agency/Vos meilleurs candidats disparaissent avant l'offre. Voici pourquoi.pdf`)
et en PNG par diapo (`sortants/_test-regles-mail-25-09/diapo-01.png` a `diapo-08.png`) -- chaque
page inspectee visuellement avant d'ecrire cette section.

### Bug trouve en verifiant ce carrousel de test : point final en double dans le nom de fichier

Le titre de la diapo hook se terminait par une phrase complete ("...Voici pourquoi.") -- une fois
`.pdf` accole par `cheminSortieParDefaut`, le fichier produit s'appelait
"...pourquoi..pdf" (double point), jamais retire avant. Corrige par une fonction partagee,
`retirerPointFinal` (`generer-pdf.js`) : retire un point final (et les espaces qui suivraient),
appelee a la fin de `nomFichierDepuisTitre` -- donc sur tout nom de fichier de sortie, PDF comme
PNG. **Meme defaut possible sur le `documentTitle` envoye a Zernio** (repris tel quel du titre de
la diapo hook par l'operateur, pas derive automatiquement) : `publierDocumentZernio`
(`lib/publier-zernio.js`) appelle desormais aussi `retirerPointFinal` sur `documentTitle`, avant
`validerAccents`/`validerAnglicismes` et avant tout appel reseau -- ce qui part vers Zernio est
toujours nettoye, meme si l'appelant ne l'a pas fait lui-meme. Voir
`test/regles-mail-25-09.test.js`, section "Point final en double".

## Regles de methode non negociables (retour de Julien, 18/09/2026)

Julien a juge les deux carrousels publies avant cette date comme "de l'AI slop" -- brouillon,
visiblement fait vite par une IA -- sur la forme, avant meme d'en lire le fond. Regles ajoutees en
consequence, a appliquer sur **tout** futur carrousel, pas seulement les prochains :

- **Un hook irresistible en ouverture.** Aucun carrousel publie jusqu'ici n'en avait un -- la
  diapo 1 (role "hook") annoncait un sujet, elle n'accrochait pas. Un hook reussi cree un manque
  ou une tension immediate (ex. une affirmation contre-intuitive, une consequence concrete et
  proche, jamais une simple annonce de theme) -- a juger a l'oeil sur le rendu reel.

  **Consigne de redaction, pas de garde-fou possible (ajoute le 18/09/2026, retour de Julien)** --
  meme structure que `information_chiffree` dans `linkedin-commentaires/SKILL.md`. **Incident
  reel** : les carrousels julien-agency du 14/09 et republie le 15/09/2026 partagent le titre
  "Pourquoi vos meilleurs candidats disparaissent-ils" (confirme par les URLs LinkedIn reelles) --
  une diapo 1 qui annonce un sujet, sans creer aucune tension -- jamais releve avant que Julien le
  signale explicitement, sur l'ensemble des carrousels publies a cette date. La seule verification
  automatique en place (`validerAccroche` dans
  `lib/valider-post.js`, appliquee au **texte du post**, pas aux diapos) ne verifie qu'un point
  d'interrogation dans les 140 premiers caracteres. **Ce que le garde-fou peut verifier** :
  presence d'un "?" tot dans le texte du post -- un signal mecanique faible, purement formel.
  **Ce qu'il ne peut pas verifier** : si la diapo 1 (image) ou l'ouverture du texte creent
  reellement une tension ou un manque chez le lecteur -- ca exige un jugement editorial, aucune
  regle syntaxique ne le remplace (meme famille de limite que le chiffre "EN PLUS du post" pour
  `information_chiffree`, qui exigerait de comparer a un contenu exterieur au texte controle).
  **Regle de redaction a appliquer avant publication** : relire la diapo 1 seule, sans le reste du
  carrousel, et se demander si elle donnerait envie de balayer -- une annonce de theme ("Pourquoi
  X") ne suffit jamais, il faut une affirmation contre-intuitive, une consequence concrete et
  proche, ou une question qui expose un vrai manque. Si le doute persiste apres relecture,
  reecrire la diapo 1, pas la publier "au cas ou ca passe".
- **Du gras sur les mots/phrases qui portent**, pas seulement pour respecter le garde-fou
  automatique (`lib/valider-post.js` exige au moins un passage en gras) -- le gras doit tomber sur
  ce qu'un lecteur retiendrait en diagonale, pas sur un mot choisi au hasard pour passer le
  controle.
- **Entre 3 et 6 emojis par post** (elargi depuis 3-5 le 18/09/2026 -- voir
  `lib/valider-post.js`, `EMOJIS_MAX`), memes regles de position inchangees (jamais deux a la
  suite, jamais au milieu d'une phrase).
- **Logo Claude Agency manquant sur les carrousels publies** -- signale par Julien, pas encore
  corrige au 18/09/2026. Les templates (`templates/*.html`) n'affichent aujourd'hui qu'un nom de
  marque textuel en pied de page (`.logo`, masque sur la diapo hook), jamais un vrai logo
  graphique. Corriger exige un vrai fichier logo (SVG ou PNG) fourni par Julien -- rien a inventer
  ici : ne jamais fabriquer un logo de substitution, meme provisoire, pour une marque reelle.

  **Bug distinct, corrige le 18/09/2026 : logo absent meme du seul repere textuel sur les images
  "couverture" (mode image unique).** Les trois gabarits masquent `.logo` via
  `.slide[data-role="hook"] .logo { display: none; }` et affichent une fleche "Balayez" a la
  place -- correct pour un vrai carrousel feuilletable, ou le repere textuel apparait des la page 2.
  Mais `genererImageCouverture` (`generer-images.js`) rend justement la diapo `role: "hook"` telle
  quelle pour produire une image UNIQUE (pas de page 2 derriere) : logo absent ET fleche "Balayez"
  pointant vers rien, sur le seul post que Julien voit reellement quand la galerie multi-images
  echoue et qu'on retombe sur ce mode de repli (voir "Ce qui ne marche pas encore"). Fix : nouveau
  parametre `forcerLogoVisible` sur `rendreDiapoEnPng` (defaut `false`) ; quand actif, clone la
  diapo avec `role: 'contenu'` juste avant le rendu Playwright (`{ ...diapo, role: 'contenu' }`) --
  seul le rendu change, le fichier de diapos source garde `role: "hook"` intact.
  `genererImageCouverture` l'appelle desormais systematiquement avec `forcerLogoVisible: true` (une
  couverture est par definition une image unique). `genererImagesParDiapo` (mode multi-images reel)
  n'est pas touche : chaque diapo y garde son vrai role, comportement inchange. Voir
  `test/generer-images.test.js` ("la couverture force le logo visible...").
- **Un carrousel = environ une heure de travail et au moins 5 iterations avant publication.**
  Jamais publier une premiere version. Cette skill a jusqu'ici genere-et-publie en une passe --
  c'est precisement ce qui a produit une qualite "brouillon". A partir du 18/09/2026 : composer un
  brouillon, le rendre, l'inspecter visuellement page par page (deja fait techniquement via
  `generer-images.js`), corriger, rerendre, et repeter reellement -- pas symboliquement -- au moins
  5 fois avant de proposer une publication. Ne jamais presenter une diapo generee une seule fois
  comme prete.

## Accent couleur sur la diapo hook (retour de Julien, 18/09/2026 -- 3 carrousels de reference)

Julien a envoye 3 carrousels LinkedIn qu'il juge reussis, consigne : « s'en inspirer, iterer ».
Inspectes reellement (Claude in Chrome, diapo hook de chacun -- LinkedIn n'a pas laisse ouvrir le
lecteur multi-pages sans geler le rendu, deux tentatives infructueuses, arret) :

- **Theophile Burnet** (« 10 guides IA gratuits ») : fond noir, titre blanc gras sur deux lignes,
  photo stock en bas de diapo, aucun accent couleur -- contraste maximal noir/blanc.
- **Sebastien Grillot** (« Le test qui ridiculise ChatGPT ») : fond rouge vif, "ChatGPT" en
  pastille jaune + "EST STUPIDE" en blanc geant, photo meme, fleche + CTA explicite.
- **Benoit Dubos** (« 11 outils IA ») : fond clair a grille legere, collage d'icones d'outils,
  titre noir avec **seuls "200" et "11" en vert vif** -- le reste du titre reste noir.

**Retenu** : le seul point commun reel aux 3 -- un accent de couleur sur UN segment du titre
(jamais tout le titre dans une seule teinte, comme nos gabarits jusqu'ici). Code en un champ
`accent` (voir plus bas).

**Ecarte, et pourquoi** (cadrage `/phrase-magique` fait avant de produire, 4 questions) :
- Palette a fort contraste type Grillot/Dubos (rouge vif, vert vif) : ecartee au profit de
  `--accent-text`, deja propre a chaque marque (ocre Claude Partners, vert Claude Agency,
  terracotta page-claude) -- **evolution de la charte existante, pas rupture**.
- Vrai visuel (photo ou icones, present sur les 3 references) : ecarte, faute de source d'image
  fiable/libre de droits a ce stade -- reste 100% typographique. A rouvrir si Julien fournit des
  visuels.
- Nouvelle limite de mots specifique au hook : ecartee, aucune des 3 references ne justifie un
  seuil different de la limite generale (25 mots, `lib/valider-diapos.js`).

**Change reellement** : nouveau champ **`accent`**, obligatoire sur la diapo `role: "hook"`
(`lib/valider-diapos.js`, `validerDiapos`) -- doit etre une sous-chaine exacte du `titre`, refuse
sinon (accent absent ou invente). Au rendu (`generer-pdf.js`, `titreAvecAccent`), ce segment est
entoure d'un `<span class="accent-mot">`, colore via `var(--accent-text)` dans les 3 templates --
aucune nouvelle couleur inventee. Uniquement sur le hook : les diapos "contenu" restent plates,
comme chez les 3 references. Voir `test/accent-hook.test.js` et les nouveaux cas de
`test/valider-diapos.test.js`.

**Avant/apres, rendu reel** (pas juste decrit -- PNG generes dans
`sortants/_comparaison-accent-18-09/`, a partir des diapos deja publiees) :
- julien-agency, hook « Pourquoi vos meilleurs candidats **disparaissent-ils** avant l'offre ? » --
  accent sur "disparaissent-ils".
- julien-partners, hook « Un partenariat qui se delite le montre bien **avant la rupture** » --
  accent sur "avant la rupture".

## Ce que fait la skill

1. Compose un carrousel (6-10 diapos) sur un sujet donne, dans le ton du compte cible.
2. `generer-pdf.js` rend le PDF multi-page a partir d'un template de `templates/` et d'une
   liste de diapos (entierement local via Playwright, aucun service externe). `generer-images.js`
   fait le meme rendu en PNG -- utile pour l'inspection visuelle page par page avant publication
   (voir "Regles de methode non negociables"), plus utilise pour publier depuis le 24/09/2026
   (voir "Publication reelle").
3. Redige le texte du post ; `generer-post.js` le valide et convertit le gras.
4. Publie reellement sur LinkedIn via Zernio, en document PDF feuilletable (voir "Publication
   reelle" plus bas).

## Point de situation

Lancer `node etat.js [compte]` avant toute chose -- affiche en trois lignes le dernier carrousel
genere, les brouillons en attente de rendu, et l'etat de publication reelle (jamais suivi
automatiquement, a verifier aupres de Julien). Propose un repli concret (reprendre
`fixtures/diapos-exemple.json`, ou un sujet deja publie sous un angle propre au compte) des
qu'aucun brouillon ni carrousel n'existe pour un compte -- jamais les mains vides.

## Comptes

- **julien-agency** -- connecte et verifie sur Zernio (`zernio_account_id`
  `6ab50c438d284ffb213b7c55`, verifie via `GET /v1/accounts` le 24/09/2026 -- voir
  `reglages-comptes.json`). Publication reelle possible depuis le 24/09/2026 (voir "Publication
  reelle").
- **julien-partners** -- connecte et verifie sur Zernio (`zernio_account_id`
  `6ab50c738d284ffb213b7d22`, meme verification le 24/09/2026). Publication reelle possible.
- **page-claude** -- en pause sur decision de Julien. `author_urn` reste `null`
  (`LINKEDIN_GET_COMPANY_INFO` repond 403, autorisation d'organisation a valider cote LinkedIn).
  Pas de `zernio_account_id` non plus -- non repris dans ce chantier.

`reglages-comptes.json` porte desormais le compte/gabarit ET les identifiants Zernio
(`zernio_account_id`, `zernio_linkedin_url`) lus par `lib/publier-zernio.js` -- le gabarit HTML
(templates/generer-pdf.js) continue de venir de l'argument CLI, independamment.

### Un fichier de style par compte -- verifie reellement le 15/09/2026

Jusqu'a cette date, tous les carrousels a contenu reel produits (dossier `sortants/`) l'avaient
ete pour **julien-agency** -- le template `julien-partners.html` n'avait jamais servi qu'a des
rendus de fumee (fixtures generiques dans les tests). Audit du 15/09/2026 : un carrousel de test
complet (`fixtures/diapos-test-julien-partners-ia-pme.json`, 10 diapos, sujet "IA pour les PME"
dans le ton facilitateur/reseau du compte) genere via `genererPdf` reel pour julien-partners,
jamais publie, puis les 10 pages inspectees visuellement (rendu PNG via `generer-images.js`).

**Resultat** : les deux templates sont bien deux fichiers distincts qui rendent des couleurs
d'accent differentes et propres a chaque marque -- vert `#7D9B76`/`#46603F` (julien-agency) contre
terracotta `#C6B49A`/`#9C503A` (julien-partners), conformes aux palettes verifiees le 11/09/2026
dans `reglages-comptes.json`. L'ecart visuel entre les deux reste concentre sur trois elements
(le petit trait en haut de diapo, le nom de marque en pied de page, le numero de page) -- fond,
encre du titre, typographie et mise en page restent identiques aux deux comptes pres.

**Decision prise le 15/09/2026 (tranchee sans attendre Julien, comme le brief l'autorise pour
tout ce qu'il ne precise pas -- a expliquer dans le mail du 20/09, voir
`references/mail-20260918-brouillon.md`)** : garder cette base commune, ne pas creuser l'ecart.
Claude Agency et Claude Partners sont deux facettes de la meme maison -- un ecart marque sur le
fond et l'encre donnerait deux identites visuelles etrangeres l'une a l'autre, pas souhaitable.
Un accent differencie sur le trait, le pied de page et le numero, avec une base commune, est le
choix retenu -- pas un defaut a corriger. Si Julien veut malgre tout deux identites franchement
distinctes, c'est un reglage a changer dans `templates/julien-agency.html` /
`templates/julien-partners.html` (au minimum `--ink`, `--muted` et le fond `body`, pas seulement
les 3 variables d'accent deja distinctes) -- pas un chantier a rouvrir ici sans decision explicite
de sa part.

Contraintes mesurees, pas supposees, specifiquement sur julien-partners (`node --test`,
`test/tailles-police.test.js` + `test/contraste.test.js` + `test/numero-fleche.test.js`, deja
parametres sur les 3 comptes avant cet audit) : titre >=64px, texte de soutien >=40px, contraste
titre/texte/numero >=3:1 (WCAG AA texte large) mesure via `getComputedStyle` sur un rendu
Playwright reel, numero present sur chaque diapo, fleche "BALAYEZ" presente uniquement sur la
diapo 1. Regression verrouillee : `test/valider-diapos.test.js` (structure/mots/accents du
carrousel de test) et `test/generer-images.test.js` (le PDF reel se genere et n'est pas vide).

## Variables d'environnement (`.env.example`)

- **`ZERNIO_API_KEY`** -- cle API Zernio (format "sk_..."), commune aux deux comptes
  (`julien-agency` et `julien-partners`) : seul l'`accountId` transmis dans la requete distingue
  le compte cible, pas la cle. Lue depuis l'environnement par `publier-zernio.js`
  (`.env` local, jamais commite -- voir "Ce depot est public" dans le `CLAUDE.md` racine).
- **`PDF_RENDER_API_KEY`** -- **vestigiale**, ne rien y mettre : le rendu est 100% local
  (Playwright), aucun service externe n'est appele.

## Garde-fous automatiques (refus explicite, jamais un avertissement)

### Structure du carrousel -- `lib/valider-diapos.js`

Appele automatiquement par `genererPdf()`, avant tout rendu :
- Nombre de diapos hors de [6, 10] -> refus (mis a jour le 24/09/2026, retour de Julien -- avant :
  [8, 12]).
- Une diapo au-dela de 60 mots -> refus (mis a jour le 24/09/2026 -- avant : 25 mots). Compte
  desormais TOUS les champs reellement affiches par le modele resolu de la diapo (`lib/modeles.js`,
  `champsVisibles`) -- titre, texte, chiffre, items de checklist/comparaison, citation, auteur,
  bouton -- pas seulement titre+texte comme avant cette correction (numero de la diapo fautive et
  nombre de mots donnes). Aucune reduction de police n'existe : le seul geste possible est de
  raccourcir.
- Diapo 1 doit porter `role: "hook"` et n'avoir aucun texte de soutien -> refus sinon.
- Titres >=64px, texte >=40px, numero sur chaque diapo, fleche sur la premiere : mesures
  reellement via Playwright (pas lues dans le CSS).
- **Limite assumee** : "diapo 2 = le gain", "une idee par diapo", "derniere = une action" sont
  des exigences de sens, pas de forme -- aucun garde-fou ne peut verifier qu'une diapo exprime
  bien une seule idee. Seule une relecture visuelle le fait (voir references/).

### Texte du post -- `lib/valider-post.js` + `generer-post.js`

**Le texte d'un post de carrousel fait 5 lignes maximum : l'accroche, la promesse, l'appel a
l'action -- jamais plus (retour de Julien, 25/09/2026, apres un post qui repetait le detail du
carrousel).** Une ligne blanche entre deux paragraphes ne compte pas comme une ligne (elle separe
deux "blocs", voir plus bas). Cette consigne est **specifique au carrousel et prime sur** la
fourchette 1300-1900 caracteres de `linkedin-mise-en-forme` -- cette derniere vaut pour un POST DE
TEXTE (le contenu principal du post), pas pour la legende courte qui accompagne un document deja
porteur du contenu reel. `LONGUEUR_MIN`/`LONGUEUR_MAX` de ce fichier (60-700 caracteres, ramene le
25/09/2026 depuis 1300-1900) et la nouvelle `LIGNES_MAX` (5) sont des bornes de bon sens pour cette
legende courte, pas une reprise de la fourchette de `linkedin-mise-en-forme`. Le gras et les
emojis restent obligatoires (memes regles que ci-dessous).

Brouillon redige avec le gras en `**etoiles**` ; `node generer-post.js <brouillon> [sortie]`
convertit et refuse (code de sortie 1) :
- Gras accentue -> refus (aucune forme Unicode grasse accentuee n'existe). **Elargi le 25/09/2026**
  (retour de Julien : "declaratif au reel" passait en gras sans son accent, faille reelle) : un
  passage en gras qui contient un mot de la liste fermee des mots toujours accentues
  (`lib/valider-orthographe.js`), meme ECRIT SANS son accent, est desormais refuse aussi -- pas
  seulement un accent deja present. Voir "Accents manquants" ci-dessous et
  `test/adversarial-25-09.test.js`.
- Aucun gras du tout -> refus.
- Emojis hors de [3, 6] (elargi depuis [3, 5] le 18/09/2026, retour de Julien), au milieu d'une
  phrase, ou deux consecutifs -> refus.
- Hors de 60-700 caracteres -> refus (ramene le 25/09/2026 depuis 1300-1900 -- voir "5 lignes
  maximum" ci-dessus).
- Plus de 5 lignes de texte non vides -> refus (`LIGNES_MAX`, ajoute le 25/09/2026).
- Accroche sans "?" dans les 140 premiers caracteres -> refus.
- Plus de 2 mots-dieses, ou places ailleurs qu'en toute fin -> refus.
- Formulations interdites (demande d'engagement, tiret long, "ce n'est pas X c'est Y", "ravi de
  vous annoncer", "taguez quelqu'un", critique de LinkedIn, MAJUSCULES) -> refus.
- Chiffre sans `(source : ...)` attache -> refus -- un nombre en toutes lettres ("sept") n'est
  jamais concerne, seule une suite de chiffres l'est. **Affine le 21/09/2026** (demande de Nomena, post
  de veille Allie K. Miller) : la source collee n'est exigee que pour un chiffre-PREUVE (pourcentage,
  volume, classement, montant, donnee d'etude). Un chiffre-ANECDOTE (age "79 ans", annee/date, duree,
  "12 personnes" dans une salle) est dispense de la parenthese collee **si et seulement si** le post
  porte une ligne `Source : ...` non vague (avant les hashtags) qui couvre l'anecdote. Liste fermee de
  motifs : un chiffre hors liste reste strict ; "N personnes/ans" dans une phrase de sondage/etude reste
  une donnee d'etude (refuse). Voir `estDetailAnecdote` et les 7 tests du 21/09 dans
  `test/valider-post.test.js`.

### Accents manquants -- `lib/valider-orthographe.js`

Refuse tout texte contenant un mot d'une liste fermee de mots toujours accentues en francais
standard (ete/été, deja/déjà, meme/même, etc. -- `declaratif`/`declarative` et `reel`/`reelle`
ajoutes le 25/09/2026, voir plus haut). Heuristique volontairement imparfaite : les mots
ambigus selon le contexte ("a"/"à", "ou"/"où") sont exclus pour eviter les faux positifs. Appele
depuis `validerDiapos`, `validerEtConvertirPost` et, depuis le 25/09/2026, `convertirGras` (sur
chaque passage en gras, meme sans accent present -- voir "Texte du post" ci-dessus) et
`publierDocumentZernio` (sur `documentTitle`, jamais verifie avant cette date -- retour de Julien :
"L'IA declarative" etait passe tel quel).

### Anglicismes -- `lib/valider-anglicismes.js`

Refuse tout texte contenant un mot d'une liste FERMEE d'anglicismes de vocabulaire professionnel
courants (process, deadline, feedback, workflow, business, brief, benchmark, reporting, roadmap,
kickoff, mindset, insight, targets, networking), avec son equivalent francais propose dans le
message de refus. Ajoute le 25/09/2026 (retour de Julien par mail, voir "Retours du mail de Julien
du 25/09/2026" plus haut). Appele depuis `validerDiapos`, `validerEtConvertirPost` (sur le
brouillon, avant conversion du gras) et `publierDocumentZernio` (sur `documentTitle`) -- memes 3
surfaces que `validerAccents`.

## Audit adversarial et de robustesse (15/09/2026)

Un sous-agent dedie a tente reellement de faire passer du contenu hors-regle a travers
`lib/valider-diapos.js`/`lib/valider-post.js` (sans jamais modifier leur code, rendu reel via
Playwright pour confirmer l'impact visuel), et des donnees malformees ont ete injectees dans les
fonctions de validation/reseau. Failles reellement reproduites et corrigees le meme jour, chacune
verrouillee par un test dans `test/adversarial-15-09.test.js` :

- **Chiffre EN GRAS echappait totalement a `validerChiffreSource`** (severite haute) : le
  controle s'execute sur le texte APRES conversion du gras, qui transforme les chiffres ASCII en
  chiffres Unicode "Mathematical Bold" -- `\d+` ne les reconnaissait pas. `"**40**% ... sans
  source"` passait entierement inapercu. `REGEX_CHIFFRE` reconnait desormais aussi cette plage
  Unicode.
- **Mot colle par des tirets contournait le compte de 25 mots**, confirme par rendu Playwright
  reel (texte debordant visuellement de la diapo, chevauchant le pied de page) : `compterMots`
  segmente desormais aussi sur les tirets, et un filet de securite en caracteres
  (`CARACTERES_MAX_PAR_DIAPO`, 260) refuse tout texte anormalement long meme si le compte de
  "mots" passe (autre separateur exotique).
- **"ce n'est pas X, c'est Y" contournable par "mais plutot Y"** (sans "c'est") : regex elargie.
- **Emoji "milieu de phrase" cache par un retour a la ligne artificiel** : le controle raisonnait
  ligne par ligne, pas phrase par phrase -- un simple `\n` juste avant/apres l'emoji le faisait
  passer pour "en tete/fin de ligne". Les lignes sans ponctuation forte (`.!?`) sont desormais
  fusionnees en "phrases visuelles" avant la verification de position.
- **Source vague acceptee mecaniquement** ("(source : une etude recente)", "(source : les
  chiffres)") : liste fermee de remplissages vagues refuses (`SOURCES_VAGUES`), meme philosophie
  que `COMMENTAIRES_VIDES` dans linkedin-commentaires -- rattrapage partiel assume, pas une
  preuve de source reelle.
- **Limite deja documentee, non corrigee** : un chiffre ecrit en toutes lettres ("quarante pour
  cent") n'est jamais detecte par `validerChiffreSource` -- assume explicitement par le
  commentaire au-dessus de cette fonction depuis sa creation, confirme concretement par l'audit.
- **Diapo `null`/titre vide/caracteres de controle** : un element `null` au milieu du tableau de
  diapos, un `titre` absent/vide, ou un caractere de controle non imprimable passaient
  silencieusement (ou plantaient avec un `TypeError` brut) -- refus explicite desormais.
- **Fichier de diapos ou reponse Composio corrompus** : `JSON.parse`/`reponse.json()` sans filet
  plantaient avec des erreurs brutes -- messages explicites desormais
  (`generer-pdf.js`, `lib/composio.js`).

## Audit adversarial du 22/09/2026 (demande explicite de Nomena, meme methode)

Tente reellement de faire passer du contenu hors-regle a travers `lib/valider-post.js`, sans
modifier son code, sur les quatre skills LinkedIn a la fois (voir aussi `linkedin-mise-en-forme`
et `linkedin-commentaires`). Failles reellement reproduites et corrigees le meme jour, verrouillees
par `test/adversarial-22-09.test.js` :

- **"commentez OUI" et "partagez si" contournables par espacement/ponctuation** : `C O M M E N T
  E Z   O U I` (une lettre par groupe), `commentez-oui` (tiret) et `commentez : oui` (ponctuation
  intercalee) passaient tous a travers `validerInterdits`, qui n'attrapait le separateur qu'en
  espace(s) simple(s). Corrige en verifiant EN PLUS une version du texte normalisee (lettres
  minuscules uniquement, tout separateur retire) pour ces deux motifs precis -- pas pour toute la
  banque, les autres motifs dependant d'une syntaxe qui perdrait son sens une fois compactee.
- **Hashtag ecrit avec le caractere fullwidth "＃" (U+FF03) echappait entierement a la limite de
  2** : `validerHashtags` ne reconnaissait que le diese ASCII "#". Les deux caracteres sont
  desormais equivalents.
- **Limite deja documentee, confirmee toujours vraie** : un chiffre en toutes lettres reste hors
  de portee de `validerChiffreSource` (voir plus haut, 15/09/2026) -- ce n'est pas une regression,
  la limite tient toujours.
- **Verifie sans trouver de faille** : le comptage d'emojis face aux modificateurs de teint
  (👍🏽, compte correctement comme 1 seul emoji) et aux sequences ZWJ (👨‍👩‍👧‍👦, compte 4 emoji pour
  1 glyphe visuel -- rend le controle plus strict, jamais plus permissif, donc pas une faille
  exploitable).

## Convention de nommage des fichiers de sortie

`sortants/<compte>/<Titre lisible en francais>.pdf` -- sans date ni numero, casse et accents
conserves : LinkedIn affiche ce nom sous le post publie, il doit se lire comme un vrai titre.
Anti-collision : `" (2)"`, `" (3)"`... jamais d'ecrasement silencieux d'un fichier existant.

## Publication reelle

**Basculee sur Zernio le 24/09/2026 (mail de Julien du 24/09/2026).** Jusqu'a cette date, la
publication passait par Composio (`lib/composio.js`, `lib/publier.js`, encore presents dans le
depot pour memoire mais plus utilises par cette skill) : aucune de ses actions ne depose un
document/PDF sur LinkedIn, seulement des images -- ce qui partait comme "carrousel" etait en
realite une grille d'images separees, jamais un vrai document feuilletable. Le blocage recurrent
du classifieur auto-mode de Claude Code sur les tentatives d'atteindre l'API Documents LinkedIn
via Composio (`COMPOSIO_REMOTE_WORKBENCH`/`proxy_execute`, motif "Real-World Transactions",
18/09/2026) est desormais sans objet : Zernio expose directement un type de media `document`
qui n'a pas besoin de ce mecanisme.

**Ce que fait `publier-zernio.js`** (`lib/zernio.js` pour les appels HTTP bas niveau,
`lib/publier-zernio.js` pour la logique de publication) :

1. **Verification du compte, avant tout envoi.** `verifierCompteZernio()` appelle reellement
   `GET /v1/accounts` et confirme que le `zernio_account_id` renseigne dans
   `reglages-comptes.json` pour le compte demande existe, est actif, porte sur LinkedIn, et
   correspond (quand l'API renvoie `profileUrl`) a l'URL de profil attendue -- refus explicite
   sinon, jamais un envoi "au cas ou l'accountId soit le bon".
2. **`POST /v1/media/presign`** avec `filename`/`contentType`/`size` -- renvoie une `uploadUrl`
   signee (valide 1h) et une `publicUrl` (stockage temporaire Zernio, 7 jours).
3. **`PUT` du PDF vers cette `uploadUrl`** (aucun en-tete `Authorization` sur ce televersement --
   l'URL est deja signee).
4. **`POST /v1/posts`**, uniquement avec le drapeau CLI `--publier` explicite : media de type
   `document` (`mediaItems: [{ type: 'document', url: publicUrl }]`) et
   `platforms[].platformSpecificData.documentTitle` pour le titre affiche sous le post --
   LinkedIn exige ce titre, sans lui il retombe sur le nom de fichier (jamais souhaitable, voir
   "Convention de nommage des fichiers de sortie").

**Usage CLI** :

```
node publier-zernio.js <compte> <pdf> <documentTitle> [texte-post.txt] [--publier]
```

Sans `--publier`, le script s'arrete apres l'upload (etapes 1-3) et n'appelle jamais
`/v1/posts` -- c'est le mode utilise pour tester l'envoi avant tout accord de publication.
`ZERNIO_API_KEY` est lue depuis `.env` (voir "Variables d'environnement"), jamais affichee ;
les URL signees sont masquees dans les logs (parametres de requete retires).

**Test reel effectue le 24/09/2026** (presign + upload seulement, sans `--publier`) : PDF de
test `sortants/julien-agency/_test-6-modeles.pdf` (696 970 octets) televerse avec succes pour
`julien-agency` ET `julien-partners`, verification de compte passee dans les deux cas contre
`GET /v1/accounts` reel. Aucun post reel n'a ete cree a cette occasion.

**Premiere publication reelle effectuee le 25/09/2026, pour julien-agency.** Sujet "55% des
TPE-PME disent utiliser l'IA. Seulement 17% l'utilisent vraiment." (sources Bpifrance Le Lab
13/01/2026 et Insee 14/10/2025, lues directement, pas de memoire). Carrousel de 8 diapos, 6
modeles distincts, 2 images reelles fal.ai (`a-publier/images/julien-agency-2026-09-25-page5.jpg`
et `-page7.jpg`). Texte valide 13/13 par `linkedin-mise-en-forme` et par `generer-post.js`.
Publie via `publier-zernio.js --publier` apres accord explicite de Nomena dans la conversation
(mail de Julien du 25/09/2026 : « Tu as tout pour publier le premier carrousel test. J'attends
l'URL. »). Confirme par l'API (pas une simple lecture du script) : `GET /v1/posts/<id>` renvoie
`status: "published"`, `platformPostUrl:
"https://www.linkedin.com/feed/update/urn:li:ugcPost:7509117168333287425/"`,
`mediaItems[0].type: "document"`. **Non verifie visuellement** (rendu reel dans le fil LinkedIn,
compteur de pages, logo) : l'extension Claude in Chrome etait deconnectee au moment de la
publication -- a confirmer visuellement des que la connexion est retablie.

**Corrige et republie le 25/09/2026, pour julien-agency, suite aux 6 retours de Julien sur le
carrousel ci-dessus** (voir "Correction du 25/09/2026" plus haut pour le detail des 6 points).
Meme sujet, 9 diapos (une page ajoutee, point 6), texte du post reecrit en 4 lignes (point 5),
documentTitle "Passez du déclaratif au réel" (point 4). Chaque page verifiee par rendu reel
(`node generer-images.js par-diapo ...`), y compris un aller-retour sur la hauteur de
`.image-slot` (voir "Correction du 25/09/2026", point 2 -- un premier correctif corrigeait le haut
de la page 5 mais faisait deborder le bas de la page 7, corrige avant publication). Publie via
`publier-zernio.js --publier` (dispense d'accord par post pour julien-agency, voir plus bas).
Confirme par l'API : `GET /v1/posts/6ab63d5de130f6fc4af4c1a4` renvoie `status: "published"`,
`platformPostUrl: "https://www.linkedin.com/feed/update/urn:li:ugcPost:7509180583709691904/"`,
`mediaItems[0].type: "document"`, `platformSpecificData.documentTitle: "Passez du déclaratif au
réel"`. **L'ancien post (`urn:li:ugcPost:7509117168333287425`) n'a pas ete supprime** -- Julien a
dit qu'il ferait le menage lui-meme.

**Publication automatique, sans accord par post, pour julien-agency ET julien-partners
uniquement.** Decision de Julien, mail du 24/09/2026 : « Je t'autorise a publier automatiquement,
chaque jour, sur les comptes julien-agency et julien-partners », publication "sans clic" posee
comme critere d'evaluation. Pour ces deux comptes seulement, `publier-zernio.js --publier`
peut donc s'executer sans repasser par un accord explicite poste par poste -- le controle
qualite (validation des diapos, du texte via `linkedin-mise-en-forme` et `generer-post.js`,
verification du compte Zernio) reste obligatoire et se fait **avant** le script, jamais saute.
Cette dispense ne vaut pour aucun autre compte : `page-claude` (et tout compte futur) reste
sous la regle generale "Rien de public sans feu vert explicite" du `CLAUDE.md` racine.

## Registre des echecs Composio/LinkedIn (`data/registre-echecs.json`)

**Ne couvre plus le chemin de publication reel de cette skill depuis le 24/09/2026** (bascule
sur Zernio, voir "Publication reelle") -- `lib/composio.js`/`lib/publier.js` restent dans le
depot mais ne sont plus appeles par `publier-zernio.js`. Section gardee pour memoire et parce que
le mecanisme partage (`lib/composio-canal.js`) sert encore a `linkedin-commentaires`.

Ajoute le 17/09/2026 (suite) -- comble un manque signale par un rapport d'investigation sur le
quota Composio du 16/09/2026 : jusque-la, aucune trace des tentatives de publication echouees
n'existait, seuls les succes etaient documentes a la main.

Desormais, tout echec reel de `lib/composio.js` (upload d'image ou creation du post) est
journalise automatiquement, AVANT que l'erreur ne remonte a l'appelant -- le comportement en cas
d'echec ne change pas, seule une trace est gardee en plus. Chaque entree : horodatage, compte
vise, canal (`rest`), action Composio appelee, code HTTP si disponible, `source` (`composio` si
le rejet vient d'avant tout relais reel -- cle invalide, format de requete refuse ; `linkedin` si
Composio a bien relaye mais que l'action elle-meme a echoue cote LinkedIn), et un message d'erreur
tronque. **Jamais de cle API ni de donnee personnelle dans ce fichier.**

Fichier local, jamais commite (voir `.gitignore` racine, meme regle que
`linkedin-commentaires/data/`) -- a consulter en cas d'investigation future sur un incident de
publication ou de quota. Implementation partagee avec `linkedin-commentaires` :
`plugins/skills-equipe/lib/composio-canal.js`, fonction `journaliserEchec`.

## Regles d'usage (brief du 10/09/2026, section 2) -- etat actuel

1. **Phrase de lancement** : faite.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]`.
3. **Lecture des chiffres depuis une capture d'ecran** : sans objet pour l'instant -- cette regle
   vise le suivi de performance d'un post deja publie ; cette skill ne suit encore aucune
   metrique post-publication.
4. **Rien ne plante a vide** : `validerDiapos` et `chargerGabarit` refusent avec un message
   explicite (jamais une exception brute) ; `etat.js` gere le cas "aucun brouillon nulle part".
5. **Jamais les mains vides** : `etat.js` propose un repli concret des qu'aucun brouillon ni
   carrousel n'existe pour un compte.

## Historique et incidents

Tests de publication reels, echecs techniques documentes (dont la suppression des anciens
carrousels, toujours non resolue), decisions de conception avec leur motif :
`references/linkedin-carrousel-historique.md`. Etat des lieux transverse aux 3 skills :
`references/etat-linkedin-20260912.md`.
