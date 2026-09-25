#!/usr/bin/env node
'use strict';

/**
 * Publication d'un carrousel LinkedIn via Zernio (24/09/2026, mail de
 * Julien -- remplace le repli image Composio pour la publication reelle :
 * Zernio depose le PDF tel quel, LinkedIn l'affiche en document feuilletable
 * natif, pas une grille d'images separees).
 *
 * Usage CLI :
 *   node publier-zernio.js <compte> <pdf> <documentTitle> [texte-post.txt] [--publier] [--schedule <scheduledFor> <timezone>]
 *
 * <compte>          julien-agency | julien-partners
 * <pdf>             chemin du PDF du carrousel (voir generer-pdf.js)
 * <documentTitle>   nom affiche sous le post LinkedIn -- titre lisible en
 *                    francais, sans date ni numero (meme regle que le nom de
 *                    fichier de sortie, voir SKILL.md)
 * [texte-post.txt]  texte du post deja valide par generer-post.js -- requis
 *                    uniquement avec --publier
 * --publier         appelle reellement POST /v1/posts. ABSENT PAR DEFAUT :
 *                    sans ce drapeau, le script s'arrete apres la
 *                    verification du compte et l'envoi du PDF (presign +
 *                    upload), et n'appelle jamais /v1/posts.
 * --schedule <scheduledFor> <timezone>
 *                    Programme le post au lieu de le publier immediatement --
 *                    exige --publier (l'appel reseau reel a /v1/posts a lieu
 *                    dans les deux cas, seul le moment de diffusion change).
 *                    `scheduledFor` : heure LOCALE au format ISO 8601 SANS
 *                    decalage (ex. "2026-09-26T08:30:00"), `timezone` : nom
 *                    IANA (ex. "Europe/Paris") -- Zernio convertit lui-meme
 *                    vers UTC a partir de ces deux valeurs (confirme par
 *                    l'exemple officiel de docs.zernio.com/quickstart, etape
 *                    5, lu directement le 26/09/2026). `publishNow` passe
 *                    automatiquement a `false` des que `--schedule` est
 *                    fourni -- jamais les deux a la fois.
 *
 * Cle API : ZERNIO_API_KEY, lue depuis l'environnement (voir .env.example).
 * Jamais affichee, jamais ecrite dans un fichier suivi par git.
 */

const fs = require('fs');
const path = require('path');
const { preparerEnvoiZernio, publierDocumentZernio } = require('./lib/publier-zernio');

function chargerEnvLocal() {
  // Pas de dependance dotenv dans ce paquet (voir package.json) : lecture
  // minimale du .env local, jamais commite (voir .gitignore racine).
  const cheminEnv = path.join(__dirname, '.env');
  if (!fs.existsSync(cheminEnv)) return;
  // Coupe sur \r?\n (pas seulement \n) : un .env avec fins de ligne Windows
  // (CRLF) laissait un \r final colle a la valeur, que ".*$" ne consomme
  // jamais (le \r n'est pas capture par "." en JS) -- la ligne entiere ne
  // matchait alors plus du tout, silencieusement. Trouve le 25/09/2026 en
  // publiant reellement depuis une session Windows.
  for (const ligne of fs.readFileSync(cheminEnv, 'utf-8').split(/\r?\n/)) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

function masquerUrlSignee(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname} (parametres de signature masques)`;
  } catch {
    return '(url illisible)';
  }
}

async function main() {
  chargerEnvLocal();

  const args = process.argv.slice(2);
  const publier = args.includes('--publier');

  const idxSchedule = args.indexOf('--schedule');
  let scheduledFor;
  let timezone;
  const indicesAIgnorer = new Set();
  if (idxSchedule !== -1) {
    scheduledFor = args[idxSchedule + 1];
    timezone = args[idxSchedule + 2];
    indicesAIgnorer.add(idxSchedule).add(idxSchedule + 1).add(idxSchedule + 2);
    if (!scheduledFor || !timezone) {
      console.error('--schedule exige deux valeurs : <scheduledFor ISO local, ex. "2026-09-26T08:30:00"> <timezone IANA, ex. "Europe/Paris">');
      process.exitCode = 1;
      return;
    }
  }

  const positionnels = args.filter((a, i) => a !== '--publier' && !indicesAIgnorer.has(i));
  const [compte, cheminPdf, documentTitle, cheminTextePost] = positionnels;

  if (!compte || !cheminPdf || !documentTitle) {
    console.error(
      'Usage : node publier-zernio.js <compte> <pdf> <documentTitle> [texte-post.txt] [--publier]'
    );
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.ZERNIO_API_KEY;
  if (!apiKey) {
    console.error('ZERNIO_API_KEY absente de l\'environnement (voir .env, jamais commite).');
    process.exitCode = 1;
    return;
  }

  console.log(`Verification du compte Zernio pour "${compte}"...`);
  const envoi = await preparerEnvoiZernio({ compte, cheminPdf, apiKey });
  console.log(`Compte verifie : accountId="${envoi.accountId}" (correspond a "${compte}").`);
  console.log(`Fichier televerse : "${envoi.filename}" (${envoi.tailleOctets} octets).`);
  console.log(`URL publique (temporaire, 7 jours) : ${envoi.publicUrl}`);
  console.log(`Cle de stockage : ${envoi.key}`);

  if (!publier) {
    console.log('');
    console.log('--publier absent : aucun appel a POST /v1/posts. Rien n\'a ete publie.');
    return;
  }

  if (!cheminTextePost) {
    console.error('--publier demande un texte de post : node publier-zernio.js <compte> <pdf> <documentTitle> <texte-post.txt> --publier');
    process.exitCode = 1;
    return;
  }
  const content = fs.readFileSync(cheminTextePost, 'utf-8').trim();

  console.log('');
  console.log(
    scheduledFor
      ? `Programmation reelle (POST /v1/posts) pour ${scheduledFor} (${timezone})...`
      : 'Publication reelle (POST /v1/posts)...'
  );
  const resultat = await publierDocumentZernio({
    compte,
    content,
    publicUrl: envoi.publicUrl,
    documentTitle,
    apiKey,
    ...(scheduledFor ? { scheduledFor, timezone } : {}),
  });
  console.log(`Resultat : id="${resultat.post && resultat.post._id}", statut="${resultat.post && resultat.post.status}".`);
  if (resultat.post && resultat.post.scheduledFor) {
    console.log(`Programme pour (confirme par Zernio) : ${resultat.post.scheduledFor}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  });
}

module.exports = { main, masquerUrlSignee };
