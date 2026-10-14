import test from "node:test";
import assert from "node:assert/strict";
import { controlerTexte, controlerFile, similariteSujet } from "../scripts/regles-julien.mjs";
import { verifierTexte } from "../scripts/lib.mjs";

const regles = (constats) => constats.map((c) => c.regle).sort();

test("regle 2 : « Exemple inventé pour l'illustration » est refusé, avec la phrase citée", () => {
  const c = controlerTexte("Une accroche réelle.\n\nExemple inventé pour l'illustration : un organisme hésite.");
  assert.deepEqual(regles(c), [2]);
  assert.match(c[0].preuve, /^Exemple inventé pour l'illustration/);
});

test("regle 2 : « inventé » en gras Unicode est aussi attrapé", () => {
  assert.deepEqual(regles(controlerTexte("Un cas 𝗶𝗻𝘃𝗲𝗻𝘁𝗲 de bout en bout.")), [2]);
});

test("regle 2 : un cas ouvert par « Exemple : » est signalé pour vérification", () => {
  const c = controlerTexte("Exemple : une consultante IA envoie le même message à tout le monde.");
  assert.equal(c[0].regle, 2);
  assert.match(c[0].motif, /fait réel/);
});

test("regle 3 : « Ma position » et « Je prends position » sont refusés", () => {
  assert.deepEqual(regles(controlerTexte("Texte.\n\nMa position : la méthode prime.")), [3]);
  assert.deepEqual(regles(controlerTexte("Je prends position : non.")), [3]);
});

test("regle 5 : lien dans le corps (URL, lnkd.in, domaine nu) refusé", () => {
  assert.deepEqual(regles(controlerTexte("Créez votre fiche sur https://lnkd.in/dekT3NU3 et je reviens vers vous.")), [5]);
  assert.deepEqual(regles(controlerTexte("Le point de départ : claudeagency.fr/diagnostic.")), [5]);
});

test("regle 5 : précautions juridiques ou de principe refusées", () => {
  assert.deepEqual(regles(controlerTexte("Ce texte ne donne pas un avis juridique.")), [5]);
  assert.deepEqual(regles(controlerTexte("Ce post ne constitue pas un conseil fiscal.")), [5]);
  assert.deepEqual(regles(controlerTexte("Cette liste ne remplace pas un audit.")), [5]);
});

test("un post conforme ne produit aucun constat", () => {
  const t = "Mardi, un organisme nous a montré ses quatre dossiers de documents.\n\nIl a fallu une semaine pour les réunir.\n\nVous avez la même pile ?";
  assert.deepEqual(controlerTexte(t), []);
});

test("regle 1 : 3 posts le même jour sur un compte = constat ; 2 = rien", () => {
  const p = (id, heure) => ({ id, compte: "julien-partners", date: "2026-10-16", heure, texte: id });
  assert.equal(controlerFile([p("a", "08:30"), p("b", "13:00")]).length, 0);
  const c = controlerFile([p("a", "08:30"), p("b", "13:00"), p("c", "17:30")]);
  assert.deepEqual(regles(c), [1]);
});

test("regle 4 : même étiquette sur le même compte à moins de 30 jours = constat ; à 30 jours = rien", () => {
  const a = { id: "a", compte: "julien-agency", date: "2026-10-01", heure: "13:00", texte: "x", sujet: "choisir un prestataire IA" };
  const b = { ...a, id: "b", date: "2026-10-20" };
  assert.deepEqual(regles(controlerFile([a, b])), [4]);
  assert.equal(controlerFile([a, { ...b, date: "2026-10-31" }]).length, 0);
});

test("regle 4 : même étiquette le même jour sur les deux comptes = constat ; jours différents = rien", () => {
  const a = { id: "a", compte: "julien-agency", date: "2026-10-20", heure: "13:00", texte: "x", sujet: "choisir un prestataire IA" };
  const b = { ...a, id: "b", compte: "julien-partners", heure: "17:30" };
  assert.deepEqual(regles(controlerFile([a, b])), [4]);
  assert.equal(controlerFile([a, { ...b, date: "2026-10-21" }]).length, 0);
});

test("regle 4 : l'historique sert de référence mais ne se juge pas lui-même", () => {
  const h1 = { id: "h1", compte: "julien-agency", date: "2026-10-05", sujet: "s", texte: "x" };
  const h2 = { ...h1, id: "h2", date: "2026-10-06" };
  assert.equal(controlerFile([], { historique: [h1, h2] }).length, 0);
  assert.equal(controlerFile([{ ...h1, id: "n", date: "2026-10-15", heure: "13:00" }], { historique: [h1] }).length, 1);
});

test("regle 4 : la similarité de mots ne rapproche pas deux posts sans rapport", () => {
  const s = similariteSujet("Vos factures devront partir au format électronique en 2027.", "Une charte d'usage de l'IA pour les stagiaires tient en quatre lignes.");
  assert.equal(s.score, 0);
});

test("regle 3 : la longueur n'est plus imposée entre 1 300 et 1 900 caractères", () => {
  const court = "Mardi, un client a signé après une relance de quatre phrases.\n\nLa voici, telle quelle.";
  const r = verifierTexte(court).resultats.find((x) => /longueur/.test(x.nom));
  assert.equal(r.bon, true, r.detail);
});

// Bout en bout : une file fabriquee qui viole les regles 1, 2, 4 et 5 fait sortir le script en code 1,
// avec une ligne ALERTE par regle ; la meme file corrigee sort en code 0.
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const SCRIPT = new URL("../scripts/controle-avant-publication.mjs", import.meta.url);
test("CLI controle-avant-publication : regles 1, 2, 4 et 5 detectees sur une file fabriquee, file propre en code 0", () => {
  const racine = mkdtempSync(join(tmpdir(), "regles-julien-"));
  const poser = (rel, texte) => { const d = join(racine, rel, ".."); mkdirSync(d, { recursive: true }); writeFileSync(join(racine, rel), texte); };
  poser("2026-11-03/p1.final.txt", "Mardi, une cliente a signé après une relance de quatre phrases.\n\nExemple inventé pour l'illustration : rien.");
  poser("2026-11-03/p2.final.txt", "Un devis clair se signe plus vite qu'un devis flou, vu cette semaine.\n\nCréez votre fiche sur https://lnkd.in/abc.");
  poser("2026-11-03/p3.final.txt", "Lundi, trois freelances nous ont envoyé le même modèle de relance.");
  poser("2026-11-03/a1.final.txt", "Lundi, un organisme a reçu deux devis pour le même module de formation.");
  writeFileSync(join(racine, "sujets.csv"), "fichier;sujet\n2026-11-03/p2.final.txt;devis\n2026-11-03/a1.final.txt;devis\n");
  const file = join(racine, "file.txt");
  writeFileSync(file, [
    "2026-11-03 08:30 julien-partners # T Mardi, une cliente a signé après une relance de quatre phrases.",
    "2026-11-03 13:00 julien-partners # T Un devis clair se signe plus vite qu'un devis flou, vu cette semaine.",
    "2026-11-03 17:30 julien-partners # T Lundi, trois freelances nous ont envoyé le même modèle de relance.",
    "2026-11-03 13:00 julien-agency # T Lundi, un organisme a reçu deux devis pour le même module de formation.",
  ].join("\n"));
  const lancer = (f) => spawnSync(process.execPath, [SCRIPT.pathname.replace(/^\/([A-Za-z]:)/, "$1"), "--file", f, "--dossier", racine, "--annonces", join(racine, "rien"), "--maintenant", "2026-11-01T00:00:00Z"], { encoding: "utf8" });
  const r = lancer(file);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const n of [1, 2, 4, 5]) assert.match(r.stdout, new RegExp(`ALERTE règle ${n} `), `règle ${n} attendue :\n${r.stdout}`);
  const propre = join(racine, "propre.txt");
  writeFileSync(propre, "2026-11-03 17:30 julien-partners # T Lundi, trois freelances nous ont envoyé le même modèle de relance.\n");
  const ok = lancer(propre);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
});
