---
name: linkedin-veille-virale
description: "Surveille des comptes LinkedIn suivis, repere les posts qui valent une reaction (score d'engagement reel) et redige un post recycle/inspire pour julien-partners ou julien-agency. Activation MANUELLE uniquement : ne se declenche jamais d'elle-meme, seulement sur demande explicite (ex. 'fais la veille du jour', 'cherche un post a recycler pour julien-agency', 'veille LinkedIn')."
---

# linkedin-veille-virale

**Activation MANUELLE uniquement.** Cette skill ne se lance jamais d'elle-meme -- seulement sur
demande explicite.

**Phrase de lancement** : « fais la veille du jour », « cherche un post a recycler pour
julien-agency ».

## Ce que fait la skill

1. `lib/veille.js` (`recupererPosts`) interroge l'acteur Apify
   `harvestapi/linkedin-profile-posts` sur les comptes listes dans `comptes_a_surveiller` de
   `reglages-comptes.json`. **Champ obligatoire : `targetUrls`, pas `profiles`** -- avec
   `profiles` l'acteur renvoie zero post sans aucune erreur.
2. `trierPosts` ecarte les carrousels (`document.totalPageCount` present) et calcule le score
   d'engagement du brief -- `(reactions + 3*commentaires + 5*partages) / abonnes` -- via
   `calculerScore` ; ne garde un post que s'il depasse `seuil_score` ET a moins de
   `fenetre_jours` (coefficients/seuil/fenetre dans `reglage-score.json`, pas en dur dans le
   code). Les abonnes par auteur viennent de `abonnes-comptes.json` (l'acteur Apify ne les
   renvoie jamais) -- un auteur sans abonnes connus est ecarte, jamais suppose a score 0. Trie
   par score decroissant. **Fichier a rafraichir periodiquement** (champ `_capture_date` du
   fichier) : ces chiffres bougent et aucun script ne les remet a jour automatiquement --
   rouvrir chaque profil LinkedIn de `comptes-a-surveiller.txt` et remplacer les valeurs a la
   main si `_capture_date` est ancien.
3. La session Claude qui invoque cette skill lit les posts retenus, choisit celui qui merite une
   reaction, et **ecrit elle-meme** le texte du post recycle/inspire dans le ton de
   `reglages-comptes.json` -- pas une generation automatique en JS.
4. `lib/publier.js` (`publierPost`) est le point d'appel direct qui publie (`authorUrn`,
   `commentary`). En usage courant, la publication reelle passe par **Buffer** (compte
   `contact@claudeagency.fr`, connecte aux deux profils LinkedIn) plutot que par cet appel
   direct -- voir "Publication" plus bas.
5. `lib/planifier-veille.js` (`validerQuotaHebdomadaire`) **refuse** explicitement de proposer un
   post si publier/programmer ce jour-la violerait le quota (3/semaine et par compte) ou la regle
   "jamais deux le meme jour" -- verifie contre `data/registre-veille.json`
   (`lib/registre.js`), pas une simple limite documentee. Voir "Garde-fou -- quota hebdomadaire"
   plus bas.
6. `dry-run.js` execute les etapes 1-3 et le controle de quota sans jamais appeler `publierPost`.
   Bascule sur le jeu fixture des que `APIFY_TOKEN` est absent (a lui seul, meme si
   `comptes_a_surveiller` est rempli) et/ou que `comptes_a_surveiller` est vide.

## Point de situation

Lancer `node etat.js [compte]` avant toute chose -- lit le dernier passage de veille reel connu
sur disque (`data/veille-resultats-reels-*.json`, gitignore) et les posts adaptes deja prets
dans `a-publier/`, jamais de donnee inventee. Propose un repli concret (`node dry-run.js` sur le
jeu fixture) des que `comptes_a_surveiller` est vide et qu'aucun post adapte n'existe -- jamais
les mains vides.

## Comptes a surveiller

`comptes_a_surveiller` est rempli : 10 influenceurs americains reels sur l'IA appliquee au
business/PME/independants (`comptes-a-surveiller.txt` a la racine du paquet, liste unique
partagee entre `julien-agency` et `julien-partners`). Detail et methode de verification :
`references/comptes-a-surveiller-veille-20260914.md`.

## Variables d'environnement (`.env.example`)

