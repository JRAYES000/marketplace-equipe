# Quatre posts adaptes -- trois programmes reellement (mis a jour le 15/09/2026, soir)

> **Decalage horaire Madagascar/Paris -- a verifier a CHAQUE fois avant de dire qu'un post
> "aurait du" etre en ligne.** Nomena est a Madagascar (UTC+3, pas de changement d'heure).
> Paris est a UTC+2 en septembre (heure d'ete) -- **Madagascar est en avance d'1h sur Paris**.
> Toutes les heures de programmation ci-dessous sont en heure de **Paris** (fuseau reel de
> Buffer, verifie dans l'editeur du post). Conversion pour les 3 posts de ce lot :
>
> | Post | Heure Paris (programmee) | Heure Madagascar (reelle pour Nomena) |
> | --- | --- | --- |
> | Codie A. Sanchez (15/09) | 19h00 | **20h00** |
> | Jason Feifer (16/09) | 17h00 | **18h00** |
> | Justin Welsh (17/09) | 13h00 | **14h00** |
>
> Meme regle documentee dans le CLAUDE.md racine du depot -- incident reel trouve le 15/09/2026 :
> une verification faite a 19h15 Madagascar (= 18h15 Paris, 45 min AVANT l'heure programmee de
> Codie Sanchez) avait conclu a tort que le post etait "bloque", alors qu'il etait simplement pas
> encore a son heure.

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

**Regle de publication -- trois maximum, jamais deux le meme jour** : verifiee par
`validerQuotaHebdomadaire` (voir "Methode de publication" plus bas, corrige le 15/09/2026) des
qu'un post est reellement enregistre dans `data/registre-veille.json` apres programmation --
espacer les 3 nouveaux posts sur au moins 3 jours differents si le GO de Julien les valide tous,
et appeler `enregistrerPostPublie` juste apres chaque programmation confirmee pour que le controle
protege les lancements suivants.

## Les trois posts adaptes le 15/09/2026

| # | Fichier | Compte | Post source (auteur, score) | Angle conserve | Chiffre francais verifie |
| --- | --- | --- | --- | --- | --- |
| 1 | `julien-partners-2026-09-15-v1.commentary.txt` | julien-partners | [Justin Welsh](https://www.linkedin.com/posts/justinwelsh_one-of-the-best-business-hacks-is-being-your-activity-7504143803625218049-bQCf) (score 0,016439, le plus eleve des 15) | Croire en soi assez longtemps pour que la competence suive, avant que les resultats ne parlent | 28% des micro-entrepreneurs francais encore actifs 5 ans apres (Insee Premiere n°2069, 2025 -- page ouverte et lue) |
| 2 | `julien-agency-2026-09-15-v1.commentary.txt` | julien-agency | [Jason Feifer](https://www.linkedin.com/posts/jasonfeifer_this-ad-could-have-pissed-everyone-off-activity-7503453455580057601-S0Q6) (score 0,012546) | Retourner un defaut assume en argument de vente plutot que de le cacher | Campagne "fruits et legumes moches" d'Intermarche : -30%, Grand Prix Strategies de la publicite 2014 (page Strategies ouverte et lue) |
| 3 | `julien-agency-2026-09-15-v2.commentary.txt` | julien-agency | [Codie A. Sanchez](https://www.linkedin.com/posts/codiesanchez_business-scaling-isnt-rocket-science-but-activity-7503799578358525952-6opW) (score 0,006832) | Le cout reel d'un recrutement se mesure des mois apres, pas a la signature | 60% des dirigeants de PME/TPE francaises ayant cherche a recruter confrontes a des difficultes (Bpifrance Le Lab/Rexecode, T3 2025 -- chiffre rafraichi le 15/09, page ouverte et lue) |

Chaque post source est note ici et reste verifiable via son lien -- **jamais republie a
l'identique**, chaque texte est une redaction originale qui reprend la structure/l'angle du post
source avec un exemple et une source francaise reels, conformement a la consigne "adapter, pas
traduire".

## Relu par Julien, corrige, programme reellement -- 15/09/2026 (soir)

Les 3 textes ont ete relus integralement par Julien (colles un par message pour eviter la
troncature rencontree plus tot), corriges (chiffre Codie Sanchez rafraichi a une edition plus
recente de la meme enquete, deux reformulations, traits d'union et accents verifies avec la
meme rigueur sur les 3), puis repasses reellement par les garde-fous d'ecriture -- **3/3
ACCEPTE**. GO donne pour programmer.

**Programmes reellement via Buffer** (compte `contact@claudeagency.fr`, deux profils LinkedIn
connectes -- voir `references/actions-composio.md`), un par jour distinct :

| # | Compte | Date programmee | Heure (Europe/Paris) |
| --- | --- | --- | --- |
| Codie A. Sanchez | julien-agency | aujourd'hui 15/09/2026 | **19h00** (deplace, voir ci-dessous) |
| Jason Feifer | julien-agency | demain 16/09/2026 | 17h00 |
| Justin Welsh | julien-partners | apres-demain 17/09/2026 | 13h00 |

**Heures corrigees le 15/09/2026** : les deux premieres (Codie Sanchez, Jason Feifer) avaient ete
notees a partir d'une vue du tableau de bord Buffer reglee sur le fuseau Minsk (GMT+3) au lieu de
Paris (GMT+2) -- corrige ici a l'heure reelle en fuseau Paris, verifiee dans l'editeur du post
(pas dans la vue liste). La programmation elle-meme n'a pas ete touchee : la regle du brief qui
compte ("jamais deux posts le meme jour") reste respectee dans les deux cas. Le troisieme
(Justin Welsh) affichait deja la bonne heure en vue Paris, non decale.

**Codie Sanchez avancee a 19h00 (15/09/2026, plus tard dans la journee)** : sur demande explicite,
pour un meilleur creneau. Changement fait directement dans Buffer (uniquement l'heure -- texte,
compte et date inchanges), puis **verifie a l'ecran apres coup** plutot que suppose : l'editeur du
post affiche explicitement "7:00 PM" en regard du libelle **Europe/Paris**, et la grille du
calendrier (fuseau "Paris" selectionne en haut a droite, meme reglage que pour la correction
Minsk/Paris ci-dessus) montre desormais la carte du post a la ligne 7 PM du mardi 15 -- aucun
decalage constate cette fois, contrairement au 15/09 apres-midi. Jason Feifer (17h00, 16/09) et
Justin Welsh (13h00, 17/09) verifies inchanges sur la meme capture -- ni leur heure, ni leur
compte, ni leur texte n'ont ete touches.

**Pas encore confirmes en ligne** au moment de cette mise a jour -- Notion reflete l'etat reel
("Programme", pas "Publie"). A confirmer et passer a "Publie" avec le lien reel une fois chaque
post effectivement paru (verification a demander explicitement le jour dit, jamais supposer
qu'une programmation a fonctionne sans la verifier -- meme discipline que le reste de ce
chantier).

## Controle premature -- fausse alerte, decalage horaire Madagascar/Paris non applique (15/09/2026, ~19h15 Madagascar)

**Corrige le 15/09/2026 : le paragraphe precedent affirmait a tort que le post etait "bloque en
file d'attente ... sans cause identifiee".** C'etait faux -- la verification a simplement ete
faite une heure trop tot. Nomena est a Madagascar (UTC+3, toute l'annee, pas de changement
d'heure) ; Paris est a UTC+2 en septembre (heure d'ete). **Quand il est 19h15 a Madagascar, il
est 18h15 a Paris.** Le post est programme a 19h00 **heure de Paris**, donc 20h00 heure de
Madagascar -- la verification faite a 19h15 Madagascar (18h15 Paris) tombait 45 minutes AVANT
l'heure reelle de publication, pas apres. Le post etait normalement encore dans la file
d'attente : ce n'etait pas une panne, juste une horloge mal convertie. Voir le decalage horaire
complet, avec les 3 horaires convertis, dans le CLAUDE.md racine du depot et en tete de ce
fichier -- **toujours convertir Paris -> Madagascar (+1h en septembre) avant de conclure qu'un
post programme "aurait du" etre en ligne.**

Verification refaite apres 20h00 Madagascar (heure reelle de publication) : voir plus bas des
qu'elle est disponible. **Aucune republication tentee entre-temps** (ni bouton "Publish Now"
cliqué, ni nouveau post cree) -- geste public, jamais sans feu vert explicite de Julien, et
c'est precisement la programmation elle-meme qu'on veut laisser faire son travail. Notion et le
registre de quota (`data/registre-veille.json`, `enregistrerPostPublie`) **restent inchanges** :
aucune publication reelle a enregistrer tant que rien n'est confirme en ligne. Reverification
prevue quelques minutes apres 20h00 Madagascar -- laisser une marge courte plutot que verifier
pile a l'heure.

## L'ancien exemple du 12/09/2026 -- toujours a part

`julien-agency-2026-09-12.commentary.txt` : premier exemple technique du pipeline, redige avant
que `comptes_a_surveiller` ne soit rempli -- reagit a un post de Julien Rayes lui-meme (= julien
agency), pas a un veritable tiers. Reste documente ici pour memoire, mais **les 3 posts ci-dessus
sont les premiers exemples reels sur un veritable compte tiers.**

## Methode de publication -- desormais Buffer, pas `publierPost`

`publierPost`/Composio reste la methode pour un post texte simple si Buffer n'est pas
disponible, mais le GO du 15/09 a ete execute via Buffer (programmation a l'avance, respect
natif du quota hebdomadaire par canal) -- voir la table ci-dessus et
`references/actions-composio.md` pour le detail. `publierPost` reste documentee pour memoire :

```js
const { publierPost } = require('../lib/publier');
const fs = require('fs');

await publierPost({
  authorUrn: '<selon le compte -- voir reglages-comptes.json>',
  commentary: fs.readFileSync('a-publier/<fichier>.commentary.txt', 'utf8').trim(),
});
```

Respecter la regle "trois maximum, jamais deux le meme jour" quelle que soit la methode utilisee
-- **desormais verifiee par du code, pas seulement une consigne a suivre** (corrige le
15/09/2026) : `lib/planifier-veille.js` (`validerQuotaHebdomadaire`) refuse explicitement si un
registre reel (`data/registre-veille.json`, `lib/registre.js`) montre le quota deja atteint ou le
jour deja pris. `dry-run.js` applique ce controle avant de retenir un candidat. **Ce registre ne
se remplit pas tout seul** : une fois un post reellement programme (Buffer) ou publie
(`publierPost`), enregistrer l'evenement explicitement --

```js
const { enregistrerPostPublie } = require('../lib/registre');
enregistrerPostPublie('julien-agency', { date: '2026-09-16', postId: '<identifiant reel>', auteurOriginal: 'Jason Feifer' });
```

Ne jamais appeler `enregistrerPostPublie` par anticipation -- comme pour
`linkedin-commentaires/lib/registre.js`, le registre doit refleter des programmations/publications
reelles confirmees, pas des intentions.
