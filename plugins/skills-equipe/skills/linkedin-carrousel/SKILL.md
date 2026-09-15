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

## Ce que fait la skill

1. Compose un carrousel (8-12 diapos) sur un sujet donne, dans le ton du compte cible.
2. `generer-pdf.js` rend le PDF multi-page a partir d'un template de `templates/` et d'une
   liste de diapos (entierement local via Playwright, aucun service externe). `generer-images.js`
   fait le meme rendu en PNG (repli image -- voir "Ce qui ne marche pas encore" plus bas, ne pas
   utiliser pour publier).
3. Redige le texte du post ; `generer-post.js` le valide et convertit le gras.
4. Publie reellement sur LinkedIn via l'API Documents (voir "Publication reelle" plus bas).

## Point de situation

Lancer `node etat.js [compte]` avant toute chose -- affiche en trois lignes le dernier carrousel
genere, les brouillons en attente de rendu, et l'etat de publication reelle (jamais suivi
automatiquement, a verifier aupres de Julien). Propose un repli concret (reprendre
`fixtures/diapos-exemple.json`, ou un sujet deja publie sous un angle propre au compte) des
qu'aucun brouillon ni carrousel n'existe pour un compte -- jamais les mains vides.

## Comptes

- **julien-agency** -- seul compte avec un acces Composio reellement confirme
  (`urn:li:person:aFqu-W7ClW`). Seul compte sur lequel publier reellement aujourd'hui.
- **julien-partners** -- acces Composio non confirme (`urn:li:person:ZvLHybJZhj` dans
  `reglages-comptes.json`, mais aucune connexion partagee active a ce jour).
- **page-claude** -- en pause sur decision de Julien. `author_urn` reste `null`
  (`LINKEDIN_GET_COMPANY_INFO` repond 403, autorisation d'organisation a valider cote LinkedIn).

`reglages-comptes.json` existe (structure a 3 comptes) mais n'est lu par aucun code de cette
skill -- le compte/gabarit vient toujours de l'argument CLI.

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
`references/mail-20260920-brouillon.md`)** : garder cette base commune, ne pas creuser l'ecart.
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

- **`COMPOSIO_API_KEY`** -- repli REST statique, lu par `lib/composio.js` en secours. Ce n'est
  **pas** la voie qui sert reellement a publier (voir "Publication reelle"). Laisser vide reste
  correct.
- **`PDF_RENDER_API_KEY`** -- **vestigiale**, ne rien y mettre : le rendu est 100% local
  (Playwright), aucun service externe n'est appele.

## Garde-fous automatiques (refus explicite, jamais un avertissement)

### Structure du carrousel -- `lib/valider-diapos.js`

Appele automatiquement par `genererPdf()`, avant tout rendu :
- Nombre de diapos hors de [8, 12] -> refus.
- Une diapo (titre + texte) au-dela de 25 mots -> refus (numero de la diapo fautive et nombre de
  mots donnes). Aucune reduction de police n'existe : le seul geste possible est de raccourcir.
- Diapo 1 doit porter `role: "hook"` et n'avoir aucun texte de soutien -> refus sinon.
- Titres >=64px, texte >=40px, numero sur chaque diapo, fleche sur la premiere : mesures
  reellement via Playwright (pas lues dans le CSS).
- **Limite assumee** : "diapo 2 = le gain", "une idee par diapo", "derniere = une action" sont
  des exigences de sens, pas de forme -- aucun garde-fou ne peut verifier qu'une diapo exprime
  bien une seule idee. Seule une relecture visuelle le fait (voir references/).

### Texte du post -- `lib/valider-post.js` + `generer-post.js`

Brouillon redige avec le gras en `**etoiles**` ; `node generer-post.js <brouillon> [sortie]`
convertit et refuse (code de sortie 1) :
- Gras accentue -> refus (aucune forme Unicode grasse accentuee n'existe).
- Aucun gras du tout -> refus.
- Emojis hors de [3, 5], au milieu d'une phrase, ou deux consecutifs -> refus.
- Hors de 1300-1900 caracteres -> refus.
- Accroche sans "?" dans les 140 premiers caracteres -> refus.
- Plus de 2 mots-dieses, ou places ailleurs qu'en toute fin -> refus.
- Formulations interdites (demande d'engagement, tiret long, "ce n'est pas X c'est Y", "ravi de
  vous annoncer", "taguez quelqu'un", critique de LinkedIn, MAJUSCULES) -> refus.
- Chiffre sans `(source : ...)` attache -> refus -- un nombre en toutes lettres ("sept") n'est
  jamais concerne, seule une suite de chiffres l'est.

### Accents manquants -- `lib/valider-orthographe.js`

Refuse tout texte contenant un mot d'une liste fermee de mots toujours accentues en francais
standard (ete/été, deja/déjà, meme/même, etc.). Heuristique volontairement imparfaite : les mots
ambigus selon le contexte ("a"/"à", "ou"/"où") sont exclus pour eviter les faux positifs. Appele
depuis `validerDiapos` et `validerEtConvertirPost`.

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

## Convention de nommage des fichiers de sortie

`sortants/<compte>/<Titre lisible en francais>.pdf` -- sans date ni numero, casse et accents
conserves : LinkedIn affiche ce nom sous le post publie, il doit se lire comme un vrai titre.
Anti-collision : `" (2)"`, `" (3)"`... jamais d'ecrasement silencieux d'un fichier existant.

## Publication reelle

**Methode qui fonctionne** : API Documents de LinkedIn, via le canal MCP Composio
(`COMPOSIO_REMOTE_WORKBENCH`, cle consumer personnelle -- voir `references/actions-composio.md`
pour le protocole complet), en 4 etapes dans une seule session MCP continue :
1. Televerser le PDF dans le bac a sable distant (`upload_local_file`) -> `s3key`.
2. `LINKEDIN_CREATE_LINKED_IN_POST` avec `images: [{ name, mimetype: "application/pdf", s3key
   }]`, author, commentary.

Le signal de reponse est systematiquement ambigu sur ce compte (droits ecriture seule) :
`successful: true`, corps vide, toute lecture (`GET /rest/posts`, etc.) echoue en 403/404 --
**c'est la signature normale d'un succes**, pas un echec. Seule une verification par navigateur
reel (permalink) confirme une publication.

**Ce qui ne marche pas encore** : le repli image (`generer-images.js` +
`publierCarrouselViaImage`) est code et teste pour le rendu, mais l'etape de creation du post
reste cassee (contrainte du wrapper Composio sur le champ `images` d'un post simple) -- leve une
erreur explicite avant tout appel reseau, ne pas debrancher. Ne pas utiliser cette voie pour
publier tant qu'elle n'est pas corrigee.

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
