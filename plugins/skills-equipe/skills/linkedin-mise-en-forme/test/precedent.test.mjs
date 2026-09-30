import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  compteDepuisNom, postsLocauxDuCompte, precedentLocal, dernierPostZernio, resoudrePrecedent, lireCorpsFichier,
} from "../scripts/precedent.mjs";

const CLI = new URL("../scripts/verif-post.mjs", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

// Dossier de livrables factice : deux comptes, trois dossiers datees, un dossier a ignorer.
function livrables() {
  const racine = mkdtempSync(join(tmpdir(), "livrables-"));
  const poser = (dossier, nom, texte = nom) => {
    mkdirSync(join(racine, dossier), { recursive: true });
    writeFileSync(join(racine, dossier, nom), texte);
  };
  poser("2026-09-28-30", "a1.final.txt");
  poser("2026-09-28-30", "a2.final.txt");
  poser("2026-09-28-30", "a10.final.txt");
  poser("2026-09-28-30", "p1.final.txt");
  poser("2026-09-30", "a6.final.txt");
  poser("2026-09-30", "a6.brouillon.txt", "pas un .final");
  poser("2026-10-01", "a8.final.txt");
  poser("2026-10-01", "p7.final.txt");
  poser("a-trier", "a99.final.txt", "dossier non date : ignore");
  return { racine, poser };
}
const noms = (posts) => posts.map((p) => p.chemin.split(/[\\/]/).slice(-2).join("/"));

test("compteDepuisNom : a<N> = julien-agency, p<N> = julien-partners, le reste = inconnu", () => {
  assert.equal(compteDepuisNom("C:/x/2026-09-30/a6.final.txt"), "julien-agency");
  assert.equal(compteDepuisNom("p12.final.txt"), "julien-partners");
  assert.equal(compteDepuisNom("brouillon.txt"), null);
});

test("postsLocauxDuCompte : seulement le compte, seulement les .final.txt, tri par dossier puis numero (a10 apres a2)", () => {
  const { racine } = livrables();
  assert.deepEqual(noms(postsLocauxDuCompte(racine, "julien-agency")), [
    "2026-09-28-30/a1.final.txt", "2026-09-28-30/a2.final.txt", "2026-09-28-30/a10.final.txt",
    "2026-09-30/a6.final.txt", "2026-10-01/a8.final.txt",
  ]);
  assert.deepEqual(noms(postsLocauxDuCompte(racine, "julien-partners")), ["2026-09-28-30/p1.final.txt", "2026-10-01/p7.final.txt"]);
});

test("precedentLocal sans brouillon dans le dossier : le .final.txt le plus recent du compte", () => {
  const { racine } = livrables();
  assert.match(precedentLocal({ dossier: racine, compte: "julien-agency" }).chemin, /a8\.final\.txt$/);
  assert.match(precedentLocal({ dossier: racine, compte: "julien-partners" }).chemin, /p7\.final\.txt$/);
});

test("precedentLocal avec un brouillon du dossier : le dernier post STRICTEMENT AVANT lui, jamais lui-meme ni un post programme apres", () => {
  const { racine } = livrables();
  const avant = (nom, dossier) => precedentLocal({ dossier: racine, compte: "julien-agency", brouillon: join(racine, dossier, nom) }).chemin;
  assert.match(avant("a6.final.txt", "2026-09-30"), /a10\.final\.txt$/);
  assert.match(avant("a8.final.txt", "2026-10-01"), /a6\.final\.txt$/);
  assert.match(avant("a2.final.txt", "2026-09-28-30"), /a1\.final\.txt$/);
  assert.equal(precedentLocal({ dossier: racine, compte: "julien-agency", brouillon: join(racine, "2026-09-28-30", "a1.final.txt") }), null, "le tout premier n'a pas de precedent");
});

test("precedentLocal : dossier introuvable = null, jamais une exception ; frontmatter et CRLF retires du texte lu", () => {
  assert.equal(precedentLocal({ dossier: join(tmpdir(), "n-existe-pas-" + Date.now()), compte: "julien-agency" }), null);
  const { racine, poser } = livrables();
  poser("2026-10-02", "a9.final.txt", "---\r\ncompte: julien-agency\r\n---\r\nLe texte.\r\nSuite.");
  assert.equal(precedentLocal({ dossier: racine, compte: "julien-agency" }).texte, "Le texte.\nSuite.");
  assert.equal(lireCorpsFichier(join(racine, "2026-10-02", "a9.final.txt")), "Le texte.\nSuite.");
});

const COMPTES = { "julien-agency": { zernio_account_id: "aaaaaaaaaaaaaaaaaaaaaaaa" }, "julien-partners": { zernio_account_id: "bbbbbbbbbbbbbbbbbbbbbbbb" } };
const reponse = (corps, status = 200) => ({ ok: status < 400, status, json: async () => corps });

test("dernierPostZernio : GET /v1/posts filtre sur le bon compte et les posts publies, renvoie le contenu", async () => {
  let appel;
  const fetchImpl = async (url, opts) => { appel = { url, opts }; return reponse({ posts: [{ content: "  Le dernier post publie.  " }] }); };
  const r = await dernierPostZernio({ compte: "julien-partners", apiKey: "cle-de-test", comptes: COMPTES, fetchImpl });
  assert.equal(r.texte, "Le dernier post publie.");
  assert.match(appel.url, /^https:\/\/zernio\.com\/api\/v1\/posts\?/);
  assert.match(appel.url, /status=published/);
  assert.match(appel.url, /accountId=bbbbbbbbbbbbbbbbbbbbbbbb/);
  assert.match(appel.url, /limit=1/);
  assert.equal(appel.opts.headers.Authorization, "Bearer cle-de-test");
  assert.equal(appel.opts.method, undefined, "lecture seule : GET par defaut, jamais de POST");
});

test("dernierPostZernio : sans cle, HTTP en erreur, aucun post, reseau en panne, compte inconnu -> une erreur, jamais une exception", async () => {
  const ok = async () => reponse({ posts: [{ content: "x" }] });
  assert.match((await dernierPostZernio({ compte: "julien-agency", apiKey: undefined, comptes: COMPTES, fetchImpl: ok })).erreur, /ZERNIO_API_KEY absente/);
  assert.match((await dernierPostZernio({ compte: "julien-agency", apiKey: "k", comptes: COMPTES, fetchImpl: async () => reponse({}, 401) })).erreur, /HTTP 401/);
  assert.match((await dernierPostZernio({ compte: "julien-agency", apiKey: "k", comptes: COMPTES, fetchImpl: async () => reponse({ posts: [] }) })).erreur, /aucun post publie/);
  assert.match((await dernierPostZernio({ compte: "julien-agency", apiKey: "k", comptes: COMPTES, fetchImpl: async () => { throw new Error("ECONNRESET"); } })).erreur, /ECONNRESET/);
  assert.match((await dernierPostZernio({ compte: "page-claude", apiKey: "k", comptes: COMPTES, fetchImpl: ok })).erreur, /aucun zernio_account_id/);
});

test("resoudrePrecedent : le dossier local passe avant Zernio, et la cle n'est meme pas lue", async () => {
  const { racine } = livrables();
  let cleLue = false;
  const r = await resoudrePrecedent({
    brouillon: join(racine, "2026-10-01", "a8.final.txt"), dossier: racine,
    apiKey: () => { cleLue = true; return "k"; }, comptes: COMPTES, fetchImpl: async () => { throw new Error("ne doit pas etre appele"); },
  });
  assert.equal(r.texte, "a6.final.txt");
  assert.match(r.source, /julien-agency/);
  assert.equal(cleLue, false);
});

test("resoudrePrecedent : dossier sans post precedent du compte -> repli sur le dernier post Zernio", async () => {
  const vide = mkdtempSync(join(tmpdir(), "vide-"));
  const r = await resoudrePrecedent({
    brouillon: "C:/x/p3.final.txt", dossier: vide, apiKey: () => "k", comptes: COMPTES,
    fetchImpl: async () => reponse({ posts: [{ content: "Publie sur Zernio." }] }),
  });
  assert.equal(r.texte, "Publie sur Zernio.");
  assert.match(r.source, /julien-partners.*Zernio/);
});

test("resoudrePrecedent : rien nulle part -> un avertissement (jamais d'exception), avec les raisons", async () => {
  const vide = mkdtempSync(join(tmpdir(), "vide-"));
  const r = await resoudrePrecedent({ brouillon: "C:/x/a3.final.txt", dossier: vide, apiKey: undefined, comptes: COMPTES });
  assert.equal(r.texte, undefined);
  assert.match(r.avertissement, /aucun post precedent pour julien-agency/);
  assert.match(r.avertissement, /ZERNIO_API_KEY absente/);
  assert.match(r.avertissement, /non mesuree/);
  const inconnu = await resoudrePrecedent({ brouillon: "C:/x/brouillon.txt", dossier: vide });
  assert.match(inconnu.avertissement, /compte inconnu/);
  const absent = await resoudrePrecedent({ brouillon: "C:/x/a3.final.txt", dossier: join(vide, "nope"), apiKey: undefined, comptes: COMPTES });
  assert.match(absent.avertissement, /dossier introuvable/);
});

// ---- CLI de bout en bout ----
// Post valide (1300-1900 caracteres, aucun gras accentue, pas de tournure interdite).
const POST = (accroche, fin) => [
  accroche, "", "Un **retard trop long** coute des candidats avant meme l'offre.", "",
  "Ce post sert uniquement de gabarit de test pour verifier automatiquement les regles de forme. ".repeat(15).trim(), "", fin,
].join("\n");
const lancer = (...args) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", env: { ...process.env, ZERNIO_API_KEY: "" } });

test("CLI : le post precedent du compte est trouve seul, et un schema identique fait echouer avec le code 1", () => {
  const { racine, poser } = livrables();
  poser("2026-09-30", "a6.final.txt", POST("Un recrutement lent coute cher.", "Voila."));
  poser("2026-10-01", "a8.final.txt", POST("Un autre recrutement coute cher aussi.", "Voila."));
  const meme = lancer("verif", join(racine, "2026-10-01", "a8.final.txt"), "--dossier", racine);
  assert.match(meme.stdout, /Post precedent : julien-agency : .*a6\.final\.txt/);
  assert.match(meme.stdout, /ECHEC schema different du post precedent/);
  assert.equal(meme.status, 1);
  poser("2026-10-01", "a8.final.txt", POST("Un recrutement lent coute-t-il cher ?", "Voila."));
  const autre = lancer("verif", join(racine, "2026-10-01", "a8.final.txt"), "--dossier", racine);
  assert.match(autre.stdout, /OK\s+schema different du post precedent/);
  assert.equal(autre.status, 0, autre.stdout);
});

test("CLI : sans post precedent (compte inconnu) -> un AVERTISSEMENT, le critere n'est pas mesure, et le code de sortie reste 0", () => {
  const { racine, poser } = livrables();
  poser("2026-10-03", "brouillon.txt", POST("Un recrutement lent coute cher.", "Voila."));
  const r = lancer("verif", join(racine, "2026-10-03", "brouillon.txt"), "--dossier", racine);
  assert.match(r.stdout, /AVERTISSEMENT : compte inconnu/);
  assert.doesNotMatch(r.stdout, /schema different/);
  assert.match(r.stdout, /14\/14 criteres passes/);
  assert.equal(r.status, 0, r.stdout);
});

test("CLI : --precedent (et le second chemin positionnel, ancienne forme) priment ; --sans-precedent coupe la mesure", () => {
  const { racine, poser } = livrables();
  poser("2026-10-03", "a20.final.txt", POST("Un recrutement lent coute cher.", "Voila."));
  poser("2026-10-03", "ancien.txt", POST("Un autre recrutement coute cher aussi.", "Voila."));
  const brouillon = join(racine, "2026-10-03", "a20.final.txt");
  const ancien = join(racine, "2026-10-03", "ancien.txt");
  assert.match(lancer("verif", brouillon, "--precedent", ancien, "--dossier", racine).stdout, /Post precedent \(donne a la main\)/);
  assert.match(lancer("verif", brouillon, ancien).stdout, /ECHEC schema different/);
  const sans = lancer("verif", brouillon, "--sans-precedent", "--dossier", racine);
  assert.doesNotMatch(sans.stdout, /schema different|AVERTISSEMENT|Post precedent/);
  assert.equal(sans.status, 0, sans.stdout);
});
