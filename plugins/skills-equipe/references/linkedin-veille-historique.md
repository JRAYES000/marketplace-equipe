# Historique et incidents -- linkedin-veille-virale

Ce fichier n'est pas necessaire pour faire tourner la skill (voir `SKILL.md` pour le mode
d'emploi) -- il garde la trace des decisions, tests reels et incidents qui ont produit l'etat
actuel. Complement de `references/etat-linkedin-20260912.md` (etat des lieux transverse aux 3
skills).

## Etat au 12/09/2026 -- premiers tests reels

- `recupererPosts` (Apify) verifie avec le compte `julien_r` (`GET /v2/users/me` -> 200) avant
  construction du reste.
- Identite `averse-cooser` confirmee correspondre a julien-agency (`urn:li:person:aFqu-W7ClW`),
  pas julien-partners comme suppose initialement -- voir
  `references/linkedin-carrousel-historique.md` pour la methode complete de decouverte.
- Pipeline de publication texte verifie sans rien publier : `LINKEDIN_CREATE_LINKED_IN_POST` en
  `lifecycleState: "DRAFT"` pour julien-agency -- cree, verifie non accessible en lecture
  publique, puis supprime. Preuve que l'authentification/l'URN/`commentary` fonctionnent de bout
  en bout via MCP -- ne couvre que la creation de post, pas `publierCommentaire`
  (action differente, sans equivalent brouillon).
- `APIFY_TOKEN` resolu (export manuel de Nomena) : premier appel reel sur
  `linkedin.com/in/julien-rayes`, 5 posts recuperes. Premier exemple redige dans `a-publier/`,
  initialement pour julien-partners (identite non confirmee) puis **reecrit** (pas republie) pour
  julien-agency -- Julien avait dit que le compte importait peu.

## Bug de schema corrige -- 14/09/2026

Le premier appel reel de `linkedin-commentaires` contre l'acteur Apify a revele que la forme
reelle des donnees (`author.name`, `content`, `postedAt.date` imbrique, `engagement.comments`)
ne correspond pas a la forme plate supposee par le code (jamais detecte avant faute d'avoir
teste contre de vraies donnees, seulement contre une fixture deja ecrite dans la forme
supposee). Meme correctif applique ici le meme jour (`normaliserPost` dans `lib/veille.js`,
3 tests de non-regression).

## Choix des 10 comptes a surveiller -- decision editoriale tranchee seule (14/09/2026)

Delegation explicite de Julien ("tranche et note ton raisonnement"). 10 influenceurs americains
reels sur l'IA appliquee au business/PME/independants, choisis et verifies un par un (handle
exact + nombre d'abonnes, profil reellement ouvert -- jamais devine). Liste unique, partagee
entre les deux comptes (contrairement au ciblage de `linkedin-commentaires`, qui vise des
personnes precises par marque). Methode complete et tableau des 10 profils :
`references/comptes-a-surveiller-veille-20260914.md`.

## Score d'engagement -- calibrage et premier passage reel (14/09/2026)

`seuil_score` (0,003) calibre sur un echantillon reel de 35 posts (les 10 comptes, fenetre
"week") : scores repartis de 0,00026 a 0,0164, coupure choisie dans l'ecart net observe entre le
15e (0,0043) et le 16e (0,0018) post par score decroissant -- garde environ 40% de l'echantillon.
Le brief interdit explicitement de baisser le seuil juste pour remplir un quota -- annoncer "une
seule proposition cette semaine" plutot que d'assouplir ce chiffre. Premier passage reel : 35
posts recuperes sur les 10 comptes, 15 retenus. Detail complet : Point n°11 de
`references/etat-linkedin-20260912.md`.

## Garde-fou accents -- pourquoi il a ete ajoute (15/09/2026)

Meme incident que sur `linkedin-carrousel` (voir sa page historique) : ce paquet n'avait aucun
validateur de contenu avant publication. L'exemple `a-publier/julien-agency-2026-09-12.commentary.txt`,
integralement sans accents, corrige le meme jour que l'ajout du garde-fou.

## Trois premiers posts adaptes sur donnees reelles (15/09/2026)

