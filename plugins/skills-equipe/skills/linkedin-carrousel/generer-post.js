#!/usr/bin/env node
'use strict';

/**
 * Valide et convertit un brouillon de texte de post (gras en **etoiles**)
 * selon les regles d'ecriture du brief Julien du 10/09/2026 -- refuse
 * explicitement le brouillon (code de sortie 1, message precis) si une
 * regle est violee, plutot que de publier quelque chose de non conforme.
 * Julien ne relit rien : ce script est le seul filet avant publication.
 *
 * Usage CLI :
 *   node generer-post.js <brouillon.txt> [sortie.txt]
 *
 * <brouillon.txt> : texte du post, gras marque par **deux etoiles**.
 * [sortie.txt]    : si fourni, le texte final (gras converti en Unicode) y
 *                   est ecrit ; sinon, imprime sur la sortie standard.
 */

const fs = require('fs');
const { validerEtConvertirPost } = require('./lib/valider-post');

function main() {
  const [, , cheminBrouillon, sortie] = process.argv;
  if (!cheminBrouillon) {
    console.error('Usage : node generer-post.js <brouillon.txt> [sortie.txt]');
    process.exitCode = 1;
    return;
  }
  const brouillon = fs.readFileSync(cheminBrouillon, 'utf-8');
  const texteFinal = validerEtConvertirPost(brouillon);

  if (sortie) {
    fs.writeFileSync(sortie, texteFinal, 'utf-8');
    console.log(`Post valide et converti : ${sortie}`);
  } else {
    console.log(texteFinal);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}

module.exports = { main };
