# Publication LinkedIn par n8n (workflow 38)

Remplace Buffer et Zernio depuis le 21/11/2026. Workflow **38 · Réseaux · Publication programmée
LinkedIn (Composio)** sur le n8n du VPS : https://n8n.claudeagency.fr/workflow/x5eccBTEHB3v3QYp

Toutes les 5 minutes, il publie les lignes dues de la table n8n **`publications_linkedin`**, puis pose
le premier commentaire. Une erreur fait échouer l'exécution : le workflow 90 envoie l'e-mail d'alerte.

## Programmer un post : une ligne dans `publications_linkedin`

Par le MCP `n8n` : `add_data_table_rows` (table `GCjlt3vNRlqbBfUB`, projet `2MVl33qcS1OYz0eZ`).

| Colonne | Valeur |
|---|---|
| `compte` | `agency` (Claude Agency) ou `partners` (Claude Partners) |
| `format` | `texte`, `image` ou `carrousel` (document PDF) |
| `texte` | le post, 3 000 caractères au plus ; `**mot**` est converti en gras Unicode ; **aucun lien** (refusé) |
| `media_url` | image ou PDF : URL **https publique** que n8n peut télécharger (pas un fichier local) |
| `titre` | carrousel : titre affiché sous le document (obligatoire) ; image : texte alternatif |
| `premier_commentaire` | le lien et son texte, 1 250 caractères au plus (facultatif) |
| `publier_le` | date ISO de publication (`2026-11-24T08:30:00+01:00`) |
| `statut` | `a_publier` ; `a_tester` crée un **brouillon invisible** sans commentaire |
| `source` | la skill ou le lot qui a programmé (pour les alertes) |

Le workflow écrit ensuite `statut`, `post_id`, `post_url`, `publie_le` et `erreur`.

## Statuts

- `a_publier` → `en_cours` → `publie` (post et commentaire partis).
- Commentaire raté, post parti : `a_publier_commentaire`, trois essais à 10 min, puis `publie_alerte`
  (commentaire à poser à la main).
- `erreur` : rien n'est parti (contrôle refusé, LinkedIn a refusé), sauf si `erreur` commence par
  « Résultat incertain » : vérifier sur LinkedIn avant de remettre la ligne à `a_publier`. Le
  workflow ne relance **jamais** seul une création de post.
- `a_tester` → `brouillon_cree` : brouillon LinkedIn invisible, à supprimer ensuite.

## Pièges connus

- **Comptes** : la clé Composio de n8n est un autre projet Composio que celui du serveur MCP. Le
  workflow trouve la connexion par son e-mail (`contact@claudeagency.fr`, `contact@claudepartners.fr`).
  Les deux comptes y sont connectés depuis le 21/11/2026 (testés en brouillon). Si une connexion
  expire, la ligne part en `erreur` (« aucune connexion LinkedIn active ») : reconnecter par
  `POST /api/v3/connected_accounts/link` (`auth_config_id: ac_BOXDEv4T2_MG`, `user_id: julien`),
  lien valable 10 min. Une page « Connection failed, invalid or expired state » peut s'afficher alors
  que la connexion a réussi : vérifier la liste des comptes avant de recommencer.
- **Statut d'origine** : le workflow lit le statut dans « Lignes dues », avant le passage à
  `en_cours`. Le lire après faisait publier les tests `a_tester` (incident du 21/11/2026 : trois
  posts de test publiés puis supprimés en 20 secondes).
- **En-tête `LinkedIn-Version: 202610`** dans le nœud « Preparer » : une version reste active environ
  12 mois ; une erreur 426 `NONEXISTENT_VERSION` veut dire qu'il faut l'avancer.
- **Texte au format « little text »** : `( ) [ ] { } < > @ # * _ ~ | \` sont échappés par le
  workflow (sinon LinkedIn coupe le texte) et `#mot` devient un vrai hashtag.

## Relevé du lundi (workflow 39)

**39 · Réseaux · Relevé LinkedIn du lundi (ScrapeCreators)** :
https://n8n.claudeagency.fr/workflow/h61TFu5meb8AkTn9 — chaque lundi 07:30, pour chaque ligne
`publie`/`publie_alerte` de `publications_linkedin` publiée depuis 28 jours, lit le post par l'API
ScrapeCreators (`/v1/linkedin/post`, credential n8n « ScrapeCreators API », 1 crédit par post) et écrit
une ligne dans la table `stats_linkedin` (`gjmnMzoFEmbefCtE`) : `releve_le`, `compte`, `format`,
`post_id`, `post_url`, `publie_le`, `reactions`, `commentaires`, `abonnes`. Un post illisible fait
échouer l'exécution (alerte du workflow 90), sans ligne vide.

Limites mesurées le 21/11/2026 : **pas d'impressions** ni de taux d'engagement (l'API LinkedIn n'a que
`w_member_social`, 403 en lecture ; ScrapeCreators ne lit que le public) ; **pas de liste des posts
d'un profil** (profils en 404 chez ScrapeCreators, Bright Data « Customer is not active », Just One API
à solde nul) : seuls les posts du workflow 38 sont relevés. L'API directe ScrapeCreators renvoie
`likeCount`/`commentCount` (la version Composio : `like_count`/`comment_count`).