- **`APIFY_TOKEN`** -- requis pour `recupererPosts` ; sans lui, repli fixture (voir plus haut).
- **`NOTION_TOKEN`** + **`NOTION_PARENT_PAGE_ID`** -- pour la base "Veille & posts" (bilan,
  suivi a 7 jours). `NOTION_PARENT_PAGE_ID` est l'ID de la page **deja partagee avec
  l'integration** Notion (bouton "..." -> "Connexions") sous laquelle creer la base.

## Garde-fou -- accents manquants

`lib/valider-orthographe.js` (`validerAccents`) refuse tout texte contenant un mot d'une liste
fermee de mots toujours accentues en francais standard. `dry-run.js` l'appelle sur
`contenuFinal` -- en cas d'echec, `contenuFinal` et `argumentsPublierPost` deviennent `null`
(`erreurOrthographe` porte le detail) plutot que de laisser passer un texte fautif.

## Garde-fou -- quota hebdomadaire (registre reel, pas une regle documentee)

Corrige le 15/09/2026 (audit du meme jour : la regle "trois par semaine maximum, jamais deux le
meme jour" etait documentee ici et dans `a-publier/README.md`, mais rien dans le code ne la
faisait respecter -- asymetrie avec `linkedin-commentaires`, qui tient un vrai registre depuis le
14/09). Meme modele desormais :

- `lib/registre.js` (`enregistrerPostPublie`) persiste chaque programmation reelle dans
  `data/registre-veille.json` (gitignore, propre a chaque machine) -- `{ "<compte>": [ { "date",
  "postId", "auteurOriginal" }, ... ] }`. **A appeler seulement APRES une programmation reelle
  confirmee** (jamais au moment de la redaction) : une fois un post reellement programme dans
  Buffer (ou publie via `publierPost`), appeler
  ```js
  const { enregistrerPostPublie } = require('./lib/registre');
  enregistrerPostPublie('julien-agency', { date: '2026-09-16', postId: 'jason-feifer-2026-09-16', auteurOriginal: 'Jason Feifer' });
  ```
- `lib/planifier-veille.js` (`validerQuotaHebdomadaire`) leve une erreur explicite si le post
  viole le quota (3/semaine par compte, calcule lundi-dimanche via `debutSemaineISO`) ou la regle
  "jamais deux le meme jour". `dry-run.js` l'appelle avant de retenir un candidat -- si le quota
  est deja atteint ou que le jour est deja pris, `contenuFinal` devient `null` et `erreurQuota`
  porte le detail, exactement comme `erreurOrthographe` pour les accents.
- **Ne baisse jamais le seuil de score pour remplir ce quota** : `seuilScore` vient uniquement de
  `reglage-score.json` (voir `lib/veille.js`, `trierPosts`/`calculerScore`), jamais ajuste en
  fonction du nombre de candidats deja retenus ou du quota restant. Si un seul post franchit le
  seuil pour une semaine donnee, la reponse honnete est **une seule proposition cette semaine** --
  pas un candidat plus faible pousse pour "completer" a trois. Rien ne code une baisse
  automatique du seuil ; ce comportement est une consequence directe de `seuilScore` fixe, pas
  une logique separee a auditer ailleurs.
- `etat.js` affiche desormais le quota reellement utilise cette semaine
  (`entreesDeLaSemaine`/`debutSemaineISO`) au lieu de dire, comme avant le 15/09, qu'aucun
  registre n'est tenu.
- `node --test test/planifier-veille.test.js` et les tests ajoutes a `test/dry-run.test.js`
  prouvent le refus (registre a 3 entrees la meme semaine -> 4e candidat refuse ; entree le meme
  jour -> refuse), pas seulement le cas qui passe.

## Audit adversarial et de robustesse (15/09/2026)

Un sous-agent dedie a tente reellement de contourner `validerQuotaHebdomadaire`/`lib/registre.js`
(sans modifier leur code), et des donnees malformees ont ete injectees dans les fonctions
reseau/registre. Failles reellement reproduites et corrigees le meme jour, chacune verrouillee
par un test dans `test/adversarial-15-09.test.js` :

- **Quota hebdomadaire contourne par variation de la cle "compte"** (`Julien-Agency` vs
  `julien-agency` vs `julien_agency` creaient chacun un historique separe pour le meme compte
  reel) : `lib/registre.js` normalise et restreint desormais `compte` a
  `julien-agency`/`julien-partners` exactement.
- **Comparaison de date par egalite de chaine stricte** : une date fournie avec une heure/fuseau
  ("2026-09-15T18:00:00.000Z" au lieu de "2026-09-15") cassait silencieusement la regle "jamais
  deux le meme jour". Format "AAAA-MM-JJ" valide strictement dans `lib/registre.js` ET
  `lib/planifier-veille.js` (defense en profondeur, meme si l'appelant normal passe deja par le
  registre).
