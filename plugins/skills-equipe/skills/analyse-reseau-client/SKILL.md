---
name: analyse-reseau-client
description: >-
  Analyse le compte Instagram ou la chaîne YouTube d'un client de Claude Agency
  et en fait un onglet de son espace client : un fichier .md rangé dans le
  dépôt des livrables, hors challenge-N, affiché tel quel au client. Chiffres
  relevés et datés, publications gagnantes et perdantes, stories ou Shorts,
  couvertures, légendes et commentaires, outils conseillés avec prix vérifiés,
  comptes de référence mesurés, plan d'action daté, mode d'emploi pour
  l'assistant du client, note d'équipe. Activation MANUELLE uniquement :
  seulement sur demande explicite (ex. « analyse le compte Instagram du client
  X », « fais l'onglet YouTube de Y », « mets à jour l'analyse Instagram de Z
  »). Ne se déclenche jamais d'elle-même sur une conversation qui parle
  seulement d'Instagram ou de YouTube. NE PAS utiliser pour les comptes de
  l'agence elle-même, pour publier, commenter ou écrire à quelqu'un sur un
  réseau, ni pour X, TikTok ou LinkedIn : la méthode n'y a pas encore été
  éprouvée.
---

# Analyse d'un réseau social client → onglet de l'espace client

Tu produis **un seul fichier** : `<dossier-client>/<RESEAU>/analyse-<reseau>.md`, par exemple
`INSTAGRAM/analyse-instagram.md`. Dès qu'il est poussé sur GitHub, le site client l'affiche
tel quel dans un onglet à lui. **Ce fichier est la page du client** : pas de brouillon, rien
d'interne. Tout ce qui est interne va dans le `CLAUDE.md` du dossier client, zone
« Notes de l'équipe ».

La méthode vient de deux onglets réels, faits en septembre 2026 pour un même client :
YouTube puis Instagram. Pour voir le niveau attendu, ouvre les onglets déjà publiés dans le
dépôt des livrables (cherche `*/YOUTUBE/analyse-youtube.md` et
`*/INSTAGRAM/analyse-instagram.md`).

## Ce que le site client fait de ton fichier

Règles lues dans le code du site client (`rapport-claude-functions/clients.ts`, 24/09/2026) :

- un `.md` rangé dans un **sous-dossier** du dossier client, **hors `challenge-N`**, devient
  un onglet ; un `.md` posé à la racine du dossier client n'en devient pas un ;
- le nom de l'onglet est le **premier titre `#`, coupé au tiret long « — »**, puis à 60
  caractères : `# Votre compte Instagram — analyse et recommandations` donne l'onglet
  « Votre compte Instagram » ;
- **5 onglets au maximum** par client, 200 000 caractères au maximum par onglet ;
- tout **autre** fichier rangé hors `challenge-N` apparaît aussi chez le client, en
  téléchargement. Relevés bruts, captures et scripts restent donc **hors du dépôt**.

Avant la collecte, lis `references/pieges.md` : ce sont les erreurs déjà faites, avec leur
parade.

## Étape 1 — Ancrer

1. Mets le dépôt des livrables à jour (`git fetch`, `git pull`). Si le `pull` est bloqué par
   le travail en cours de quelqu'un d'autre, ne touche à rien : l'étape 8 dit comment
   publier quand même.
2. Lis le `CLAUDE.md` du client, surtout les **Notes de l'équipe** : accès disponibles,
   décisions sur le ton, consignes par réseau, et **ce que le client a demandé de ne pas
   citer**. Puis `fiche-client.md`.
3. Compte les onglets déjà publiés (`node scripts/verifier-onglet.mjs` le fait, option
   `--dossier-client`). S'il y en a déjà 5, arrête-toi et dis-le : un 6e ne s'afficherait pas.
4. Si un onglet existe pour un autre réseau, relis-le. Même structure, même ton, et pas de
   recommandation qui le contredise sans le dire.
5. Fais la liste de ce que tu peux lire : statistiques du propriétaire (Drive, YouTube
   Studio en lecteur, captures), un compte connecté au réseau, un outil de collecte et son
   jeton. Ce qui manque devient « à relever », jamais une supposition.

