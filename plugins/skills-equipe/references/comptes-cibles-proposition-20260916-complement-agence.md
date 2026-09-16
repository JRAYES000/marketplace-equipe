# Complement propose pour julien-agency (16/09/2026) -- EN ATTENTE de validation Julien/Nomena

## Pourquoi

Constat reel du 16/09/2026 (3e passage consecutif a zero candidat sous le plafond de 48h,
voir `a-publier/README.md` du 16/09) : les 8 comptes cibles actuels de julien-agency ne
publient presque pas. Le plus actif (Jean ZENDJI) sort un post tous les 4 jours ; les 7 autres
sont a plusieurs semaines, mois, voire annees (2 d'entre eux -- Alexandre Touraine, Pierre-Emmanuel
Cochet -- n'ont meme pas de post ORIGINAL recent, seulement des reposts). Le probleme n'est pas
la fenetre de 4h ni l'heure du passage : c'est la liste elle-meme. Ce document propose un
complement, verifie sur l'activite reelle, pas seulement la pertinence thematique (erreur du
14/09/2026 : la premiere liste n'avait verifie QUE la pertinence, jamais la frequence).

## Methode

Recherches LinkedIn (`search/results/content`, tri "Latest") sur des formulations proches du
positionnement de julien-agency (automatisation IA pour PME/TPE/dirigeants/independants,
gain de temps), profils francais uniquement. Pour chaque profil trouve : lecture reelle de
`recent-activity/all/` (5 derniers posts, age relatif de chacun releve un par un), retenu
seulement les profils dont au moins 3 des 5 derniers posts sont ORIGINAUX (pas des reposts) et
tombent dans les 7 derniers jours -- le test que la premiere liste n'avait jamais fait.

Ecartes a cette etape (verifies puis rejetes, pour reference) :
- **Antony Barroux** : 1 post a 14h puis un trou de 2 mois avant les 4 precedents -- rafale
  ponctuelle, pas une cadence.
- **Franck Delmas** : 2 posts recents (1j, 3j) puis un trou de 3 semaines -- meme profil.
- **Eric Gibout** : ~1 post/semaine (2j, 6j, 1sem, 2sem, 3sem) -- sous le seuil "2-3x/semaine"
  demande, quoique regulier.
- **Leonel ADAGBE** : tres actif (10h, 5j, 6j, 6j, 1sem) et positionnement ideal ("J'aide les
  dirigeants a gagner 20h/semaine en automatisant") -- **ecarte uniquement parce que base au
  Togo**, pas en France (poste sur l'ecosysteme tech togolais). A reconsiderer si le critere
  "comptes francais" de `reglages-comptes.json` est assoupli un jour.

## Les 5 comptes proposes

| # | Nom | URL LinkedIn | Positionnement observe | Zone | Abonnes | Dernier post | Cadence recente (5 derniers posts) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Emmanuel Brisseau | `https://www.linkedin.com/in/emmanuel-brisseau/` | "Freelance \| J'aide les entreprises locales a etre plus visibles... IA & automatisation" (ACEB Web-Creation) | Bordeaux | 633 | 22 min (16/09/2026) | 22min, 23h, 1sem, 1sem, 1sem -- tous originaux |
| 2 | Théo Meuriot | `https://www.linkedin.com/in/theo-meuriot/` | "Developpeur Python Full-Stack & Agents IA \| 1.4M+ vues \| Automatisation & Data" | Rouen | 8 206 | 1h (16/09/2026) | 1h, 20h, 1j, 2j, 3j -- quasi quotidien, tous originaux |
| 3 | Yohann Nezri | `https://www.linkedin.com/in/yohann-nezri-expert-digitalisation/` | "DIGITAL POWER \| IA \| Automatisation \| SEO" -- aide aussi les avocats en generation de leads | Marseille | 5 354 | 22 min (16/09/2026) | 22min, 2j, 4j, 5j (repost), 1sem -- 4/5 originaux |
| 4 | Mehdi Stili | `https://www.linkedin.com/in/mehdi-stili-6769a6174/` | "Tech Lead IA \| Python/FastAPI \| RAG/LLM en prod" -- freelance disponible | Toulon | 5 583 | 22 min (16/09/2026) | 22min, 2j, 5j, puis 3mo/4mo -- 3 posts sur 7 jours, mais gap avant : a resurveiller dans 2-3 semaines |
| 5 | Stéphane Benoist | `https://www.linkedin.com/in/sbenoist/` | "DSI a temps partage \| Votre informatique coute cher..." -- gouvernance IT/IA pour PME, pas uniquement automatisation | Bordeaux | 4 057 | 1 jour (15/09/2026) | 1j, 2j, 4j, 5j, 1sem -- tous originaux, cadence tres reguliere |

## Reserves assumees (a lire avant de valider)

- **Yohann Nezri** et **Mehdi Stili** : contenu davantage centre sur leur propre activite
  (generation de leads pour avocats ; disponibilite freelance) que sur l'automatisation/IA pour
  PME au sens strict -- reste un theme recurrent chez eux, mais moins pur que les 8 comptes
  actuels. A garder si la cadence prime, a ecarter si la purete thematique prime.
- **Stéphane Benoist** : positionnement "DSI a temps partage" (gouvernance IT/cout) plutot que
  "j'automatise avec l'IA" -- l'IA y est un sujet parmi d'autres, pas le coeur. Cadence
  excellente en revanche (poste presque un jour sur deux).
- **Mehdi Stili** : les 3 posts recents sont suivis d'un trou de plusieurs mois dans l'historique
  visible -- possible reprise recente d'activite apres une pause, pas une garantie de cadence
  soutenue. A revalider dans 2-3 semaines avant de le considerer comme fiable.
- **Aucun profil invente** : les 5 URL ci-dessus ont ete reellement ouvertes, `recent-activity/all/`
  lu poste par poste, ages releves un par un -- meme methode que le fichier du 14/09/2026.

## Statut

**En attente de validation** (Julien ou Nomena) avant toute copie dans
`linkedin-commentaires/reglages-comptes.json` -- meme processus que le 14/09/2026, jamais copie
sans validation explicite au prealable.
