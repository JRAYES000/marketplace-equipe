---
name: linkedin-mise-en-forme
description: >
  Règles de forme et contrôle par script de tout post LinkedIn de Julien (Claude Agency, Claude
  Partners) : règles du 14/10, accroche, gras, blocs, variété, lisibilité. Chargée par les autres
  skills linkedin-* ou sur « écris un post LinkedIn », « relis ce post », « mets ça en forme pour
  LinkedIn ». Pas pour un commentaire ni un carrousel. Activation manuelle : sur demande explicite
  uniquement.
---

# LinkedIn — mise en forme

Sommaire : 0. Règles de Julien du 14/10 · Ordre de travail · 1. Accroche · 2. Gras · 3. Blocs ·
4. Emojis · 5. Lecture à 13 ans · 6. Arbitrage anti-IA · 7. Tournures interdites et variété ·
Contrôle par script · Pièges · Ce que la skill ne fait pas.

Ces règles valent pour les deux comptes, Claude Agency et Claude Partners, au même niveau. Elles
sont la source de vérité de la forme pour toutes les skills linkedin-* (gras, formulations
interdites, accents, anglicismes). Historique des décisions : [references/historique.md](references/historique.md).

## 0. Les 6 règles de Julien du 14/10/2026 — elles priment sur tout le reste

Une règle plus ancienne, d'une autre skill ou d'un calendrier, qui les contredit ne s'applique plus.

1. **Deux posts par jour et par compte, au maximum** (annonces de mission et posts de Julien compris).
2. **Chaque post part d'un fait réel** : une mission, un chiffre, un cas client non nommé. Aucun
   exemple inventé, jamais la mention « exemple inventé pour l'illustration ». Pas de fait réel :
   on ne publie pas, on le demande à Julien.
3. **On casse le moule** : pas de « Ma position » ni de « Je prends position » systématique, pas de
   question finale automatique, des longueurs, formes et accroches variées.
