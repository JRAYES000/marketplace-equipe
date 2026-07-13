# Installer le connecteur OpenRouter MCP (économiser ses tokens Claude Pro)

**~5 minutes. Aucun code, aucune installation locale.**

## Le principe

Claude (abonnement Pro) reste le cerveau : il comprend, planifie et rédige la réponse finale. Les tâches lourdes (résumés longs, traductions, génération de masse, extraction) sont déléguées à **DeepSeek V4 Pro** via l'outil `chat-send` du serveur MCP officiel d'OpenRouter. Claude consomme peu de tokens Pro ; le modèle bon marché fait le gros du travail, facturé quelques centimes en crédits OpenRouter.

**Modèle retenu : DeepSeek V4 Pro** — slug `deepseek/deepseek-v4-pro`, ~0,435 $/M tokens d'entrée et ~0,87 $/M en sortie ([fiche](https://openrouter.ai/deepseek/deepseek-v4-pro)), 10 à 25× moins cher que les modèles Claude haut de gamme, contexte 1M.

## Prérequis

1. Claude Desktop avec abonnement Pro.
2. Un compte [openrouter.ai](https://openrouter.ai) avec 5-10 $ de crédits.

## Installation (une seule fois)

1. Claude Desktop : **Paramètres > Connecteurs > Ajouter un connecteur personnalisé** (bouton **+**).
2. Nom : `OpenRouter MCP` — URL : `https://mcp.openrouter.ai/mcp` — champs OAuth vides.
3. **Ajouter**, puis ouvrir le connecteur et cliquer **Connecter** (approbation OAuth dans le navigateur).
4. OpenRouter crée une clé dédiée, plafond 10 $ par défaut (modifiable).

⚠️ **La clé expire tous les 7 jours** : recliquer « Connecter » chaque semaine (10 s).

## Fonctionnement

1. Claude découpe la partie « lourde » de la demande.
2. Il appelle `chat-send` avec `deepseek/deepseek-v4-pro` et un prompt autonome (le modèle délégué ne voit pas la conversation).
3. Le résultat revient à Claude, qui relit, corrige et intègre.

Exemple : « Résume ce document de 40 pages. Délègue chaque section à DeepSeek V4 Pro via chat-send, puis fais toi-même la synthèse finale. »

Astuces : suffixe `:floor` = prix minimum, `:free` = version gratuite si disponible. Demander « liste les modèles les moins chers » utilise le catalogue en direct (`models-list`).

## Contrôler le routage

À la volée (« passe par DeepSeek » / « fais-le toi-même »), ou règle permanente dans **Paramètres > Profil > Préférences personnelles** : déléguer résumés, traductions, extraction, premiers jets > 500 mots ; garder pour Claude le raisonnement, la relecture, le contenu final client et le code non trivial. Le choix Sonnet/Opus se fait dans le sélecteur de modèle de la conversation.

## Limites honnêtes

- L'économie porte sur la **génération**, pas la lecture : Claude relit les résultats délégués.
- Chaque `chat-send` est facturé en crédits OpenRouter ([suivi](https://openrouter.ai/activity)).
- Le modèle bon marché est moins bon que Claude : toujours relire.
- Reconnexion hebdomadaire (clé 7 jours). Sur comptes Team/Enterprise, l'admin peut bloquer les connecteurs personnalisés.

Doc officielle : [OpenRouter MCP Server](https://openrouter.ai/docs/guides/overview/mcp-server)
