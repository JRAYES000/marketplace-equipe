---
name: linkedin-carrousel
description: >
  Compose, rend en PDF et publie un carrousel LinkedIn pour Claude Agency ou Claude Partners à
  partir d'un sujet, avec garde-fous d'écriture et contrôle du rendu. Pour « fais-moi un
  carrousel », « génère le carrousel du jour », « carrousel LinkedIn sur [sujet] ». Activation
  manuelle : sur demande explicite uniquement.
---

# linkedin-carrousel

Sommaire : Installation · Déroulé · Comptes · Modèles de page et charte · Règles de contenu ·
Garde-fous automatiques · Publication · Pièges · Annexes.

Phrase de lancement : « fais-moi un carrousel ». Variantes : « génère le carrousel du jour »,
« carrousel LinkedIn sur <sujet> », « carrousel pour julien-agency / julien-partners ».

## Installation, une fois par poste

Dans le dossier de cette skill :

```bash
npm ci
npx playwright install chromium
```

Sans la première, `playwright` et le dictionnaire français manquent ; sans la seconde, tout rendu
de PDF échoue (« Executable doesn't exist »). `npm ci` et non `npm install`, qui réécrirait
`package-lock.json`. Tests : `npm test`.

## Déroulé

1. **Point de situation** : `node etat.js [compte]` affiche le dernier carrousel généré, les
   brouillons en attente et l'état de publication. Sans brouillon, il propose un repli
   (`fixtures/diapos-exemple.json` ou un sujet déjà publié repris sous un angle propre au compte).
2. **Composer** le fichier de diapos JSON (6 à 10 diapos, voir « Modèles de page ») dans le ton du
   compte, à partir d'un fait réel (règles de Julien : `linkedin-mise-en-forme`, règle 0).
3. **Rendre et inspecter** : `node generer-images.js par-diapo <compte> <diapos.json> [dossier]`
   produit un PNG par diapo. Inspecter chaque page à l'œil.
4. **Itérer** : un carrousel demande environ une heure et au moins 5 vraies itérations
   (corriger, rerendre, relire). Ne jamais présenter une diapo rendue une seule fois comme prête.
5. **PDF final** : `node generer-pdf.js <compte> <diapos.json> [sortie.pdf]` (valide les diapos
   avant tout rendu, mesure l'espacement réel après).
6. **Texte du post** : brouillon avec le gras en `**étoiles**`, puis
   `node generer-post.js <brouillon.txt> [sortie.txt]` qui valide et convertit le gras
   (code de sortie 1 au premier refus).
7. **Contrôle avant programmation** :
   `node ../linkedin-mise-en-forme/scripts/controle-avant-publication.mjs` (règles 1, 2, 4, 5).
   Ce script ne lit pas les diapos : relire chaque diapo contre la règle 2 (fait réel) avant le rendu.
8. **Publier** (voir « Publication »), puis donner le lien LinkedIn à Julien.

## Comptes

- **julien-agency** et **julien-partners** : actifs, gabarits `templates/julien-agency.html` et
  `templates/julien-partners.html`, identifiants de publication dans `reglages-comptes.json`.
- **page-claude** : en pause sur décision de Julien (autorisation d'organisation LinkedIn non
  validée). Ne pas publier dessus.

Les deux marques partagent fond, encre, typographie et mise en page ; l'écart tient aux couleurs
d'accent, au logo et au pied de page. Choix assumé (deux facettes de la même maison) : ne pas
creuser l'écart sans décision de Julien.

## Modèles de page et charte

Le champ `modele` d'une diapo choisit parmi 6 modèles (détail des champs en tête de
`generer-pdf.js`) : `accroche`, `gros-chiffre`, `comparaison` (deux colonnes), `checklist`,
`citation`, `cta`. Sans `modele`, la diapo 1 est rendue en `accroche`, les autres en
titre + texte.

- **Diapo 1** : `role: "hook"`, sans texte de soutien, avec un champ `accent` obligatoire, sous-chaîne
  exacte du `titre`, colorée via `var(--accent-text)`. Les autres diapos restent sans accent.
- **Logo, photo et couleurs de marque sur chaque page**, injectés depuis `assets/` par
  `lib/assets.js` : remplacer un fichier suffit, aucun changement de gabarit. La photo
  `assets/photo-julien-rayes.png` est provisoire (capture du profil LinkedIn) : la remplacer par le
  fichier source dès que Julien le fournit.
- **Polices** : Bricolage Grotesque (titres) et Schibsted Grotesk (corps), auto-hébergées dans
  `assets/fonts/`, aucun CDN au rendu.
- **Couleurs** (gabarits actuels) : fond `#FBF7F1`, encre `#2B2724`, accent décoratif `#CC785C`.
  Claude Agency : texte d'accent et fond sombre `#934E3A`. Claude Partners : texte d'accent
  `#9C503A`, fond sombre `#763D2C`. Hook, `cta` et `citation` sont sur le fond sombre.
- **Image** : champ `image` (chemin réel, avec `imagePrompt`) ou `imageEmplacement: true`
  (encadré « Emplacement image IA » signalé, jamais un vide silencieux).
- **Numéro de page** en « N/Total » ; flèche « Balayez » sur la diapo 1 seulement. Une image
  « couverture » unique (`generer-images.js couverture`) force le logo visible.
- **Tailles et contraste** (mesurés sur rendu Playwright par les tests) : titre ≥ 64 px, texte de
  soutien ≥ 40 px, contraste ≥ 3:1.

## Règles de contenu

- **Aucune citation ni témoignage inventé**, même attribué à « un dirigeant de PME ». Une diapo
  `citation` n'affiche `auteur` que si `citationSource` (URL où la phrase apparaît mot pour mot)
  est fourni ; sinon elle reste un propos éditorial sans attribution.
- **Fait réel** : le carrousel part d'une mission, d'un chiffre ou d'un cas client non nommé, sans
  exemple inventé, ni dans la légende ni dans les diapos.
- **Source visible pour tout chiffre affiché** (champ `source`, organisme et année en bas de page),
  lue directement à la source primaire, jamais de mémoire. Une source secondaire sans date
  vérifiable est écartée.
- **Un seul fil** : chaque page, exemple et chiffre sert le sujet de l'accroche. Le chiffre choc
  prouve l'accroche : il mesure exactement ce qu'elle annonce. Relire le carrousel d'une traite avant publication.
- **Hook** : la diapo 1 crée une tension (affirmation contre-intuitive, conséquence concrète,
  vrai manque), jamais une annonce de thème du type « Pourquoi X ». Relire la diapo 1 seule ; en
  cas de doute, la réécrire.
- **Page « Comment… » ou « méthode »** : toujours un exemple concret, marqué « exemple » ou « ex : ».
- **Images** : seulement si elles illustrent l'idée de la page, jamais un décor (clavier, écran
  vide, bureau vide).