4. **Un sujet ne revient pas sur le même compte avant 30 jours**, et jamais le même jour sur les deux
   comptes. Le sujet s'inscrit dans le registre `linkedin/sujets.csv` des livrables avant la
   programmation (libellé court, réutilisé tel quel s'il existe déjà).
5. **Le lien va en premier commentaire, jamais dans le post.** On peut écrire « le lien est en
   commentaire ». Aucune précaution du type « ce texte ne donne pas un avis juridique » ou « cette
   liste ne remplace pas un audit ».
6. **Le client visé s'arrêterait-il de faire défiler pour lire ?** Sans oui franc, on ne publie pas.
   Aucun code ne le juge : écrire la réponse, en une phrase, à côté du brouillon.

### Contrôle avant programmation (règles 1, 2, 4, 5 et formules de la 3)

Obligatoire avant de programmer, sortie brute montrée avec le brouillon :

```bash
node "<dossier de la skill>/scripts/controle-avant-publication.mjs" --brouillon "$LIVRABLES_LINKEDIN_DIR/2026-11-03/a50.final.txt" --date 2026-11-03 --heure 13:00 --sujet "libellé du sujet" --maintenant <UTC d'une source fiable>
```

Il lit la file de publication relevée (`file-attente-buffer.txt` ; Buffer est résilié depuis le 21/11/2026, à faire : relevé par le workflow n8n LinkedIn), retrouve le texte complet de chaque
post dans les `.final.txt` (y compris `linkedin/posts-nouveaux/`), et refuse (code 1, une ligne
`ALERTE regle N` par constat, avec la phrase en cause) :

- un jour à 3 posts sur un compte ;
- « inventé » ou un cas ouvert par « Exemple : », « Ma position », un lien ou une précaution dans
  le corps ;
- un sujet traité sur le compte depuis moins de 30 jours, ou le même jour sur l'autre compte ;
- un brouillon sans sujet étiqueté ;
- une formule de fin répétée (`regle fin`) : même ouverture (3 premiers mots) du dernier
  paragraphe ou de la dernière phrase qu'un des 9 posts voisins, publiés ou programmés, deux
  comptes confondus. Les lignes `Source :`, de hashtags ou réduites à un lien ne comptent pas ;
  un post dont seul le début est connu n'est pas contrôlé ; les annonces de mission
  (`fichier;sujet;type=annonce-mission` dans `sujets.csv`) sont exclues.

Sans `--brouillon`, il contrôle toute la file. Cœur : `scripts/regles-julien.mjs` (fonctions
pures, `test/regles-julien.test.mjs`). Un sujet ne se reconnaît pas par code : sans étiquette, le
script signale seulement un sujet « probablement répété, à confirmer ». L'étiquette du registre
fait foi.

## Ordre de travail

1. Si `contenu-linkedin` est disponible (dépôt `visibilite-ops`), la charger pour le fond ; sinon
   rédiger le fond à la main.
2. Rédiger le fond, puis appliquer les règles 1 à 7.
3. Passe `humanizer` (la skill).
4. `verif-post.mjs verif` sur le brouillon (voir « Contrôle par script »).
5. Avant de programmer : inscrire le sujet dans `linkedin/sujets.csv`, passer
   `controle-avant-publication.mjs` et écrire la réponse à la question de la règle 0.6.

## 1. L'accroche : libre, mais elle fait cliquer

Question, prise de position, chiffre ou situation concrète : les deux premières lignes doivent
donner envie de cliquer sur « … plus ». C'est le temps de lecture qui décide de la distribution.

    "Un recrutement lent coûte plus cher qu'une mauvaise embauche."     ->  prise de position
    "Lundi, un candidat a relancé mon équipe pour la quatrième fois."  ->  situation concrète

- **140 caractères au maximum** (seuil du « voir plus » sur mobile), comptés en points de code.
- **L'accroche n'énonce pas la réponse** : le hook ouvre, le corps referme.
- Trois mots au moins (le script n'attrape que l'accroche dégénérée).
- **Jamais toute l'accroche en gras** : le gras de la ligne 1 se pose sur le chiffre ou le TJM.

### Ce qui marche (mesure Buffer du 18/10/2026, Claude Partners, 62 posts)

Corrélations sur de petits groupes, pas des preuves ; refaire la mesure avant de citer ces chiffres.

| Accroche (ligne 1) | n | Impressions (médiane) |
|---|---|---|
| `💼 Mission freelance IA : intitulé, durée, lieu.` + **TJM en gras** | 9 | **2 926** |
| Annonce qui ouvre sur « 450 € HT par jour pour… », TJM pas en gras | 3 | 1 477 |
| Interpelle le lecteur par son métier (« Développeur, vous… ») | 2 | 1 130 |
| Autre question concrète (tarif, mission, paiement) | 16 | 338 |
| Question entièrement en gras | 13 | 391 |
| « Et si… ? » | 4 | **170** |
| Ouvre sur « Exemple : » ou un cas inventé | 4 | 169 |

À faire : un chiffre concret en ligne 1, en gras (TJM, durée, nombre) ; nommer le lecteur (son
métier, sa situation) ; une prise de position nette plutôt qu'une question ouverte.
À éviter : « Et si… ? » et les questions abstraites sur l'IA ; une accroche entièrement en gras.

## 2. Gras : 1 à 4 passages, sans accent

LinkedIn n'a pas d'éditeur riche : le gras se fabrique en Unicode **Mathematical Sans-Serif Bold**.
Ce bloc n'a aucune lettre accentuée : un segment accentué rend `𝗺𝗲𝘀𝘂𝗿é`, l'accent retombe en
maigre au milieu du mot. Ne mettre en gras que des segments sans accent ; sinon reformuler.

    "La vérité mesurée"  ->  reformuler en  "Trois mois pour rien"

**1 à 4 passages par post.** Un post sans gras se lit mal dans le fil : en mettre au moins un.
Dans l'ordre : le chiffre qui frappe (dans une annonce, le TJM de la ligne 1 est toujours en
gras), la phrase qui porte la leçon (une seule), un ou deux titres de bloc (ils comptent dans les 4).
Pas en gras : un paragraphe entier, toute l'accroche, des mots isolés sans rapport.

