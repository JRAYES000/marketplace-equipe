'use strict';

/**
 * Charge le .env local de CETTE skill dans process.env, au demarrage.
 * Meme mecanisme que linkedin-carrousel/publier-zernio.js (24-25/09/2026) :
 * pas de dependance dotenv (voir package.json), lecture minimale, jamais de
 * valeur affichee ni ecrite ailleurs, jamais d'ecrasement d'une variable deja
 * definie dans l'environnement (priorite a l'environnement reel sur le
 * fichier local).
 */
const fs = require('fs');
const path = require('path');

function chargerEnvLocal() {
  // __dirname = <skill>/lib -- la racine de la skill est un niveau au-dessus.
  const cheminEnv = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(cheminEnv)) return;
  // Coupe sur \r?\n (pas seulement \n) : un .env avec fins de ligne Windows
  // (CRLF) laissait un \r final colle a la valeur, invisible pour ".*$" en
  // JS -- meme piege que publier-zernio.js, trouve le 25/09/2026.
  for (const ligne of fs.readFileSync(cheminEnv, 'utf-8').split(/\r?\n/)) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

module.exports = { chargerEnvLocal };
