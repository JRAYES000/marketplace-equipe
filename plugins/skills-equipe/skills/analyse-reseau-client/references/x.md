# X (Twitter) — relever les chiffres

Méthode éprouvée le 24/09/2026 sur un compte poker anglophone : 87 tweets
relevés en une passe, plus un mois de réponses.

## Ce que seul le propriétaire voit

- **Les statistiques du compte** (menu « Analytics » de X) : impressions, taux
  d'engagement, visites du profil, réponses, likes, reposts, signets, partages, abonnés
  (dont certifiés et actifs), audience (pays, âge, sexe, appareil), et pour les vidéos :
  vues, heures de visionnage, **durée moyenne regardée et part vue jusqu'au bout**. Le
  client les a souvent en captures dans son Drive.
- **Le détail de chaque tweet** (clics sur le lien, clics sur le profil, durée regardée
  d'une vidéo) : seulement depuis son compte, ou dans un outil qu'il y a branché
  (Metricool). Sinon : « à relever ».

## Ce que tout le monde voit, avec un compte connecté

Sans compte, X n'affiche presque rien. Il faut **une session X connectée, avec Claude in
Chrome : la tienne ou celle de la personne qui te le demande**, jamais le compte du client.
Sur chaque tweet, X affiche publiquement **vues, réponses, reposts, likes et signets**.

- **Onglet « Posts »** (`https://x.com/<compte>`) : ses tweets, épinglé compris, et les
  suites de ses propres fils. **Onglet « Replies »** (`/with_replies`) : ses réponses aux
  autres, mêlées aux tweets qu'il cite.
- **Le compteur complet est dans l'attribut `aria-label`** du bloc
  `article[data-testid="tweet"] div[role="group"]`, sous la forme
  « 5 replies, 11 likes, 5 bookmarks, 1743 views » (les compteurs à zéro sont absents).
  La date est dans `time[datetime]`, le texte dans `[data-testid="tweetText"]`, l'épingle
  dans `[data-testid="socialContext"]`, la vidéo dans `[data-testid="videoPlayer"]` ou
  `video`, la photo dans `[data-testid="tweetPhoto"]`.
- **Le fil ne garde en mémoire que les tweets visibles** : il faut les ramasser au fil du
  défilement, dans un objet indexé par l'adresse du tweet.

### La boucle qui marche

L'appel JavaScript de Claude in Chrome coupe au bout de **45 secondes**. Lance la boucle
**sans l'attendre**, puis interroge son état par des appels courts :

```js
window.__tw = {};
window.__grab = () => document.querySelectorAll('article[data-testid="tweet"]').forEach(a => {
  const link = [...a.querySelectorAll('a[href*="/status/"]')].find(l => l.querySelector('time'));
  if (!link) return;
  const g = a.querySelector('div[role="group"][aria-label]');
  window.__tw[link.getAttribute('href')] = {
    time: link.querySelector('time').getAttribute('datetime'),
    metrics: g ? g.getAttribute('aria-label') : '',
    txt: (a.querySelector('[data-testid="tweetText"]') || {}).innerText || '',
    pinned: !!a.querySelector('[data-testid="socialContext"]'),
    video: !!a.querySelector('[data-testid="videoPlayer"], video'),
    photo: !!a.querySelector('[data-testid="tweetPhoto"] img'),
    quote: a.querySelectorAll('[data-testid="User-Name"]').length > 1,
  };
});
(async () => { for (let i = 0; i < 120; i++) { __grab(); scrollBy(0, 1200);
  await new Promise(r => setTimeout(r, 1500)); } window.__done = true; })();
'lancé'
```

**Risque pour le compte qui lit.** Les règles d'automatisation de X interdisent de piloter
le site par script, sous peine de suspension. La boucle ne fait que défiler et lire, au
rythme d'une personne (1,5 s par écran), mais elle reste un script : **une seule passe par
analyse**, jamais en boucle continue, arrêt au premier message d'erreur ou de limite de X.
Préviens la personne dont le compte est utilisé avant de lancer.

Puis, toutes les 10 à 20 secondes : nombre de tweets, date du plus ancien, `__done`.
Arrête quand la période voulue est couverte (celle des captures du Drive, par exemple).

- **Garde l'onglet visible** : une capture d'écran entre deux interrogations. Onglet caché
  = défilement gelé, sans erreur.
- **Sors les données par `get_page_text`, pas par le retour JavaScript** : ce retour est
  coupé vers 1 000 caractères. Mets le texte dans un `<article>` de la page, puis lis la page :
  `const p = document.createElement('article'); p.textContent = rows.join('\n');
  document.body.innerHTML = ''; document.body.appendChild(p);`
  (les données restent dans `window` ; la page, elle, est perdue : recharge-la ensuite).
- **Calcule les statistiques dans un script local**, à partir d'un relevé brut recopié hors
  du dépôt : médianes par mois, par format, par sujet. Pas de calcul de tête.

### Ce qu'il faut classer à la main

- **Le sujet de chaque tweet** (main jouée, débat du milieu, résultat raconté, vie perso,
  annonce, session en cours…) : c'est le tableau « sujet par sujet » qui a porté l'analyse.
- **Les suites de fil** : le 2e tweet d'un fil fait toujours peu de vues. Exclus-les des
  « moins vus ».
- **Les citations** (tweet qui en cite un autre) : repère-les, elles se comportent à part.

### Les réponses du client

Sur `/with_replies`, la même boucle ramasse ses réponses **et** les tweets auxquels il
répond. Garde celles dont l'adresse commence par `/<compte>/` et qui ne sont pas dans
l'onglet Posts. Lis-les pour le ton : vraie réponse technique, ou « Exactly » ? Et
cherche ce qui peut lui nuire : une réponse publique reste cherchable.

## Outil de collecte, pour les comptes de référence

Apify `apidojo/twitter-profile-scraper` : 40 à 60 posts récents par compte, abonnés lus sur
le profil. Coût estimé le 24/09/2026 : 0,50 à 0,85 $ pour 16 comptes. Un filtre de dates a
rendu 0 résultat : ne pas en mettre. Certains identifiants se devinent mal (Brad Owen,
Davidi Kitai…) : vérifie le handle sur X avant de lancer.

## Repères relevés le 24/09/2026 — à revérifier avant de les citer

| Repère | Valeur | Source |
|---|---|---|
| Ce que prédit le classement | likes, réponses, reposts, citations, partages, partages en message privé, clics sur le profil, abonnements, qualité de visionnage vidéo, temps passé ; signaux négatifs (pas intéressé, masquer, bloquer, signaler) | github.com/xai-org/x-algorithm, version du 13/08/2026 |
| Posts d'un même auteur | chaque post après le premier est dévalué dans le fil d'une même personne | même source |
| Poids publiés (2023, historiques) | réponse à laquelle l'auteur répond 75 · réponse 13,5 · clic profil 12 · like 0,5 · signalement −369 | github.com/twitter/the-algorithm-ml |
| Lien externe, boost Premium | **absents du code public** : ne pas les affirmer | — |
| X Premium | fait remonter les réponses de l'abonné sous les posts des autres | help.x.com, « X Premium » |
| Vidéo | moins de 15 s pour être vue en entier, mouvement et message dès les premières secondes, sous-titres | business.x.com, « creative best practices » |
| Heures | mardi à jeudi, 12 h - 18 h, heure locale du public | Sprout Social, fin 2025 - début 2026 |
| Jeux d'argent | contenus exclus du partage des revenus avec les créateurs ; publicité interdite sauf pays listés, avec autorisation | help.x.com « content monetization standards », business.x.com « gambling content » |

## Automatisation : ce que X permet (help.x.com, « X automation », avril 2026)

- **Autorisé** : réponse ou message privé automatique à quelqu'un qui a pris contact
  (réponse au tweet, message privé), **une seule par interaction**, avec désinscription
  simple.
- **Interdit** : déclenchement sur un mot-clé trouvé par recherche, messages privés non
  sollicités (un abonnement ne vaut pas accord), likes et abonnements automatiques,
  contenu dupliqué, pilotage du site par script.
- **Accord écrit de X exigé** : bot de réponse par IA, campagne de réponses automatiques
  d'une marque.
- **API** : paiement à l'usage depuis 2026 (lecture d'un post 0,005 $, création 0,015 $,
  post avec lien 0,200 $).