Toujours par le script, jamais à la main :

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" gras "Trois mois pour rien"
```

Il refuse tout segment accentué, avec le caractère fautif. La fonction `enGras()` de
`scripts/lib.mjs` est la référence ; `linkedin-carrousel/generer-post.js` produit la même police.

## 3. Un à quatre blocs, avec ou sans titre

Un post compte 1 à 4 blocs (groupes de paragraphes), chacun avec ou sans titre.

- Un titre est court, sur sa propre ligne, en gras sans accent (compté dans les 4) ou en texte simple.
- Aucun titre ni emoji n'est imposé ; un post d'un seul bloc sans titre est valide.
- L'accroche vit au-dessus du premier bloc ; le pied commercial sous le dernier, sans titre.
- La fin est libre (question, prise de position, phrase sèche) ; « Et vous ? » ne se met pas par réflexe.
- Le script ne voit que les titres en gras ; le reste se juge à l'œil.

## 4. Emojis : facultatifs, 6 au maximum, en tête de ligne

S'il y en a, ils remplacent les tirets de liste ou marquent un titre, en début de ligne, jamais au
milieu d'une phrase. Au-delà de 6, le post passe pour un gabarit.

## 5. Niveau de lecture : 13 ans

L'audience compte beaucoup de jeunes adultes qui veulent se lancer dans l'IA.

- Phrases de 20 mots au plus, 12 en moyenne ; une idée par phrase.
- Paragraphes de 1 à 3 lignes, séparés par une ligne vide.
- Aucun terme technique sans son explication en trois mots (« une suite d'étapes automatiques »).
- Voix active, verbes concrets ; chiffres parlants (« 4 fois plus » plutôt que « +300 % »).
- Deux virgules dans la phrase : la couper en deux.

Humanizer chasse les tics d'IA, cette règle chasse la complexité : les deux passent.

## 6. Arbitrage — l'anti-IA prime

Si le brouillon sonne artificiel après la passe humanizer, retirer de la mise en forme, dans cet
ordre : un emoji, puis un passage en gras, rien d'autre. Un chiffre sourcé, une entité nommée ou
un détail concret ne se coupent jamais : si simplicité et précision se heurtent, réécrire la phrase.

## 7. Tournures interdites et règle de variété

En plus de la banque commune (critère 7 ci-dessous) : « Notre lecture : », « Testons-la. »,
« Suivons son regard. », refusées en clair comme en gras Unicode.

**Variété** : le script compare le brouillon aux 5 derniers posts du même compte et refuse, en
nommant le post en cause :

- le même schéma (type d'accroche, nombre de blocs, type de fin) ;
- les trois premiers mots de l'accroche identiques ;
- la même dernière ligne, mot pour mot (accents et ponctuation ignorés ; lien et `Source` exclus) ;
- une même phrase en gras (deux mots au moins) ;
- un troisième post de suite fini par une question ;
- la même tranche de longueur (court < 700, moyen 700-1 500, long > 1 500 caractères) que les
  3 derniers posts.

Types d'accroche calculés (premier qui convient) : question (finit par « ? »), citation (ouvre sur
un guillemet), échéance (date + mot d'échéance), chiffre (chiffre ou quantité en lettres : « la
moitié », « un sur trois »), annonce (« a sorti », « lance une »), affirmation. Fin : question,
chiffre ou affirmation. Pour passer : changer le début d'accroche, la dernière phrase ou la phrase
en gras, ou varier le schéma.

**Posts précédents** (`scripts/precedent.mjs`) : compte déduit du nom (`a<N>.final.txt` =
julien-agency, `p<N>.final.txt` = julien-partners, `AAAA-MM-JJ-agency-….final.txt`), sinon
`--compte`. Le script prend les 5 derniers `.final.txt` du compte dans le dossier des livrables
(strictement avant le brouillon s'il y est). Sans post trouvé : un avertissement, la variété n'est
pas mesurée, le script n'échoue pas.

## Contrôle par script

```bash
node "<dossier de la skill>/scripts/verif-post.mjs" verif "$LIVRABLES_LINKEDIN_DIR/2026-10-01/a8.final.txt"
```

Options : `--precedent <fichier>` (prioritaire), `--compte <compte>`, `--dossier <dossier>` (sinon
`LIVRABLES_LINKEDIN_DIR`, sinon `~/OneDrive/Documents/GitHub/livrables-Claude-Agency/linkedin`),
`--sans-precedent`, `--noms-propres <fichier>`, `--offre <url>`. Le brouillon s'accepte en markdown
`**gras**` ou déjà converti en Unicode : mêmes mesures. Code 1 si un critère échoue. Montrer la
sortie brute avec le brouillon ; ne jamais écrire « contrôles passés » sans elle.

Critères mesurés (seul le niveau de lecture se relit) :

1. Accroche de 140 caractères au plus.
2. 4 passages en gras au plus, jamais toute la ligne 1, aucun accent ni mot qui en exige un
   (dictionnaire français).
3. 4 titres de bloc en gras au plus.
4. 6 emojis au plus, tous en tête de ligne.
5. Aucune phrase de plus de 20 mots.
6. Longueur jusqu'à 3 000 caractères (3 001 refusé).
7. Aucune formulation interdite : demande d'engagement (« commentez OUI », « partagez si… », même
   espacée), exclamations en rafale, tiret long, « ce n'est pas X, c'est Y », « ravi de vous
   annoncer », « taguez quelqu'un », critique de LinkedIn, mot en MAJUSCULES.
8. Accroche non dégénérée (3 mots au moins). La force du hook reste un jugement.
9. Gras dans la bonne police : Sans-Serif Bold. Un gras à empattement (Mathematical Bold) est
   compté mais signalé comme fautif, avec le segment.
10. Aucun chiffre sans source : `(source : …)` dans les 80 caractères avant ou 60 après, sources
    vagues refusées. Un détail d'anecdote est dispensé si une ligne finale `Source : …` le couvre.
    Les noms propres de `linkedin/noms-propres-autorises.txt` (« OPCO 2i ») sont exemptés.
    Exception « offre » : avec `--offre <url>` et la ligne exacte `Page d'offre : <url>` dans le
    `.md` voisin, pour une page de `https://claudeagency.fr/`, les chiffres de la page sont admis
    sans source ; sinon refus.
