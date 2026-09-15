'use strict';

/**
 * Integration Notion pour la page "Veille & posts" (brief Julien du
 * 10/09/2026, section 5). Prepare AVANT que la cle Notion soit disponible --
 * tout ce qui suit est ecrit et documente, mais n'a pu etre EXECUTE contre
 * l'API reelle faute de jeton (voir SKILL.md).
 *
 * Cle lue depuis l'environnement (NOTION_TOKEN), meme convention que
 * APIFY_TOKEN dans lib/trouver-posts.js -- jamais lue depuis un fichier de
 * secrets par ce code, jamais loggee.
 *
 * API Notion version 2025-09-03 (modele "data source" : une base de donnees
 * a une ou plusieurs sources de donnees ; on cree la base, on recupere le
 * data_source_id renvoye, on l'utilise pour les vues et les requetes).
 *
 * LIMITE VERIFIEE, PAS CONTOURNEE : l'API Notion publique n'expose AUCUN
 * endpoint pour inviter un e-mail externe (guest) sur une page -- confirme
 * par recherche (developers.notion.com ne documente pas cette action ;
 * uniquement disponible via le bouton "Share" de l'interface). La page 1
 * "colonne 'partagee en modification avec contact@claudeagency.fr'" du brief
 * devra donc etre faite A LA MAIN, une fois, par la personne qui possede le
 * jeton -- ce script imprime l'URL exacte de la page a partager pour
 * eviter d'avoir a la rechercher.
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
const FORMATS = ['texte', 'carrousel', 'video'];
// "Programme" ajoute le 15/09/2026 : la base Notion reelle ne distinguait pas
// "redige et valide, date de publication fixee" de "reellement en ligne" --
// necessaire des que Buffer permet de planifier a l'avance (voir SKILL.md).
const ETATS = ['Repere', 'Adapte', 'A relire', 'Programme', 'Publie', 'Rejete'];
const BILANS = ['Gagnant', 'Neutre', 'Perdant'];

/**
 * Schema exact des colonnes demandees par le brief (section 5). Score =
 * formule automatique (reactions + 3*commentaires + 5*partages) / abonnes --
 * meme formule que lib/scorer-posts.js (a ecrire cote logique JS, ici cote
 * Notion pour l'affichage).
 */
const PROPRIETES_VEILLE_ET_POSTS = {
  Titre: { type: 'title', title: {} },
  Compte: { type: 'select', select: { options: COMPTES.map((c) => ({ name: c })) } },
  "Lien d'origine": { type: 'url', url: {} },
  Auteur: { type: 'rich_text', rich_text: {} },
  Abonnes: { type: 'number', number: { format: 'number' } },
  "Date d'origine": { type: 'date', date: {} },
  Reactions: { type: 'number', number: { format: 'number' } },
  Commentaires: { type: 'number', number: { format: 'number' } },
  Partages: { type: 'number', number: { format: 'number' } },
  Score: {
    type: 'formula',
    formula: { expression: '(prop("Reactions") + 3 * prop("Commentaires") + 5 * prop("Partages")) / prop("Abonnes")' },
  },
  Sujet: { type: 'rich_text', rich_text: {} },
  Format: { type: 'select', select: { options: FORMATS.map((f) => ({ name: f })) } },
  Etat: { type: 'select', select: { options: ETATS.map((e) => ({ name: e })) } },
  'Date de publication': { type: 'date', date: {} },
  'Lien du post publie': { type: 'url', url: {} },
  'Vues a 7 jours': { type: 'number', number: { format: 'number' } },
  'Reactions a 7 jours': { type: 'number', number: { format: 'number' } },
  'Commentaires a 7 jours': { type: 'number', number: { format: 'number' } },
  Bilan: { type: 'select', select: { options: BILANS.map((b) => ({ name: b })) } },
};

/**
 * Cree la base "Veille & posts" sous la page parente donnee. Renvoie
 * { databaseId, dataSourceId, url } -- `url` est la page a partager a la
 * main avec contact@claudeagency.fr (voir limite documentee en tete de
 * fichier).
 */
async function creerBaseVeilleEtPosts({ parentPageId, notionToken } = {}) {
  if (!parentPageId) throw new Error('parentPageId requis (page Notion sous laquelle creer la base).');

  const reponse = await appelNotion('/databases', {
    method: 'POST',
    notionToken,
    body: {
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Veille & posts' } }],
      initial_data_source: { properties: PROPRIETES_VEILLE_ET_POSTS },
    },
  });

  const dataSourceId = reponse.data_sources && reponse.data_sources[0] && reponse.data_sources[0].id;
  if (!dataSourceId) throw new Error(`Reponse Notion sans data_source_id exploitable : ${JSON.stringify(reponse)}`);

  return { databaseId: reponse.id, dataSourceId, url: reponse.url };
}

/**
 * Cree les 3 vues filtrees demandees ("une colonne Compte et trois vues
 * filtrees") -- une par compte, triee par date d'origine decroissante.
 */
