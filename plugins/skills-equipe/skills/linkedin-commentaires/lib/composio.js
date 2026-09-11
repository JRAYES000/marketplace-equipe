'use strict';

/**
 * Appel bas niveau d'une action Composio.
 *
 * CANAL : voulu en MCP (connect.composio.dev/mcp), mais ce canal exige un jeton
 * AuthKit (session OAuth reelle), pas une cle API statique -- teste et documente
 * dans references/actions-composio.md du paquet (11/09/2026). En attendant une
 * voie d'acces programmatique a ce jeton, cette fonction utilise le canal REST
 * direct (/api/v3.1/tools/execute/<slug>) avec COMPOSIO_API_KEY, qui EST
 * verifiable aujourd'hui (echoue proprement si le compte n'est pas connecte
 * sous ce projet). A remplacer par un vrai appel MCP des que le jeton est
 * disponible -- l'interface de cette fonction (memes parametres, meme forme de
 * retour) ne devrait pas avoir besoin de changer cote appelant.
 */
async function executerActionComposio(slug, { arguments: args = {}, userId, apiKey } = {}) {
  const cle = apiKey || process.env.COMPOSIO_API_KEY;
  if (!cle) {
    throw new Error('COMPOSIO_API_KEY manquant (variable d\'environnement ou parametre apiKey).');
  }

  const corps = { arguments: args };
  if (userId) corps.user_id = userId;

  const reponse = await fetch(`https://backend.composio.dev/api/v3.1/tools/execute/${slug}`, {
    method: 'POST',
    headers: { 'x-api-key': cle, 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });

  const json = await reponse.json();
  if (!reponse.ok || json.successful === false) {
    const err = new Error(`Composio ${slug} a echoue (HTTP ${reponse.status}) : ${JSON.stringify(json)}`);
    err.httpStatus = reponse.status;
    err.reponse = json;
    throw err;
  }
  return json;
}

module.exports = { executerActionComposio };
