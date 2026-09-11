# A publier -- julien-agency, exemple reel pret, NON publie

**Bascule le 12/09/2026** : cet exemple ciblait initialement julien-partners, dont l'identite
Composio n'est pas confirmee. Julien a dit explicitement que le compte importe peu -- corrige
pour cibler **julien-agency** (`urn:li:person:aFqu-W7ClW`), le seul compte avec un acces
Composio reellement confirme et fonctionnel (identite `averse-cooser`, voir
`references/etat-linkedin-20260912.md`). Le texte a ete **reecrit** dans le ton de
julien-agency (confiant, direct, pedagogue, oriente-dirigeants), pas simplement republie sous
un autre `authorUrn` -- voir "Texte redige" plus bas pour le detail du changement d'angle.

**Donnees reelles obtenues le 12/09/2026** via `APIFY_TOKEN` (configure dans l'environnement,
export manuel par Nomena -- voir SKILL.md) : appel reel de `recupererPosts` sur le profil
`https://www.linkedin.com/in/julien-rayes` (5 posts recuperes, sauvegardes dans
`data/posts-julien-rayes-2026-09-12.json`, gitignore -- contenu specifique a un compte reel,
pas destine a un depot public).

**Limite a noter honnetement** : `comptes_a_surveiller` est encore vide dans
`reglages-comptes.json` -- il n'y a donc pas encore de veritable compte tiers configure a
surveiller. Le profil interroge est celui de Julien Rayes lui-meme, qui EST julien-agency :
ce post "recycle/inspire" serait donc, en pratique, julien-agency reagissant a son propre
post anterieur -- un exemple technique valable pour prouver que la chaine fonctionne de bout
en bout sur des donnees reelles, mais pas le scenario de production final (reagir a un
veritable compte tiers). A completer : remplir `comptes_a_surveiller` avec de vrais comptes a
suivre avant un usage reel en continu.

**Ne pas enchainer sur ce compte avant confirmation du carrousel** : julien-agency a deja un
post de test (le carrousel PDF, voir `linkedin-carrousel/a-publier/README.md`) en attente que
Julien confirme son apparence reelle. Ne pas publier ce post-ci avant cette confirmation, pour
ne pas empiler plusieurs posts de test sur le meme compte avant de savoir si le premier
fonctionne comme prevu.

## Post source (reel, retenu par `trierPosts`)

- Auteur : Julien Rayes (julien-agency), post du 2026-09-08.
- Sujet : pourquoi ses pages ne sont jamais citees par ChatGPT/Gemini/Perplexity, et ce que
  les douze pages qui sortent ont en commun (nommer d'autres acteurs, dater leurs listes).
- URL : voir `data/posts-julien-rayes-2026-09-12.json` (`id: 7503145103931392000`).

## Texte redige (jugement editorial de cette session, pas une generation automatique)

`julien-agency-2026-09-12.commentary.txt` -- post "recycle/inspire" dans le ton de
julien-agency (confiant, direct, pedagogue, oriente-dirigeants -- voir
`reglages-comptes.json`). L'angle du post source (juger sur un vrai livrable, pas une demo)
est repris, mais reoriente sur l'adoption d'outils en entreprise plutot que sur le choix d'un
partenaire de reseau (l'angle initial, ecrit pour julien-partners) -- registre plus direct et
imperatif ("la regle est simple"), adresse au dirigeant a la deuxieme personne. Reformule, pas
copie.

## A faire une fois la publication confirmee (et le carrousel valide)

```js
const { publierPost } = require('./lib/publier');
const fs = require('fs');

await publierPost({
  authorUrn: 'urn:li:person:aFqu-W7ClW', // julien-agency -- identite Composio confirmee le 12/09/2026
  commentary: fs.readFileSync('a-publier/julien-agency-2026-09-12.commentary.txt', 'utf8').trim(),
});
```

**Ne pas executer maintenant** : l'identite et l'acces technique sont confirmes, mais deux
conditions restent a lever avant d'appeler `publierPost` reellement -- (1) l'accord explicite
de Julien sur ce texte precis, et (2) sa confirmation que le carrousel deja publie sur ce
compte s'affiche comme prevu, pour ne pas empiler un deuxieme post de test avant d'avoir
valide le premier.
