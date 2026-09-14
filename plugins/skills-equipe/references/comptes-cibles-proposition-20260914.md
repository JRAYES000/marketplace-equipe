# Proposition de comptes_cibles pour linkedin-commentaires (14/09/2026)

Le brief exige 8 a 12 comptes par marque, dans un fichier modifiable -- champ vide a ce jour,
et decision explicitement editoriale (pas a moi de la prendre seul). Conformement a la regle 5
("jamais les mains vides"), voici une proposition argumentee plutot qu'un champ laisse vide :
**8 profils LinkedIn francais reels, actifs, verifies un par un** (ouverts et lus via
Claude in Chrome, session reelle -- pas une recherche web generique, pas une invention).

Methode : recherches LinkedIn (`search/results/content`, `search/results/people`) sur des
formulations proches du positionnement exact des trois comptes ("IA pour les PME et les
indépendants", "automatisation dirigeants PME"), retenu seulement les profils dont la bio et
les posts recents portent explicitement sur ce sujet, pour ce public, en France.

## Les 8 candidats

| # | Nom | URL LinkedIn | Positionnement observe | Zone |
| --- | --- | --- | --- | --- |
| 1 | Georges Solutions | `https://www.linkedin.com/in/georges-solutions-9b7957432` | "IA & Automatisation \| J'aide les entreprises à gagner du temps" | (suggestion reseau de Julien lui-meme -- deja proche) |
| 2 | Xavier Vincent | `https://www.linkedin.com/in/xavier-vincent33/` | "We integrate AI and automate the processes of SMEs" -- co-fondateur Lyten Agency **et Carousels Generator** (concurrent direct sur le format carrousel) | Bordeaux |
| 3 | Valentin Muller | `https://www.linkedin.com/in/valentin--muller/` | "J'aide les dirigeants à automatiser leur business" | Lyon |
| 4 | Cécilia Boavista | `https://www.linkedin.com/in/c%C3%A9cilia-boavista-0b02309b/` | "Consultante IA Automatisation & Agents IA \| j'aide les sociétés et les indépendants à gagner du temps" -- correspond mot pour mot au positionnement du brief | Paris |
| 5 | Florent Pontiac | `https://www.linkedin.com/in/florent-pontiac/` | "sites web, SEO/SEA, IA & applis métier sur mesure" pour indépendants/PME (Speedizycom / EXIAA) | France |
| 6 | Jean Zendji | `https://www.linkedin.com/in/jean-zendji-zenfia/` | "Les agents IA qui exécutent pendant que vous dirigez." -- Zenfia Automation | Paris |
| 7 | Benjamin Lacroix | `https://www.linkedin.com/in/benjamin-lacroix-fr/` | "Modernisation SI, automatisation, IA pour PME · Freelance · CTO on demand" | Montpellier |
| 8 | Alexandre Touraine | `https://www.linkedin.com/in/alexandre-touraine/` | "J'aide les dirigeants de PME à piloter leur système IT, digitaliser leurs processus et automatiser leurs opérations" -- fondateur BINAREE Consulting | Montpellier |

Chaque URL a ete verifiee reellement ouverte (lecture directe du profil ou du resultat de
recherche via navigateur, pas une supposition) -- 8 profils, ce qui atteint le plancher de la
fourchette demandee (8-12). Une recherche plus longue trouverait probablement 2-4 candidats
supplementaires ; je m'arrete a 8 solides plutot que d'allonger la liste avec des profils moins
directement pertinents (SEO generaliste, dev IA sans angle PME/dirigeants, recrutement, etc. --
tous ecartes pendant la recherche).

## Proposition de repartition par compte (a trancher par Julien)

Les 8 profils partagent le meme sujet (IA/automatisation pour PME et indépendants), mais leur
**ton** differe -- utile pour coller au `ton` deja defini dans `reglages-comptes.json` :

- **julien-agency** (confiant, direct, pedagogue, oriente-dirigeants) : Georges Solutions,
  Alexandre Touraine, Benjamin Lacroix, Jean Zendji -- registre "consultant/CTO qui s'adresse a
  des dirigeants", le plus proche du ton actuel.
- **julien-partners** (chaleureux, professionnel, facilitateur, oriente-reseau) : Valentin
  Muller, Cécilia Boavista, Florent Pontiac, Xavier Vincent -- registre plus personnel/
  accompagnement, plus proche du ton facilitateur.

Cette repartition est une suggestion, pas une decision -- les deux comptes visant le meme
sujet, un chevauchement partiel (certains profils suivis par les deux comptes) serait tout
aussi defendable. **A trancher par Julien.**

## Ce que je n'ai pas fait

- Pas invente de profil : chaque URL ci-dessus a ete reellement ouverte/observee cette session.
- Pas complete a 12 par marque en ajoutant des profils moins pertinents juste pour atteindre le
  haut de la fourchette -- 8 solides valent mieux que 12 dont la moitie serait hors-sujet.
- Pas ecrit dans `reglages-comptes.json` : le champ `comptes_cibles` reste vide tant que Julien
  n'a pas valide (ou corrige) cette liste, pour eviter de traiter une proposition comme une
  decision prise. Une fois validee, il suffit de copier les URLs dans le fichier.
