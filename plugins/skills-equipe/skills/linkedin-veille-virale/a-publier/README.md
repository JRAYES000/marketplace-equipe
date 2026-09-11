# A publier -- julien-partners, exemple reel pret, NON publie

**Donnees reelles obtenues le 12/09/2026** via `APIFY_TOKEN` (desormais configure dans
l'environnement, export manuel par Nomena -- voir SKILL.md et
`references/etat-linkedin-20260912.md`) : appel reel de `recupererPosts` sur le profil
`https://www.linkedin.com/in/julien-rayes` (5 posts recuperes, sauvegardes dans
`data/posts-julien-rayes-2026-09-12.json`, gitignore -- contenu specifique a un compte reel,
pas destine a un depot public).

**Limite a noter honnetement** : `comptes_a_surveiller` est encore vide dans
`reglages-comptes.json` pour les deux comptes (voir "A completer avant un usage reel" du
SKILL.md) -- il n'y a donc pas encore de veritable compte tiers configure a surveiller. Le
profil interroge ici est celui de Julien Rayes lui-meme (= julien-agency, voir
`references/etat-linkedin-20260912.md`), pas un tiers. Cet exemple prouve que la chaine
recuperation -> tri -> redaction -> arguments de publication fonctionne de bout en bout sur
des donnees reelles, mais ce n'est pas encore le scenario de production final (surveiller un
compte tiers pertinent). A completer : remplir `comptes_a_surveiller` avec de vrais comptes a
suivre avant un usage reel en continu.

## Post source (reel, retenu par `trierPosts`)

- Auteur : Julien Rayes (julien-agency), post du 2026-09-08.
- Sujet : pourquoi ses pages ne sont jamais citees par ChatGPT/Gemini/Perplexity, et ce que
  les douze pages qui sortent ont en commun (nommer d'autres acteurs, dater leurs listes).
- URL : voir `data/posts-julien-rayes-2026-09-12.json` (`id: 7503145103931392000`).

## Texte redige (jugement editorial de cette session, pas une generation automatique)

`julien-partners-2026-09-12.commentary.txt` -- post "recycle/inspire" dans le ton de
julien-partners (chaleureux, professionnel, facilitateur, oriente-reseau -- voir
`reglages-comptes.json`). L'angle du post source (juger sur un vrai livrable, pas une demo)
est repris et transpose au choix d'un partenaire dans son reseau -- reformule, pas copie.

## A faire une fois la publication confirmee

```js
const { publierPost } = require('./lib/publier');
const fs = require('fs');

await publierPost({
  authorUrn: 'urn:li:person:ZvLHybJZhj', // julien-partners -- identite Composio NON confirmee, voir SKILL.md
  commentary: fs.readFileSync('a-publier/julien-partners-2026-09-12.commentary.txt', 'utf8').trim(),
});
```

**Ne pas executer avant confirmation explicite** : contrairement a julien-agency (identite
`averse-cooser` confirmee), julien-partners n'a a ce jour aucune connexion LinkedIn Composio
identifiee -- `publierPost` echouerait ou, pire, agirait sur un compte incertain. Ce texte est
pret editorialement, pas techniquement publiable tant que ce point n'est pas resolu.
