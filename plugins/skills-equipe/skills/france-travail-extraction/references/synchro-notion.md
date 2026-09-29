# Notion fait foi, NocoDB en miroir

Depuis la v9.0 (29/09/2026), le run écrit dans la base Notion « Leads France Travail » par
**l'API publique Notion** (`scripts/notion.js`), puis aligne NocoDB dessus. Le connecteur Notion
MCP n'est plus utilisé : il plafonnait ses appels (`usage_limit_reached` en plein run, et
`query_multiple_data_sources` réservé à l'offre payante). L'API publique, elle, est gratuite sur
tous les plans et sans quota d'usage ; sa seule limite est ~3 requêtes par seconde, que le script
respecte.

La v8.0 faisait l'inverse (NocoDB faisait foi, Notion en différé). Ne pas y revenir sans
demande explicite de Julien.

Repères Notion : base `1cfd41a205fc44f797b39e4e8e1d6978`, source de données
`collection://c9a8febd-29ae-468e-a320-bd2fd62a161f`, connexion interne « Leads France Travail -
API » (espace CLAUDE PARTNERS), jeton `NOTION_TOKEN_FT` dans le coffre de secrets. Une nouvelle
base ou une base dupliquée doit être **connectée** à cette intégration (⋯ → Connexions → Ajouter
une connexion), sinon l'API répond 404 `object_not_found`.

## Deux commandes pour un run

- `notion.js situer <connus.json>` (Phase 1) : une lecture, comptes par requête et noms connus.
- `notion.js publier <lot.json>` (Phase 5) : reprise de la file, retrait des doublons, écriture,
  relecture par date et requête, miroir NocoDB. Codes : 0 ok, 2 écart, 3 file d'attente.

Les commandes de détail (`resume`, `connus`, `dedup`, `ecrire`, `reprendre`, `verifier`,
`miroir-nocodb`, `export`) restent pour diagnostiquer, pas pour le run.

## Le miroir

```bash
node "<skill>/scripts/notion.js" miroir-nocodb --sec   # simulation : comptes, statuts à réaligner
node "<skill>/scripts/notion.js" miroir-nocodb         # applique, puis relit
```

- Appariement Notion ↔ NocoDB par email, sinon nom + prénom + commune + requête, **au
  multi-ensemble** (deux profils au même intitulé sont deux personnes). Entre profils anonymes
  du même intitulé, l'appariement est arbitraire : le miroir réécrit alors plusieurs champs,
  mais le contenu final de NocoDB est bien celui de Notion.
- Fiches `Ecarte` de Notion : jamais recopiées ; si NocoDB en avait, elles y sont supprimées.
- **`Statut` : Notion est maître** (v9.2, décision de Julien du 29/09/2026). Le miroir recopie le
  Statut comme les autres colonnes et compte les transitions. Le Statut se change dans Notion,
  jamais dans NocoDB. Premier alignement : 137 fiches passées de « A importer » à « Importe
  SalesHandy » dans NocoDB.
- Garde-fou : plus de 20 suppressions ou 20 % de la table → arrêt, sauf `--force`.
- Mesures du 29/09/2026 : premier miroir, 8 modifications, relu = attendu = 226. Test v9.1 sur
  3 fiches `TEST-` : création 3, Statut changé dans NocoDB conservé et signalé, puis suppression 3
  après archivage dans Notion ; relu = attendu à chaque étape.

## La file d'attente

Si Notion refuse une écriture après 5 essais (panne, 429 persistant, jeton invalide, délai de
30 s), `publier` sort en code 3 et range les fiches non écrites dans
`%LOCALAPPDATA%/france-travail-extraction/notion-attente.json` (données de candidats : locale,
jamais versionnée, jamais sur GitHub). `situer`, `dedup` et `publier` en tiennent compte.
`reprendre` (ou le prochain `publier`) la repousse, sans recréer une fiche déjà arrivée. NocoDB
n'est jamais utilisé comme secours. La file est propre à chaque poste.

## Contrôles utiles

- `notion.js export <fichier.json>` : toute la base en JSON (colonnes NocoDB). Supprimer le
  fichier après usage.
- `nocodb.js resume` et `nocodb.js reconcilier <export.json>` : lecture seule. Depuis la v9.1,
  `nocodb.js` n'écrit plus rien (ses commandes `ecrire`, `notion-pages` et `--importer`
  contournaient Notion) ; un écart se corrige par `notion.js miroir-nocodb`.
- `notion.js archiver-test TEST-…` : archive les fiches d'essai (refuse toute autre requête).
