---
name: annonce-mission-linkedin
description: >
  Publie un lot d'annonces de mission freelance IA de Julien sur la page LinkedIn Claude Partners :
  lecture du .docx, rédaction, fiches image, planning, publication par n8n, relevé à 48 h. Pour « nouveau lot
  d'annonces de mission ». Pas pour un post ordinaire (linkedin-mise-en-forme) ni un carrousel.
  Activation manuelle : sur demande explicite uniquement.
---

# Annonces de mission LinkedIn (Claude Partners)

> **Compte `julien-partners` recyclé le 27/11/2026.** Le profil LinkedIn `linkedin.com/in/julien-rayes-claude-partners` est devenu `linkedin.com/in/julien-rayes-mesdroitschomage` et fait la promotion de Mes Droits Chômage (simulateur d'aides publiques). Ne plus rien y publier, commenter ni programmer au titre de Claude Partners sans l'accord écrit de Julien. Les posts déjà publiés restent en ligne. Ancien profil relevé dans `MESDROITSCHOMAGE/reseaux/linkedin/ancien-profil-claude-partners.md`.

Sommaire : Condition préalable · Règles du 14/10 · 1 Lire le document · 2 Comparer · 3 Rédiger ·
4 Images · 5 Planning · 6 Tester puis programmer · 7 Relire la file · 8 Mail · 9 Relevé à 48 h · Fin.
Historique des règles et mesures : [references/historique.md](references/historique.md). Cas de test :
[references/evals.md](references/evals.md).

Reprend la chaîne du 08/10/2026 (`livrables-Claude-Agency/NOTES.md`, sections du 08/10).
Dépôt de travail : `livrables-Claude-Agency`. Dossier d'un lot : `sortants/annonces-missions/<lot>/`
(le lot du 08/10 est `v4/`, à prendre comme modèle). Lire d'abord le `CLAUDE.md` du dépôt (pièges connus).

**Publication : workflow n8n 38** (Buffer est résilié) : une ligne par annonce dans la table
`publications_linkedin`, `compte: partners`, `format: image`, fiche image à une URL https publique, lien de
la fiche en `premier_commentaire`. Colonnes, statuts et pièges : `../../references/publication-linkedin-n8n.md`. **Relevé** : le workflow n8n 39
relève chaque lundi réactions, commentaires et abonnés des posts du 38 (table `stats_linkedin`), sans impressions ;
le relevé à 48 h de l'étape 9 n'a pas encore de workflow n8n (à faire).

## Condition préalable bloquante

**Rien n'est programmé tant que Julien n'a pas confirmé par écrit qu'il porte les missions.**
Sans cette confirmation écrite (mail archivé, cité dans le README du lot) : retirer la mention
« portée par Claude Agency » de chaque annonce, ou ne pas publier. Ne jamais la garder « en attendant ».

**Trois accords distincts de l'utilisateur, dans la conversation en cours** : textes, images,
programmation. Rien n'est programmé avant le troisième. Aucun mail n'est envoyé par outil.

## Règles de Julien du 14/10/2026 (elles priment ; détail : `linkedin-mise-en-forme`, règle 0)

Une annonce est un post : elle compte dans les 2 posts par jour et par compte, son sujet s'inscrit dans
`linkedin/sujets.csv` (« annonce : <mission> »), le lien de la fiche va en premier commentaire, aucune
précaution. La mission réelle est le fait réel de la règle 2. Contrôle avant programmation :
`linkedin-mise-en-forme/scripts/controle-avant-publication.mjs`.

## 1. Lire le document de Julien

- Le .docx est joint à son mail. Extraire le texte par script, pas à la main :
  `node scripts/extraire-docx.mjs <document.docx> [sortie.txt]` (un paragraphe par ligne, sans dépendance).
- Si un document précédent existe, comparer les deux par script
  (`node scripts/comparer-docx.mjs <ancien.docx> <nouveau.docx>`) et lister ce qui change
  (posts ajoutés ou retirés, lignes nouvelles, mentions retirées). Les versions périmées sont
  signalées comme telles dans le README du lot.
- Aucune offre inventée.

## 2. Comparer avec l'annonce d'origine

- Retrouver chaque annonce d'origine (Free-Work, LeHibou…) et l'ouvrir.
- Comparer TJM, durée, lieu, date de démarrage, environnement technique. Tout écart va dans
  `sources-origine.md` et devient une question à Julien ; on ne corrige pas son document de soi-même.

## 3. Rédiger

- Charger `linkedin-mise-en-forme` et l'appliquer.
- Appliquer les constats de `sortants/annonces-missions/etude/corps.md` (chiffres et écarts
  succès / flops : les lire dans ce fichier, ne pas les recopier ici) : phrase « pourquoi cette
  mission vaut le coup », écriture en « je », rémunération chiffrée.
- **Accroche** :
  ligne 1 = `💼 Mission freelance IA : <intitulé>, <durée>, <lieu>. <TJM> € HT/jour.`, avec le
  **TJM seul en gras**, fabriqué par `verif-post.mjs gras "800 € HT/jour."` (un seul passage,
  le « € » reste maigre). Deux-points après « IA », jamais de tiret long (refusé par le script).
  La ligne 2 dit l'enjeu concret du client en une phrase (« Un organisme de formation veut
  industrialiser la création de ses modules »), pas « je cherche ».
