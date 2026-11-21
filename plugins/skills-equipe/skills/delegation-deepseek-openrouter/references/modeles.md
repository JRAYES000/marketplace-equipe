# Modèles DeepSeek sur OpenRouter

## Relevé du 21/11/2026 (OpenRouter : get-model et list-model-endpoints)

| | Flash `deepseek/deepseek-v4-flash-0731` | Pro `deepseek/deepseek-v4-pro-0813` |
|---|---|---|
| Prix affiché (entrée / sortie, $ par million) | 0,0443 / 0,30 | DeepSeek natif : 0,66 / 1,98 hors pointe ; 1,32 / 3,96 en semaine de 1 h à 4 h et de 6 h à 10 h UTC |
| Autres fournisseurs Pro | — | de 0,10 / 8 (Relace, fp4) à 1,98 / 5,94 ; la plupart 1,32 / 3,96 |
| Raisonnement par défaut | activé, effort « high » (à couper) | à garder |

Pro natif hors pointe / Flash : environ 15× en entrée, 7× en sortie. Les endpoints `fp4` / `mxfp4`
moins chers sont quantifiés (qualité dégradée) : à éviter, comme le suffixe `:floor`.

## Relevé précédent (conservé, non recontrôlé)

| | Flash (défaut) | Pro (exception) |
|---|---|---|
| slug | `deepseek/deepseek-v4-flash-0731` | `deepseek/deepseek-v4-pro-0813` |
| entrée / sortie par million | 0,04 $ / 0,08 $ | 0,58 $ / 1,74 $ chez DeepSeek, jusqu'à 1,32 $ / 3,96 $ ailleurs |
| intelligence / code / agentique | 51,8 / 69,1 / 48,4 | 53,2 / **68,8** / 49,6 |
| raisonnement | à couper | à garder, c'est ce qu'on paie |

Tarifs relevés dans le catalogue OpenRouter le 13/09/2026 ; indices Artificial
Analysis relevés le 23/08/2026, non recontrôlés depuis.
**Pro coûte 14 à 22× Flash, dans le meilleur des cas, pour +1,4 point
d'intelligence et un score de code légèrement inférieur.** Il ne se justifie
donc pas par « la tâche est un peu plus dure » : sur presque tout ce qui est
déléguable, Flash fait aussi bien.

Ne pas confondre avec `deepseek/deepseek-v4-pro` tout court, le snapshot 0423
(45,3 / 59,4 / 37,8) : celui-là est dépassé par Flash sur les trois indices,
ne jamais le choisir. L'alias `~deepseek/deepseek-v4-flash-latest`, affiché
moins cher, pointe aujourd'hui vers le même 0731 mais suivra le prochain
modèle de la famille sans prévenir. `deepseek/deepseek-v4.1-flash`, apparu au
catalogue le 10/09/2026, coûte 0,15 $ / 0,60 $ — presque quatre fois Flash 0731 :
ce n'est pas un remplaçant du défaut, seulement une option si la qualité de 0731
ne suffit pas sur un lot donné.

**Les slugs sont datés et périmeront.** Avant une série d'appels, passer par
`list-models` (attention, ce n'est pas `models-list`) : contrôler que le
modèle est toujours servi et qu'aucun successeur moins cher n'est sorti. Un
identifiant versionné écrit en dur dans une skill est une date de péremption.
