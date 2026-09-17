# Remplacement propose et integre pour julien-partners (17/09/2026) -- VALIDE par Nomena le 17/09/2026, integre

## Pourquoi

Audit reel de la cadence des 8 comptes cibles julien-partners (17/09/2026, via `trouverPosts`
reel sur Apify, `postedLimit: 'month'`, 5 derniers posts par compte) : 6 comptes sur 8 publient a
un rythme sain (1 a 5 jours entre deux posts), mais **2 comptes n'ont produit aucun post original
sur le mois ecoule** :

- `sindy-desquerre` -- 0 post recupere sur 1 mois.
- `romy-ozier-lafontaine-ia` -- 0 post recupere sur 1 mois.

Contrairement au constat du 16/09/2026 sur julien-agency (liste entiere a remplacer en majorite),
ici seuls 2 comptes sur 8 sont concernes -- le reste de la liste est sain et n'a pas ete touche.

## Methode

Recherche LinkedIn (`search/results/content`, tri "Latest") sur des formulations proches du
positionnement de julien-partners (reseau professionnel, indeependants, recommandation, confiance
entre freelances/clients) -- ton "chaleureux, professionnel, facilitateur, oriente-reseau" (voir
`ton` ci-dessus), different du positionnement automatisation/IA de julien-agency. Pour chaque
profil trouve : verification reelle via `trouverPosts` (Apify, `postedLimit: 'month'`, jusqu'a 5
posts), pas seulement la pertinence thematique -- meme discipline que le complement julien-agency
du 16/09/2026.

## Candidats verifies

| Candidat | URL | Positionnement observe | Cadence reelle (5 derniers posts) | Verdict |
| --- | --- | --- | --- | --- |
| Victor Partouche-Sebban | `https://www.linkedin.com/in/victorpartouche/` | Fondateur du reseau d'affaires NBC -- "J'aide les professionnels a gagner en visibilite, a developper leur reseau et a creer des opportunites d'affaires" | 0,1j / 1,2j / 1,5j / 2,0j / 2,3j -- plusieurs posts par jour, tres actif | **Retenu** -- positionnement facilitateur/reseau, correspond exactement au ton julien-partners |
| Alexis Combeaux | `https://www.linkedin.com/in/alexiscombeaux/` | "Je t'accompagne de tes debuts en Freelance a ta 1ere mission" -- freelance digital analyst | 0,4j / 2,4j / 6,4j / 8,4j / 10,4j -- quasi quotidien | **Retenu** -- audience independants/freelances, cadence excellente |
| Lola Goncalves | `https://www.linkedin.com/in/lola-goncalves/` | CEO Helios 4 IT -- "placement de freelances qualifies", ton relationnel proche du brief ("les relations humaines qui creent les plus belles collaborations") | 3,3j puis trou a 16,4j et 23,4j | **Ecartee** -- cadence trop irreguliere (meme type de reserve que Mehdi Stili pour julien-agency le 16/09) |

**Aucun profil invente** : les 3 URL ci-dessus ont ete reellement trouvees par recherche LinkedIn
et leur cadence verifiee par un appel Apify reel (voir historique de session du 17/09/2026),
jamais une estimation.

## Statut

**Valide par Nomena le 17/09/2026** -- les 2 comptes retenus sont integres dans
`linkedin-commentaires/reglages-comptes.json`, a la place de `sindy-desquerre` et
`romy-ozier-lafontaine-ia`. La liste julien-partners reste a 8 comptes cibles.