- Pourquoi ce format : mesure du 18/10/2026 dans `linkedin-mise-en-forme` (règle 1) ; la refaire au prochain lot.
- Le reste du corps prend jusqu'à 3 autres passages en gras (règle 2 de `linkedin-mise-en-forme`,
  4 au plus) : la phrase « pourquoi cette mission vaut le coup », un titre de bloc.
- Le préfixe « Mission freelance IA » et le TJM en gras ne comptent pas dans la règle de variété ;
  l'intitulé, si : deux annonces ne commencent jamais par le même intitulé.
- **Les FAITS sont recopiés mot pour mot** du document de Julien : TJM, durée, lieu, rythme,
  démarrage, environnement, lien. Contrôle par script contre le .docx : 0 écart attendu
  (`node scripts/controler-faits.mjs <document.docx> NN.final.txt NN.commentaire.txt --fait "6 mois" --fait "Paris" …` :
  chaque `--fait` doit être dans le .docx et l'annonce, chaque URL et montant en euros de l'annonce dans le .docx ;
  sortie 1 s'il reste un écart).
- **Textes fixes, identiques dans toutes les annonces** : la phrase d'envoi
  « Vous pensez à quelqu'un en lisant ça ? Envoyez-lui ce post. » et l'appel à candidater
  du document de Julien, **sans le lien** : le texte dit « le lien est en commentaire » et le lien
  part en premier commentaire (règle 5 du 14/10/2026).
- Trois fichiers par annonce : `NN.md` (relecture), `NN.final.txt` (gras Unicode, à coller) et
  `NN.commentaire.txt` (le lien seul, à coller en premier commentaire).
- `verif-post.mjs` sur chaque annonce, comparée à celle qui la précède dans le planning : schéma
  toujours différent. L'échec « aucun chiffre sans source » sur le TJM est un faux positif connu.
- Passe `humanizer` si la skill existe sur le poste ; sinon le dire.

## 4. Images

- Une fiche « mission » 1080 × 1350 pour la moitié des annonces, à la charte Claude Partners
  (`#763D2C`), générée par script (modèle : `v4/images/generer-fiches.js`). Chaque champ est
  recopié du texte ; contrôle de chevauchement par le script.
- Répartir les groupes avec et sans image pour équilibrer TJM et lieux (tableau dans le README).

## 5. Planning

- 13:00 Paris, **un jour libre entre deux annonces**, **alternance avec image / sans image**.
- **Annonces en semaine**, sauf décision contraire de Julien.
- Relire la file de publication en direct avant de fixer les dates (pas un relevé de la veille).
- Un post texte qui occupe le 13:00 passe à 17:30 le même jour **seulement si ce jour reste à
  2 posts au plus** (règle 1 du 14/10/2026) ; sinon il passe au prochain jour ouvré qui a de la
  place, ou il est retiré. **Jamais décalé au week-end**.
- **Ne jamais déplacer un post de Julien** : tout post de la file absent de nos fichiers est à lui.
  Si son post prend le créneau, l'annonce attend une décision de l'utilisateur.
- Les annonces sont hors du test des formats. Mettre à jour `linkedin/test-formats-2026-10/suivi-posts-*.csv`.

## 6. Tester une annonce avec image, puis programmer le reste

- Programmer d'abord **une seule** annonce avec image, puis relire sa ligne dans `publications_linkedin` :
  `publier_le` en heure de Paris (`+01:00` ou `+02:00`), `media_url` présente, **aucun lien dans le texte, lien
  de la fiche dans `premier_commentaire`** (règle 5 du 14/10/2026).
- Seulement ensuite, programmer les autres sur le compte Claude Partners, par le workflow n8n 38
  (une ligne `a_publier` par annonce) : empreinte du texte comparée au `.final.txt`, date relue après programmation.

## 7. Relire la file

Relire **toutes** les lignes `a_publier` de `publications_linkedin` (MCP `n8n`, `get_data_table_rows`, toutes
les pages) : chaque annonce à son créneau, image ou non selon le planning, lien en premier commentaire, jamais
3 posts le même jour sur le compte, posts décalés à 17:30. Noter le nombre de lignes.

## 8. Mail du planning à Julien

Fichier `linkedin/mails/AAAA-MM-JJ-planning-annonces.md` puis brouillon Gmail dans la boîte de
l'adresse Gmail de l'utilisateur (à lui demander), via Claude in Chrome, jamais envoyé par outil.
Une ligne par annonce (date, heure, intitulé, TJM, avec ou sans image), les annonces non
programmées et pourquoi, le lien GitHub du lot vérifié. Aucun texte à trou ; Julien vouvoyé.

## 9. Relevé à 48 h

Ajouter dans `NOTES.md` le tableau « Relevé à 48 h des annonces » : une ligne
par annonce avec « Publication prévue » et « Relevé à faire le » (publication + 48 h, heure de
Paris), colonnes « Impressions », « Réactions », « Commentaires », « Taux d'engagement », « Abonnés (canal) »,
« Lien LinkedIn ».
Le relevé à 48 h se fait à la main tant qu'aucun workflow n8n ne le fait. L'ancienne routine Windows
« LinkedIn - 5 Releve 48 h des annonces » lisait Buffer ; son déclencheur s'est arrêté le 15/11/2026 et
`register-routines.ps1` ne la recrée plus.
**Identification d'une annonce** (routine comme relevé à la main), les deux conditions à la fois :
son intitulé exact (ligne 💼, ou ligne 2 de l'accroche, telle qu'elle est dans `NN.final.txt`) ET sa date de publication prévue (jour de Paris). Si deux posts du même jour correspondent, lire leur heure de publication réelle pour les départager ; si l'ambiguïté reste, ou si aucun post ne correspond : rien n'est écrit dans la ligne, « ALERTE : identification ambiguë » est noté avec les candidats trouvés (date, heure, début du texte).
Un post absent de nos fichiers n'est jamais relevé : c'est un post de Julien.
**Indicateurs fixés par Julien, et eux seuls** : impressions, réactions, commentaires, taux d'engagement,
abonnés du compte au moment du relevé. Aucun autre chiffre n'est demandé ni relevé. Sources : réactions,
commentaires et abonnés dans `stats_linkedin` (workflow 39, le lundi) ; impressions et taux à la main sous le
post avec Claude in Chrome ; relevé à 48 h : à faire, workflow n8n (ancienne méthode Buffer :
`../analyse-lundi-linkedin/references/releve-buffer.md`, historique).

## Fin

NOTES.md à jour (fait, reste, décisions), commit et push des fichiers nommés un par un,
puis « Livrable » et « Statut ».
