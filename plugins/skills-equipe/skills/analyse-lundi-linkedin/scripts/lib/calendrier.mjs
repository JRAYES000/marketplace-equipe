// Calendrier du test des formats : génération, heures Paris ↔ UTC, contrôle des créneaux.
// Les heures sont toujours des heures de Paris ; l'UTC est calculé avec Intl (changement d'heure
// du 25/10/2026 compris), jamais à la main et jamais avec l'horloge de la machine.

const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

// Cases de la grille : lignes = semaines, colonnes = jours du test (mar, mer, jeu, ven).
// 2 textes et 2 carrousels par ligne ET par colonne : chaque format tombe deux fois sur chaque jour.
// Le compte « B » prend la grille inverse : le même jour, les deux comptes testent des formats opposés.
export const GRILLE_A = ['TCTC', 'CTCT', 'TTCC', 'CCTT'];

const inverser = (ligne) => [...ligne].map((c) => (c === 'T' ? 'C' : 'T')).join('');

/** Décalage d'un fuseau (Paris par défaut) par rapport à l'UTC, en minutes, à un instant donné. */
function decalageMinutes(instant, fuseau = 'Europe/Paris') {
  const morceau = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau,
    timeZoneName: 'longOffset',
  })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName').value; // « GMT+02:00 »
  const m = morceau.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/**
 * « 2026-10-06 », « 08:30 » lus dans un fuseau donné (nom IANA, ex. « Europe/Minsk » affiché par Buffer)
 * → Date UTC. Intl fait le calcul, changement d'heure compris.
 */
export function heureLocaleVersUtc(date, heure, fuseau) {
  const [a, mo, j] = date.split('-').map(Number);
  const [h, mi] = heure.split(':').map(Number);
  const naif = Date.UTC(a, mo - 1, j, h, mi);
  let instant = new Date(naif - decalageMinutes(new Date(naif), fuseau) * 60000);
  instant = new Date(naif - decalageMinutes(instant, fuseau) * 60000); // 2e passage : autour du changement d'heure
  return instant;
}

/** « 2026-10-06 », « 08:30 » (heure de Paris) → Date UTC. */
export const parisVersUtc = (date, heure) => heureLocaleVersUtc(date, heure, 'Europe/Paris');

/** Date UTC → { date, heure, jour } en heure de Paris. */
export function utcVersParis(instant) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).map((x) => [x.type, x.value]),
  );
  const date = `${p.year}-${p.month}-${p.day}`;
  return { date, heure: `${p.hour}:${p.minute}`, jour: JOURS[new Date(`${date}T12:00:00Z`).getUTCDay()] };
}

export const ajouterJours = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const jourSemaine = (date) => new Date(`${date}T12:00:00Z`).getUTCDay();

/**
 * Associe à chaque case « texte » un carrousel du même sujet, à au moins `ecartMinJours` jours,
 * avec autant de paires « texte d'abord » que de paires « carrousel d'abord ».
 * Recherche exhaustive (8! = 40 320 cas) : le premier arrangement valide, toujours le même.
 */
export function apparierSujets(textes, carrousels, ecartMinJours = 8) {
  const n = textes.length;
  const dansOrdre = (perm) => {
    let texteDabord = 0;
    for (let i = 0; i < n; i++) {
      const dt = textes[i].date;
      const dc = carrousels[perm[i]].date;
      if (Math.abs((new Date(dt) - new Date(dc)) / 86400000) < ecartMinJours) return null;
      if (dt < dc) texteDabord++;
    }
    return texteDabord;
  };
  const perm = [];
  const pris = new Array(n).fill(false);
  let trouve = null;
  const chercher = (i) => {
    if (trouve) return;
    if (i === n) {
      if (dansOrdre(perm) === n / 2) trouve = [...perm];
      return;
    }
    for (let k = 0; k < n; k++) {
      if (pris[k]) continue;
      const ecart = Math.abs((new Date(textes[i].date) - new Date(carrousels[k].date)) / 86400000);
      if (ecart < ecartMinJours) continue;
      pris[k] = true;
      perm.push(k);
      chercher(i + 1);
      perm.pop();
      pris[k] = false;
    }
  };
  chercher(0);
  return trouve;
}

/**
 * config = {
 *   debut: '2026-10-05' (un lundi), semaines: 4, jours: [2,3,4,5] (0 = dimanche),
 *   comptes: { 'julien-partners': { accountId, heure: '08:30', grille: 'A' }, ... }
 * }
 */