- **Appel à l'action** (`cta`) : une action faisable depuis LinkedIn (« Écrivez-moi
  "recrutement" en message privé »), jamais « En savoir plus » ni une demande d'engagement.
- **Page clairsemée** : la fusionner avec sa voisine plutôt que la laisser à moitié vide.
- **Français** : accents corrects partout ; pas d'anglicismes (« processus », pas « process »).
- **Légende du post** : 5 lignes au plus (accroche, promesse, appel à l'action), sans reprendre
  le détail des diapos. Gras, emojis et accroche en question sont facultatifs (règle 3 du
  14/10/2026) ; le gras, s'il est utilisé, tombe sur ce qu'un lecteur retiendrait en diagonale.
- Règles de Julien du 14/10/2026 (2 posts par jour et par compte, sujet absent depuis 30 jours,
  lien en commentaire…) : `linkedin-mise-en-forme`, règle 0.

## Garde-fous automatiques

Refus explicite, jamais un avertissement.

### Diapos — `lib/valider-diapos.js`, appelé par `genererPdf()` avant tout rendu

- Nombre de diapos hors de [6, 10].
- Plus de 60 mots ou plus de 650 caractères sur une diapo, tous champs visibles du modèle compris
  (`lib/modeles.js`, `champsVisibles`). Aucune réduction de police : raccourcir.
- Diapo 1 sans `role: "hook"`, avec texte de soutien, ou sans `accent` présent dans le titre.
- Diapo `null`, titre vide, caractère de contrôle.
- Chiffre-preuve (« % » ou « Nx ») sans champ `source`.
- Champ `image` sans `imagePrompt`, ou prompt sur un sujet générique interdit.
- Page « Comment… » / « méthode » sans marqueur d'exemple.
- Diapo `cta` avec une formulation d'engagement interdite (même banque que le post).
- Accents manquants et anglicismes (voir plus bas).
- Après le rendu (`validerEspacementReel`, dans `genererPdf()` et `generer-images.js`) : au moins
  32 px entre le trait du haut et le contenu, 24 px entre le contenu et le pied de page, sur
  chaque diapo.

### Texte du post — `lib/valider-post.js` via `generer-post.js`

- Hors de 60 à 700 caractères, ou plus de 5 lignes non vides (une ligne blanche ne compte pas).
- Gras converti en Unicode **Mathematical Sans-Serif Bold**, la police que produit et accepte
  `linkedin-mise-en-forme` (critère « gras dans la bonne police »). Refus si un passage en gras
  contient un accent, ou un mot qui en exige un mais écrit sans (dictionnaire français et liste
  fermée).
- Plus de 6 emojis, emoji au milieu d'une phrase ou deux consécutifs. Aucun n'est imposé.
- Plus de 2 mots-dièses, ou ailleurs qu'en toute fin (dièse pleine chasse « ＃ » compris).
- Formulations interdites, en clair comme en gras : demande d'engagement (y compris espacée,
  « C O M M E N T E Z »), tiret long, « ce n'est pas X, c'est Y » / « mais plutôt Y », « ravi de
  vous annoncer », « taguez quelqu'un », critique de LinkedIn, MAJUSCULES, « inventé »,
  « Ma position », « Je prends position », lien dans le corps, précaution du type « ne remplace
  pas un audit ».
