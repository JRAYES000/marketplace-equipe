---
name: linkedin-veille-virale
description: >
  Surveille les comptes LinkedIn suivis, repère les posts au meilleur score d'engagement et rédige
  un post inspiré, ancré sur un fait réel de Julien, pour julien-agency ou julien-partners. Pour
  « fais la veille du jour », « cherche un post à recycler pour julien-agency », « veille
  LinkedIn ». Activation manuelle : sur demande explicite uniquement.
---

# linkedin-veille-virale

Sommaire : Règles · Déroulé · Point de situation · Comptes à surveiller · Variables
d'environnement · Garde-fous · Publication · Bilan et suivi à 7 jours · Pièges · Annexes.

Phrase de lancement : « fais la veille du jour », « cherche un post à recycler pour julien-agency ».

## Règles

**Règles de Julien du 14/10/2026** (détail : `linkedin-mise-en-forme`, règle 0) : un post de
veille est un post comme les autres. 2 posts par jour et par compte au plus, sujet absent du
compte depuis 30 jours et pas le même jour sur l'autre compte (registre `linkedin/sujets.csv`),
lien en commentaire, aucune précaution, et le client visé doit s'arrêter de défiler.

**Règle 2 appliquée à la veille** : le post viral d'un autre compte donne l'idée, jamais le fait.
Le post part d'un fait réel de Julien (mission, chiffre, cas client non nommé). Sans fait réel à y
accrocher, on ne le rédige pas, et aucun cas n'est fabriqué pour l'illustrer.

**Quota propre à la veille** : 3 posts de veille par semaine et par compte au plus, jamais deux le
même jour. Il s'ajoute à la limite de 2 posts par jour tous types confondus : les deux s'appliquent.

**Forme** : `linkedin-mise-en-forme` fait foi ; cette skill ne recopie pas ses critères.

## Déroulé

1. `lib/veille.js` (`recupererPosts`) interroge l'acteur Apify `harvestapi/linkedin-profile-posts`
   sur `comptes_a_surveiller` (`reglages-comptes.json`). Champ obligatoire : `targetUrls` (avec
   `profiles`, zéro post sans erreur).
2. `trierPosts` écarte les carrousels et calcule le score d'engagement
   `(réactions + 3 × commentaires + 5 × partages) / abonnés` (`calculerScore`). Un post n'est gardé
   que s'il dépasse `seuil_score` et a moins de `fenetre_jours` (`reglage-score.json`). Les abonnés
   viennent de `abonnes-comptes.json` ; un auteur sans abonnés connus est écarté. Tri par score.
3. La session Claude choisit le post qui mérite une réaction et **écrit elle-même** le post
   inspiré, dans le ton de `reglages-comptes.json`.
4. `lib/planifier-veille.js` (`validerQuotaHebdomadaire`) refuse de proposer un post qui
   violerait le quota de veille, contre `data/registre-veille.json`.
5. Contrôle de forme, puis programmation par n8n (voir « Publication »).

**Essai à blanc** : `node dry-run.js` exécute les étapes 1 à 4 sans publier. Sans `APIFY_TOKEN` ou
sans `comptes_a_surveiller`, il bascule sur la fixture. Sortie dans
`dry-run-sortie/dernier-dry-run.json` (non suivi) ; la fixture versionnée n'est jamais réécrite.

## Point de situation

`node etat.js [compte]` d'abord : dernier passage réel (`data/veille-resultats-reels-*.json`),
posts adaptés prêts dans `a-publier/`, quota de la semaine utilisé. Sans compte surveillé ni post
prêt, il propose `node dry-run.js` sur la fixture.

## Comptes à surveiller

10 influenceurs américains sur l'IA appliquée au business, aux PME et aux indépendants, communs
aux deux comptes (`comptes-a-surveiller.txt`, méthode :
[../../references/comptes-a-surveiller-veille-20260914.md](../../references/comptes-a-surveiller-veille-20260914.md)).
julien-agency a en plus 8 comptes francophones (organismes de formation). Une page d'entreprise ne
convient pas : l'acteur n'y renvoie pas `authorPublicIdentifier`, donc aucun score.

`abonnes-comptes.json` se rafraîchit à la main : si `_capture_date` est ancien, rouvrir chaque
profil de `comptes-a-surveiller.txt` et remplacer les valeurs.

## Variables d'environnement (`.env.example`)

Chaque script CLI (`dry-run.js`, `creer-page-notion.js`, `mettre-a-jour-stats.js`, `bilan.js`)
charge le `.env` de la skill par `chargerEnvLocal()` (`lib/charger-env.js`), sans écraser une
variable définie ni afficher de valeur. Une clé manquante arrête le script avec un message
explicite ; seul `dry-run.js` a un repli fixture, pour `APIFY_TOKEN`.

