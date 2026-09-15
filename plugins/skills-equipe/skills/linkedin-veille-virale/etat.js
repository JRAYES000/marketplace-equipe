#!/usr/bin/env node
'use strict';

/**
 * Point de situation en trois lignes, des la premiere ligne d'execution
 * (brief Julien du 10/09/2026, section 2, regle 2). Ajoute le 15/09/2026 --
 * cette skill n'en avait aucun jusqu'ici, trouve par l'audit du meme jour.
 *
 * Usage CLI :
 *   node etat.js [compte]
 *
 * Depuis l'audit du 15/09/2026 (asymmetrie avec linkedin-commentaires,
 * corrigee le meme jour) : cette skill tient desormais un registre reel des
 * posts publies/programmes (lib/registre.js, data/registre-veille.json,
 * gitignore) -- le quota hebdomadaire ci-dessous vient de ce registre, pas
 * d'une regle simplement documentee. Ce registre ne se remplit que si
 * `enregistrerPostPublie` est reellement appele apres une programmation
 * confirmee (voir SKILL.md, section "Publication") -- une programmation
 * jamais enregistree ici reste invisible pour ce point de situation, meme
 * si elle est reellement en ligne.
 */

const fs = require('fs');
const path = require('path');
const { chargerRegistre, entreesDeLaSemaine, debutSemaineISO } = require('./lib/registre');
const { dateJourISO, QUOTA_MAX_PAR_SEMAINE } = require('./lib/planifier-veille');
const reglages = require('./reglages-comptes.json');

function dernierFichierResultatsReels() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) return null;
  const candidats = fs
    .readdirSync(dataDir)
    .filter((f) => /^veille-resultats-reels-.*\.json$/.test(f))
    .sort()
    .reverse();
  if (candidats.length === 0) return null;
  return JSON.parse(fs.readFileSync(path.join(dataDir, candidats[0]), 'utf8'));
}

function postsAdaptesPrets(compte) {
  const dir = path.join(__dirname, 'a-publier');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(compte) && f.endsWith('.commentary.txt'));
}

function etatPourCompte(compte, config) {
  const lignes = [];
  const nbSurveilles = (config.comptes_a_surveiller || []).length;

  lignes.push(
    nbSurveilles > 0
      ? `${nbSurveilles} compte(s) surveille(s) configure(s) dans reglages-comptes.json (comptes_a_surveiller).`
      : 'Aucun compte surveille configure -- comptes_a_surveiller est vide.'
  );

  const resultats = dernierFichierResultatsReels();
  if (resultats) {
    const total = (resultats.posts || []).length;
    const aRediger = (resultats.posts || []).filter((p) => /^a rediger/.test(p.etat || '')).length;
    const redigesRecemment = total - aRediger;
    lignes.push(
      `Dernier passage de veille reel connu (${resultats.genere_le}) : ${resultats.nb_recuperes} posts ` +
      `recuperes, ${resultats.nb_retenus} retenus, ${redigesRecemment} deja rediges en post, ${aRediger} encore "a rediger".`
    );
  } else {
    lignes.push(
      'Aucun passage de veille reel connu sur cette machine (data/veille-resultats-reels-*.json ' +
      'absent -- gitignore, propre a chaque machine). "node dry-run.js" donne un apercu sur donnees fixture.'
    );
  }

  const prets = postsAdaptesPrets(compte);
  lignes.push(
    prets.length > 0
      ? `${prets.length} post(s) adapte(s) pret(s) dans a-publier/ pour ${compte} : ${prets.join(', ')}.`
      : `Aucun post adapte pret dans a-publier/ pour ${compte} a ce jour.`
  );

  const registre = chargerRegistre();
  const aujourdhui = dateJourISO(new Date());
  const entreesSemaine = entreesDeLaSemaine(registre, compte, aujourdhui);
  lignes.push(
    `Quota hebdomadaire (semaine du ${debutSemaineISO(aujourdhui)}) : ` +
    `${entreesSemaine.length}/${QUOTA_MAX_PAR_SEMAINE} posts deja publies/programmes pour ${compte}, ` +
    `${Math.max(0, QUOTA_MAX_PAR_SEMAINE - entreesSemaine.length)} restant(s) -- data/registre-veille.json.`
  );

  if (nbSurveilles === 0 && prets.length === 0) {
    lignes.push(
      'Repli propose : tant que comptes_a_surveiller est vide, lancer "node dry-run.js" sur le jeu ' +
      'fixture (fixtures/posts-exemple.json) pour verifier le pipeline, plutot que de rester sans rien a montrer.'
    );
  }

  return lignes;
}

function main() {
  const [, , compteDemande] = process.argv;
  const comptes = compteDemande ? [compteDemande] : Object.keys(reglages);

  for (const compte of comptes) {
    const config = reglages[compte];
    if (!config) {
      console.log(`Compte inconnu : "${compte}". Attendu : ${Object.keys(reglages).join(', ')}.`);
      continue;
    }
    console.log(`-- ${compte} --`);
    for (const ligne of etatPourCompte(compte, config)) {
      console.log(ligne);
    }
    console.log('');
  }
}

if (require.main === module) {
  main();
}

module.exports = { etatPourCompte, dernierFichierResultatsReels, postsAdaptesPrets };