- Chiffre-preuve (pourcentage, volume, classement, montant, donnée d'étude) sans
  `(source : …)` collé, ou source vague (« une étude récente »). Un chiffre-anecdote (âge, date,
  durée, « 12 personnes ») est dispensé si le post porte une ligne `Source : …` non vague.

### Accents — `lib/valider-orthographe.js`

Liste fermée de mots toujours accentués (été, déjà, même, déclaratif, réel…), mots ambigus
(« a », « ou ») exclus. Appelée sur les diapos, le texte du post (y compris chaque passage en
gras) et le `documentTitle`.

### Anglicismes — `lib/valider-anglicismes.js`

Liste fermée (process, deadline, feedback, workflow, business, brief, benchmark, reporting,
roadmap, kickoff, mindset, insight, targets, networking) avec l'équivalent français dans le
message. « email », « planning », « week-end » sont admis. Mêmes trois surfaces que les accents.

### Limites assumées

Aucun script ne juge le sens : tension du hook, « une idée par diapo », unité du fil, exemple
réellement concret, image conforme à son prompt. Seule la relecture visuelle le fait. Un chiffre
écrit en toutes lettres échappe au contrôle de source.

## Publication

`publier-zernio.js` est le script de publication de cette skill (`lib/publier-zernio.js`,
`lib/zernio.js`) :

```
node publier-zernio.js <compte> <pdf> <documentTitle> [texte-post.txt] [--publier] [--schedule <scheduledFor> <timezone>]
```

- Vérifie d'abord le compte (`GET /v1/accounts` : existe, actif, LinkedIn, bonne URL de profil).
- Sans `--publier`, s'arrête après le téléversement (test sans publication).
- `--schedule "2026-09-26T08:30:00" "Europe/Paris"` : heure locale ISO sans décalage et fuseau
  IANA, fournis ensemble ; force `publishNow: false`.
- Le `documentTitle` (titre affiché sous le document) passe par `retirerPointFinal`, le contrôle
  d'accents et d'anglicismes avant tout appel réseau.
- `ZERNIO_API_KEY` vient de l'environnement ou du `.env` local (jamais commité, jamais affiché).

Feu vert : publication sans accord poste par poste pour julien-agency et julien-partners
seulement (décision de Julien, rappelée dans le `CLAUDE.md` du dépôt). Les contrôles des étapes 5 à
7 du déroulé restent obligatoires avant le script. Tout autre compte suit la règle générale du
feu vert explicite.

**Sorties** : `sortants/<compte>/<Titre lisible>.pdf`, sans date, casse et accents conservés
(LinkedIn affiche ce nom) ; suffixe « (2) », « (3) » plutôt qu'un écrasement.

**Checklist A4 (lead magnet)** : `node generer-checklist-pdf.js` produit
`a-publier/julien-agency-2026-09-26-checklist-recrutement.pdf` (contenu codé en dur, une page,
refus si le rendu déborde) et un `.verif.png` de contrôle à ne pas commiter.

## Pièges

- `.env` en fins de ligne Windows : la lecture coupe sur `/\r?\n/`, sinon la clé paraît absente.
- Titre de hook terminé par un point : `retirerPointFinal` évite « pourquoi..pdf ».
- Un mot sans accent dans un `**gras**` devient invisible aux regex après conversion : le contrôle
  se fait avant conversion.
- Un chiffre en gras était invisible au contrôle de source : les chiffres gras Unicode sont reconnus.
- Une image de 480 px faisait déborder les pages checklist/comparaison : `.image-slot` est à
  380 px, et `validerEspacementReel` attrape le reste.
- Les autres skills linkedin-* programment par Buffer, et Zernio ne voit pas les posts Buffer
  (`analyse-lundi-linkedin`) : ne pas lire Zernio pour savoir ce qui est publié.
- `lib/composio.js` et `lib/publier.js` ne servent plus à la publication de cette skill ; le canal
  partagé `../../lib/composio-canal.js` sert encore à `linkedin-commentaires`.
- LinkedIn gèle parfois le lecteur multi-pages dans le navigateur piloté : inspecter les PNG
  locaux plutôt que le rendu LinkedIn.

## Annexes

- [references/historique.md](references/historique.md) : ancien corps complet (refonte des
  modèles, corrections du 24 et 25/09, audits adversariaux, publications réelles, décisions).
- [references/plan-accent-hook-18-09-2026.md](references/plan-accent-hook-18-09-2026.md) : plan
  de l'accent coloré du hook.
- [../../references/linkedin-carrousel-historique.md](../../references/linkedin-carrousel-historique.md) :
  tests de publication, échecs techniques (suppression des anciens carrousels non résolue).
- [../../references/etat-linkedin-20260912.md](../../references/etat-linkedin-20260912.md) : état
  des lieux transverse aux skills LinkedIn.
- [../../references/mail-20260918-brouillon.md](../../references/mail-20260918-brouillon.md) :
  brouillon du mail expliquant les choix de charte.
- `a-publier/README.md` : journal des tentatives de publication par Composio (septembre 2026).
