# Synchro Notion différée (à la demande)

Depuis la v8.0, le run n'écrit **que dans NocoDB**. La base Notion « Leads France Travail »
est une copie mise à jour **après coup**, quand on le demande (« synchronise Notion avec les
leads France Travail »). Raison : la limite d'appels du connecteur Notion tombait en plein run
(29/09/2026) et imposait une alerte, une file d'attente et une reprise. NocoDB fait foi.

Les deux bases dérivent : Notion garde ce que NocoDB n'a plus (les 31 fiches `Ecarte` supprimées
le 29/09/2026), NocoDB a tout ce qui a été extrait depuis la v8.0.

Repères Notion : base `1cfd41a205fc44f797b39e4e8e1d6978`, source de données
`collection://c9a8febd-29ae-468e-a320-bd2fd62a161f`.

## 1. Obtenir la base Notion en fichier

Trois voies, de la moins chère à la plus manuelle :

- **Composio** (hors quota du connecteur MCP) : dans `COMPOSIO_REMOTE_WORKBENCH`, boucler sur
  `NOTION_QUERY_DATABASE` (`database_id` `1cfd41a205fc44f797b39e4e8e1d6978`, 100 lignes par
  appel, curseur `next_cursor` jusqu'à `has_more=false`), écrire un CSV aux colonnes de la table
  (`Nom`, `Prenom`, `Email`, `Telephone`, `Commune`, `Fonction`, `Requete`, `Date extraction`,
  `Profil mis a jour`, `Statut`, `Note`), l'exposer par `upload_local_file` et le télécharger avec
  `curl -L` dans le dossier temporaire. **Supprimer ce fichier après usage** : données de
  candidats. Mesuré le 29/09/2026 : 258 lignes en 3 appels.
- **Connecteur Notion MCP** : `notion-query-data-sources` (100 lignes par appel, pagination sur
  `has_more`), si le quota le permet.
- **À la main** : dans Notion, base « Leads France Travail » → ⋯ → Exporter → CSV.

## 2. Simuler

```bash
node "<skill>/scripts/nocodb.js" reconcilier <export.csv|.json>
```

Rend les comptes, les `Id` NocoDB absents de Notion, et les fiches Notion absentes de NocoDB.
Appariement par email, sinon nom + prénom + commune + requête, **au multi-ensemble** : deux
profils au même intitulé sont deux personnes.

## 3. NocoDB → Notion

```bash
node "<skill>/scripts/nocodb.js" notion-pages <ids séparés par des virgules>
```

Rend `[{"properties": {…}}]`, prêt pour l'écriture. Dates renommées
(`date:Date extraction:start`…), `Type de requete` jamais envoyé (formule).

Écrire par paquets de **100 au maximum** : `notion-create-pages` avec
`parent={"type":"data_source_id","data_source_id":"c9a8febd-29ae-468e-a320-bd2fd62a161f"}`,
`allow_async=false`, ou par Composio si le connecteur MCP est en limite. Recopier le tableau tel
quel, sans reformuler une `Note`.

**Limite Notion** (`usage_limit_reached`, `rate_limited`, `entitlement`…) : la dire tout de
suite, ne pas réessayer en boucle, passer par Composio ou reprendre plus tard. Rien n'est perdu :
la prochaine synchro recalcule l'écart.

## 4. Notion → NocoDB

Relancer l'étape 2 avec `--importer`. Les fiches `Ecarte` ne sont **jamais** importées. Les
dates de l'export (« 29 septembre 2026 », « September 29, 2026 », `JJ/MM/AAAA`) passent en
`AAAA-MM-JJ`.

## 5. Relire

`resume` côté NocoDB, puis relancer l'étape 2 : elle doit rendre 0 et 0 (hors `Ecarte`). Sinon,
annoncer l'écart avec ses deux chiffres.
