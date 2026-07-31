# Installer le connecteur OpenRouter MCP (économiser ses tokens Claude Pro)

**~5 minutes. Aucun code, aucune installation locale.**

## Le principe

Claude reste le cerveau : il comprend, planifie et rédige la réponse finale. Les tâches lourdes (résumés longs, traductions, génération de masse, extraction) sont déléguées à **DeepSeek V4 Flash** via l'outil `send-message` du serveur MCP officiel d'OpenRouter. Claude consomme peu de tokens Pro ; le modèle bon marché fait le gros du travail, facturé quelques centimes en crédits OpenRouter.

**Modèle retenu : DeepSeek V4 Flash** — slug `deepseek/deepseek-v4-flash-0731`, 0,14 $/M tokens d'entrée et 0,28 $/M en sortie ([fiche](https://openrouter.ai/deepseek/deepseek-v4-flash-0731)), environ 35× moins cher en entrée que les modèles Claude haut de gamme, contexte 1M.

⚠️ **Toujours passer `reasoning_effort: none`.** Flash réfléchit par défaut et facture cette réflexion au prix de sortie ; sans ce réglage, l'appel part en timeout ou renvoie une réponse vide.

## Prérequis

1. Claude Desktop avec un abonnement payant.
2. Un compte [openrouter.ai](https://openrouter.ai) avec 5-10 $ de crédits.

## Installation (une seule fois)

1. Claude Desktop : **Paramètres > Connecteurs > Ajouter > Ajouter un connecteur personnalisé**.
2. Nom : `OpenRouter MCP` — URL : `https://mcp.openrouter.ai/mcp` — champs OAuth avancés laissés vides.
3. **Ajouter**, puis **Connecter** (approbation OAuth dans le navigateur : compte, plafond de dépense, libellé de clé, puis *Authorize*).
4. OpenRouter crée une clé dédiée, plafond 10 $ par défaut (modifiable sur l'écran d'approbation).

⚠️ **La clé expire tous les 7 jours** : recliquer « Connecter » chaque semaine (10 s).

⚠️ **Un connecteur ajouté pendant une conversation ne s'y attache pas.** Ouvrir une nouvelle conversation après l'installation.

## Les outils exposés

Le serveur expose une vingtaine d'outils. Ceux qui comptent ici :

| Outil (nom réel) | Libellé dans l'UI | Usage |
|---|---|---|
| `send-message` | Send a chat message | **l'outil de délégation** — catégorie écriture, demande une approbation |
| `models-list` | — | catalogue des modèles et prix en direct |
| `get-credits` | Get-credits | solde de crédits restant |
| `get-generation` | Get-generation | détail et coût d'un appel passé |

⚠️ La documentation publique d'OpenRouter mentionne encore `chat-send` : **ce nom n'existe pas**. L'outil s'appelle `send-message`.

## Fonctionnement

1. Claude découpe la partie « lourde » de la demande.
2. Il appelle `send-message` avec `deepseek/deepseek-v4-flash-0731`, `reasoning_effort: none`, et un prompt autonome (le modèle délégué ne voit pas la conversation).
3. Le résultat revient à Claude, qui vérifie le champ `model`, relit, corrige et intègre.

Exemple : « Résume ce document de 40 pages. Délègue chaque section à DeepSeek V4 Flash via send-message, puis fais toi-même la synthèse finale. »

Astuces : suffixe `:floor` = prix minimum, `:free` = version gratuite si disponible.

## Contrôler le routage

À la volée (« passe par DeepSeek » / « fais-le toi-même »), ou règle permanente dans **Paramètres > Profil > Préférences personnelles** : déléguer résumés, traductions, extraction, premiers jets > 500 mots ; garder pour Claude le raisonnement, la relecture, le contenu final client et le code non trivial.

## Limites honnêtes

- L'économie porte sur la **génération**, pas la lecture : Claude relit les résultats délégués.
- Chaque `send-message` est facturé en crédits OpenRouter ([suivi](https://openrouter.ai/activity)).
- Le modèle bon marché est moins bon que Claude : toujours relire.
- Reconnexion hebdomadaire (clé 7 jours).
- **Données personnelles** : ce qui part vers OpenRouter sort du périmètre Anthropic et est conservé selon les conditions du fournisseur. Ne pas déléguer de CVs, coordonnées de candidats ou données clients identifiantes.

## Test de validation

Dans une nouvelle conversation :

> Utilise l'outil send-message du connecteur OpenRouter MCP avec model="deepseek/deepseek-v4-flash-0731", reasoning_effort="none", et le prompt « Réponds uniquement par : DELEGATION-OK ». Affiche la réponse brute et le modèle qui a répondu.

Attendu : `DELEGATION-OK` + `model: deepseek/deepseek-v4-flash-0731`.

Doc officielle : [OpenRouter MCP Server](https://openrouter.ai/docs/guides/overview/mcp-server)