3 posts adaptes (Justin Welsh, Jason Feifer, Codie A. Sanchez), choisis parmi les meilleurs
scores avec une matiere reellement adaptable -- **adaptes, pas traduits** : angle et structure du
post source conserves, exemples et chiffres remplaces par des references francaises reelles
verifiees individuellement (Insee, Bpi France Le Lab/Rexecode, Strategies -- pages reellement
ouvertes et lues). Passes par les garde-fous d'ecriture de `linkedin-carrousel`
(`validerEtConvertirPost`) bien que non natifs a ce paquet -- demande explicite pour ce livrable.
Detail complet, post source note pour chacun : `a-publier/README.md`.

## GO de Julien, relecture et programmation reelle via Buffer (15/09/2026, soir)

Julien a relu les 3 textes et demande des corrections (chiffre recrutement rafraichi de mai 2023
a T3 2025, meme population mesuree, source Bpifrance Le Lab/Rexecode reellement reverifiee ;
plusieurs traits d'union et accents corriges). Toutes repassees par les garde-fous reels avant
validation.

Buffer connecte reellement (compte `contact@claudeagency.fr`, verifie avant tout usage -- voir
`references/actions-composio.md`, section 15/09 soir). Les 3 textes programmes, un par jour
distinct (regle "trois maximum par semaine, jamais deux le meme jour" respectee) :
- Codie Sanchez -> julien-agency, 15/09.
- Jason Feifer -> julien-agency, 16/09.
- Justin Welsh -> julien-partners, 17/09.

**Piege trouve et corrige le 15/09/2026 (a froid, en testant les 3 skills comme un utilisateur)**
: les heures avaient ete notees depuis une vue Buffer reglee sur le fuseau Minsk (GMT+3) au lieu
de Paris (GMT+2) -- corrige a l'heure reelle en fuseau Paris (21h29 et 17h00 au lieu de 22h29 et
18h00 notes initialement ; le troisieme, 13h00, etait deja correct). La programmation elle-meme
n'a pas ete touchee, seule la documentation de l'heure reelle.

Notion mis a jour avec la realite (pas une anticipation) : `Etat` = "Programme" (nouvelle valeur
ajoutee au schema), pas encore "Publie" tant que chaque post n'est pas confirme reellement en
ligne.

## Page Notion "Veille & posts" -- deblocages successifs

- **14/09/2026, jeton recu, blocage** : `NOTION_TOKEN` fonctionnait, mais aucune page ordinaire
  n'etait partagee avec l'integration (seulement des bases existantes sans rapport, non
  modifiees) -- `POST /v1/databases` exige un `parent.page_id` valide.
- **15/09/2026, debloque** : Julien a partage la page "LinkedIn — Veille & Commentaires" avec
  l'integration "Leads site claudeagency.fr". `node creer-page-notion.js` a cree la base "Veille
  & posts" et ses 3 vues par compte. Remplie avec les 3 vrais posts adaptes (metriques reelles
  du post source reprises depuis `data/veille-resultats-reels-20260914.json`), etat "A relire" --
  verifie en relisant les 3 lignes via l'API. URL de la base : `references/mail-20260920-brouillon.md`.
- `creerBaseVeilleEtPosts` (19 colonnes du brief, dont `Score` en formule Notion native) n'avait
  pas ete testee contre l'API avant cette date -- conforme a la documentation consultee,
  confirmee au premier appel reel.

## Commande "bilan" -- execution reelle (15/09/2026)

`bilan.js` (CLI manquant jusque-la -- `recupererEntreesRecentes` et `calculerBilan` existaient
separement, jamais rejoues ensemble contre l'API reelle) execute sur les 3 vraies entrees :
2 pour julien-agency, 1 pour julien-partners, 0 pour page-claude. Regles 4/5 du brief confirmees
en conditions reelles (echantillon trop petit signale explicitement, jamais de "meilleur format"
trompeur sur si peu de lignes ; cas zero entree gere sans planter). `dataSourceId` de "Veille &
posts" pour reference future : `6a62dda7-58aa-41fd-9416-eccfaef04d4b` (identifiant, pas un
secret).

Etat des lieux complet des 3 skills linkedin-* : `references/etat-linkedin-20260912.md`.
