# Quatre posts adaptes -- prets, non publies (mis a jour le 15/09/2026)

**Trois posts reels adaptes le 15/09/2026**, choisis parmi les 15 candidats reels retenus le
14/09/2026 (`data/veille-resultats-reels-20260914.json`, passage reel sur les 10 comptes
americains de `comptes-a-surveiller.txt`) -- les 3 meilleurs par score qui offraient une matiere
reellement adaptable (les posts purement promotionnels d'un candidat -- ex. lancement de cours --
ecartes malgre un bon score, faute de fond a adapter). **Aucun appel a `publierPost` n'a ete
fait.**

**Methode -- adapter, pas traduire** : structure et angle du post source conserves, mais exemples
et chiffres entierement remplaces par des references francaises reelles, verifiees une par une
(page ouverte et lue, pas un chiffre de memoire ni une reprise du chiffre americain du post
source). Chaque post passe reellement par `linkedin-carrousel/lib/valider-post.js`
(`validerEtConvertirPost`) et `lib/valider-orthographe.js` (`validerAccents`) -- les memes
garde-fous d'ecriture que le carrousel (gras Unicode, 3-5 emojis, 1300-1900 caracteres, accroche
interrogative, 0-2 hashtags, aucun interdit, chiffre source, accents), pas encore natifs a
`linkedin-veille-virale` mais explicitement demandes pour ce livrable.

**Regle de publication -- trois maximum, jamais deux le meme jour** : aucun des 4 n'est publie a
ce jour, donc cette regle n'a pas encore ete testee en conditions reelles -- **a respecter au
moment de publier** : espacer les 3 nouveaux posts sur au moins 3 jours differents si le GO de
Julien les valide tous.

## Les trois posts adaptes le 15/09/2026

| # | Fichier | Compte | Post source (auteur, score) | Angle conserve | Chiffre francais verifie |
| --- | --- | --- | --- | --- | --- |
| 1 | `julien-partners-2026-09-15-v1.commentary.txt` | julien-partners | [Justin Welsh](https://www.linkedin.com/posts/justinwelsh_one-of-the-best-business-hacks-is-being-your-activity-7504143803625218049-bQCf) (score 0,016439, le plus eleve des 15) | Croire en soi assez longtemps pour que la competence suive, avant que les resultats ne parlent | 28% des micro-entrepreneurs francais encore actifs 5 ans apres (Insee Premiere n°2069, 2025 -- page ouverte et lue) |
| 2 | `julien-agency-2026-09-15-v1.commentary.txt` | julien-agency | [Jason Feifer](https://www.linkedin.com/posts/jasonfeifer_this-ad-could-have-pissed-everyone-off-activity-7503453455580057601-S0Q6) (score 0,012546) | Retourner un defaut assume en argument de vente plutot que de le cacher | Campagne "fruits et legumes moches" d'Intermarche : -30%, Grand Prix Strategies de la publicite 2014 (page Strategies ouverte et lue) |
| 3 | `julien-agency-2026-09-15-v2.commentary.txt` | julien-agency | [Codie A. Sanchez](https://www.linkedin.com/posts/codiesanchez_business-scaling-isnt-rocket-science-but-activity-7503799578358525952-6opW) (score 0,006832) | Le cout reel d'un recrutement se mesure des mois apres, pas a la signature | 78% des PME/TPE francaises confrontees a des difficultes de recrutement (Bpi France Le Lab/Rexecode, mai 2023 -- page ouverte et lue) |

Chaque post source est note ici et reste verifiable via son lien -- **jamais republie a
l'identique**, chaque texte est une redaction originale qui reprend la structure/l'angle du post
source avec un exemple et une source francaise reels, conformement a la consigne "adapter, pas
traduire".

## L'ancien exemple du 12/09/2026 -- toujours a part

`julien-agency-2026-09-12.commentary.txt` : premier exemple technique du pipeline, redige avant
que `comptes_a_surveiller` ne soit rempli -- reagit a un post de Julien Rayes lui-meme (= julien
agency), pas a un veritable tiers. Reste documente ici pour memoire, mais **les 3 posts ci-dessus
sont les premiers exemples reels sur un veritable compte tiers.**

## En attente du GO de Julien

Rien n'a ete publie. Pour publier reellement un de ces posts une fois valide :

```js
const { publierPost } = require('../lib/publier');
const fs = require('fs');

await publierPost({
  authorUrn: '<selon le compte -- voir reglages-comptes.json>',
  commentary: fs.readFileSync('a-publier/<fichier>.commentary.txt', 'utf8').trim(),
});
```

Respecter la regle "trois maximum, jamais deux le meme jour" si plusieurs sont valides d'un coup.
