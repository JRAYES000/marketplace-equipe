import test from "node:test";
import assert from "node:assert/strict";
import { insererNote, REPERE } from "../scripts/inserer-note-equipe.mjs";

const BASE = "## Notes de l’équipe\n\n### Ancienne note — 22/09/2026\n\nTexte.\n\n" + REPERE + "\n";
const NOTE = "### Nouvelle note — 01/10/2026\n\nConstat.";

test("la note s'insère juste avant le repère", () => {
  const { texte, crlf } = insererNote(BASE, NOTE);
  assert.ok(texte.includes("Constat.\n\n" + REPERE));
  assert.ok(texte.indexOf("Ancienne note") < texte.indexOf("Nouvelle note"));
  assert.equal(crlf, false);
});

test("un fichier en CRLF reste entièrement en CRLF", () => {
  const { texte, crlf } = insererNote(BASE.replace(/\n/g, "\r\n"), NOTE);
  assert.equal(crlf, true);
  assert.doesNotMatch(texte, /[^\r]\n/);
});

test("la même note n'est jamais insérée deux fois", () => {
  const une = insererNote(BASE, NOTE).texte;
  assert.throws(() => insererNote(une, NOTE), /déjà présente/);
});

test("pas de repère, ou deux repères : refus", () => {
  assert.throws(() => insererNote("## Notes\n", NOTE), /trouvé 0 fois/);
  assert.throws(() => insererNote(BASE + REPERE, NOTE), /trouvé 2 fois/);
});

test("une note sans titre daté est refusée", () => {
  assert.throws(() => insererNote(BASE, "### Note sans date\n\nx"), /date/);
  assert.throws(() => insererNote(BASE, "Pas de titre — 01/10/2026"), /titre/);
});
