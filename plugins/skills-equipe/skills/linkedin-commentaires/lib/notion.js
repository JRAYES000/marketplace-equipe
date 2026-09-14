'use strict';

/**
 * Integration Notion pour la deuxieme page du brief Julien du 10/09/2026
 * (section 6) : suivi des commentaires publies. Prepare AVANT que la cle
 * Notion soit disponible -- ecrit et documente, pas encore EXECUTE contre
 * l'API reelle faute de jeton (voir SKILL.md).
 *
 * Cle lue depuis l'environnement (NOTION_TOKEN), meme convention que
 * APIFY_TOKEN dans lib/trouver-posts.js.
 *
 * LIMITE VERIFIEE, PAS CONTOURNEE (identique a linkedin-veille-virale/lib/notion.js) :
 * l'API Notion publique n'expose aucun endpoint pour inviter un e-mail
 * externe sur une page -- le partage avec contact@claudeagency.fr devra se
 * faire a la main, une fois, via le bouton "Share" de l'interface. Ce
 * script imprime l'URL de la page a partager pour eviter d'avoir a la
 * rechercher.
 */

const NOTION_VERSION = '2025-09-03';
const NOTION_API = 'https://api.notion.com/v1';

function jeton(notionToken) {
  const cle = notionToken || process.env.NOTION_TOKEN;
  if (!cle) throw new Error('NOTION_TOKEN manquant (variable d\'environnement ou parametre notionToken).');
  return cle;
}

/**
 * Rien ne plante a vide (brief section 2, regle 4) : chaque echec connu de
 * l'API Notion est traduit en message qui dit quoi faire et ou, pas en
 * exception brute avec un corps JSON a decortiquer soi-meme.
 */
function messageErreurNotion(status, json) {
  if (status === 401) {
    return (
      'NOTION_TOKEN invalide ou expire. Verifiez sa valeur dans Notion -> Parametres et ' +
      'membres -> Connexions -> votre integration -> "Afficher le jeton secret", et ' +
      'reexportez-la dans l\'environnement.'
    );
  }
  if (status === 404 && json && json.code === 'object_not_found') {
    return (
      'Page ou base introuvable pour NOTION_PARENT_PAGE_ID -- deux causes possibles : ' +
      '(1) l\'ID est invalide (copiez-le depuis l\'URL de la page Notion, le bloc de 32 ' +
      'caracteres apres le dernier tiret) ; (2) la page existe mais n\'est PAS partagee avec ' +
      'cette integration -- ouvrez la page dans Notion, bouton "..." en haut a droite -> ' +
      '"Connexions" -> ajoutez l\'integration par son nom, puis relancez.'
    );
  }
  if (status === 403) {
    return (
      'Acces refuse par Notion (403) -- l\'integration existe et le jeton est valide, mais ' +
      'elle n\'a pas la permission necessaire sur cette ressource. Verifiez qu\'elle est bien ' +
      'ajoutee via "Connexions" sur la page ET que son niveau d\'acces couvre l\'ecriture.'
    );
  }
  return `Notion a repondu ${status} : ${JSON.stringify(json)}`;
}

async function appelNotion(endpoint, { method = 'GET', body, notionToken } = {}) {
  const cle = jeton(notionToken); // leve avant toute tentative reseau -- pas une erreur "reseau"
  let reponse;
  try {
    reponse = await fetch(`${NOTION_API}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${cle}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(`Impossible de contacter l'API Notion (reseau) : ${err.message}`);
  }
  const json = await reponse.json();
  if (!reponse.ok) {
    throw new Error(messageErreurNotion(reponse.status, json));
  }
  return json;
}

const COMPTES = ['page-claude', 'julien-agency', 'julien-partners'];
const { GENRES } = require('./valider-commentaire');

/**
 * Schema exact des colonnes demandees par le brief (section 6) : les
 * colonnes de redaction, puis les colonnes de suivi a 3 jours -- "le coeur
 * de la skill" selon le brief, qui repond a "est-ce que commenter chez les
 * concurrents amene des gens", pas seulement "combien de J'aime".
 */
const PROPRIETES_COMMENTAIRES = {
  Titre: { type: 'title', title: {} }, // identifiant lisible de la ligne (ex. "auteur -- date")
  Compte: { type: 'select', select: { options: COMPTES.map((c) => ({ name: c })) } },
  'Personne visee': { type: 'rich_text', rich_text: {} },
  'Lien du post': { type: 'url', url: {} },
  Date: { type: 'date', date: {} },
  'Texte du commentaire': { type: 'rich_text', rich_text: {} },
  Genre: { type: 'select', select: { options: GENRES.map((g) => ({ name: g })) } },
  "J'aime recus (3j)": { type: 'number', number: { format: 'number' } },
  'Reponses recues (3j)': { type: 'number', number: { format: 'number' } },
  "Reponse de l'auteur (3j)": { type: 'checkbox', checkbox: {} },
  'Vues de profil (3j)': { type: 'number', number: { format: 'number' } },
  'Demandes de contact (3j)': { type: 'number', number: { format: 'number' } },
};

/**
 * Cree la base de suivi des commentaires sous la page parente donnee.
 * Renvoie { databaseId, dataSourceId, url } -- `url` a partager a la main
 * avec contact@claudeagency.fr (voir limite en tete de fichier).
 */
async function creerBaseCommentaires({ parentPageId, notionToken } = {}) {
  if (!parentPageId) throw new Error('parentPageId requis (page Notion sous laquelle creer la base).');

  const reponse = await appelNotion('/databases', {
    method: 'POST',
    notionToken,
    body: {
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Commentaires' } }],
      initial_data_source: { properties: PROPRIETES_COMMENTAIRES },
    },
  });

  const dataSourceId = reponse.data_sources && reponse.data_sources[0] && reponse.data_sources[0].id;
  if (!dataSourceId) throw new Error(`Reponse Notion sans data_source_id exploitable : ${JSON.stringify(reponse)}`);

  return { databaseId: reponse.id, dataSourceId, url: reponse.url };
}

/**
 * Vue demandee par le brief : "une vue qui met cote a cote le nombre de
 * commentaires de la semaine et ces deux courbes [vues de profil, demandes
 * de contact]". Cree une vue de type "chart" -- l'API des vues (2025-09-03)
 * supporte ce type, mais son objet `configuration` (choix des series, axe
 * temporel) n'est pas entierement documente publiquement au moment ou ce
 * code est ecrit : la vue est creee avec un regroupement par semaine sur
 * "Date", a ajuster a la main dans l'interface si le rendu par defaut ne
 * convient pas -- assume comme limite, pas devine plus loin.
 */
async function creerVueComparaisonHebdomadaire({ databaseId, dataSourceId, notionToken } = {}) {
  return appelNotion('/views', {
    method: 'POST',
    notionToken,
    body: {
      database_id: databaseId,
      data_source_id: dataSourceId,
      name: 'Commentaires vs vues de profil / demandes de contact',
      type: 'chart',
      sorts: [{ property: 'Date', direction: 'ascending' }],
    },
  });
}

module.exports = {
  creerBaseCommentaires,
  creerVueComparaisonHebdomadaire,
  PROPRIETES_COMMENTAIRES,
  COMPTES,
};