export function genererCalendrier(config) {
  const { debut, semaines = 4, jours = [2, 3, 4, 5], comptes } = config;
  if (jourSemaine(debut) !== 1) throw new Error(`debut (${debut}) doit être un lundi.`);
  if (semaines !== GRILLE_A.length || jours.length !== 4) {
    throw new Error('La grille livrée est prévue pour 4 semaines × 4 jours.');
  }
  const creneaux = [];
  for (const [compte, cfg] of Object.entries(comptes)) {
    const grille = cfg.grille === 'B' ? GRILLE_A.map(inverser) : GRILLE_A;
    const lettre = compte === 'julien-partners' ? 'P' : compte === 'julien-agency' ? 'A' : compte[0].toUpperCase();
    const propres = [];
    for (let s = 0; s < semaines; s++) {
      jours.forEach((jour, k) => {
        const date = ajouterJours(debut, s * 7 + (jour - 1));
        const utc = parisVersUtc(date, cfg.heure);
        propres.push({
          id: `${lettre}-sem${s + 1}-${JOURS[jour]}`,
          compte,
          accountId: cfg.accountId,
          semaine: s + 1,
          date,
          jour: JOURS[jour],
          heureParis: cfg.heure,
          utc: utc.toISOString(),
          format: grille[s][k] === 'T' ? 'texte' : 'carrousel',
        });
      });
    }
    const textes = propres.filter((c) => c.format === 'texte');
    const carrousels = propres.filter((c) => c.format === 'carrousel');
    const perm = apparierSujets(textes, carrousels);
    if (!perm) throw new Error(`Aucun appariement de sujets possible pour ${compte}.`);
    textes.forEach((t, i) => {
      const c = carrousels[perm[i]];
      const sujet = `${lettre}-S${i + 1}`;
      t.sujet = sujet;
      c.sujet = sujet;
      t.ordreDansPaire = t.date < c.date ? 1 : 2;
      c.ordreDansPaire = c.date < t.date ? 1 : 2;
    });
    creneaux.push(...propres);
  }
  creneaux.sort((x, y) => x.utc.localeCompare(y.utc) || x.compte.localeCompare(y.compte));
  return {
    meta: {
      debut,
      fin: ajouterJours(debut, semaines * 7 - 1),
      semaines,
      jours: jours.map((j) => JOURS[j]),
      fuseau: 'Europe/Paris',
      comptes: Object.fromEntries(Object.entries(comptes).map(([k, v]) => [k, { accountId: v.accountId, heure: v.heure }])),
    },
    creneaux,
  };
}

/**
 * Contrôle de chaque créneau contre la file Buffer (seule référence des posts programmés).
 * `buffer` : [{ compte, instant }]. Un créneau est en conflit si un autre post du même compte
 * tombe à moins de `ecartMinHeures`, dans la file ou dans le plan lui-même.
 */
export function verifierCreneaux(creneaux, { maintenant, ecartMinHeures = 4, buffer = [], jourAutorises = [2, 3, 4, 5] } = {}) {
  if (!maintenant) throw new Error("verifierCreneaux : heure de référence absente (jamais l'horloge de la machine).");
  const ms = ecartMinHeures * 3600000;
  return creneaux.map((c) => {
    const problemes = [];
    const t = new Date(c.utc).getTime();
    const retour = utcVersParis(new Date(c.utc));
    if (retour.date !== c.date || retour.heure !== c.heureParis) {
      problemes.push(`aller-retour UTC/Paris incohérent (${retour.date} ${retour.heure})`);
    }
    if (!jourAutorises.includes(jourSemaine(c.date))) problemes.push(`jour non autorisé (${c.jour})`);
    if (t <= new Date(maintenant).getTime()) problemes.push('créneau dans le passé');
    for (const b of buffer) {
      if (b.compte !== c.compte) continue;
      const dt = Math.abs(new Date(b.instant).getTime() - t);
      if (dt === 0) problemes.push('déjà pris dans la file Buffer');
      else if (dt < ms) problemes.push(`file Buffer : post à ${Math.round(dt / 60000)} min`);
    }
    for (const autre of creneaux) {
      if (autre.id === c.id || autre.compte !== c.compte) continue;
      if (Math.abs(new Date(autre.utc).getTime() - t) < ms) problemes.push(`trop proche du créneau ${autre.id}`);
    }
    return { id: c.id, ok: problemes.length === 0, problemes };
  });
}

/**
 * File Buffer relevée à la main (une ligne par post : « AAAA-MM-JJ HH:MM compte », heure de Paris)
 * → [{ compte, instant }] avec l'UTC calculé ici, jamais à la main. Les lignes vides et « # » sont ignorées.
 */
export function lireFileBuffer(texte) {
  return texte.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l, n) => {
    const m = l.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s+(\S+)/);
    if (!m) throw new Error(`File Buffer, ligne ${n + 1} : « ${l} » ne suit pas « AAAA-MM-JJ HH:MM compte ».`);
    return { compte: m[3], instant: parisVersUtc(m[1], m[2]).toISOString() };
  });
}
