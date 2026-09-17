'use strict';

/**
 * Appel bas niveau d'une action Composio pour linkedin-carrousel -- canal
 * REST direct (backend.composio.dev/api/v3.1, cle "ak_..." de la couche
 * PLATFORM). L'implementation elle-meme vit dans lib/composio-canal.js
 * (partagee avec linkedin-commentaires depuis le 17/09/2026, voir
 * references/actions-composio.md) : ce fichier ne fait que la relayer, pour
 * ne pas casser les appelants existants (require('./composio')).
 *
 * Historique : jusqu'au 17/09/2026 ce canal etait documente comme "methode
 * de secours seulement" (aucune connexion LinkedIn sur le projet ak_ alors
 * disponible). Verifie depuis (GET /api/v3/connected_accounts) : une
 * connexion ACTIVE existe bien pour julien-partners (ca_vn1-dhh8VcYf) --
 * c'est desormais le canal reel de publication pour ce compte, pas un
 * secours. Rien n'existe pour julien-agency sur ce canal (voir
 * lib/composio-canal.js, ROUTAGE_COMPTES) : ce compte reste sur MCP/ck_,
 * gere par linkedin-commentaires/lib/composio.js.
 */
const path = require('path');
const { executerActionRest } = require('../../../lib/composio-canal');

/**
 * Registre des echecs Composio/LinkedIn (17/09/2026, suite) -- comble le
 * manque signale par le rapport du 16/09 (seuls les succes etaient
 * enregistres, cote linkedin-commentaires ; linkedin-carrousel n'avait meme
 * pas de registre de succes). Meme convention gitignore que
 * linkedin-commentaires/data/ (voir .gitignore racine).
 */
const CHEMIN_REGISTRE_ECHECS = path.join(__dirname, '..', 'data', 'registre-echecs.json');

async function executerActionComposio(slug, opts = {}) {
  return executerActionRest(slug, { cheminRegistreEchecs: CHEMIN_REGISTRE_ECHECS, ...opts });
}

module.exports = { executerActionComposio, CHEMIN_REGISTRE_ECHECS };