**Recommandation retenue le 24/09/2026 : pas d'automatisation des réponses sur X.** Premier
tweet de réponse posé par le client, « DM me <MOT> », messages privés traités à la main par
l'assistant, avec la question du niveau avant toute proposition.

## Outils le 24/09/2026 — prix à relire le jour même

| Besoin | Outil | Prix relevé | Remarque |
|---|---|---|---|
| Programmer, première réponse, stats par tweet, concurrents | Metricool + module X | Starter 16 €/mois à l'année, + 10 €/mois par compte X (ou 120 €/an), depuis le 13/07/2026 | messages privés X dans sa boîte : non décrit, à vérifier à l'essai |
| Texte à l'écran, sous-titres | Canva Pro | 110 €/an | |
| Mot-clé → message privé | ManyChat | — | **ne gère pas X** (Instagram, WhatsApp, Messenger, TikTok, Telegram, SMS, e-mail) |
| Écarté | Hypefury | — | sa FAQ : « no longer supports 𝕏 » |
| Non tranché | Typefully | montants non affichés au relevé | liste des « Auto-DMs » : à vérifier contre les règles de X |

## Comptes poker relevés le 24/09/2026 (médiane vues / likes des posts originaux)

Negreanu @RealKidPoker 561 946 abonnés, 33 105 / 260 · Hellmuth @phil_hellmuth 328 039,
10 384 / 18 · Doug Polk @DougPolkVids 181 840, 39 191 / 247 · Joey Ingram @Joeingram1
97 860, 13 783 / 72 · Garrett Adelstein @GmanPoker 86 521, 26 997 / 52 · Fedor Holz
@CrownUpGuy 77 905, 79 110 / 251 · Lex Veldhuis @LexVeldhuis 77 886, 15 222 / 68 · Winamax
@Winamax 73 369, 4 119 / 26 · Rampage @rampagepoker 70 963, 7 884 / 27 · ElkY @ElkYPoker
70 251 (inactif) · Jonathan Little @JonathanLittle 63 601, 5 312 / 24 · Spraggy @spraggy
62 898 · Jason Koon @JasonKoon 62 264 · Nick Schulman @NickSchulman 46 756 · Andrew Neeme
@andrewneeme 38 167, 4 708 / 30.

Ce qui revient : les gros comptes vivent de leurs **réponses** (50 à 90 % de l'activité de
Negreanu, Ingram, Adelstein, Little) ; un clip de main **finit par une question** ; une
annonce d'offre claire (le mentorat de Fedor Holz, 133 790 vues) ne fait pas fuir.
