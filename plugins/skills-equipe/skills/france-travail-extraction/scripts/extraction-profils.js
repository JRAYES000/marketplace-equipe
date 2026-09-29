// Script d'extraction v5.3 — un lot de profils France Travail Pro.
// v5.3 (2026-09-29) : chaque profil journalise aussi `presentation`, le texte
//   que le candidat ecrit sur son profil. Il alimente la Note NocoDB, qui ne
//   doit plus jamais rester vide (deux fiches du 29/09 l'etaient).
// v5.2 (2026-09-29) : dedoublonnage PENDANT le parcours. `window.__connus`
//   (Set de cles « prenom nom » normalisees, construit depuis `window.__connusBruts`
//   injecte avant le script)
//   fait sauter un profil deja en base AVANT tout clic : ni « Afficher le
//   numero », ni telechargement, ni OCR, ni appariement. `__run(n)` compte
//   desormais n NOUVEAUX profils, et s'arrete sur un budget de temps pour tenir
//   sous le timeout CDP. Mesure du 29/09 : 17 profils sur 20 etaient deja en
//   base, et chacun coutait un CV, un OCR et un appariement pour rien.
// Réécrit le 2026-09-17 après un run réel : la version de juin ne fonctionnait
// plus, son sélecteur de panneau ne trouvait plus rien et rendait `done: 0`.
//
// AVANT de l'injecter :
//   1. INJECTER `scripts/arriere-plan.js`. Il rebranche les attentes et les
//      animations sur un Web Worker, seul moyen de travailler onglet caché :
//      sinon le parcours rampe à 25 s par profil SANS lever d'erreur, et la
//      modale du profil ne s'ouvre jamais (requestAnimationFrame est gelé) ;
//   1 bis. l'onglet doit être VISIBLE pour LANCER la recherche et ouvrir le
//      premier profil — les clics du protocole de débogage n'atteignent pas un
//      onglet caché, et la liste de résultats ne s'y rend pas. Une fois le
//      premier profil ouvert, l'onglet peut repasser en arrière-plan : le bouton
//      « Suivant » répond au clic JavaScript ordinaire ;
//   2. être connecté (le nom du compte s'affiche en haut à droite ; « Connexion »
//      signifie que la session est fermée, et sans elle ni nom ni CV) ;
//   3. avoir lancé la recherche et appliqué les filtres ;
//   4. avoir ouvert le PREMIER profil d'un VRAI CLIC de souris. Un `.click()` en
//      JavaScript sur `button.lienclic-profil` ne l'ouvre pas : le handler exige
//      un événement de confiance.
//
// L'INJECTER PRÉCÉDÉ DE `await` : l'IIFE rend une promesse, et sans `await` le
// résultat revient en `{}` — ce qui se lit comme un lot vide.
//
// Pièges encodés ici, à ne pas réintroduire en le réécrivant :
//   • Le panneau est `div.modal-body`. Le repérer par « Profil mis à jour le »
//     SEUL : exiger « Adresse » en plus le fait rater tous les profils qui n'ont
//     pas de bloc adresse, et le script s'arrête en croyant la liste finie.
//   • `textContent` ne contient PAS « EXPÉRIENCES » : la majuscule vient du CSS.
//     Tout test de libellé passe par `innerText`, ou par du texte normalisé.
//   • Le bouton « Suivant » est re-sélectionné à chaque tour (re-render), et la
//     comparaison de libellé se fait sur du texte normalisé.
//   • L'attente après « Suivant » est conditionnelle : on sonde le compteur de
//     pagination, on n'attend pas un délai fixe.
//   • `window.__log` n'est jamais réassigné : un lot perdu reste récupérable par
//     `JSON.stringify(window.__log)`.
//
// LIMITE CONNUE — téléchargement des CV : le `.click()` JS sur « Télécharger »
// ne ramène qu'UN fichier par session. Chrome bloque les téléchargements
// automatiques multiples et affiche une demande d'autorisation dans la barre
// d'adresse. Autoriser pro.francetravail.fr à télécharger plusieurs fichiers
// AVANT de lancer un lot, sinon tous les emails manqueront sauf un.

