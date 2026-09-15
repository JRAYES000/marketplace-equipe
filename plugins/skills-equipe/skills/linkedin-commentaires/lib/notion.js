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
 * de contact]". Cree une vue de type "chart" (API des vues, 2025-09-03).
 *
 * LIMITE VERIFIEE le 15/09/2026, pas devinee : le schema reel de
 * `configuration` (confirme par un essai reel, l'appel echouait avant avec
 * "Chart views require a CHART directive in the configure param" faute de
 * `configuration`) n'accepte qu'UN SEUL axe Y par vue -- pas de superposition
 * "commentaires + vues de profil + demandes de contact" sur le meme
 * graphique en un seul appel. Cette fonction cree donc la vue la plus utile
 * a elle seule (nombre de commentaires par semaine) ; les 2 courbes
 * complementaires ("Vues de profil (3j)", "Demandes de contact (3j)")
 * restent a ajouter a la main dans l'interface (bouton "+" a cote des
 * vues -> Graphique -> ajouter une serie), pas un contournement possible par
 * API a ce jour.
 */
async function creerVueComparaisonHebdomadaire({ databaseId, dataSourceId, notionToken } = {}) {
  // L'id reel de la propriete "Date" n'est connu qu'apres creation (Notion le
  // genere, ex. "{]AL") -- jamais suppose, toujours relu sur le data source.
  const source = await appelNotion(`/data_sources/${dataSourceId}`, { notionToken });
  const proprieteDateId = source.properties && source.properties.Date && source.properties.Date.id;
  if (!proprieteDateId) throw new Error(`Propriete "Date" introuvable sur le data source ${dataSourceId}.`);

  return appelNotion('/views', {
    method: 'POST',
    notionToken,
    body: {
      database_id: databaseId,
      data_source_id: dataSourceId,
      name: 'Commentaires par semaine',
      type: 'chart',
      configuration: {
        type: 'chart',
        chart_type: 'column',
        x_axis: { type: 'date', property_id: proprieteDateId, group_by: 'week', sort: { type: 'ascending' } },
        y_axis: { aggregator: 'count', property_id: proprieteDateId },
      },
    },
  });
}

/**
 * Alternative reellement faisable a la superposition impossible (voir
 * limite documentee juste au-dessus) : au lieu d'un seul graphique a 3
 * courbes, un BLOC TABLEAU NATIF Notion, ecrit sur la page (pas une vue de
 * base de donnees) avec les 3 colonnes demandees cote a cote, une ligne par
 * semaine -- "commentaires de la semaine" et les 2 courbes de suivi
 * redeviennent directement comparables d'un coup d'oeil, sans les
 * limitations d'un chart view. Fonction PURE, testable sans reseau : prend
 * les lignes deja recuperees (mais recupererEntreesRecentes-like) et calcule
 * l'agregat par semaine ISO (lundi comme premier jour).
 *
 * Choix assume : pas d'interpretation ("meilleure semaine", tendance...) --
 * seulement les 3 chiffres bruts cote a cote, pour laisser le jugement a qui
 * lit (regle 5 du brief : ne jamais pretendre a une conclusion que les
 * donnees ne permettent pas).
 */
function numeroSemaineISO(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const jour = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - jour + 3); // jeudi de la semaine ISO
  const premierJeudi = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const numero = 1 + Math.round(((d - premierJeudi) / 86400000 - 3 + ((premierJeudi.getUTCDay() + 6) % 7)) / 7);
  const lundi = new Date(`${dateStr}T00:00:00Z`);
  lundi.setUTCDate(lundi.getUTCDate() - jour);
  return { cle: `${d.getUTCFullYear()}-S${String(numero).padStart(2, '0')}`, debutSemaine: lundi.toISOString().slice(0, 10) };
}