- `APIFY_TOKEN` : requis par `recupererPosts`.
- `NOTION_TOKEN` + `NOTION_PARENT_PAGE_ID` : base « Veille & posts » (bilan, suivi à 7 jours) ; la
  page parente doit être partagée avec l'intégration.

## Garde-fous

- **Forme** : `lib/publier.js` (`publierPost`) et `dry-run.js` passent par le pont
  `lib/valider-mise-en-forme.js`, qui appelle les critères de `linkedin-mise-en-forme`
  (`../linkedin-mise-en-forme/scripts/lib.mjs`) et transforme leur rapport en refus, avant tout appel réseau. Le pont
  applique aussi les règles 2, 3 (formules) et 5 du 14/10 via `verifierTexte`.
- **Accents** : `lib/valider-orthographe.js` (`validerAccents`), qui ignore le contenu des
  `**…**`. En cas d'échec, `contenuFinal` devient `null` et `erreurOrthographe` porte le détail.
- **Quota de veille** : `validerQuotaHebdomadaire` (semaine du lundi au dimanche,
  `debutSemaineISO`) refuse un 4e post dans la semaine ou un 2e le même jour ; `erreurQuota` porte
  le détail. Compte normalisé (`julien-agency` / `julien-partners`), date au format `AAAA-MM-JJ`.
- **Seuil fixe** : `seuilScore` vient uniquement de `reglage-score.json`. Si un seul post franchit
  le seuil dans la semaine, une seule proposition ; jamais un candidat plus faible pour compléter.
- Tests : `node --test`.

## Publication

**Voie réelle : workflow n8n 38** (Buffer résilié le 21/11/2026) : une ligne dans la table
`publications_linkedin` (`format: texte`, lien en `premier_commentaire`). Colonnes, statuts et
pièges : `../../references/publication-linkedin-n8n.md`. Le contrôle se fait juste avant, sur le fichier.

1. Convertir chaque passage en gras :
   `node ../linkedin-mise-en-forme/scripts/verif-post.mjs gras "segment"`.
2. Contrôler le texte : `node ../linkedin-mise-en-forme/scripts/verif-post.mjs verif <fichier>`
   (code 1 = ne pas programmer).
3. `node ../linkedin-mise-en-forme/scripts/controle-avant-publication.mjs` (règles 1, 2, 4, 5).
4. Programmer par le workflow n8n 38 (ligne `a_publier`), puis, seulement après une programmation confirmée, inscrire le post au
   registre :
   ```js
   const { enregistrerPostPublie } = require('./lib/registre');
   enregistrerPostPublie('julien-agency', { date: '2026-09-16', postId: 'jason-feifer-2026-09-16', auteurOriginal: 'Jason Feifer' });
   ```
5. Une fois le post en ligne (constaté, jamais supposé), mettre à jour son entrée Notion
   (`Etat` : « Publié », lien réel).

**Voie directe** (`publierPost`, via Composio) : `authorUrn` confirmé pour julien-agency
(`urn:li:person:aFqu-W7ClW`) ; julien-partners non confirmé. Protocole d'accès :
[../../references/actions-composio.md](../../references/actions-composio.md).

## Bilan et suivi à 7 jours

- **Bilan** : `node bilan.js <compte> --dataSourceId <id>` (ou `NOTION_VEILLE_DATA_SOURCE_ID`) :
  30 jours, formats et sujets les plus performants. Signale un échantillon de moins de 10 entrées
  plutôt que de conclure.
- **Suivi à 7 jours** : la session lit les chiffres sur la capture collée (pas d'OCR), puis
  ```
  node mettre-a-jour-stats.js --titre "Le vrai coût d'un recrutement -- adapté de Codie Sanchez" --vues 1500 --reactions 40 --commentaires 6 --bilan Neutre
  ```
  Refus si le titre correspond à plusieurs entrées.

## Pièges

- `profiles` au lieu de `targetUrls` dans l'appel Apify : zéro post, aucune erreur.
- Le registre ne se remplit que si la session appelle `enregistrerPostPublie` après la
  programmation ; il ne protège que les lancements suivants.
- Les abonnés bougent et aucun script ne les met à jour : un `_capture_date` ancien fausse les scores.
- Réponse Apify, Notion ou Composio malformée, registre corrompu : messages explicites, pas
  d'exception brute.

## Annexes

- [references/historique.md](references/historique.md) : ancien corps complet (rebranchement du
  pont sur `linkedin-mise-en-forme`, audit du 15/09, incidents).
- [../../references/linkedin-veille-historique.md](../../references/linkedin-veille-historique.md) :
  score d'engagement, choix des comptes, déblocages Notion, ancienne programmation Buffer.
- [../../references/etat-linkedin-20260912.md](../../references/etat-linkedin-20260912.md) : état
  des lieux transverse aux skills LinkedIn.
