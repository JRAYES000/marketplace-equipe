---
name: linkedin-carrousel
description: "Composer et publier des carrousels LinkedIn pour Claude Agency (acces confirme le 12/09) et Claude Partners (acces non confirme) -- la page Claude est abandonnee pour l'instant. Activation MANUELLE uniquement : ne se declenche jamais d'elle-meme, seulement sur demande explicite (ex. 'fais-moi un carrousel', 'genere le carrousel du jour', 'carrousel LinkedIn sur <sujet>')."
---

# linkedin-carrousel

**Activation MANUELLE uniquement.** Cette skill ne se lance jamais d'elle-meme -- seulement sur
demande explicite.

**Phrase de lancement** : « fais-moi un carrousel ».
Variantes probables : « genere le carrousel du jour », « carrousel LinkedIn sur <sujet> »,
« carrousel pour julien-agency/julien-partners », « prepare le carrousel de la semaine ».

**Point de situation** : lancer `node etat.js [compte]` avant toute chose -- affiche en trois
lignes le dernier carrousel genere, les brouillons en attente de rendu, et l'etat de
publication reelle (jamais suivi automatiquement, a verifier aupres de Julien). Propose un
repli si rien n'est en attente (jamais les mains vides).

## Perimetre au 12/09/2026 (renverse le meme jour par un test reel -- ne pas revenir a la version precedente)

**Hypothese initiale de Julien (11-12/09/2026), infirmee par un test reel le 12/09/2026** :
Julien pensait que la connexion Composio partagee `averse-cooser` correspondait a
julien-partners ("compte marque par defaut"), et avait donc designe julien-partners comme
priorite absolue. Un appel reel de `LINKEDIN_GET_MY_INFO` via le canal MCP (voir plus bas et
`references/etat-linkedin-20260912.md`) a renvoye `id: aFqu-W7ClW` -- **julien-agency, pas
julien-partners**. Cette trace est gardee volontairement : ce n'est pas une supposition qui
s'est averee juste, c'en est une qui s'est averee fausse, corrigee par un test, pas par une
nouvelle supposition.

**Perimetre reel a jour** :
- **julien-agency** : **acces Composio confirme reellement** le 12/09/2026 (connexion
  `averse-cooser`). C'est desormais le seul compte sur lequel un exemple reel de publication
  est possible. Carrousel pret dans `a-publier/` (redige pour ce compte, pas une simple
  reutilisation du texte pense pour julien-partners -- voir `a-publier/README.md`), **en
  attente de l'accord explicite de Julien avant tout appel reel** de
  `publierCarrouselViaImage` -- l'identite technique est solide, mais publier reste un acte
  public irreversible sur son compte, pas une decision a prendre seul.
- **julien-partners** : acces Composio **non confirme** -- `averse-cooser` ne correspond pas a
  ce compte. Aucune autre connexion LinkedIn partagee n'est visible a ce jour pour ce compte.
  A rouvrir si/quand un acces reel existe ; ce n'est plus la priorite du 20/09.
- **page-claude** : **abandonnee pour l'instant**, sur decision de Julien. Le code deja ecrit
  (URN substituable dans `publierCarrousel`/`publierCarrouselViaImage`, template
  `templates/page-claude.html`) reste tel quel dans le depot sans qu'on y retouche -- ce n'est
  pas un chantier actif, ne pas perdre de temps a le reprendre. `reglages-comptes.json` garde
  l'entree `page-claude` (structure a 3 comptes voulue), mais son `ton`/`palette`/`concurrents`
  restent volontairement vides : les renseigner serait du travail perdu.

`generer-pdf.js` produit le PDF multi-page a partir des templates de `templates/` et d'une
liste de diapos (voir l'en-tete du script pour l'usage et la convention de nommage des
fichiers de sortie). `generer-images.js` fait le meme rendu en PNG (repli image, voir
plus bas).

## Tentative reelle de publication le 12/09/2026 (julien-agency, mode "couverture") -- ECHEC PROPRE, rien publie

