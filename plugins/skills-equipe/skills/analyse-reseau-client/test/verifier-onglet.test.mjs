import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifierOnglet, colonnes, ongletsDuDossier, LIMITES } from "../scripts/verifier-onglet.mjs";

// Fixture fabriquee pour ce test, pas un vrai onglet client : ce depot est public.
const BON = [
  "# Votre chaîne YouTube — analyse et recommandations",
  "",
  "> **Dernière mise à jour : 01/10/2026** — relevé fait dans YouTube Studio.",
  "",
  "## L’essentiel en 5 points",
  "",
  "1. **Un constat.** Des chiffres *(estimé)*.",
  "",
  "## 1. Où en est la chaîne",
  "",
  "| Indicateur | Valeur |",
  "|---|---|",
  "| Vues | 1 200 |",
  "| Partages | non relevé |",
  "",
  "## 2. Ce qui marche, ce qui ne marche pas",
  "",
  "## 3. Miniatures et titres",
  "",
  "## Annexe A — Les vidéos",
  "",
  "## Historique",
].join("\n");

test("un onglet conforme passe, apostrophe droite ou typographique", () => {
  assert.deepEqual(verifierOnglet(BON).erreurs, []);
  assert.deepEqual(verifierOnglet(BON.replace("L’essentiel", "L'essentiel")).erreurs, []);
});

test("le nom de l'onglet est le titre coupé au tiret long", () => {
  assert.equal(verifierOnglet(BON).titre, "Votre chaîne YouTube");
});

test("un nom d'onglet trop long est refusé", () => {
  const long = BON.replace("Votre chaîne YouTube", "x".repeat(LIMITES.titre + 1));
  assert.match(verifierOnglet(long).erreurs.join(" "), /coupe à 60/);
});

test("les mots de la cuisine interne sont refusés, y compris ceux ajoutés", () => {
  assert.match(verifierOnglet(BON + "\nCollecte Apify.").erreurs.join(" "), /apify/);
  assert.match(verifierOnglet(BON + "\nVu sur unforum.net.", { interdits: ["unforum.net"] }).erreurs.join(" "), /unforum\.net/);
});

test("un tableau avec une colonne de trop est refusé", () => {
  const casse = BON.replace("| Vues | 1 200 |", "| Vues | 1 200 | x |");
  assert.match(verifierOnglet(casse).erreurs.join(" "), /colonnes attendues/);
});

test("un tableau sans ligne de séparation est refusé", () => {
  const casse = BON.replace("|---|---|\n", "");
  assert.match(verifierOnglet(casse).erreurs.join(" "), /séparation/);
});

test("il faut au moins trois sections numérotées", () => {
  const court = BON.replace("## 3. Miniatures et titres", "## Miniatures et titres");
  assert.match(verifierOnglet(court).erreurs.join(" "), /section/);
});

test("les étiquettes sont comptées", () => {
  const r = verifierOnglet(BON);
  assert.equal(r.etiquettes.estime, 1);
  assert.equal(r.etiquettes.nonReleve, 1);
});

test("colonnes() ignore le code en ligne et les barres échappées", () => {
  // 3 cellules : « a », le code `x|y`, « c \| d ». Les barres internes ne comptent pas.
  assert.equal(colonnes("| a | `x|y` | c \\| d |"), 3);
});

test("ongletsDuDossier suit les règles du site client", () => {
  const d = mkdtempSync(join(tmpdir(), "onglets-"));
  try {
    writeFileSync(join(d, "CLAUDE.md"), "racine");
    writeFileSync(join(d, "AUDIT-INTERNE.md"), "racine : jamais un onglet");
    mkdirSync(join(d, "challenge-1"));
    writeFileSync(join(d, "challenge-1", "livrable.md"), "challenge");
    mkdirSync(join(d, "YOUTUBE"));
    writeFileSync(join(d, "YOUTUBE", "analyse-youtube.md"), "onglet");
    writeFileSync(join(d, "YOUTUBE", "LIENS.md"), "ossature");
    mkdirSync(join(d, "INSTAGRAM"));
    writeFileSync(join(d, "INSTAGRAM", "analyse-instagram.md"), "onglet");
    writeFileSync(join(d, "INSTAGRAM", "releve.csv"), "pas un .md");
    assert.deepEqual(ongletsDuDossier(d), ["INSTAGRAM/analyse-instagram.md", "YOUTUBE/analyse-youtube.md"]);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
});
