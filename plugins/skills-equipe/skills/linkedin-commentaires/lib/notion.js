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
  // Audit adversarial du 15/09/2026 : `reponse.json()` etait appele sans
  // filet -- un 500 renvoyant une page d'erreur HTML, un 429 (rate limit)
  // renvoyant du texte brut, ou un corps tronque faisaient planter cette
  // fonction avec un SyntaxError brut au lieu du message explicite prevu
  // par `messageErreurNotion` juste en dessous. Le corps est lu une seule
  // fois en texte, puis parse -- jamais deux lectures du meme flux.
  const texteBrut = await reponse.text();
  let json;
  try {
    json = texteBrut ? JSON.parse(texteBrut) : {};
  } catch (erreur) {
    throw new Error(
      `Notion a repondu ${reponse.status} avec un corps qui n'est pas du JSON exploitable ` +
      `(${erreur.message}). Debut du corps recu : "${texteBrut.slice(0, 200)}". ` +
      (reponse.status === 429
        ? 'Probablement une limite de frequence (rate limit) -- reessayez apres une pause.'
        : 'Probablement une panne cote Notion -- reessayez plus tard.')
    );
  }
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
// Faille de conception trouvee et corrigee le 15/09/2026 (voir
// lib/statistiques-profil.js pour le detail) : "Vues de profil (3j)" et
// "Demandes de contact (3j)" ont ete RETIREES du schema des lignes de
// commentaire -- ce sont des mesures de PROFIL datees, pas des proprietes
// d'un commentaire, et les additionner par ligne (comme le faisait
// `calculerComparaisonHebdomadaire` avant cette date) gonflait le tableau de
// comparaison hebdomadaire d'un facteur egal au nombre de commentaires du
// jour. Elles vivent desormais dans data/statistiques-profil.json (un
// releve par jour, lib/statistiques-profil.js). La base Notion deja creee
// le 15/09/2026 porte encore ces deux colonnes sur son schema d'origine --
// laissees vides, mortes, sans consequence : plus aucun code n'y ecrit.
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

/**
 * FAILLE DE CONCEPTION TROUVEE ET CORRIGEE (15/09/2026, avant toute donnee
 * reelle ecrite) : cette fonction prenait un seul tableau `lignes` (les
 * commentaires) et lisait `ligne.vuesProfil`/`ligne.demandesContact` dessus,
 * additionnees a chaque ligne -- 5 commentaires publies le meme jour,
 * portant chacun le MEME chiffre global de profil (ecrit 5 fois par erreur,
 * ou simplement parce que ce chiffre est global et identique ce jour-la),
 * produisaient un total 5 fois trop eleve dans le tableau de comparaison
 * hebdomadaire. Voir lib/statistiques-profil.js pour le detail complet.
 *
 * Desormais deux parametres separes, correspondant a deux natures de
 * donnees differentes :
 * - `lignesCommentaires` : une ligne = un commentaire reellement publie.
 *   Seul `nombreCommentaires` en depend (compte les lignes, correct par
 *   nature -- chaque commentaire compte une fois).
 * - `relevesProfil` : une entree = UN releve quotidien de profil (voir
 *   `lib/statistiques-profil.js`, `listeReleves()`). Deduplique par date
 *   AVANT agregation (une seule entree retenue par date, meme si
 *   l'appelant en fournit plusieurs par erreur) : c'est le filet qui
 *   empeche la faille du 15/09/2026 de revenir, structurellement, meme si
 *   un futur appelant se trompe et repasse un releve par commentaire.
 */
function calculerComparaisonHebdomadaire(lignesCommentaires, relevesProfil = []) {
  const semaines = new Map();

  function semaineDe(cle, debutSemaine) {
    if (!semaines.has(cle)) {
      semaines.set(cle, { semaine: cle, debutSemaine, nombreCommentaires: 0, vuesProfil: 0, demandesContact: 0 });
    }
    return semaines.get(cle);
  }

  for (const ligne of lignesCommentaires || []) {
    if (!ligne || !ligne.date) continue;
    const { cle, debutSemaine } = numeroSemaineISO(ligne.date);
    semaineDe(cle, debutSemaine).nombreCommentaires += 1;
  }

  const relevesParDate = new Map();
  for (const releve of relevesProfil || []) {
    if (!releve || !releve.date) continue;
    relevesParDate.set(releve.date, releve); // dedoublonnage -- voir docstring
  }
  for (const releve of relevesParDate.values()) {
    const { cle, debutSemaine } = numeroSemaineISO(releve.date);
    const agg = semaineDe(cle, debutSemaine);
    agg.vuesProfil += releve.vuesProfil || 0;
    agg.demandesContact += releve.demandesContact || 0;
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
 * EXECUTE REELLEMENT le 15/09/2026 (bloc reel cree, contenu relu et verifie --
 * voir SKILL.md). **`pageId` doit etre la PAGE PARENTE de la base
 * "Commentaires" (ex. "LinkedIn — Veille & Commentaires"), jamais l'ID de la
 * base elle-meme** : confirme par un vrai `400 validation_error` ("Block does
 * not support children") en essayant d'abord sur l'ID de la base -- une base
 * de donnees, meme en pleine page, n'est pas un conteneur de blocs enfants
 * au sens de l'API. Le `page_id` du `parent` d'une base se lit via `GET
 * /v1/databases/{id}` (`response.parent.page_id`).
 */
async function ecrireBlocComparaisonHebdomadaire({ pageId, lignes, relevesProfil = [], notionToken } = {}) {
  if (!pageId) throw new Error('pageId requis (page PARENTE de la base "Commentaires", pas la base elle-meme -- voir GET /v1/databases/{id}.parent.page_id).');
  const semaines = calculerComparaisonHebdomadaire(lignes, relevesProfil);

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

/**
 * Ecrit les statistiques a 3 jours d'UN commentaire (J'aime, reponses,
 * reponse de l'auteur). Retire le 15/09/2026 : `vuesProfil`/`demandesContact`
 * -- ce ne sont pas des proprietes d'un commentaire mais des mesures de
 * profil datees, voir `lib/statistiques-profil.js`
 * (`enregistrerReleveProfil`) pour ces deux chiffres.
 */
async function mettreAJourStatistiques({
  dataSourceId, auteurCible, date, jaime, reponses, reponseAuteur, notionToken,
} = {}) {
  const ligne = await retrouverLigneCommentaire({ dataSourceId, auteurCible, date, notionToken });

  const properties = {};
  if (jaime !== undefined) properties["J'aime recus (3j)"] = { number: jaime };
  if (reponses !== undefined) properties['Reponses recues (3j)'] = { number: reponses };
  if (reponseAuteur !== undefined) properties["Reponse de l'auteur (3j)"] = { checkbox: reponseAuteur };

  if (Object.keys(properties).length === 0) {
    throw new Error('Aucun chiffre fourni -- rien a ecrire (au moins un des 3 champs est requis).');
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