## Étape 2 — Faire trancher ce qui n'est pas à toi

Pose en une seule fois les questions que le dossier ne tranche pas. Les cas déjà rencontrés :

- **une idée de la demande que les chiffres du client contredisent.** Exemple vécu :
  « il faut multiplier les stories pour grandir », alors que 86 % des vues venaient déjà des
  abonnés et que les stories ne se montrent qu'à eux. Quelle ligne écrit-on au client ?
- **les données manquantes** (stats story par story, publications invisibles sans compte) :
  publier avec « à relever », ou attendre le client ;
- **à qui parle le plan d'action** : au client seul, ou aussi à son assistant (annexe
  « mode d'emploi ») ;
- **ce que « automatiser » veut dire** quand la demande reste floue : premier commentaire
  programmé, mot-clé qui déclenche un message privé, boîte de réception unique, ou réponses
  publiques automatiques (déconseillées : le ton sonne faux).

Une position fausse publiée chez le client coûte plus cher qu'une question.

## Étape 3 — Relever les chiffres

Lis la fiche du réseau : `references/instagram.md` ou `references/youtube.md`.

Règles communes aux deux :

- **Chaque chiffre a une date et un statut.** La date de relevé figure en tête de page ;
  « *(estimé)* » marque un calcul d'ordre de grandeur ; « non relevé » marque un trou. Jamais
  un chiffre de mémoire, jamais un chiffre deviné pour remplir une case.
- **Lis lentement.** Un compte connecté qui enchaîne les requêtes se fait bloquer, et c'est
  le compte de quelqu'un : une page toutes les 1,5 à 2 secondes, arrêt au premier refus.
- **Tiens un relevé brut** hors du dépôt : une ligne par publication, avec date, légende,
  vues, likes, commentaires, et ce que tu sais en plus. C'est lui qui sert à relire chaque
  chiffre à l'étape 7.
- **Vérifie en direct où mènent les liens** de la bio et des descriptions (`curl` sans
  `-L`, pour voir les redirections), et l'ordre des boutons de la page d'arrivée. Un lien
  cassé est souvent la vraie fuite de clients.

## Étape 4 — Chercher, en parallèle et avec un plafond

Trois recherches indépendantes, confiées à des sous-agents si tu en as :

1. **Outils** : publication sur plusieurs réseaux, couvertures ou miniatures,
   automatisation des commentaires conforme aux règles de la plateforme. Prix du jour, lus
   sur la page officielle.
2. **Règles et bonnes pratiques** : sources officielles d'abord (la plateforme, son
   patron, ses règles de la communauté), puis études avec taille d'échantillon. Ajoute les
   **règles du secteur du client** : par exemple, pour les jeux d'argent, la limite d'âge de
   Meta, la liste des opérateurs agréés par l'ANJ, la loi n° 2010-476.
3. **Comptes de référence** : 10 à 25 comptes du même métier, qui ont réussi, mesurés à la
   date du jour. Ce qui marche chez eux, et ce qui se transpose au client.

**Plafonne.** Le budget de recherches web d'une session est commun à tous les sous-agents :
trois d'entre eux l'ont épuisé en une seule analyse. Donne à chacun un maximum (une
quarantaine de recherches) et exige une URL et une date pour chaque fait.

**Relis toi-même ce qui porte une recommandation** : le prix d'un outil que tu conseilles,
une règle que tu cites au client, un texte de loi. Un sous-agent peut lire une page de
travers, et certaines pages bloquent les robots de lecture : ouvre-les dans un navigateur.

## Étape 5 — Analyser

- **Gagnants et perdants** : les 5 publications les plus vues, les 5 moins vues, puis ce
  qu'elles ont en commun (sujet, première ligne, couverture, format, date). Un écart qui
  repose sur un seul cas s'écrit « une piste, pas une preuve ».
- **Le rythme** : un tableau par période (nombre de publications, vues médianes, likes
  moyens). Les deux premiers onglets ont montré le même schéma : le compte vit quand le
  client publie chaque jour, et s'éteint quand il s'arrête.
