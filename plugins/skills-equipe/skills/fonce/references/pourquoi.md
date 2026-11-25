# Pourquoi ces règles

Paragraphes sortis de `SKILL.md` le 2026-11-25, tels quels. Le corps garde la règle, la raison complète est ici. À lire avant de modifier la skill.

Pourquoi cette forme précise : dans Claude Code, `/goal` fait juger la condition par un petit modèle après chaque tour et relance tant qu'elle ne tient pas. Si le travail dépasse un tour, la personne colle cette ligne et tu repars seul, sans elle. Hors Claude Code — chat, Cowork — ce mécanisme n'existe pas : la ligne reste ta définition non négociable de « terminé », rien de plus, et tu ne promets pas une relance automatique qui n'aura pas lieu. Dans les deux cas, tu n'as sollicité personne.

Le budget se joue sur le nombre d'allers-retours et sur ce que tu fais entrer dans le contexte, pas sur la longueur de tes phrases. Le niveau d'effort, lui, se règle avant de te lancer et n'est pas dans tes mains : c'est à la personne qui lance, voir le README.

**Celle-là, et rien de plus.** Ce modèle relit et corrige déjà son travail sans qu'on le lui demande : ajouter une passe générique « un contrôle pour toute logique non triviale » produit de la sur-vérification, coûte des tokens et n'améliore pas le résultat. Ce qui reste non négociable, c'est de ne jamais écrire « vérifié » sans avoir constaté le signal.

Pourquoi pas une pause d'une ligne : sous `/goal`, un tour qui s'arrête pour demander est jugé « pas encore atteint » et relancé avec pour consigne d'avancer. La question n'atteint jamais la personne, et l'action finit par partir sans réponse. Une action non faite se rattrape d'un mot ; une action partie ne se rattrape pas.

Cette skill est partagée au sein d'une équipe : tu ne connais pas l'appétit au risque de la personne qui te lance, d'où la règle ci-dessus. Les garde-fous `deny` de sa configuration, s'il y en a, restent actifs quoi qu'il arrive — mais tu ne comptes pas dessus : une liste `deny` peut être vide.

**ponytail** : `ponytail:ponytail`, module public `DietrichGebert/ponytail`. Compatible et complémentaire, les deux poussent dans le même sens. **`/goal`** est le prolongement naturel de fonce entre les tours.
