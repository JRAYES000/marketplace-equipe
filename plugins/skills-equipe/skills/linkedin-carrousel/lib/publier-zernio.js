'use strict';

/**
 * Publication reelle des carrousels via Zernio (24/09/2026, mail de Julien) --
 * remplace le repli image Composio (lib/publier.js) pour julien-agency et
 * julien-partners : Zernio publie le PDF tel quel comme document LinkedIn
 * (carrousel feuilletable natif), pas une grille d'images.
 *
 * Garde-fou central : verifierCompteZernio() confirme, par un appel reel a
 * GET /v1/accounts, que l'accountId utilise correspond bien au compte
 * demande (compte Zernio actif, platform "linkedin", et -- quand l'API le
 * renvoie -- meme URL de profil que reglages-comptes.json) AVANT tout envoi.
 * Refus explicite si l'un de ces points ne colle pas, jamais un envoi "au
 * cas ou".
 */

const fs = require('fs');
const path = require('path');
const { presignerFichier, televerserFichier, listerComptes, creerPost } = require('./zernio');
const { validerAccents } = require('./valider-orthographe');
const { validerAnglicismes } = require('./valider-anglicismes');
const { retirerPointFinal } = require('../generer-pdf');

const COMPTES_CONNUS = ['julien-agency', 'julien-partners'];

function chargerReglages() {
  // require() mis en cache par Node -- delete du cache pour que les tests
  // qui manipulent un fichier reglages-comptes.json jetable restent fiables.
  const cheminReglages = path.join(__dirname, '..', 'reglages-comptes.json');
  delete require.cache[require.resolve(cheminReglages)];
  return require(cheminReglages);
}

/**
 * Confirme, par un appel reel a l'API Zernio, que le zernio_account_id
 * renseigne pour `compte` dans reglages-comptes.json existe bien, est actif,
 * porte sur LinkedIn, et correspond au bon profil -- jamais une simple
 * lecture du JSON local presentee comme une verification.
 */
async function verifierCompteZernio({ compte, apiKey, reglages }) {
  if (!compte) throw new Error('compte requis ("julien-agency" ou "julien-partners").');
  if (!COMPTES_CONNUS.includes(compte)) {
    throw new Error(`Compte inconnu pour la publication Zernio : "${compte}" (attendu : ${COMPTES_CONNUS.join(' ou ')}).`);
  }

  const reglagesComptes = reglages || chargerReglages();
  const entree = reglagesComptes[compte];
  if (!entree) {
    throw new Error(`Compte inconnu dans reglages-comptes.json : "${compte}".`);
  }
  if (!entree.zernio_account_id) {
    throw new Error(`Aucun "zernio_account_id" renseigne pour "${compte}" dans reglages-comptes.json.`);
  }

  const { accounts } = await listerComptes({ apiKey });
  const compteZernio = (accounts || []).find((c) => c._id === entree.zernio_account_id);

  if (!compteZernio) {
    throw new Error(
      `Verification refusee : aucun compte Zernio avec _id="${entree.zernio_account_id}" ` +
      `(attendu pour "${compte}") n'apparait dans GET /v1/accounts. Ne pas publier.`
    );
  }
  if (compteZernio.platform !== 'linkedin') {
    throw new Error(
      `Verification refusee : le compte Zernio "${entree.zernio_account_id}" attendu pour "${compte}" ` +
      `n'est pas de type "linkedin" (platform="${compteZernio.platform}"). Ne pas publier.`
    );
  }
  if (compteZernio.isActive === false) {
    throw new Error(
      `Verification refusee : le compte Zernio "${entree.zernio_account_id}" pour "${compte}" ` +
      'n\'est pas actif (isActive=false). Ne pas publier.'
    );
  }
  const urlAttendue = entree.zernio_linkedin_url;
  const urlObtenue = compteZernio.profileUrl;
  if (urlAttendue && urlObtenue && urlObtenue.replace(/\/$/, '') !== urlAttendue.replace(/\/$/, '')) {
    throw new Error(
      `Verification refusee : le profil LinkedIn du compte Zernio ("${urlObtenue}") ne correspond pas ` +
      `a celui attendu pour "${compte}" ("${urlAttendue}"). Ne pas publier -- accountId potentiellement ` +
      'attribue au mauvais compte dans reglages-comptes.json.'
    );
  }

  return { accountId: entree.zernio_account_id, compteZernio };
}

/**
 * Presign + upload du PDF du carrousel, apres verification du compte.
 * Ne publie rien : s'arrete une fois le fichier deppose sur le stockage
 * temporaire Zernio (publicUrl exploitable ensuite par publierDocumentZernio).
 */
