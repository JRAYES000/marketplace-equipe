#!/usr/bin/env node
'use strict';

/**
 * Genere le lead magnet "checklist recrutement" (PDF A4, une page) promis
 * dans le post Zernio julien-agency programme pour le 26/09/2026 08:30 Paris
 * (id `6ab66ea404c51b0900f1e2db`, voir SKILL.md). Contenu en continuite
 * directe du carrousel source (`a-publier/julien-agency-2026-09-25-test-regles-mail.json`) :
 * meme chiffre source (Yaggo/Ifop, janvier 2026), meme delai de relance
 * (48 heures), meme reseau de recommandations, memes signaux d'un
 * processus qui s'essouffle.
 *
 * Usage : node generer-checklist-pdf.js
 * Sortie : a-publier/julien-agency-2026-09-26-checklist-recrutement.pdf
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { dataUriDepuisAsset } = require('./lib/assets');

const SKILL_DIR = __dirname;
const TEMPLATE = path.join(SKILL_DIR, 'templates', 'checklist-a4.html');
const SORTIE = path.join(SKILL_DIR, 'a-publier', 'julien-agency-2026-09-26-checklist-recrutement.pdf');

const POLICE_BRICOLAGE = 'fonts/bricolage-grotesque-variable.woff2';
const POLICE_SCHIBSTED = 'fonts/schibsted-grotesk-variable.woff2';
const LOGO_FICHIER = 'logo-claude-agency-512.png';
const PHOTO_FICHIER = 'photo-julien-rayes.png';

// Contenu : 10 points actionnables, chacun avec un exemple concret. Le seul
// chiffre cite (point 2) reprend exactement la source deja verifiee dans le
// carrousel du 25/09/2026 -- aucun chiffre nouveau invente ici.
const ITEMS = [
  {
    titre: 'Accusez réception en moins de 24 heures',
    exemple: 'Un message confirme la réception de la candidature dès son envoi, avant même le premier tri.',
  },
  {
    titre: 'Répondez dans un délai maximum de deux semaines',
    exemple: 'Annoncez au candidat la date de votre réponse dès le premier échange.',
  },
  {
    titre: 'Relancez sous 48 heures après chaque étape',
    exemple: 'Un entretien passé le lundi appelle un retour au plus tard le mercredi, même pour dire qu’aucune décision n’est encore prise.',
  },
  {
    titre: 'Surveillez qui relance qui',
    exemple: 'Notez la date de chaque échange. Sans nouvelle de vous depuis 48 h, relancez.',
  },
  {
    titre: 'Tenez un vivier de candidats visible en continu',
    exemple: 'Une liste à jour des profils sérieux des recrutements précédents, consultée avant d’ouvrir une nouvelle annonce.',
  },
  {
    titre: 'Activez le réseau de recommandations avant les annonces en ligne',
    exemple: '« Qui connaissez-vous pour ce poste ? » posé à l’équipe en place dès l’ouverture du poste, pas après un mois de recherche infructueuse.',
  },
  {
    titre: 'Donnez un retour concret après chaque entretien',
    exemple: 'Un point fort et un point à retravailler, communiqués au candidat, pas un simple accusé de réception poli.',
  },
  {
    titre: 'Cadrez l’offre avant de lancer le recrutement',
    exemple: 'Fourchette de salaire, date de démarrage souhaitée et nombre d’étapes écrits noir sur blanc avant le premier entretien.',
  },
  {
    titre: 'Limitez le nombre d’étapes d’entretien',
    exemple: 'Deux échanges au maximum avant une décision, pas quatre entretiens étalés sur trois semaines.',
  },
  {
    titre: 'Centralisez la décision finale',
    exemple: 'Une seule personne chargée de trancher, pour éviter qu’un candidat attende l’avis de trois interlocuteurs en parallèle.',
  },
];

const TITRE = 'Pourquoi vos candidats disparaissent avant l’offre';
const TITRE_ACCENT = 'disparaissent avant l’offre';
const INTRO =
  'Un recrutement ne s’essouffle presque jamais à cause du salaire proposé. Il s’essouffle sur le rythme. ' +
  'Voici les 10 points à vérifier cette semaine avant de perdre votre prochain candidat sérieux.';
const SOURCE_LIGNE =
  'Source du délai de deux semaines (point 2) : Yaggo/Ifop, baromètre expérience candidat, janvier 2026.';
const IA_LIGNE =
  'Accusés de réception, relances à 48 h : l’IA peut les envoyer pour vous. C’est le métier de Claude Agency.';
const CTA_LIGNE =
  'Vous recevez cette checklist parce que vous avez écrit « recrutement » en message privé. ' +
  'Pour en discuter, répondez directement à ce message.';
const SITE_LIGNE = 'claudeagency.fr';

function echapperHtml(texte) {
  return String(texte)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function titreAvecAccent(titre, accent) {
  const texte = String(titre || '');
  const segment = String(accent || '');
  const index = segment ? texte.indexOf(segment) : -1;
  if (index === -1) return echapperHtml(texte);
  const avant = texte.slice(0, index);
  const milieu = texte.slice(index, index + segment.length);
  const apres = texte.slice(index + segment.length);
  return `${echapperHtml(avant)}<span class="accent-mot">${echapperHtml(milieu)}</span>${echapperHtml(apres)}`;
}

function itemsHtml(items) {
  return items
    .map(
      (item, index) => `
      <li class="checklist-item">
        <div class="check-bubble">${index + 1}</div>
        <div class="item-body">
          <p class="item-titre">${echapperHtml(item.titre)}</p>
          <p class="item-exemple">${item.exemple}</p>
        </div>
      </li>`
    )
    .join('\n');
}

function construireDocument() {
  let html = fs.readFileSync(TEMPLATE, 'utf-8');
  html = html
    .replaceAll('{{FONT_BRICOLAGE_DATAURI}}', dataUriDepuisAsset(POLICE_BRICOLAGE))
    .replaceAll('{{FONT_SCHIBSTED_DATAURI}}', dataUriDepuisAsset(POLICE_SCHIBSTED))
    .replaceAll('{{LOGO_DATAURI}}', dataUriDepuisAsset(LOGO_FICHIER))
    .replaceAll('{{PHOTO_DATAURI}}', dataUriDepuisAsset(PHOTO_FICHIER))
    .replaceAll('{{NOM_MARQUE}}', 'Claude Agency')
    .replaceAll('{{EYEBROW}}', 'La checklist complète')
    .replaceAll('{{TITRE_HTML}}', titreAvecAccent(TITRE, TITRE_ACCENT))
    .replaceAll('{{INTRO}}', echapperHtml(INTRO))
    .replaceAll('{{ITEMS_HTML}}', itemsHtml(ITEMS))
    .replaceAll('{{SOURCE_LIGNE}}', echapperHtml(SOURCE_LIGNE))
    .replaceAll('{{IA_LIGNE}}', echapperHtml(IA_LIGNE))
    .replaceAll('{{AUTEUR_NOM}}', 'Julien Rayes')
    .replaceAll('{{AUTEUR_ROLE}}', 'Claude Agency')
    .replaceAll('{{CTA_LIGNE}}', echapperHtml(CTA_LIGNE))
    .replaceAll('{{SITE_LIGNE}}', echapperHtml(SITE_LIGNE));
  return html;
}

async function mesurerHauteurReelle(page) {
  return page.evaluate(() => {
    const p = document.querySelector('.page');
    const footer = document.querySelector('.footer-wrap');
    const r1 = p.getBoundingClientRect();
    const r2 = footer.getBoundingClientRect();
    return { hauteurPage: r1.height, basFooter: r2.bottom - r1.top };
  });
}

async function genererPdf() {
  const html = construireDocument();
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({ viewport: { width: 794, height: 1123 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    const mesure = await mesurerHauteurReelle(page);
    if (mesure.basFooter > 1123) {
      throw new Error(
        `Checklist refusee : le contenu deborde de la page A4 (bas du pied de page a ${mesure.basFooter.toFixed(1)}px, ` +
        `limite 1123px). Reduire le texte ou les marges avant de regenerer.`
      );
    }

    fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
    await page.screenshot({ path: SORTIE.replace(/\.pdf$/, '.verif.png') });
    await page.pdf({
      path: SORTIE,
      width: '210mm',
      height: '297mm',
      printBackground: true,
      margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
    });
    return SORTIE;
  } finally {
    await navigateur.close();
  }
}

if (require.main === module) {
  genererPdf()
    .then((sortie) => console.log(`PDF genere : ${sortie}`))
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
}

module.exports = { genererPdf, construireDocument };
