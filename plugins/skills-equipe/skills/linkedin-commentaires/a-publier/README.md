# A publier -- julien-partners, exemple reel pret, NON publie

**Donnees reelles obtenues le 12/09/2026** via `APIFY_TOKEN` (desormais configure dans
l'environnement, export manuel par Nomena -- voir SKILL.md et
`references/etat-linkedin-20260912.md`) : meme appel reel que `linkedin-veille-virale` sur le
profil `https://www.linkedin.com/in/julien-rayes` (5 posts, sauvegardes dans
`data/posts-julien-rayes-2026-09-12.json`, gitignore -- contenu specifique a un compte reel).

**Limite a noter honnetement** : `comptes_cibles` est encore vide dans
`reglages-comptes.json` -- pas encore de veritable compte tiers configure. Le profil
interroge est celui de Julien Rayes lui-meme (= julien-agency). Cet exemple prouve que la
chaine recherche -> tri -> redaction -> arguments de publication fonctionne de bout en bout
sur des donnees reelles (y compris la conservation du `shareUrn`, jamais une URN
`urn:li:activity:`), mais ce n'est pas encore le scenario de production final. A completer :
remplir `comptes_cibles` avec de vrais comptes a suivre.

## Post cible (reel, retenu par `trierPosts`)

- Auteur : Julien Rayes (julien-agency), post du 2026-09-05.
- Sujet : comment verifier qu'un prestataire IA sait vraiment faire (badge de l'annuaire
  Claude Partners, teste sur 20 situations reelles, score a partir de 75/100).
- `shareUrn` : `urn:li:share:7501940404297101312` (voir
  `data/posts-julien-rayes-2026-09-12.json`, `id: 7501940405106679808`).

## Texte redige (jugement editorial de cette session, pas une generation automatique)

`julien-partners-2026-09-12.commentary.txt` -- commentaire dans le ton de julien-partners
(chaleureux, professionnel, facilitateur, oriente-reseau), qui renforce le point du post
source (juger sur un test concret plutot qu'une impression) avec un angle reseau propre a
Partners -- coherent puisque le post source parle deja de l'annuaire Claude Partners.

## A faire une fois la publication confirmee

```js
const { publierCommentaire } = require('./lib/publier-commentaire');
const fs = require('fs');

await publierCommentaire({
  actorUrn: 'urn:li:person:ZvLHybJZhj', // julien-partners -- identite Composio NON confirmee, voir SKILL.md
  targetUrn: 'urn:li:share:7501940404297101312',
  message: fs.readFileSync('a-publier/julien-partners-2026-09-12.commentary.txt', 'utf8').trim(),
});
```

**Ne pas executer avant confirmation explicite** : julien-partners n'a a ce jour aucune
connexion LinkedIn Composio identifiee (contrairement a julien-agency, confirmee via
`averse-cooser`) -- ce texte est pret editorialement, pas techniquement publiable tant que ce
point n'est pas resolu.
