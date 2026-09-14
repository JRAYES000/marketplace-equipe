# Budget Apify -- estimation avant lancement sur comptes_cibles (14/09/2026)

Julien impose un plafond de 50 € d'API pour l'ensemble du chantier et exige de noter la
depense dans le mail du 20/09. Ce fichier fait les deux : estimer le cout AVANT de lancer la
recuperation sur les 8-12 comptes cibles, et noter ce qui est reellement tracable a ce jour.

## Tarification reelle de l'acteur utilise

Acteur : `harvestapi/linkedin-profile-posts` (le seul utilise par `linkedin-veille-virale` et
`linkedin-commentaires`). Verifie directement sur sa page Apify (`apify.com/harvestapi/
linkedin-profile-posts`) le 14/09/2026 : **modele pay-per-event, facture au nombre de posts
extraits** -- "$2 per 1k posts" (une version basse a "from $1.50/1,000 posts" selon le plan
d'abonnement Apify). Aucun abonnement obligatoire : paiement a l'usage.

Notre code (`trouverPosts` dans `lib/trouver-posts.js`, identique dans les deux skills) appelle
l'acteur avec `maxPosts: 5` par profil par defaut -- donc au plus 5 posts factures par compte
et par appel (le prix ne depend pas des `reactions`/`commentaires` scrapes tant qu'on ne
demande pas leur extraction detaillee en objets separes, ce que notre appel ne fait pas).

## Estimation d'un passage sur la liste proposee

8 comptes proposes (`references/comptes-cibles-proposition-20260914.md`), en attente de
validation par Julien :

```
8 comptes x 5 posts max = 40 posts factures au plus
40 posts x (2 $ / 1000 posts) = 0,08 $ par passage
```

Le brief demande deux passages par jour pour `linkedin-commentaires` : **~0,16 $/jour**, soit
environ **1 $ pour les 6 jours restants avant le 20/09** -- meme en doublant pour couvrir
`linkedin-veille-virale` (un passage par jour, meme liste ou liste dediee), on reste sous
**2 $ au total** pour le reste du chantier. Si Julien valide 12 comptes au lieu de 8 (haut de
la fourchette), le calcul monte a 60 posts/passage, soit 0,12 $/passage -- l'ordre de grandeur
ne change pas.

**Conclusion : le budget de 50 € n'est pas un facteur limitant pour cet usage.** Le cout
reste negligeable (< 5 % du budget total) meme dans le scenario le plus large.

## Depense deja engagee -- ce qui est tracable, ce qui ne l'est pas

**Ce qui N'EST PAS tracable depuis cette session** : aucune API de facturation/consommation
Apify n'a ete appelee (ni disponible) ici. Le montant reellement debite sur le compte Apify de
l'equipe ne peut etre lu que depuis la console Apify elle-meme (apify.com -> Billing), a
laquelle cette session n'a pas acces. **Ne pas presenter une estimation comme un montant
facture reel** dans le mail du 20 -- seul le tableau de bord Apify fait foi.

**Ce qui est tracable depuis le code et les references du depot** (donc une borne basse
verifiable, pas le total reel) -- **mis a jour le 15/09/2026** avec les deux passages reels
survenus le 14/09/2026, absents de la version precedente de ce fichier (ecrite avant eux, verifie
par `git log`) :

**12/09/2026** -- deux appels reels a `trouverPosts` sur le profil
`https://www.linkedin.com/in/julien-rayes`, `maxPosts: 5` chacun (un pour chaque skill) :
```
2 appels x 5 posts = 10 posts factures au plus
```

**14/09/2026, `linkedin-commentaires`** -- premier appel reel sur les 16 comptes valides par
Julien (8 par marque) : `julien-partners` -> 12 posts recuperes, `julien-agency` -> 2 posts
recuperes (Point n°9 de `etat-linkedin-20260912.md`) :
```
12 + 2 = 14 posts factures
```

**14/09/2026, `linkedin-veille-virale`** -- premier appel reel sur les 10 comptes americains
(`comptes-a-surveiller.txt`), confirme directement dans `data/veille-resultats-reels-20260914.json`
(`nb_recuperes: 35`) :
```
35 posts factures
```

**Total trace depuis le code, au 15/09/2026** :
```
10 + 14 + 35 = 59 posts factures au plus
59 posts x (2 $ / 1000 posts) = 0,118 $ (arrondi 0,12 $)
```

Toujours tres largement sous les 50 € (moins de 0,3 % du budget total, avant conversion en
euros). Les fichiers de resultat du 12/09
(`data/posts-julien-rayes-2026-09-12.json`) sont gitignores et n'existent plus sur cette
machine -- ce sous-total s'appuie sur la documentation ecrite a l'epoque, pas sur une relecture
directe. Les fichiers du 14/09 (`data/veille-reelle-20260914.json`,
`data/veille-resultats-reels-20260914.json`) existent encore sur cette machine au moment de
cette mise a jour et ont ete relus directement pour le chiffre ci-dessus.

**A confirmer aupres de la console Apify pour le montant exact a mettre dans le mail du 20** --
ce total reste une borne basse calculee, pas un releve de facturation.

## Ce qui reste a faire avant de lancer la recuperation reelle

1. Julien valide ou corrige la liste de 8 comptes proposee.
2. Copier les URLs validees dans `comptes_cibles` (`linkedin-commentaires/reglages-comptes.json`)
   et/ou `comptes_a_surveiller` (`linkedin-veille-virale/reglages-comptes.json`).
3. Lancer `trouverPosts`/`recupererPosts` pour de vrai -- cout attendu < 1 $ pour le premier
   passage sur l'ensemble des comptes valides.
