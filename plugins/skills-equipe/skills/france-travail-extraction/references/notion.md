# Base Notion « Leads France Travail »

Depuis la v9.0 (29/09/2026), le run écrit dans la base Notion « Leads France Travail » par
**l'API publique Notion** (`scripts/notion.js`). Le connecteur Notion MCP n'est plus utilisé : il
plafonnait ses appels (`usage_limit_reached` en plein run, et `query_multiple_data_sources`
réservé à l'offre payante). L'API publique, elle, est gratuite sur tous les plans et sans quota
d'usage ; sa seule limite est ~3 requêtes par seconde, que le script respecte.

**NocoDB n'est plus utilisé** (v10.0, Julien 04/10/2026). La table NocoDB « Leads France
Travail » n'est plus alimentée ni lue : `nocodb.js` et le miroir de fin de run sont retirés. Ne
pas y revenir sans demande explicite de Julien.

Repères Notion : base `1cfd41a205fc44f797b39e4e8e1d6978`, source de données
`collection://c9a8febd-29ae-468e-a320-bd2fd62a161f`, connexion interne « Leads France Travail -
API » (espace CLAUDE PARTNERS), jeton `NOTION_TOKEN_FT` dans le coffre de secrets. Une nouvelle
base ou une base dupliquée doit être **connectée** à cette intégration (⋯ → Connexions → Ajouter
une connexion), sinon l'API répond 404 `object_not_found`.

## Deux commandes pour un run

- `notion.js situer <connus.json>` (Phase 1) : une lecture, comptes par requête et noms connus.
- `notion.js publier <lot.json>` (Phase 5) : reprise de la file, retrait des doublons, écriture,
  relecture par date et requête. Codes : 0 ok, 2 écart, 3 file d'attente.

Les commandes de détail (`resume`, `connus`, `dedup`, `ecrire`, `reprendre`, `verifier`,
`export`) restent pour diagnostiquer, pas pour le run.

## Ce que fait publier (sorti de SKILL.md le 2026-11-22)

1. reprend la file d'attente d'un lot précédent ;
2. **retire les doublons** et les liste (`doublon retire : …`) : même email, même téléphone, ou
   même nom + prénom. Un profil **anonyme** (sans prénom) ne se compare que par email ou
   téléphone : son intitulé est partagé par d'autres (un nouvel anonyme était retiré à tort en
   v9.0). Un profil déjà en base est un doublon quel que soit son `Statut`. Une même personne
   présente deux fois dans le lot ne s'écrit qu'une fois (`deux fois dans le lot`) ;
3. crée les fiches une par une (~3 par seconde, réessais sur 429, 5xx et délai de 30 s) ;
4. **relit** par date et requête : `relu=N attendu=N notes_vides=0`.

Mesuré : 9 s pour 3 fiches.

## La file d'attente

Si Notion refuse une écriture après 5 essais (panne, 429 persistant, jeton invalide, délai de
30 s), `publier` sort en code 3 et range les fiches non écrites dans
`%LOCALAPPDATA%/france-travail-extraction/notion-attente.json` (données de candidats : locale,
jamais versionnée, jamais sur GitHub). `situer`, `dedup` et `publier` en tiennent compte.
`reprendre` (ou le prochain `publier`) la repousse, sans recréer une fiche déjà arrivée. La file
est propre à chaque poste.

## Contrôles utiles

- `notion.js export <fichier.json>` : toute la base en JSON. Supprimer le fichier après usage.
- `notion.js verifier <AAAA-MM-JJ> <requête>` : compte et notes vides d'un lot.
- `notion.js archiver-test TEST-…` : archive les fiches d'essai (refuse toute autre requête).

## Colonnes (sorti de SKILL.md le 2026-11-21)

Colonnes (ASCII, ce sont des identifiants de schéma) : `Nom` (MAJUSCULES, à défaut l'intitulé),
`Prenom`, `Email` (du CV uniquement), `Telephone` (`06 XX XX XX XX`, CV d'abord),
`Fonction`, `Requete`, `Date extraction` (jour **et heure** du `lot`, v10.5 ; `--heure HH:MM` si
le lot est rejoué un autre jour), `Profil mis a jour`, `Statut` (`A importer` par défaut),
`Note` (jamais vide). La colonne `Accroche` des fiches anciennes (premier e-mail SalesHandy) ne
s'écrit plus.

## Empreintes hors-cible (sorti de SKILL.md le 2026-11-21)

Il range aussi les **hors-cible** : chaque nouveau profil nommé absent de `choix.json` laisse son
empreinte (SHA-256 tronqué du « prénom nom ») dans
`%LOCALAPPDATA%/france-travail-extraction/ecartes.json`, 180 jours au plus. Jamais un nom en
clair, rien dans Notion. Les lots suivants sautent ces profils sans CV ni OCR. Un profil gardé
plus tard est retiré de la liste. Les profils anonymes n'y entrent jamais. La liste est propre à
chaque poste.