async function preparerEnvoiZernio({ compte, cheminPdf, apiKey, reglages }) {
  if (!cheminPdf) throw new Error('cheminPdf requis.');
  if (!fs.existsSync(cheminPdf)) throw new Error(`Fichier introuvable : ${cheminPdf}`);

  const { accountId } = await verifierCompteZernio({ compte, apiKey, reglages });

  const buffer = fs.readFileSync(cheminPdf);
  const filename = path.basename(cheminPdf);
  const contentType = 'application/pdf';

  const presign = await presignerFichier({ apiKey, filename, contentType, size: buffer.length });
  await televerserFichier({ uploadUrl: presign.uploadUrl, contentType, buffer });

  return {
    accountId,
    publicUrl: presign.publicUrl,
    key: presign.key,
    filename,
    tailleOctets: buffer.length,
  };
}

/**
 * Publication reelle : appelle POST /v1/posts avec le document deja
 * televerse (publicUrl de preparerEnvoiZernio). Revalidee independamment
 * (un nouvel appel a verifierCompteZernio) pour ne jamais publier sur la foi
 * d'une verification faite plusieurs minutes plus tot dans un autre appel.
 */
async function publierDocumentZernio({ compte, content, publicUrl, documentTitle, apiKey, publishNow = true, scheduledFor, timezone, reglages }) {
  if (!content) throw new Error('content requis (texte du post, deja valide par generer-post.js).');
  if (!publicUrl) throw new Error('publicUrl requis (voir preparerEnvoiZernio).');
  if (!documentTitle) throw new Error('documentTitle requis.');
  // Ajoute le 25/09/2026 (retour de Julien) : "L'IA declarative" dans le
  // documentTitle du carrousel publie ce jour n'etait verifie par aucun
  // garde-fou -- generer-post.js/valider-post.js ne portent que sur le
  // TEXTE du post, jamais sur ce titre, passe tel quel en argument CLI.
  // Meme controle que le texte du post (liste fermee des mots toujours
  // accentues, lib/valider-orthographe.js), applique ici avant tout appel
  // reseau Zernio.
  // Bug reel trouve le 25/09/2026 (meme jour, suite) : un documentTitle
  // recopie directement depuis le titre de la diapo hook (qui se termine
  // souvent par une phrase complete, ex. "...Voici pourquoi.") porte le
  // meme point final que celui qui produisait "Titre..pdf" sur le nom de
  // fichier (voir retirerPointFinal, generer-pdf.js) -- retire ICI, avant
  // tout controle et tout envoi, pour que ce qui part vers Zernio soit
  // toujours nettoye, meme si l'appelant ne l'a pas fait lui-meme.
  const documentTitleNettoye = retirerPointFinal(documentTitle);
  validerAccents(documentTitleNettoye);
  // Retour de Julien par mail (25/09/2026) : meme trois surfaces que le
  // controle d'accents ci-dessus -- diapos, documentTitle, texte du post.
  validerAnglicismes(documentTitleNettoye, 'documentTitle');

  // Programmation (ajoute le 26/09/2026, demande de Julien -- confirme via
  // docs.zernio.com/quickstart, etape 5, lu directement le meme jour) :
  // `scheduledFor` (heure LOCALE ISO 8601 sans decalage, ex.
  // "2026-09-26T08:30:00") + `timezone` (nom IANA, ex. "Europe/Paris").
  // Zernio convertit lui-meme vers UTC a partir de ces deux valeurs. Refuse
  // explicitement l'un sans l'autre -- une programmation a moitie renseignee
  // n'a pas de sens. `publishNow` passe automatiquement a `false` des que
  // `scheduledFor` est fourni : envoyer les deux en meme temps contredirait
  // l'exemple officiel (qui n'envoie jamais `publishNow` avec un post
  // programme) et risquerait une publication immediate malgre la demande de
  // programmation.
  if ((scheduledFor && !timezone) || (!scheduledFor && timezone)) {
    throw new Error('scheduledFor et timezone doivent etre fournis ensemble, ou aucun des deux.');
  }
  const publishNowFinal = scheduledFor ? false : publishNow;

  const { accountId } = await verifierCompteZernio({ compte, apiKey, reglages });

  return creerPost({
    apiKey,
    content,
    accountId,
    documentTitle: documentTitleNettoye,
    publicUrl,
    publishNow: publishNowFinal,
    ...(scheduledFor ? { scheduledFor, timezone } : {}),
  });
}

module.exports = { verifierCompteZernio, preparerEnvoiZernio, publierDocumentZernio, COMPTES_CONNUS };
