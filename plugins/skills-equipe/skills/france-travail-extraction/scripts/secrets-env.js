// Complete l'environnement avec le fichier ecrit par charger-secrets.sh (v9.2).
// Une variable deja presente dans l'environnement l'emporte toujours sur le fichier.
// Rien n'est jamais affiche. Le fichier part a la corbeille avec le lot (nettoyer-cv.sh).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const DOSSIER = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'state'), 'france-travail-extraction');
const FICHIER = process.env.FT_SECRETS || path.join(DOSSIER, 'secrets.env');
try {
  for (const l of fs.readFileSync(FICHIER, 'utf8').split(/\r?\n/)) {
    const i = l.indexOf('=');
    if (i < 1) continue;
    const k = l.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = l.slice(i + 1);
  }
} catch {}

module.exports = { DOSSIER, FICHIER };