- `debutSemaineISO` (calcul du lundi de la semaine, y compris autour d'un changement d'annee ou
  d'un dimanche) a ete testee sur les cas limites et n'a montre aucune faille.
- **Registre corrompu sur disque** : `chargerRegistre` plantait avec un `SyntaxError` brut --
  message explicite desormais.
- **Reponse Apify malformee** : un element `null` dans le tableau de posts, ou une reponse qui
  n'est pas un tableau, plantaient `trierPosts`/`recupererPosts` avec un `TypeError` brut --
  filtres/messages explicites desormais.
- **Reponse Notion/Composio 500/429/tronquee** : `reponse.json()` etait appele sans filet --
  message explicite desormais (`lib/notion.js`, `lib/composio.js`).

## Publication

**Voie reelle en usage courant : Buffer**, compte `contact@claudeagency.fr`, connecte aux deux
profils LinkedIn -- programmer un post recycle, un par jour distinct, **jamais deux le meme
jour, trois maximum par semaine** (desormais verifie contre `data/registre-veille.json` avant de
proposer un candidat, voir ci-dessus -- **mais la programmation elle-meme dans Buffer reste un
geste manuel, hors de ce code** : le registre ne se remplit que si la session qui programme
appelle explicitement `enregistrerPostPublie` juste apres, ce garde-fou ne protege donc que les
lancements ulterieurs de cette skill, pas Buffer directement). Une fois un post reellement en
ligne (a confirmer explicitement, jamais suppose), mettre a jour son entree Notion (`Etat`:
"Publie", lien reel).

**Voie directe** (`publierPost`, via Composio/MCP) : `authorUrn` confirme pour julien-agency
(`urn:li:person:aFqu-W7ClW`) ; julien-partners non confirme cote Composio -- voir
`linkedin-carrousel/SKILL.md` pour la methode d'acces complete (cle consumer, protocole MCP).

## Commande "bilan"

`node bilan.js <compte> --dataSourceId <id>` (ou `NOTION_VEILLE_DATA_SOURCE_ID` dans
l'environnement) -- analyse 30 jours, formats/sujets les plus performants par compte. Signale
explicitement un echantillon trop petit (<10 entrees) plutot que d'afficher une conclusion
trompeuse ; gere le cas zero entree sans planter.

## Suivi a 7 jours (regle 3 du brief -- lecture par capture d'ecran)

Aucun OCR : la **session Claude** lit les chiffres visibles sur la capture d'ecran collee dans
la conversation, puis appelle le script avec ce qu'elle a lu :
```
node mettre-a-jour-stats.js --titre "Le vrai cout d'un recrutement -- adapte de Codie Sanchez" \
  --vues 1500 --reactions 40 --commentaires 6 --bilan Neutre
```
`retrouverEntreeParTitre` refuse explicitement si le titre correspond a plusieurs entrees.

## Regles d'usage (brief du 10/09/2026, section 2) -- etat actuel

1. **Phrase de lancement** : faite.
2. **Point de situation en 3 lignes** : fait, `node etat.js [compte]`.
3. **Lecture des chiffres depuis une capture d'ecran** : mecanisme pret et fonctionnel (voir
   "Suivi a 7 jours") -- premiere execution reelle une fois les posts programmes en ligne depuis
   7 jours pleins (voir `references/` pour les dates).
4. **Rien ne plante a vide** : `recupererPosts`/`trierPosts` refusent avec un message explicite
   si `APIFY_TOKEN` manque ou si `profileUrls` est vide ; erreurs Notion traduites en message
   actionnable ; `etat.js` gere le cas "aucun compte surveille, aucun post pret".
5. **Jamais les mains vides** : `etat.js` propose un repli concret des que rien n'est
   disponible.
6. **Quota "3/semaine, jamais deux le meme jour" reellement code** (corrige le 15/09/2026, voir
   "Garde-fou -- quota hebdomadaire" plus haut) : `validerQuotaHebdomadaire` refuse
   explicitement, contre un registre persistant (`data/registre-veille.json`), pas juste
   documente dans ce fichier.

## Historique et incidents

Decisions de conception (score d'engagement, choix des 10 comptes), bugs trouves et corriges,
deblocages Notion, programmation reelle via Buffer : `references/linkedin-veille-historique.md`.
Etat des lieux transverse aux 3 skills : `references/etat-linkedin-20260912.md`.
