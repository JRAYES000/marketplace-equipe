# Comptes a surveiller pour linkedin-veille-virale -- decision editoriale tranchee seule, 14/09/2026

Le brief exige 10 influenceurs americains sur "l'IA pour les PME et les independants", dans un
fichier texte hors code, une seule liste partagee entre les comptes suivis (voir Point n°112 de
`audit-brief-20260914-v3.md`, "NON CONFORME -- decision editoriale requise (Julien/Nomena)").
Julien a explicitement delegue cet arbitrage le 14/09/2026 ("tranche et note ton raisonnement --
conforme a la methode de Julien : tu arbitres seul les decisions editoriales") : liste choisie et
verifiee sans remonter de question, methode documentee ici pour que Julien puisse l'expliquer le
20/09 si besoin.

**10 profils reels, tous verifies un par un le 14/09/2026** (ouverts et lus via Claude in Chrome,
session LinkedIn reelle de Nomena -- jamais devines, conforme a la regle du depot de ne jamais
generer ou deviner une URL). Nombre d'abonnes = valeur affichee au moment de la verification, pas
un chiffre marketing recopie d'un article tiers.

| # | Nom | Handle LinkedIn | Abonnes (14/09/2026) | Base | Positionnement |
| --- | --- | --- | --- | --- | --- |
| 1 | Allie K. Miller | `alliekmiller` | 1 673 689 | New York | Ex-responsable IA/ML pour startups chez AWS, ex-IBM. Strategie IA pour dirigeants : ROI, adoption, checklists de selection d'outils -- contenu tres actionnable pour PME. |
| 2 | Ethan Mollick | `emollick` | 429 587 | Philadelphie | Professeur a Wharton, voix de reference sur l'usage pratique de l'IA generative (ChatGPT, Claude) au travail -- articles et retours d'experience reguliers, jamais du survol marketing. |
| 3 | Dharmesh Shah | `dharmesh` | 1 194 280 | Boston | Co-fondateur/CTO de HubSpot, aujourd'hui centre sur les agents IA pour les equipes commerciales/marketing -- audience PME/scale-up par nature (HubSpot). |
| 4 | Justin Welsh | `justinwelsh` | 879 917 | New York | "The Saturday Solopreneur" -- reference americaine sur la construction d'une activite independante, y compris l'usage d'outils IA pour scaler seul. |
| 5 | Codie Sanchez | `codiesanchez` | 605 541 | Austin | Contrarian Thinking -- rachat et pilotage de petites entreprises ("Main Street"), angle operationnel/PME tres concret. |
| 6 | Noah Kagan | `noahkagan` | 108 190 | Austin | Fondateur d'AppSumo (marketplace d'outils logiciels, dont IA, pour entrepreneurs/PME) -- contenu produit et croissance oriente petites structures. |
| 7 | Sahil Bloom | `sahilbloom` | 722 282 | New York | Contenu business/croissance grand public, aborde regulierement l'IA comme levier pour les independants -- forte portee. |
| 8 | Jason Feifer | `jasonfeifer` | 264 954 | Brooklyn | Redacteur en chef du magazine *Entrepreneur* -- couverture reguliere des tendances IA appliquees aux petites entreprises americaines. |
| 9 | Matt Wolfe | `matt-wolfe-30841712` | 11 761 | San Diego | Createur de Future Tools (veille d'outils IA), 1M+ abonnes YouTube -- profil LinkedIn plus modeste mais contenu directement utile pour recycler (nouveaux outils, cas d'usage business). |
| 10 | Amy Porterfield | `amyporterfield` | 41 147 | Nashville | Formatrice business en ligne pour entrepreneurs/PME, contenu recentre sur le marketing assiste par IA depuis 2025. |

## Methode de selection

1. **Recherche web** (`WebSearch`, plusieurs requetes croisees : "top LinkedIn creators AI small
   business", "AI influencers LinkedIn small business solopreneur", "women AI business influencer
   LinkedIn United States") pour etablir un vivier de noms cites par plusieurs sources
   independantes (Favikon, Website Builder Expert, DataNorth, Cherry Lane Media, etc.).
2. **Filtre nationalite americaine, verifie individuellement** -- pas suppose : plusieurs noms
   frequemment cites dans ce type de classement ont ete **ecartes** apres verification parce que
   non americains -- Zain Kahn (Toronto, Canada), Rowan Cheung (Vancouver, Canada), Ruben Hassid
   (France), Menno Fokkema (Europe). Ecarte aussi Fei-Fei Li (recherche academique, pas
   business/PME) et un candidat ("Alex Wang" educatrice IA) faute de pouvoir distinguer sans
   ambiguite son profil de celui, tres different, du fondateur de Scale AI portant un nom proche.
3. **Filtre pertinence** : IA appliquee au business, a la croissance, ou aux outils pour
   independants/petites entreprises -- pas de la recherche academique pure ni de l'actualite IA
   generaliste sans angle business/PME.
4. **Verification individuelle reelle** de chaque profil retenu : ouverture du profil LinkedIn via
   navigateur authentifie (pas d'API, pas de moteur de recherche generique), lecture directe du
   handle exact (URL `/in/...`), du nombre d'abonnes affiche, et de la localisation US confirmee
   sur le profil lui-meme (pas seulement dans l'article source).

## Ce qui n'a pas ete fait

- Pas de profil invente ni de handle devine : les 10 URLs ci-dessus ont toutes ete reellement
  ouvertes le 14/09/2026, session authentifiee.
- Pas de chiffre d'abonnes recopie d'un article tiers sans re-verification -- exemple concret :
  plusieurs sources indiquaient "pres de 2M" ou "2M" pour Allie K. Miller ; le chiffre retenu ici
  (1 673 689) est celui lu directement sur son profil au moment de la verification.
- Pas de completion artificielle au-dela de 10 pour "faire plus riche" : le brief demande
  precisement 10 noms, fournis tels quels.
- Liste volontairement **unique et partagee** entre `julien-agency` et `julien-partners` (pas
  8+8 comme pour `linkedin-commentaires`) : contrairement au ciblage de commentaires (qui vise des
  personnes precises a interpeller par marque), la veille repere des posts viraux a recycler --
  la meme source d'inspiration sert les deux comptes, seule la redaction finale change de ton.

## Limite honnete

Le score d'engagement du brief -- `(reactions + 3*commentaires + 5*partages) / abonnes` -- n'est
pas encore code dans `trierPosts` (confirme absent le 14/09/2026 dans l'audit v3, section 6). Le
nombre d'abonnes ci-dessus est donc pour l'instant une donnee **de reference editoriale**, pas
encore branchee dans le pipeline de tri automatique -- a faire quand ce paquet reviendra en
priorite (voir `references/audit-brief-20260914-v3.md`, priorisation confirmee : carrousel
d'abord, commentaires ensuite, veille en dernier).
