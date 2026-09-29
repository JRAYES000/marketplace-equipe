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

## Le miroir

```bash
node "<skill>/scripts/notion.js" miroir-nocodb --sec   # simulation : comptes et champs modifiés
node "<skill>/scripts/notion.js" miroir-nocodb         # applique, puis relit
```

- Appariement Notion ↔ NocoDB par email, sinon nom + prénom + commune + requête, **au
  multi-ensemble** (deux profils au même intitulé sont deux personnes). Entre profils anonymes
  du même intitulé, l'appariement est arbitraire : le miroir réécrit alors plusieurs champs,
  mais le contenu final de NocoDB est bien celui de Notion.
- Fiches `Ecarte` de Notion : jamais recopiées ; si NocoDB en avait, elles y sont supprimées.
- Champs comparés : les 11 colonnes, `Type de requete` exclu (formule Notion).
- Garde-fou : plus de 20 suppressions ou 20 % de la table → arrêt, sauf `--force`.
- Mesuré le 29/09/2026, premier miroir : Notion 257 (dont 31 `Ecarte`), NocoDB 226 ; 0 création,
  8 modifications (écarts de quelques caractères dans des `Note`, profils anonymes), 0
  suppression ; relu = attendu = 226, puis 0 écart à la relance.

## La file d'attente

Si Notion refuse une écriture après 5 essais (panne, 429 persistant, jeton invalide), `ecrire`
sort en code 3 et range les fiches non écrites dans
`%LOCALAPPDATA%/france-travail-extraction/notion-attente.json` (données de candidats : locale,
jamais versionnée, jamais sur GitHub). `resume`, `connus`, `dedup` et `verifier` en tiennent
compte. `reprendre` (ou le prochain `ecrire`) la repousse, sans recréer une fiche déjà arrivée.
NocoDB n'est jamais utilisé comme secours.

## Bascule v8 → v9 (une fois)

`notion.js amorcer [--sec]` crée dans Notion les fiches que NocoDB a reçues pendant la v8.0 et
que Notion n'a jamais vues. À lancer **avant** le premier miroir, sinon le miroir les supprimerait
de NocoDB. Mesuré le 29/09/2026 : 0 fiche à amorcer, les deux bases étaient déjà d'accord.

## Contrôles utiles

- `notion.js export <fichier.json>` : toute la base en JSON (colonnes NocoDB). Supprimer le
  fichier après usage.
- `nocodb.js reconcilier <export.json>` : écarts dans les deux sens, en lecture seule sans
  `--importer`. Ne plus utiliser `--importer` ni `notion-pages` : ils datent de la v8.0 et
  écrivent dans le mauvais sens.
- `notion.js archiver-test TEST-…` : archive les fiches d'essai (refuse toute autre requête).