11. Aucun anglicisme (« process » → « processus »), liste partagée avec
    `../../lib/valider-anglicismes.js` (partagé) : ajouter un mot là-bas vaut pour les deux.
12. Règles de Julien du 14/10 sur le texte seul (règles 2, 3 pour les formules, 5).
13. Variété sur les 5 derniers posts (si des posts précédents sont trouvés).

## Pièges

- Sous Windows, passer à node un chemin `C:/…`, pas `/c/Users/…`.
- Une lettre en gras Unicode occupe deux unités UTF-16 : tout se compte en points de code.
- L'apostrophe dans un run gras est de la ponctuation, pas un accent.
- Un gras dans une troisième police Unicode (Double-Struck, Fraktur…) n'est ni compté ni signalé :
  à traiter seulement si un post réel l'utilise.
- Une accroche dans une autre langue passe : le contrôle est mécanique, sans restriction de langue.
- `linkedin-veille-virale` appelle ces critères par son pont `lib/valider-mise-en-forme.js`.

## Ce que cette skill ne fait pas

Elle ne publie pas. Dans `visibilite-ops`, le brouillon va dans `sortants/linkedin/` : le clic
« Valider » de Julien le publie, et un `publier_le:` le fait partir à sa date. Ailleurs, il va dans
`docs/prive/sortants/` et attend sa validation.