- **Les repères** : situe le compte par rapport aux études, en disant que leurs méthodes
  diffèrent et que l'ordre de grandeur suffit.
- **Le chemin vers l'offre** : profil, lien, page de vente. Où le visiteur se perd-il ?
- **Les commentaires** : lis 3 ou 4 fils en entier, réponses dépliées. Un joueur, un
  client, un pro qui pose une vraie question reçoit-il une vraie réponse ?
- **Les risques** : règles de la plateforme (limite d'âge, éligibilité aux
  recommandations) et du secteur. **Cite le texte, ne tranche pas en juriste** : « nous ne
  sommes pas juristes, un avocat peut trancher ».

## Étape 6 — Rédiger l'onglet

Pars de `references/gabarit-onglet.md`. En écrivant :

- tu parles au client : « vous », phrases courtes, un mot technique expliqué au passage.
  Franc sur ce qui fâche si l'équipe l'a décidé (c'est écrit dans son `CLAUDE.md`) ;
- ses propres mots servent : une légende, une phrase de sa vidéo, citées courtement ;
- **jamais** le pseudo d'un commentateur, le nom des outils internes (outil de collecte,
  navigateur piloté, sous-agents), un coût de collecte, une note d'équipe, ni ce que le
  client a demandé de taire ;
- chaque recommandation dit quoi faire et avant quand. Si une échéance existe (lancement,
  sortie d'une vidéo), une section « À faire avant le JJ/MM » ;
- les sources vont à la fin, regroupées par thème, une ligne par thème.

## Étape 7 — Contrôler

1. Lance le contrôle, en ajoutant à `--interdits` ce que le client a demandé de taire :

   ```bash
   node scripts/verifier-onglet.mjs <dossier-client>/INSTAGRAM/analyse-instagram.md --dossier-client <dossier-client> --interdits "mot1,mot2"
   ```

   Il doit répondre **CONFORME** : titre et nom d'onglet, ligne de mise à jour, sections,
   annexe A, historique, tableaux réguliers, taille, mots interdits, nombre d'onglets.
2. Relis **chaque chiffre** contre ton relevé brut, et chaque mot qui en dit plus que les
   données : « toutes », « aucune », « jamais », « le seul ».

## Étape 8 — Publier et transmettre

1. **Note d'équipe** : écris-la dans un fichier temporaire (méthode, accès utilisés,
   décisions prises, ce qui reste « à relever », date du prochain relevé), avec un titre
   `### … — JJ/MM/AAAA`, puis :

   ```bash
   node scripts/inserer-note-equipe.mjs <dossier-client>/CLAUDE.md <note.md>
   ```

   Elle s'insère juste avant `<!-- NOTES-EQUIPE:FIN -->`, en gardant les fins de ligne du
   fichier. Le haut du `CLAUDE.md` est réécrit par le serveur : n'y écris jamais.
2. **Pousse toi-même.** L'envoi automatique de midi ne publie que les dossiers
   `challenge-N` : un onglet ne part qu'avec un push (git ou GitHub Desktop). Ajoute tes
   fichiers **par leur nom**, jamais `git add -A`. Si l'arbre contient le travail en cours de
   quelqu'un d'autre, publie depuis un worktree jetable (voir `references/pieges.md`).
3. **Vérifie** sur GitHub que le fichier poussé est identique au tien.
4. Si tu n'as pas accès à l'espace du client, écris « affichage non vérifié » et demande à
   quelqu'un qui l'a de recharger la page.
5. **Relevé suivant** : le premier lundi du mois, même méthode. Mets à jour la date en tête,
   les chiffres, et ajoute une ligne à l'Historique.

## Ce qu'on ne fait pas

- Publier, commenter, liker ou écrire au nom du client sur un réseau : l'onglet recommande,
  le client ou son assistant agit.
- Se connecter avec les identifiants du client, ou taper un mot de passe : on lit avec son
  propre compte, ou avec les accès que le client a donnés.
- Ranger dans le dépôt un fichier de travail : il deviendrait visible chez le client.