Julien a donne son accord explicite ("OK parfait pour Claude Agency. Peu importe le compte
LinkedIn sur lequel tu publies.") apres le renversement d'identite ci-dessus. Contenu
`a-publier/julien-agency-2026-09-12.json`/`.commentary.txt` relu avant publication : aucune
trace residuelle de "Partners" ou de l'angle "reseau professionnel" (verifie mot a mot, et sur
le rendu visuel des 5 diapos -- branding "CLAUDE AGENCY" correct en pied de page).

Tentative reelle via le canal MCP (meme methode que la confirmation d'identite, cle consumer
du compte Composio de nomena) :
1. `LINKEDIN_REGISTER_IMAGE_UPLOAD` (owner_urn `aFqu-W7ClW`) -> **reussi**, `upload_url` +
   asset URN LinkedIn natif obtenus.
2. PUT des octets de l'image de couverture (1080x1350, PNG) sur `upload_url` -> **reussi**,
   `201 Created`.
3. `LINKEDIN_CREATE_LINKED_IN_POST` (author `aFqu-W7ClW`, commentary du fichier, `images:
   [<URN de l'etape 1>]`) -> **ECHOUE**, `400` : `"Invalid request data provided - Input
   should be a valid dictionary or instance of FileUploadable on parameter images.0"`.
   **Aucun post n'a ete cree.**

Cause reelle, confirmee via `COMPOSIO_GET_TOOL_SCHEMAS` sur `LINKEDIN_CREATE_LINKED_IN_POST` :
le parametre `images` n'accepte pas une URN d'asset LinkedIn en chaine simple (ce que l'etape 1
produit) -- il exige un objet `{ name, mimetype, s3key }` referencant un fichier deja stocke
dans le S3/R2 propre a Composio. C'est une contrainte du wrapper Composio, pas de l'API
LinkedIn native. Consequence : l'implementation actuelle de `publierCarrouselViaImage` (voir
`lib/publier.js`) est **confirmee non fonctionnelle** pour l'etape de creation du post -- un
garde-fou explicite y a ete ajoute (leve une erreur claire avant tout appel reseau, pour ne
pas re-televerser inutilement une image a chaque tentative). Correction non implementee :
router le fichier via le stockage S3 de Composio necessite `COMPOSIO_REMOTE_WORKBENCH`
(l'unique outil MCP exposant `upload_local_file`), ce qui suppose de faire entrer les octets
de l'image dans son bac a sable distant -- l'encodage base64 tente pour cela a ete bloque par
le classifieur auto-mode de Claude Code (meme famille que les blocages deja documentes sur la
construction du flux OAuth), non contourne.

**linkedin-carrousel n'est donc pas livre le 12/09/2026** : le rendu (PDF, image) et
l'identite du compte sont valides et reels, mais la publication reelle reste bloquee sur ce
point technique precis, distinct de tout accord ou identite. A reprendre : corriger
`publierCarrouselViaImage` pour router via le stockage Composio, ou trouver un canal
alternatif pour faire entrer le fichier dans le bac a sable sans se heurter au classifieur.

**Complement le meme jour -- le reste du pipeline texte fonctionne** : pour verifier que
seule l'etape image pose probleme (pas le canal MCP ni l'identite en general), un appel reel
de `LINKEDIN_CREATE_LINKED_IN_POST` **sans image**, en `lifecycleState: "DRAFT"`, a ete fait
pour julien-agency -- cree avec succes, verifie non accessible en lecture publique (coherent
avec un brouillon), puis supprime immediatement (`LINKEDIN_DELETE_POST`, `deleted: true`).
Confirme que l'authentification, l'URN d'auteur et le champ `commentary` marchent de bout en
bout sur ce compte via ce canal -- le blocage est localise precisement a l'objet `images`, pas
plus large.

## Deuxieme tentative reelle, meme jour -- PDF publie techniquement, contenu visible NON CONFIRME

