'use strict';

/**
 * Appels bas niveau a l'API Zernio (docs.zernio.com), canal de publication
 * des carrousels a partir du 24/09/2026 (mail de Julien -- Composio ne sait
 * pas publier de PDF, un carrousel publie via Composio jusque-la etait en
 * realite une grille d'images, pas un vrai document feuilletable).
 *
 * Base URL confirmee par deux sources independantes de la documentation
 * (exemple curl de /quickstart, et le README du SDK Node officiel qui
 * initialise `baseURL: 'https://zernio.com/api'`) -- PAS "api.zernio.com",
 * qui n'apparait que dans un resume ponctuel non confirme ailleurs.
 *
 * Trois appels, dans l'ordre (voir docs.zernio.com, rubriques "Media
 * uploads" et "LinkedIn") :
 *   1. presignerFichier  -- POST /v1/media/presign
 *   2. televerserFichier -- PUT vers l'uploadUrl renvoyee (pas d'auth)
 *   3. creerPost         -- POST /v1/posts, mediaItems[].type="document" +
 *                            platforms[].platformSpecificData.documentTitle
 */

const BASE_URL = 'https://zernio.com/api/v1';

function enteteAuth(apiKey) {
  if (!apiKey) throw new Error('apiKey requise (ZERNIO_API_KEY).');
  return { Authorization: `Bearer ${apiKey}` };
}

async function corpsErreur(reponse) {
  try {
    return await reponse.text();
  } catch {
    return '(corps illisible)';
  }
}

/** Etape 1 : demande une URL d'upload presignee pour un fichier local. */
async function presignerFichier({ apiKey, filename, contentType, size }) {
  if (!filename) throw new Error('filename requis.');
  if (!contentType) throw new Error('contentType requis.');

  const reponse = await fetch(`${BASE_URL}/media/presign`, {
    method: 'POST',
    headers: { ...enteteAuth(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType, ...(size ? { size } : {}) }),
  });
  if (!reponse.ok) {
    throw new Error(`Zernio: media/presign a echoue (HTTP ${reponse.status}) : ${await corpsErreur(reponse)}`);
  }
  const donnees = await reponse.json();
  if (!donnees.uploadUrl || !donnees.publicUrl) {
    throw new Error(`Zernio: media/presign a renvoye une reponse inexploitable : ${JSON.stringify(donnees)}`);
  }
  return donnees;
}

/** Etape 2 : depose l'octet-stream sur l'uploadUrl presignee (jamais d'Authorization ici). */
async function televerserFichier({ uploadUrl, contentType, buffer }) {
  if (!uploadUrl) throw new Error('uploadUrl requise.');
  if (!contentType) throw new Error('contentType requis.');
  if (!buffer) throw new Error('buffer requis.');

  const reponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: buffer,
  });
  if (!reponse.ok) {
    throw new Error(`Zernio: upload du fichier a echoue (HTTP ${reponse.status}) : ${await corpsErreur(reponse)}`);
  }
  return { ok: true, status: reponse.status };
}

/** Comptes LinkedIn (et autres) connectes sur le projet Zernio -- lecture seule. */
async function listerComptes({ apiKey }) {
  const reponse = await fetch(`${BASE_URL}/accounts`, {
    method: 'GET',
    headers: enteteAuth(apiKey),
  });
  if (!reponse.ok) {
    throw new Error(`Zernio: accounts a echoue (HTTP ${reponse.status}) : ${await corpsErreur(reponse)}`);
  }
  return reponse.json();
}

/**
 * Etape 3 : cree le post LinkedIn avec le PDF televerse comme document
 * (carrousel feuilletable natif LinkedIn -- documentTitle est le nom affiche
 * sous le post, jamais la date ni un numero, voir SKILL.md).
 */
async function creerPost({ apiKey, content, accountId, documentTitle, publicUrl, publishNow = true, scheduledFor, timezone }) {
  if (!content) throw new Error('content requis (texte du post).');
  if (!accountId) throw new Error('accountId requis.');
  if (!documentTitle) throw new Error('documentTitle requis.');
  if (!publicUrl) throw new Error('publicUrl requis (voir presignerFichier/televerserFichier).');

  const corps = {
    content,
    platforms: [
      {
        platform: 'linkedin',
        accountId,
        platformSpecificData: { documentTitle },
      },
    ],
    mediaItems: [{ type: 'document', url: publicUrl }],
    publishNow,
    ...(scheduledFor ? { scheduledFor } : {}),
    ...(timezone ? { timezone } : {}),
  };

  const reponse = await fetch(`${BASE_URL}/posts`, {
    method: 'POST',
    headers: { ...enteteAuth(apiKey), 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  if (!reponse.ok) {
    throw new Error(`Zernio: posts a echoue (HTTP ${reponse.status}) : ${await corpsErreur(reponse)}`);
  }
  return reponse.json();
}

module.exports = { BASE_URL, presignerFichier, televerserFichier, listerComptes, creerPost };
