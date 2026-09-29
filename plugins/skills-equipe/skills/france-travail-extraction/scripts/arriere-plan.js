// Parades au bridage des onglets en arriere-plan — a injecter AVANT toute autre
// chose, et a re-injecter apres chaque rechargement de page (elles vivent dans la
// page, pas dans la session).
//
// Chrome degrade un onglet qui n est pas au premier plan de quatre facons.
// Deux se contournent ici, deux non — voir la fin de ce fichier.
//
// Mesures du 2026-09-18 sur pro.francetravail.fr, onglet cache :
//   • setTimeout        : 10 attentes de 200 ms = plus de 45 000 ms (facteur 22)
//     avec le Worker    : 2 047 ms, soit le temps nominal
//   • requestAnimationFrame : 0 image par seconde — GELE, pas ralenti
//     apres le patch    : 32 images par seconde

// 1) MINUTERIES — celles d un Worker vivent hors du thread de la page et
//    echappent au bridage. `window.__pause(ms)` remplace partout
//    `new Promise(r => setTimeout(r, ms))`.
if (!window.__pause) {
  const src = 'onmessage=e=>{const t=e.data.t,id=e.data.id;setTimeout(()=>postMessage(id),t)}';
  const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  const enCours = new Map();
  let seq = 0;
  w.onmessage = e => { const f = enCours.get(e.data); if (f) { enCours.delete(e.data); f(); } };
  window.__pause = ms => new Promise(r => { const id = ++seq; enCours.set(id, r); w.postMessage({ t: ms, id }); });
}

// 2) ANIMATIONS — requestAnimationFrame est totalement gele en arriere-plan, donc
//    toute animation d ouverture reste figee : une modale Bootstrap garde
//    `width: 0` et ne s ouvre jamais. On la rebranche sur le Worker.
if (!window.__rafPatche) {
  let s = 0;
  const vivants = new Set();
  window.requestAnimationFrame = cb => {
    const id = ++s; vivants.add(id);
    window.__pause(16).then(() => { if (vivants.delete(id)) { try { cb(performance.now()); } catch (e) {} } });
    return id;
  };
  window.cancelAnimationFrame = id => vivants.delete(id);
  window.__rafPatche = true;
}

// CE QUI NE SE CONTOURNE PAS, et qui exige un onglet VISIBLE :
//   • les clics du protocole de debogage n atteignent pas un onglet cache. Un
//     ecouteur pose sur le bouton ne recoit RIEN — pas meme un evenement non
//     fiable. C est ce qui empeche d ouvrir le premier profil.
//   • le rendu de la liste de resultats est suspendu : 0 `li.cv-result` construit
//     alors que les filtres sont bons et le compteur correct.
//
// Un AudioContext silencieux, parade classique pour « garder la page active »,
// ne leve aucune des quatre limitations : teste, sans effet.
//
// EN PRATIQUE : l onglet doit etre visible pour lancer la recherche et ouvrir le
// premier profil. Ensuite « Suivant » repond au clic JavaScript, et tout le
// parcours continue en arriere-plan grace aux deux parades ci-dessus.

'parades installees : __pause=' + (typeof window.__pause) + ' rAF=' + (window.__rafPatche ? 'patche' : 'non');