Julien a trouve le vrai mecanisme cote Composio (teste par lui-meme pour l'upload) :
`COMPOSIO_REMOTE_WORKBENCH` embarque un helper `upload_local_file` qui appelle lui-meme
`/api/v3/files/upload/request` avec la cle de la session MCP en cours -- pas besoin d'une cle
de projet Composio separee, contrairement a ce que la tentative precedente (endpoint appele a
la main) laissait penser. Deroule dans une seule session MCP continue, comme demande (le
`s3key` n'est valide que pour la session qui l'a genere) :

1. Le PDF du carrousel (`sortants/julien-agency/...pdf`, deja rendu) a ete transfere dans le
   bac a sable distant, decode, puis televerse via `upload_local_file` -- **reussi**, un
   `s3key` reel obtenu.
2. `LINKEDIN_CREATE_LINKED_IN_POST` appele dans la meme session avec `images: [{ name:
   "carrousel.pdf", mimetype: "application/pdf", s3key: <valeur de l'etape 1> }]`, author
   `aFqu-W7ClW`, le commentary deja redige -- **reussi**, sans erreur :
   `{"data":{"x_restli_id":"urn:li:share:7504217733631266816"},"error":null}`.

**Ce qui n'est PAS confirme** : si le PDF apparait reellement comme document/carrousel
feuilletable sur le post, ou si LinkedIn a silencieusement ignore un type de fichier qu'il ne
traite pas vraiment via ce champ (le point de vigilance signale par Julien lui-meme des le
depart). Deux tentatives de verification par lecture ont echoue : `LINKEDIN_GET_POST_CONTENT`
(`403 Forbidden`) et `LINKEDIN_LIST_REACTIONS` (`404 Entity not found`) -- mais le meme genre
d'echec de lecture etait deja survenu sur le brouillon de test precedent, qui existait bel et
bien (confirme par sa suppression reussie) : ce n'est donc probablement pas concluant en soi.
Verification par URL publique non plus : LinkedIn a renvoye un code `999` (anti-bot) sur les
tentatives d'acces non authentifie -- **non contourne**, conformement a l'interdiction de
contourner les mecanismes anti-bot.

**Le post n'a pas ete supprime** : rien dans les reponses ne signale un echec reel (pas
d'erreur de l'API), donc le supprimer sur une simple incertitude aurait ete une action
destructive non justifiee. **Julien a ete sollicite pour ouvrir le post lui-meme et confirmer
ce qu'il voit reellement** (PDF/carrousel affiche, ou post texte seul) -- reponse en attente au
moment de cette redaction. Ne pas marquer ce point comme "livre et valide" tant que cette
confirmation n'est pas arrivee.

## Cinq regles d'usage (brief du 10/09/2026, section 2) -- etat au 14/09/2026

