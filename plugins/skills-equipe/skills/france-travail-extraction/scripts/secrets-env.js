// Complete l'environnement avec le fichier ecrit par charger-secrets.sh (v9.2).
// Une variable deja presente dans l'environnement l'emporte toujours sur le fichier.
// Rien n'est jamais affiche. Le fichier part a la corbeille avec le lot (nettoyer-cv.sh).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

// v11.2 : un dossier par projet (FT_PROJET=mdc -> france-travail-extraction-mdc). File d'attente,
// hors-cible et telechargements ne se melangent plus entre deux bases Notion. Sans FT_PROJET :
// le dossier historique, celui de l'Ecole.
const PROJET = (process.env.FT_PROJET || '').toLowerCase();
if (PROJET && !/^[a-z0-9-]{1,30}$/.test(PROJET)) { console.error('ERREUR : FT_PROJET invalide (lettres, chiffres, tirets)'); process.exit(1); }
const DOSSIER = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.local', 'state'), 'france-travail-extraction' + (PROJET ? '-' + PROJET : ''));
const FICHIER = process.env.FT_SECRETS || path.join(DOSSIER, 'secrets.env');
try {
  for (const l of fs.readFileSync(FICHIER, 'utf8').split(/\r?\n/)) {
    const i = l.indexOf('=');
    if (i < 1) continue;
    const k = l.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = l.slice(i + 1);
  }
} catch {}

module.exports = { DOSSIER, FICHIER, PROJET };
