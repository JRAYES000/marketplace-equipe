'use strict';

/**
 * Encode un fichier de `assets/` en data URI, pour l'injecter dans les
 * templates au moment du rendu (Playwright n'a pas d'URL de base pour
 * resoudre un chemin relatif -- meme raison que les polices deja en
 * base64 dans les gabarits, voir templates/*.html).
 *
 * Objectif explicite (demande de Nomena, refonte du 24/09/2026) : garder
 * chaque image de marque (logo, photo) dans un vrai fichier a part sous
 * assets/, jamais bakee a la main dans le HTML -- remplacer une image
 * revient a remplacer CE fichier, sans toucher au template ni au code.
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const MIME_PAR_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/**
 * `cheminRelatif` est relatif a assets/ (ex. "logo-claude-agency-512.png",
 * "fonts/schibsted-grotesk-variable.woff2"). Erreur explicite si le fichier
 * n'existe pas ou si l'extension n'est pas reconnue -- jamais un data URI
 * vide ou faux rendu silencieusement.
 */
function dataUriDepuisAsset(cheminRelatif) {
  const chemin = path.join(ASSETS_DIR, cheminRelatif);
  if (!fs.existsSync(chemin)) {
    throw new Error(`Asset introuvable : "${chemin}".`);
  }
  const extension = path.extname(chemin).toLowerCase();
  const mime = MIME_PAR_EXTENSION[extension];
  if (!mime) {
    throw new Error(
      `Type de fichier non pris en charge pour un data URI : "${chemin}" (extension "${extension}").`
    );
  }
  const contenu = fs.readFileSync(chemin);
  return `data:${mime};base64,${contenu.toString('base64')}`;
}

/**
 * Meme principe que `dataUriDepuisAsset`, mais pour une image de diapo
 * fournie par son chemin complet (ex. une image generee par fal.ai, hors de
 * assets/) -- utilise par le champ optionnel `image` d'une diapo (voir
 * generer-pdf.js, gabarits "gros-chiffre"/"comparaison"/"checklist"/"citation").
 */
function dataUriDepuisChemin(chemin) {
  if (!fs.existsSync(chemin)) {
    throw new Error(`Image de diapo introuvable : "${chemin}".`);
  }
  const extension = path.extname(chemin).toLowerCase();
  const mime = MIME_PAR_EXTENSION[extension];
  if (!mime) {
    throw new Error(
      `Type de fichier non pris en charge pour un data URI : "${chemin}" (extension "${extension}").`
    );
  }
  return `data:${mime};base64,${fs.readFileSync(chemin).toString('base64')}`;
}

module.exports = { dataUriDepuisAsset, dataUriDepuisChemin, ASSETS_DIR };