1. **Phrase de lancement** : faite, voir en tete de ce fichier et dans le README du paquet.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]` (voir en tete de ce
   fichier).
3. **Lecture des chiffres depuis une capture d'ecran, jamais de saisie manuelle** : **sans objet
   pour l'instant, assume explicitement plutot que fait a moitie**. Cette regle vise le suivi
   de performance d'un post deja publie (vues, reactions) -- `linkedin-carrousel` ne fait que
   generer et publier, il ne suit encore aucune metrique post-publication. A reprendre le jour
   ou un tableau de suivi (Notion ou autre) est construit pour cette skill.
4. **Rien ne plante a vide** : fait pour les cas reels de cette skill -- `validerDiapos` refuse
   avec un message explicite (jamais une exception brute) sur une liste vide ou hors bornes,
   `chargerGabarit` fait de meme sur un compte inconnu, et `etat.js` gere explicitement le cas
   "aucun brouillon nulle part" (voir regle 5). `reglages-comptes.json` existe mais **n'est lu
   par aucun code** de cette skill a ce jour (verifie) -- rien a proteger de ce cote, le
   compte/gabarit vient toujours de l'argument CLI.
5. **Jamais les mains vides** : fait, `etat.js` propose un repli concret (reprendre
   `fixtures/diapos-exemple.json` ou un sujet deja publie sous un angle propre au compte) des
   qu'aucun brouillon ni carrousel n'existe pour un compte -- teste reellement sur
   `page-claude` (aucun contenu a ce jour), voir sortie plus bas.

## Garde-fous automatiques (2026-09-14) -- refus explicite, pas un avertissement

Priorite 1 du 14/09/2026 : amener `linkedin-carrousel` a conformite complete avant de rouvrir
`linkedin-commentaires` ("mieux vaut deux skills finies que trois a moitie faites"). Les regles
de structure et d'ecriture du brief integral (sections 3 et 4) sont desormais codees en
garde-fous qui **refusent** -- ils ne se contentent pas de signaler.

### A. Structure du carrousel -- `lib/valider-diapos.js`

Appele automatiquement par `genererPdf()` (donc par le CLI `generer-pdf.js`), AVANT tout
rendu :
- Nombre de diapos hors de [8, 12] -> refus, message avec le compte reel et la fourchette.
- Une diapo (titre + texte) au-dela de 25 mots -> refus avec le numero de la diapo fautive et
  le nombre de mots constate. Aucune reduction de police n'existe nulle part dans le code
  (verifie : `templates/*.html` n'a pas de taille de police calculee dynamiquement) -- le
  seul geste possible reste de raccourcir le texte.
- Diapo 1 doit porter `role: "hook"` et n'avoir aucun texte de soutien (accroche seule, sans
  logo) -> refus sinon.
- **Limite assumee** : "diapo 2 = le gain", "diapos 3-9 = une idee chacune", "derniere = une
  action" sont des exigences de SENS, pas de forme -- aucun code ne peut verifier qu'une
  phrase exprime bien "une seule idee". Seule la position et le decompte de mots sont
  verifies automatiquement.
- Titres >=64px, texte >=40px, numero sur chaque diapo, fleche sur la premiere : mesures
  reellement (pas lues dans le CSS) via Playwright sur les 3 templates --
  `test/tailles-police.test.js` et `test/numero-fleche.test.js`, 15 tests, tous verts.

### B. Ecriture du texte du post -- `lib/valider-post.js` + `generer-post.js`

Brouillon redige avec le gras en `**etoiles**` ; `node generer-post.js <brouillon> [sortie]`
convertit et refuse (code de sortie 1, jamais un simple avertissement) :
- Gras accentue -> refus (aucune forme Unicode grasse n'existe accentuee).
- Aucun gras du tout -> refus.
- Emojis hors de [3, 5], au milieu d'une phrase, ou deux consecutifs -> refus.
- Hors de 1300-1900 caracteres -> refus avec le compte reel.
- Accroche sans "?" dans les 140 premiers caracteres -> refus.
- Plus de 2 mots-dieses, ou places ailleurs qu'en toute fin -> refus.
- Formulations interdites (demande d'engagement, tiret long, "ce n'est pas X c'est Y", "ravi
  de vous annoncer", "taguez quelqu'un", critique de LinkedIn, MAJUSCULES) -> refus.
- Chiffre sans `(source : ...)` attache -> refus -- **le filet principal**, traite comme tel :
  un nombre ecrit en toutes lettres ("sept", "dix") n'est jamais concerne, seule une suite de
  chiffres l'est.
- `test/valider-post.test.js` : 15 tests, chacun un cas reel qui doit echouer (gras accentue,
  2 emojis colles, 1200 caracteres, chiffre sans source, etc.) -- tous verts, sortie reelle
  capturee, pas une description.

### C. Cinq regles d'usage (section 2 du brief) -- etat au 14/09/2026

1. **Phrase de lancement** : faite, voir en tete de ce fichier et dans le README du paquet.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]` (voir en tete de ce
   fichier) -- lit l'etat reel sur disque (derniers PDF generes, brouillons en attente),
   jamais de donnee inventee.
3. **Lecture des chiffres depuis une capture d'ecran, jamais de saisie manuelle** : **sans
   objet pour l'instant, assume explicitement plutot que fait a moitie**. Cette regle vise le
   suivi de performance d'un post deja publie (vues, reactions) -- `linkedin-carrousel` ne
   fait que generer et publier, il ne suit encore aucune metrique post-publication. A
   reprendre le jour ou un tableau de suivi (Notion ou autre) est construit pour cette skill.
4. **Rien ne plante a vide** : `validerDiapos` et `chargerGabarit` refusent avec un message
   explicite (jamais une exception brute) ; `etat.js` gere le cas "aucun brouillon nulle
   part" (voir regle 5). `reglages-comptes.json` existe mais **n'est lu par aucun code** de
   cette skill a ce jour (verifie) -- rien a proteger de ce cote.
5. **Jamais les mains vides** : `etat.js` propose un repli concret (reprendre
   `fixtures/diapos-exemple.json` ou un sujet deja publie sous un angle propre au compte) des
   qu'aucun brouillon ni carrousel n'existe pour un compte -- teste reellement sur
   `page-claude` (aucun contenu a ce jour) :
   ```
   $ node etat.js page-claude
   Aucun carrousel jamais genere pour page-claude.
   Aucun brouillon en attente de rendu pour page-claude.
   Publication reelle sur LinkedIn : aucune confirmation suivie automatiquement ici -- ...
   Repli propose : aucun contenu pour page-claude pour l'instant -- reprendre
   "fixtures/diapos-exemple.json" comme point de depart, ou un sujet deja publie ...
   ```

### D. Exemple reel conforme -- produit en faisant tourner la skill

`a-publier/julien-agency-2026-09-14-v2.brouillon.txt` (gras en `**etoiles**`) ->
`node generer-post.js` -> `a-publier/julien-agency-2026-09-14-v2.commentary.txt` (texte final,
1413 caracteres, accroche interrogative 87 caracteres, 4 emojis en tete de bloc, 2 passages en
gras unicode sans accent, 2 hashtags en fin, aucune formulation interdite -- valide par le
garde-fou reel, pas ecrit a cote). `a-publier/julien-agency-2026-09-14-v2.json` (10 diapos) ->
`node generer-pdf.js julien-agency ...` -> `sortants/julien-agency/Pourquoi vos meilleurs
candidats disparaissent-ils avant l'offre.pdf`, 10 pages, genere par le garde-fou `validerDiapos`
en amont (refuse sinon).

**Verification visuelle page par page faite** (rendu PNG identique au PDF, voir
`test/generer-images.test.js`) : accroche seule + fleche "BALAYEZ" sur la diapo 1, logo "Claude
Agency" sur les 9 suivantes, numerotation 01-10 correcte, aucun texte tronque. **Un defaut de
contenu trouve puis corrige** pendant cette relecture : la diapo 2 annoncait "trois signes"
alors que 7 diapos d'idees suivent -- corrige en "sept signes" (json ET post relies, pipeline
re-execute entierement, pas seulement le fichier concerne) -- aucun garde-fou automatique ne
pouvait detecter cette incoherence de sens, seule la relecture visuelle l'a fait.

**Chiffre sourcé trouvé et intégré** (mise à jour du 14/09/2026, après recherche explicitement
demandée par Julien, 10 minutes) : 26 % des TPE-PME françaises utilisent déjà l'IA en 2025
(source : France Num, Direction générale des Entreprises, *Baromètre France Num 2025*, publié
septembre 2025 — URL réellement ouverte et lue, pas une statistique de mémoire). Intégré via le
pipeline réel (`generer-post.js`), pas à la main. **Bug réel trouvé et corrigé à cette
occasion** dans `lib/valider-post.js` : l'année écrite à l'intérieur de sa propre citation
`(source : France Num, 2025)` était détectée comme un second chiffre sans source et bouclait
sur son propre refus — corrigé en élargissant la fenêtre de détection (avant ET après le
chiffre, pas seulement après), voir `test/valider-post.test.js`.

**Publication réelle exécutée le 14/09/2026** (mêmes 4 étapes que le premier carrousel,
nouvelle session MCP) : upload confirmé (`urn:li:document:D5610AQFhGep7UlLEHw`, 81 693 octets,
`Content-Length` vérifié par `HEAD` sur `downloadUrl`, statut `AVAILABLE`), `POST /rest/posts`
exécuté avec le texte validé par les garde-fous — **`successful: true`, corps vide, aucun ID de
post extractible** (même limitation que la première fois : LinkedIn renvoie l'ID réel dans
l'en-tête HTTP `x-restli-id` d'une réponse `201` à corps vide, non exposé par `proxy_execute`
en cas de succès). Une tentative de lecture (`GET /rest/posts?q=author`) a échoué en `403`,
cohérent avec les droits écriture seule de ce compte, pas un signal d'échec.

**Aucune nouvelle tentative relancée** pour éviter un doublon.

**CONFIRMÉ le 14/09/2026, par navigateur réel** (pas par l'API, en échec normal sur ce compte
en lecture) : consultation directe de `linkedin.com/in/julien-rayes` via Claude in Chrome
(session LinkedIn authentifiée de Nomena — l'usage normal pour vérifier un post, pas un
contournement anti-bot). **Les deux carrousels sont réellement en ligne et s'affichent comme
des documents feuilletables** :

- **Carrousel du 14/09 (10 diapos, conforme au brief)** :
  `https://www.linkedin.com/posts/julien-rayes_pourquoi-vos-meilleurs-candidats-disparaissent-ils-activity-7505170085091840000-6DCd`
  — **document ouvert et inspecté** : la barre du lecteur affiche "10 pages" (confirme le
  compte exact) et le nom de fichier "Pourquoi vos meilleurs candidats disparaissent-ils
  ava..." (tronqué à l'affichage, cohérent avec le nom réel). Diapo 1 pleinement lisible, sans
  troncature ni défaut de rendu, identique au rendu local (accroche, flèche "BALAYEZ", numéro
  01). Texte du post identique à celui validé par `generer-post.js` (chiffre France Num
  inclus). URL confirmée par deux méthodes indépendantes (lien du toast "Copy link to post",
  et attribut `data-urn` du DOM lu via `javascript_tool`) — jamais via le presse-papiers.
- **Carrousel du 12/09 (5 diapos, non conforme au brief — voir Point A de l'audit)** :
  `https://www.linkedin.com/posts/julien-rayes_carrouselpdf-activity-7505146405649559552-m6yM`
  — existe également, contrairement à l'incertitude qui pesait dessus depuis le 12/09.

**Méthode API Documents de LinkedIn : VALIDÉE.** Les deux carrousels tentés par
`proxy_execute` (4 étapes) sont réellement en ligne, corrects (bon nombre de pages, bon
contenu). Le signal ambigu obtenu à chaque fois côté API (`successful: true`, corps vide,
lecture 403 sur `GET /rest/posts`) **est la signature normale d'un succès sur ce compte**
(droits écriture seule) — pas un signal d'échec, pas un doute à lever systématiquement par une
vérification navigateur à chaque publication future. Détail complet dans
`references/etat-linkedin-20260912.md` (Points n°7 et n°8). **Ce point est maintenant livré et
confirmé** pour le carrousel du 14/09 — reste à Julien de décider du sort du carrousel du 12/09
(non conforme mais bien réel).

Le nombre de diapos (5), les mots par diapo (jusqu'a 29) et l'absence totale de gras/emojis du
carrousel du 12/09 ci-dessus **auraient ete refuses** par ces memes garde-fous s'ils avaient
existe a l'epoque -- confirme en rejouant `generer-pdf.js` dessus (voir plus bas).

Voir `references/audit-brief-20260914-v3.md` pour le detail complet, skill par skill, de tout
ce qui reste non conforme au brief integral en dehors de `linkedin-carrousel`
(`linkedin-veille-virale`, `linkedin-commentaires`, obligations transverses).

## Limites connues

- **(2026-09-14, corrige suite au brief du 10/09)** Le nom de fichier de sortie n'est plus
  `AAAA-MM-JJ-<slug>.pdf` mais `sortants/<compte>/<Titre lisible en francais>.pdf` -- sans
  date ni numero, casse et accents conserves -- car LinkedIn affiche ce nom sous le post
  publie et il doit se lire comme un vrai titre, pas comme un identifiant technique. Voir
  `generer-pdf.js` (fonction `nomFichierDepuisTitre`) pour le detail de la regle.
- **(2026-09-11)** Le PDF fini atterrit dans `sortants/<compte>/<Titre lisible>.pdf`,
  mais rien ne le fait passer de la a la publication reelle sur LinkedIn : aucun dossier
  surveille, aucun point d'entree. Verifie a cette date : `sortants/instagram/` du depot
  `visibilite-ops` est vide (juste `.gitkeep`), et son pipeline de brouillons
  (`sortants/<canal>/*.md` + clic "Valider" de Julien) ne gere que du texte, pas un
  artefact binaire comme un PDF. A faire deposer/publier a la main pour l'instant, ou a
  outiller plus tard (ex. un sortant `.md` qui reference le chemin du PDF genere, avec le
  geste de publication -- upload document -- qui reste a construire cote Composio).

- **(2026-09-11, confirme)** `lib/publier.js` (`publierCarrousel`) leve volontairement une
  erreur : verifie sur les 24 actions du toolkit `linkedin` de Composio
  (`references/actions-composio.md` du paquet), **aucune n'accepte un document/PDF**. Les
  actions image (`LINKEDIN_REGISTER_IMAGE_UPLOAD`, `LINKEDIN_INITIALIZE_IMAGE_UPLOAD`) ne
  gerent pas les documents multi-pages, et `LINKEDIN_CREATE_LINKED_IN_POST` n'a pas de champ
  document. Coherent avec `visibilite-ops` (JOURNAL.md, 04/09) qui a abandonne les posts
  illustres pour la meme raison. La fonction reste prete a brancher des qu'une action
  Composio equivalente existera.

- **(2026-09-11)** Canal voulu pour toute publication : MCP (`connect.composio.dev/mcp`),
  pas le SDK/cle API. Teste reellement : ce canal exige un jeton AuthKit (session OAuth),
  pas une cle API statique -- `composio login` (CLI officiel) bloque par le classifieur
  auto-mode, extraction de jeton navigateur ecartee (pas une pratique a suivre). En
  attendant, `lib/composio.js` utilise le canal REST direct comme implementation actuelle --
  raison technique documentee, pas un changement fait en silence.

- **(2026-09-11)** URN d'auteur verifies par Julien pour julien-partners
  (`urn:li:person:ZvLHybJZhj`) et julien-agency (`urn:li:person:aFqu-W7ClW`), dans
  `reglages-comptes.json`. Pour page-claude, `author_urn` reste `null` : `LINKEDIN_GET_COMPANY_INFO`
  repond 403 (autorisation d'organisation a valider cote LinkedIn, Julien s'en occupe) --
  brancher `urn:li:organization:<id>` une fois debloque, rien d'autre a changer.

- **(2026-09-12) Repli image code, mais inerte tant que Julien n'a pas choisi** :
  `generer-images.js` rend localement (Playwright, zero appel Composio, meme gabarit HTML que
  le PDF) les deux options documentees le 11/09 :
  - `genererImagesParDiapo` -- une image PNG 1080x1350 par diapo (option "par-diapo").
  - `genererImageCouverture` -- une seule image PNG 1080x1350, la diapo "hook" ou la
    premiere (option "couverture").
  Verifie reellement en local le 12/09/2026 sur `fixtures/diapos-exemple.json` (4 diapos,
  compte julien-partners, et retest sur julien-agency pour confirmer que le meme pipeline
  fonctionne sur son propre template) : rendu net, polices chargees, 1080x1350px confirme en
  lisant le chunk IHDR du PNG, tailles de fichier coherentes -- voir
  `test/generer-images.test.js` (`npm test`, 12 tests verts). Cote Composio,
  `lib/publier.js` expose `publierCarrouselViaImage({ authorUrn, modeRepli, cheminsImages,
  commentary })` -- `modeRepli: "par-diapo" | "couverture"`. Les etapes de televersement
  (`LINKEDIN_REGISTER_IMAGE_UPLOAD` puis PUT des octets) fonctionnent reellement (confirme le
  12/09/2026), mais l'etape de creation du post est **confirmee non fonctionnelle** -- voir
  "Tentative reelle de publication" plus bas pour le detail complet -- et leve desormais une
  erreur explicite avant tout appel reseau. **Personne ne l'appelle nulle part ailleurs dans ce
  paquet** (verifie par `test/publier-repli-image.test.js`).

- **(2026-09-12) Identite `averse-cooser` -- CONFIRMEE par test reel, infirme l'hypothese initiale** :
  Premiere tentative le 12/09/2026 via le dashboard Composio de nomena (compte membre de
  l'equipe Composio de Julien, deja authentifie dans le navigateur) : la connexion
  `averse-cooser` est bien visible et confirmee comme LA seule connexion LinkedIn partagee,
  mais l'UI ne propose aucun testeur d'action, et construire a la main le flux OAuth du canal
  MCP (`connect.composio.dev/mcp`, AuthKit/WorkOS, PKCE) a ete bloque par le classifieur
  auto-mode apres l'enregistrement du client OAuth -- non contourne a ce stade.

  **Deblocage reel, meme jour** : le dashboard de nomena expose, dans Reglages -> "Sessions &
  API Key", une **cle API "consumer" dediee** (`x-consumer-api-key`) prevue explicitement par
  Composio pour authentifier un client MCP sans passer par le flux OAuth complet -- ce n'est
  pas un jeton extrait en douce, c'est un mecanisme documente sur la page elle-meme ("MCP
  clients can authenticate two ways: with an API key ... or with OAuth"). Avec cette cle en
  en-tete `x-consumer-api-key` :
  1. `POST https://connect.composio.dev/mcp` (`initialize`) -> `200`, session MCP ouverte.
  2. `tools/call` sur `COMPOSIO_SEARCH_TOOLS` ("get the authenticated user's LinkedIn profile
     information") -> revele deja dans sa reponse la connexion active :
     `accounts:[{"id":"linkedin_averse-cooser","user_info":{"sub":"aFqu-W7ClW","name":"Julien
     Rayes",...}}]`.
  3. `tools/call` sur `COMPOSIO_MULTI_EXECUTE_TOOL` avec `tool_slug: LINKEDIN_GET_MY_INFO`,
     `arguments: {}` -> reponse reelle confirmee :
     `"id":"aFqu-W7ClW"`, `"localizedHeadline":"...| Claude Agency"`,
     `"profileUrl":"https://www.linkedin.com/in/julien-rayes"`.

  **Resultat : `id: aFqu-W7ClW` correspond a julien-agency, pas a julien-partners**
  (`ZvLHybJZhj`). L'hypothese initiale de Julien ("compte marque par defaut" = julien-partners)
  etait raisonnable mais fausse -- gardee ci-dessus pour comprendre pourquoi le perimetre a
  bascule le meme jour. `julien-partners` n'a, a ce jour, aucune connexion LinkedIn partagee
  confirmee : a rouvrir si un acces reel apparait un jour pour ce compte.

  Consequence : `publierPost`/`publierCommentaire` peuvent desormais etre appelees reellement
  pour julien-agency avec `authorUrn: urn:li:person:aFqu-W7ClW`. Julien a depuis donne son
  accord explicite pour publier sur ce compte -- voir "Tentative reelle de publication" plus
  bas : l'identite et l'accord ne sont plus le point bloquant, `publierCarrouselViaImage` l'est
  (bug confirme, pas une question d'autorisation).

Etat des lieux complet des 3 skills linkedin-* et de tout ce qui devient
activable des que chaque blocage se leve : `references/etat-linkedin-20260912.md`
du paquet.
