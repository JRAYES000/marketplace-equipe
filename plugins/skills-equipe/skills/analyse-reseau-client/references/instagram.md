# Instagram — relever les chiffres

## Ce que seul le propriétaire voit

- **Les statistiques du compte** : vues, part des vues venant des abonnés, abonnés gagnés,
  interactions, visites du profil, clics sur le lien, audience (pays, âge, sexe). Le client
  les a souvent déjà mises en captures dans son Drive.
- **Les statistiques de chaque publication et de chaque story** (portée, partages,
  enregistrements, sorties, réponses, clics sur le sticker lien) : seulement dans
  l'application du propriétaire, ou dans un outil qu'il y a branché (Metricool, par
  exemple). Sans elles, écris « à relever » et demande au client des captures
  « Statistiques » des 30 derniers jours.

## Ce que tout le monde voit, à condition d'être connecté

**Sans compte connecté, une partie des publications est invisible.** Mesuré le 24/09/2026
sur un compte de poker : 5 publications sur 22 visibles, les 17 autres en « accès
restreint ». Cause probable : Meta limite aux 18 ans et plus les contenus qui représentent
des jeux d'argent en ligne (règles « Biens et services restreints »). Même chose à prévoir
pour l'alcool, le tabac ou les produits pour adultes.

Il faut donc une **session Instagram adulte et connectée**, avec Claude in Chrome : la tienne.
Jamais le compte du client, jamais un mot de passe tapé par Claude.

- **La grille** (`https://www.instagram.com/<compte>/`) ne charge la suite qu'au défilement,
  et seulement si l'onglet est visible. Si `document.hidden` vaut `true` et que rien de
  nouveau n'arrive, une capture d'écran de l'onglet le réveille.
- **Les vues** : onglet Reels (`/<compte>/reels/`). Chaque vignette porte son compteur, dans
  le texte des liens `a[href*="/reel/"]`.
- **Likes, commentaires, date et légende** : dans la balise
  `<meta property="og:description">` de la page de chaque publication, sous la forme
  « 20 likes, 5 comments - <compte> le September 21, 2026: "…" ». Une requête
  `fetch('/p/<code>/')` toutes les 1,5 à 2 secondes, **arrêt au premier refus (429)**.
- **Jamais les points d'accès internes** (`/api/v1/…`, `web_profile_info`) : refus 429
  immédiat le 24/09/2026. Insister expose le compte qui lit.
- **Les commentaires** : ouvre 3 ou 4 publications (la plus commentée, la plus vue, une
  récente). Déplie « Voir les réponses », note qui répond, et comment.
- **La vitrine** : bio, lien (où il mène, quels boutons, dans quel ordre), publications
  épinglées (la première chose que voit un visiteur), stories à la une, couvertures (un
  modèle commun ? du texte ? lisible en petit ?). La grille du profil affiche des vignettes
  en 3:4 : un Reel en 9:16 y perd le haut et le bas.

## Un outil de collecte, si l'équipe en a un

Apify, avec un jeton dans une variable d'environnement de la session. Il ne voit que les
publications publiques :

- `apify/instagram-scraper`, `resultsType: "details"` : abonnés, bio, lien, nombre de
  publications et de stories à la une ;
- `apify/instagram-reel-scraper` avec `includeSharesCount` et `includeTranscript` : partages
  et transcription (utile pour juger l'accroche des premières secondes) ;
- `apify/instagram-profile-scraper` sur la liste des comptes de référence : abonnés et
  dernières publications en un seul passage ;
- toujours un plafond `maxTotalChargeUsd`. Coût réel le 24/09/2026 : moins de 0,50 $ pour
  une analyse complète.

## Repères relevés le 24/09/2026 — à revérifier avant de les citer

| Repère | Valeur | Source |
|---|---|---|
| Ce qui fait monter un Reel | temps de visionnage, likes et partages en message privé, rapportés aux personnes touchées ; les partages pèsent plus pour les non-abonnés | Adam Mosseri, janvier et mars 2025 |
| Les stories | on voit les stories des comptes qu'on suit | about.instagram.com, « Instagram ranking explained » |
| Être recommandé | Reel de 3 minutes au plus ; contenu original, sans filigrane d'une autre appli | creators.instagram.com, « tips for improving your reach » |
| Hashtags | 5 au maximum par publication, depuis décembre 2025 | help.instagram.com |
| Reels d'essai | montrés d'abord à des non-abonnés | creators.instagram.com, « instagram trial reels » |
| Statut du compte | dit si les contenus peuvent être recommandés aux non-abonnés | about.instagram.com |
| Jeux d'argent | visibilité limitée aux 18 ans et plus | transparency.meta.com, « restricted goods and services » |
| Engagement, comptes de 1 000 à 10 000 abonnés | 2,19 % | HypeAuditor 2025 |
| Vues d'un Reel rapportées aux abonnés, comptes de 1 000 à 5 000 | 10 à 20 % | Socialinsider 2025 et 2026 |
| Interactions par personne touchée | carrousels 6,9 %, Reels 3,3 % | Buffer 2026 |
| Sortie après la première story | 23,8 % | Socialinsider 2025 |

## Outils conseillés le 24/09/2026 — prix à relire le jour même

| Besoin | Outil | Prix relevé | Page officielle |
|---|---|---|---|
| Publier sur Instagram, YouTube (vidéos longues comprises) et X ; premier commentaire ; boîte de réception ; stats par publication et par story ; suivi de concurrents | Metricool, offre Starter | 16 €/mois facturés à l'année, + 10 €/mois par compte X ; accès séparé pour un assistant : offre Advanced, dès 43 €/mois | metricool.com/pricing |
| Couvertures de Reels | Canva Pro | 110 €/an | canva.com/fr_fr/pricing |
| Mot-clé en commentaire → message privé | ManyChat, offre Essential | 14 $/mois facturés à l'année ; partenaire officiel de Meta ; 250 contacts actifs, 2 utilisateurs | manychat.com/pricing (bloque les robots : l'ouvrir dans Chrome) |
| Écarté | Buffer | ne publie que les Shorts sur YouTube, pas les vidéos longues | support.buffer.com |