function calculerComparaisonHebdomadaire(lignes) {
  const semaines = new Map();
  for (const ligne of lignes || []) {
    if (!ligne.date) continue;
    const { cle, debutSemaine } = numeroSemaineISO(ligne.date);
    if (!semaines.has(cle)) {
      semaines.set(cle, { semaine: cle, debutSemaine, nombreCommentaires: 0, vuesProfil: 0, demandesContact: 0 });
    }
    const agg = semaines.get(cle);
    agg.nombreCommentaires += 1;
    agg.vuesProfil += ligne.vuesProfil || 0;
    agg.demandesContact += ligne.demandesContact || 0;
  }
  return [...semaines.values()].sort((a, b) => a.debutSemaine.localeCompare(b.debutSemaine));
}

/**
 * Ecrit (ajoute) le tableau calcule par calculerComparaisonHebdomadaire comme
 * un vrai bloc "table" Notion, enfant de la page donnee -- API blocks
 * standard (POST /blocks/{id}/children), pas une vue de base de donnees :
 * aucune des limites de "chart view" (un seul axe Y) ne s'applique a un bloc
 * de contenu statique. Rappelle a chaque appel qu'il s'agit d'un instantane
 * a une date donnee (pas une vue qui se met a jour seule) -- a relancer pour
 * rafraichir.
 *
 * CONCU SELON LA DOCUMENTATION PUBLIQUE DE L'API NOTION (blocs "table" /
 * "table_row"), PAS ENCORE EXECUTE CONTRE L'API REELLE au moment ou ce code
 * est ecrit -- NOTION_TOKEN absent de cette session. A verifier reellement
 * au premier appel, comme tout le reste de ce depot (voir CLAUDE.md racine).
 */
async function ecrireBlocComparaisonHebdomadaire({ pageId, lignes, notionToken } = {}) {
  if (!pageId) throw new Error('pageId requis (page Notion sous laquelle ecrire le tableau).');
  const semaines = calculerComparaisonHebdomadaire(lignes);

  const celluleTexte = (valeur) => [{ type: 'text', text: { content: String(valeur) } }];
  const ligneEntete = { type: 'table_row', table_row: { cells: [
    celluleTexte('Semaine'), celluleTexte('Commentaires'), celluleTexte('Vues de profil'), celluleTexte('Demandes de contact'),
  ] } };
  const lignesDonnees = semaines.map((s) => ({ type: 'table_row', table_row: { cells: [
    celluleTexte(`${s.semaine} (a partir du ${s.debutSemaine})`),
    celluleTexte(s.nombreCommentaires),
    celluleTexte(s.vuesProfil),
    celluleTexte(s.demandesContact),
  ] } }));

  if (lignesDonnees.length === 0) {
    throw new Error('Aucune ligne avec une Date exploitable -- rien a ecrire (verifiez que les entrees ont bien une Date renseignee).');
  }

  return appelNotion(`/blocks/${pageId}/children`, {
    method: 'PATCH',
    notionToken,
    body: {
      children: [{
        type: 'table',
        table: { table_width: 4, has_column_header: true, has_row_header: false, children: [ligneEntete, ...lignesDonnees] },
      }],
    },
  });
}

/**
 * Ajoute une entree reelle (une ligne) dans la base "Commentaires". A
 * appeler seulement APRES une publication reelle confirmee (meme regle que
 * enregistrerCommentairePublie/lib/registre.js) -- jamais en anticipant.
 */
async function ajouterLigneCommentaire({
  dataSourceId, compte, auteurCible, lienPost, date, texte, genre, notionToken,
} = {}) {
  if (!dataSourceId) throw new Error('dataSourceId requis.');
  if (!COMPTES.includes(compte)) throw new Error(`compte "${compte}" inconnu, attendu l'un de : ${COMPTES.join(', ')}.`);
  if (!GENRES.includes(genre)) throw new Error(`genre "${genre}" inconnu, attendu l'un de : ${GENRES.join(', ')}.`);

  const properties = {
    Titre: { title: [{ text: { content: `${auteurCible} -- ${date}` } }] },
    Compte: { select: { name: compte } },
    'Personne visee': { rich_text: [{ text: { content: auteurCible } }] },
    'Lien du post': { url: lienPost },
    Date: { date: { start: date } },
    'Texte du commentaire': { rich_text: [{ text: { content: texte } }] },
    Genre: { select: { name: genre } },
  };

  return appelNotion('/pages', {
    method: 'POST',
    notionToken,
    body: { parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties },
  });
}