async function creerVuesParCompte({ databaseId, dataSourceId, notionToken } = {}) {
  const vues = [];
  for (const compte of COMPTES) {
    const vue = await appelNotion('/views', {
      method: 'POST',
      notionToken,
      body: {
        database_id: databaseId,
        data_source_id: dataSourceId,
        name: compte,
        type: 'table',
        filter: { property: 'Compte', select: { equals: compte } },
        sorts: [{ property: "Date d'origine", direction: 'descending' }],
      },
    });
    vues.push(vue);
  }
  return vues;
}

/**
 * Ajoute une entree reelle (une ligne) dans la base "Veille & posts". A
 * appeler pour chaque post reellement repere/adapte -- jamais en anticipant
 * un etat non atteint (meme regle que enregistrerCommentairePublie cote
 * linkedin-commentaires : refleter la realite, pas une intention).
 */
async function ajouterEntreeVeille({
  dataSourceId, titre, compte, lienOrigine, auteur, abonnes, dateOrigine,
  reactions, commentaires, partages, sujet, format, etat,
  datePublication, lienPostPublie, notionToken,
} = {}) {
  if (!dataSourceId) throw new Error('dataSourceId requis.');
  if (!COMPTES.includes(compte)) throw new Error(`compte "${compte}" inconnu, attendu l'un de : ${COMPTES.join(', ')}.`);
  if (!ETATS.includes(etat)) throw new Error(`etat "${etat}" inconnu, attendu l'un de : ${ETATS.join(', ')}.`);

  const properties = {
    Titre: { title: [{ text: { content: titre } }] },
    Compte: { select: { name: compte } },
    "Lien d'origine": { url: lienOrigine },
    Auteur: { rich_text: [{ text: { content: auteur } }] },
    Abonnes: { number: abonnes },
    "Date d'origine": { date: { start: dateOrigine } },
    Reactions: { number: reactions },
    Commentaires: { number: commentaires },
    Partages: { number: partages },
    Sujet: { rich_text: [{ text: { content: sujet } }] },
    Format: { select: { name: format } },
    Etat: { select: { name: etat } },
  };
  if (datePublication) properties['Date de publication'] = { date: { start: datePublication } };
  if (lienPostPublie) properties['Lien du post publie'] = { url: lienPostPublie };

  return appelNotion('/pages', {
    method: 'POST',
    notionToken,
    body: { parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties },
  });
}

/**
 * Interroge la source de donnees pour les entrees d'un compte publiees dans
 * les `fenetreJours` derniers jours -- utilise par la commande "bilan" (voir
 * calculerBilan ci-dessous, qui prend directement ce resultat en entree).
 */
async function recupererEntreesRecentes({ dataSourceId, compte, fenetreJours = 30, notionToken, maintenant = new Date() } = {}) {
  const depuis = new Date(maintenant.getTime() - fenetreJours * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const reponse = await appelNotion(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    notionToken,
    body: {
      filter: {
        and: [
          { property: 'Compte', select: { equals: compte } },
          { property: "Date d'origine", date: { on_or_after: depuis } },
        ],
      },
    },
  });
  return (reponse.results || []).map((page) => {
    const p = page.properties;
    return {
      compte,
      sujet: (p.Sujet.rich_text[0] && p.Sujet.rich_text[0].plain_text) || '',
      format: p.Format.select && p.Format.select.name,
      score: p.Score.formula && p.Score.formula.number,
      vues7j: p['Vues a 7 jours'].number,
      dateOrigine: p["Date d'origine"].date && p["Date d'origine"].date.start,
    };
  });
}

/**
 * Commande "bilan" (brief section 5) -- fonction PURE, testable sans reseau :
 * prend un tableau d'entrees deja recuperees (voir recupererEntreesRecentes)
 * et renvoie, par format et par sujet, la moyenne de score et le nombre
 * d'entrees -- pour repondre a "quels formats et quels sujets ont le mieux
 * marche" sur la fenetre demandee.
 */
function calculerBilan(entrees, { compte } = {}) {
  const filtrees = compte ? entrees.filter((e) => e.compte === compte) : entrees;
  if (filtrees.length === 0) {
    return { compte, nombreEntrees: 0, parFormat: [], parSujet: [], message: 'Aucune entree sur cette periode pour ce compte.' };
  }

  const moyenneParCle = (cle) => {
    const groupes = new Map();
    for (const e of filtrees) {
      const valeur = e[cle];
      if (!valeur) continue;
      if (!groupes.has(valeur)) groupes.set(valeur, []);
      groupes.get(valeur).push(e.score || 0);
    }
    return [...groupes.entries()]
      .map(([nom, scores]) => ({
        nom,
        nombre: scores.length,
        scoreMoyen: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.scoreMoyen - a.scoreMoyen);
  };

  const parFormat = moyenneParCle('format');
  const parSujet = moyenneParCle('sujet');

  return {
    compte,
    nombreEntrees: filtrees.length,
    parFormat,
    parSujet,
    meilleurFormat: parFormat[0] || null,
    meilleurSujet: parSujet[0] || null,
  };
}

module.exports = {
  creerBaseVeilleEtPosts,
  creerVuesParCompte,
  ajouterEntreeVeille,
  recupererEntreesRecentes,
  calculerBilan,
  PROPRIETES_VEILLE_ET_POSTS,
  COMPTES,
  FORMATS,
  ETATS,
  BILANS,
};