// S'injecte une fois, puis se rappelle par `await window.__run(15)` : re-injecter
// le script entier a chaque lot coute des jetons pour rien. La taille de lot est
// un parametre, pas une constante — 15 passe sans probleme onglet visible, alors
// que 10 depasse le timeout CDP de 45 s des que l'onglet est cache.
window.__log = window.__log || [];
window.__connus = window.__connus || new Set();

// Cle de dedoublonnage : minuscules, sans accents ni ponctuation, espaces
// reduits. Doit rester identique a celle construite depuis NocoDB (SKILL.md,
// Phase 1) : « Prenom NOM » cote page, `Prenom || ' ' || Nom` cote base.
window.__cle = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Noms connus injectes BRUTS avant le script (`window.__connusBruts = [...]`,
// « Prenom NOM » tels que NocoDB les rend) : la normalisation se fait ici, une
// seule fois, avec la meme fonction que pour les noms lus dans le panneau.
(window.__connusBruts || []).forEach(n => window.__connus.add(window.__cle(n)));

// BATCH = nombre de NOUVEAUX profils voulus. BUDGET_MS = duree max d'un appel :
// un profil deja connu coute ~0,3 s, un nouveau ~2-3 s ; 35 s laisse de la marge
// sous le timeout CDP de 45 s. Relancer `__run` tant que `arret` vaut « budget ».
window.__run = async (BATCH = 8, BUDGET_MS = 35000) => {
  const debut = Date.now();
  // Toutes les attentes passent par le Worker de `arriere-plan.js`. Sans lui, repli
  // sur setTimeout : le script tourne, mais 22 fois plus lentement en arriere-plan.
  const pause = window.__pause || (ms => new Promise(r => setTimeout(r, ms)));
  // Le parcours tourne en arriere-plan, mais SEULEMENT si les parades sont en place.
  // Sans elles, il ne plante pas : il rampe a 25 s par profil, ce qui se lit comme un
  // site lent et fait chercher la panne au mauvais endroit.
  if (document.hidden && !window.__pause) return JSON.stringify({
    erreur: 'ONGLET CACHE ET PARADES ABSENTES — injecter scripts/arriere-plan.js, ou remettre l onglet au premier plan. Sans cela le parcours passe de 0,3 s a 25 s par profil, sans lever d erreur.'
  });
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const P = () => [...document.querySelectorAll('div.modal-body')]
    .filter(e => (e.textContent || '').includes('Profil mis à jour le'))
    .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];

  const modale = () => { const p = P(); return p ? (p.closest('.modal') || p.parentElement.parentElement) : null; };
  const pag = () => { const m = modale(); const r = (m ? m.innerText : '').match(/(\d+)\s*\/\s*\d+/); return r ? +r[1] : null; };
  const suivant = () => [...document.querySelectorAll('button,a')]
    .filter(e => e.offsetParent !== null)
    .find(e => /^suivant$/i.test(norm(e.textContent)));
  const attendre = async prev => {
    const t0 = Date.now();
    while (Date.now() - t0 < 6000) {
      await pause(200);
      const p = pag();
      if (p !== null && p !== prev) return p;
    }
    return pag();
  };

  const lot = [];
  let arret = 'batch atteint';
  let sautes = 0;

  for (let i = 0; lot.length < BATCH; i++) {
    if (Date.now() - debut > BUDGET_MS) { arret = 'budget'; break; }
    const p = P();
    if (!p) { arret = 'panneau absent a l iteration ' + i; break; }
    const courant = pag();

    // Reprise après interruption : on saute ce qui est déjà journalisé.
    if (window.__log.some(r => r.pag === courant)) {
      const nx0 = suivant();
      if (!nx0) { arret = 'deja vu, pas de suivant'; break; }
      nx0.click(); await attendre(courant); continue;
    }

    // Deja en base ? On le sait avant tout clic : le nom est dans le panneau.
    // Un profil anonyme (nom remplace par l'intitule) n'est jamais saute : son
    // identite ne se lit que dans le CV.
    const t0 = p.innerText || '';
    // `\n+` : le panneau met une ligne vide entre la date et le nom (mesure du 29/09/2026 :
    // sans cela nom0 restait vide et aucun profil deja en base n'etait saute).
    const nom0 = ((t0.match(/Profil mis à jour le [^\n]+\n+([^\n]+)/) || [])[1] || '').trim();
    if (nom0 && window.__connus.has(window.__cle(nom0))) {
      window.__log.push({ pag: courant, nom: nom0, deja: true });
      sautes++;
      const nxd = suivant();
      if (!nxd) { arret = 'suivant introuvable'; break; }
      nxd.click();
      if (await attendre(courant) === courant) { arret = 'pagination bloquee a ' + courant; break; }
      continue;
    }

    // Le téléphone vient du CV par OCR, pas du panneau : mesuré le 2026-09-17,
    // l'OCR en rend 25 sur 26 CV, contre 25 profils sur 30 pour le clic, et il
    // trouve des numéros que le panneau n'affiche pas du tout. On ne clique
    // « Afficher le numéro » que pour les profils SANS CV, où c'est la seule
    // source — ce qui économise ~1,6 s sur la grande majorité des profils.
    const aCV = !!(p ? [...p.querySelectorAll('a,button')].find(e => /Télécharger/i.test(norm(e.textContent))) : null);
    if (!aCV) {
      const btnTel = [...p.querySelectorAll('button')].find(e => /^Afficher le num/i.test(norm(e.textContent)));
      if (btnTel) { btnTel.click(); await pause(1600); }
    }

    const q = P();
    const t = q ? (q.innerText || '') : '';
    const bloc = (t.match(/Profil mis à jour le [^\n]+\n([\s\S]*?)\nDisponibilit/) || [])[1] || '';
    const L = bloc.split('\n').map(s => s.trim()).filter(Boolean);

    // Date de mise a jour du profil, convertie en ISO pour NocoDB. C est le seul
    // indicateur de fraicheur d un lead : un profil de trois mois n a pas la
    // meme valeur qu un profil d hier.
    const dm = t.match(/Profil mis à jour le\s+(\d{2})\/(\d{2})\/(\d{4})/);
    const maj = dm ? dm[3] + '-' + dm[2] + '-' + dm[1] : '';

    // Le champ dédié affiche souvent « Information indisponible », alors que le
    // candidat a écrit son numéro dans son texte de présentation. On prend le
    // champ en priorité, le texte en repli, et on note d'où vient la valeur.
    const zoneTel = (t.match(/Numéro de téléphone\n([^\n]+)/) || [])[1] || '';
    const telChamp = (zoneTel.match(/(?:\+33|0)[ .]?[1-9](?:[ .]?\d{2}){4}/) || [])[0] || '';
    const telTexte = (t.match(/(?:\+33|0)[ .]?[1-9](?:[ .]?\d{2}){4}/) || [])[0] || '';

    const btnDL = q ? [...q.querySelectorAll('a,button')].find(e => /Télécharger/i.test(norm(e.textContent))) : null;
    let dl = false;
    if (btnDL) { btnDL.click(); dl = true; await pause(1500); }

    const rec = {
      pag: courant,
      nom: L[0] || '',
      titre: L[1] || '',
      maj,
      commune: ((t.match(/\b\d{5}\s+[A-ZÀ-Ü' -]+/) || [''])[0]).trim(),
      tel: telChamp || telTexte,
      telSource: telChamp ? 'champ' : (telTexte ? 'texte' : ''),
      aCV: !!btnDL,
      telecharge: dl,
      // Texte de presentation ecrit par le candidat, entre la ligne
      // « Disponibilite » et « Points forts ». C'est la source OBLIGATOIRE de la
      // Note NocoDB (depuis le 29/09/2026). Coupe avant « Adresse » : un
      // candidat y avait colle son adresse postale.
      presentation: norm((t.match(/\nDisponibilit[^\n]*\n([\s\S]*?)(?:\n\s*(?:Points forts|Pour des raisons de s|Adresse\b)|$)/) || [])[1] || '')
    };
    window.__log.push(rec);
    lot.push(rec);

    const nx = suivant();
    if (!nx) { arret = 'suivant introuvable'; break; }
    nx.click();
    const np = await attendre(courant);
    if (np === courant) { arret = 'pagination bloquee a ' + courant; break; }
  }

  return JSON.stringify({
    nouveaux: lot.length, sautes, total: window.__log.length,
    nouveauxTotal: window.__log.filter(r => !r.deja).length,
    telecharges: window.__log.filter(r => r.telecharge).length,
    arret, secondes: Math.round((Date.now() - debut) / 1000), lot
  });
};

// Premier lot des l'injection, pour ne pas perdre un aller-retour.
await window.__run(8)