/**
 * Regle 3 du brief (lecture des chiffres par capture d'ecran) : cette
 * fonction ne fait AUCUNE lecture d'image elle-meme (pas d'OCR dans ce
 * paquet) -- c'est la session Claude qui lit les chiffres visibles sur la
 * capture d'ecran collee par l'utilisateur (capacite multimodale native,
 * meme principe que la redaction editoriale des posts : un jugement humain
 * assiste, pas une automatisation aveugle). Cette fonction se contente de
 * retrouver la bonne ligne (par personne visee + date) et d'ecrire les
 * chiffres que la session a lus. Voir SKILL.md, section "Regle 3".
 */
async function retrouverLigneCommentaire({ dataSourceId, auteurCible, date, notionToken } = {}) {
  if (!dataSourceId) throw new Error('dataSourceId requis.');
  if (!auteurCible) throw new Error('auteurCible requis (doit correspondre exactement a "Personne visee").');

  const filtre = {
    and: [
      { property: 'Personne visee', rich_text: { equals: auteurCible } },
      ...(date ? [{ property: 'Date', date: { equals: date } }] : []),
    ],
  };
  const reponse = await appelNotion(`/data_sources/${dataSourceId}/query`, {
    method: 'POST',
    notionToken,
    body: { filter: filtre },
  });
  if (!reponse.results || reponse.results.length === 0) {
    throw new Error(`Aucune ligne trouvee pour "${auteurCible}"${date ? ` a la date ${date}` : ''}.`);
  }
  if (reponse.results.length > 1) {
    throw new Error(
      `${reponse.results.length} lignes trouvees pour "${auteurCible}"${date ? ` a la date ${date}` : ''} -- ` +
      'precisez la date pour lever l\'ambiguite plutot que d\'ecrire sur la mauvaise ligne.'
    );
  }
  return reponse.results[0];
}

async function mettreAJourStatistiques({
  dataSourceId, auteurCible, date, jaime, reponses, reponseAuteur, vuesProfil, demandesContact, notionToken,
} = {}) {
  const ligne = await retrouverLigneCommentaire({ dataSourceId, auteurCible, date, notionToken });

  const properties = {};
  if (jaime !== undefined) properties["J'aime recus (3j)"] = { number: jaime };
  if (reponses !== undefined) properties['Reponses recues (3j)'] = { number: reponses };
  if (reponseAuteur !== undefined) properties["Reponse de l'auteur (3j)"] = { checkbox: reponseAuteur };
  if (vuesProfil !== undefined) properties['Vues de profil (3j)'] = { number: vuesProfil };
  if (demandesContact !== undefined) properties['Demandes de contact (3j)'] = { number: demandesContact };

  if (Object.keys(properties).length === 0) {
    throw new Error('Aucun chiffre fourni -- rien a ecrire (au moins un des 5 champs est requis).');
  }

  return appelNotion(`/pages/${ligne.id}`, {
    method: 'PATCH',
    notionToken,
    body: { properties },
  });
}

module.exports = {
  creerBaseCommentaires,
  creerVueComparaisonHebdomadaire,
  calculerComparaisonHebdomadaire,
  ecrireBlocComparaisonHebdomadaire,
  ajouterLigneCommentaire,
  retrouverLigneCommentaire,
  mettreAJourStatistiques,
  PROPRIETES_COMMENTAIRES,
  COMPTES,
};
