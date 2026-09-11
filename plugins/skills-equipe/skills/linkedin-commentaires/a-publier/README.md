# A publier -- julien-agency, exemple reel pret, NON publie

**Bascule le 12/09/2026** : cet exemple ciblait initialement julien-partners, dont l'identite
Composio n'est pas confirmee. Julien a dit explicitement que le compte importe peu -- corrige
pour cibler **julien-agency** (`urn:li:person:aFqu-W7ClW`), le seul compte avec un acces
Composio reellement confirme et fonctionnel (identite `averse-cooser`, voir
`references/etat-linkedin-20260912.md`). Le texte a ete **reecrit** dans le ton de
julien-agency (confiant, direct, pedagogue, oriente-dirigeants), pas simplement republie sous
un autre `actorUrn` -- voir "Texte redige" plus bas.

**Donnees reelles obtenues le 12/09/2026** via `APIFY_TOKEN` (configure dans l'environnement,
export manuel par Nomena -- voir SKILL.md) : meme appel reel que `linkedin-veille-virale` sur
le profil `https://www.linkedin.com/in/julien-rayes` (5 posts, sauvegardes dans
`data/posts-julien-rayes-2026-09-12.json`, gitignore -- contenu specifique a un compte reel).

**Limite a noter honnetement** : `comptes_cibles` est encore vide dans
`reglages-comptes.json` -- pas encore de veritable compte tiers configure. Le post cible est
celui de Julien Rayes lui-meme, qui EST julien-agency : ce commentaire serait donc, en
pratique, julien-agency commentant son propre post -- un exemple technique valable pour
prouver que la chaine fonctionne de bout en bout sur des donnees reelles (y compris la
conservation du `shareUrn`, jamais une URN `urn:li:activity:`), mais pas le scenario de
production final (commenter un veritable post tiers). A completer : remplir `comptes_cibles`
avec de vrais comptes a suivre.

**Ne pas enchainer sur ce compte avant confirmation du carrousel** : julien-agency a deja un
post de test (le carrousel PDF, voir `linkedin-carrousel/a-publier/README.md`) en attente que
Julien confirme son apparence reelle. Ne pas publier ce commentaire avant cette confirmation,
pour ne pas empiler plusieurs actions de test sur le meme compte avant de savoir si la
premiere fonctionne comme prevu.

## Post cible (reel, retenu par `trierPosts`)

- Auteur : Julien Rayes (julien-agency), post du 2026-09-05.
- Sujet : comment verifier qu'un prestataire IA sait vraiment faire (badge de l'annuaire
  Claude Partners, teste sur 20 situations reelles, score a partir de 75/100).
- `shareUrn` : `urn:li:share:7501940404297101312` (voir
  `data/posts-julien-rayes-2026-09-12.json`, `id: 7501940405106679808`).

## Texte redige (jugement editorial de cette session, pas une generation automatique)

`julien-agency-2026-09-12.commentary.txt` -- commentaire dans le ton de julien-agency
(confiant, direct, pedagogue, oriente-dirigeants), qui renforce le point du post source
(juger sur un test concret plutot qu'une impression) mais avec un angle recrutement/decision
de dirigeant plutot que reseau (l'angle initial, ecrit pour julien-partners) -- s'adresse
directement au dirigeant qui recrute ("pour un dirigeant qui recrute...", "ca va vous faire
gagner du temps"), pas au facilitateur de reseau.

## A faire une fois la publication confirmee (et le carrousel valide)

```js
const { publierCommentaire } = require('./lib/publier-commentaire');
const fs = require('fs');

await publierCommentaire({
  actorUrn: 'urn:li:person:aFqu-W7ClW', // julien-agency -- identite Composio confirmee le 12/09/2026
  targetUrn: 'urn:li:share:7501940404297101312',
  message: fs.readFileSync('a-publier/julien-agency-2026-09-12.commentary.txt', 'utf8').trim(),
});
```

**Ne pas executer maintenant** : l'identite et l'acces technique sont confirmes, mais deux
conditions restent a lever -- (1) l'accord explicite de Julien sur ce texte precis, et (2) sa
confirmation que le carrousel deja publie sur ce compte s'affiche comme prevu, pour ne pas
empiler une deuxieme action de test avant d'avoir valide la premiere.
