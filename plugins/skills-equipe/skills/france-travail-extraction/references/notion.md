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
  relecture par date et requête, import SalesHandy. Codes : 0 ok, 2 écart, 3 file d'attente,
  4 SalesHandy.

Les commandes de détail (`resume`, `connus`, `dedup`, `ecrire`, `reprendre`, `verifier`,
`saleshandy`, `export`) restent pour diagnostiquer, pas pour le run.

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
