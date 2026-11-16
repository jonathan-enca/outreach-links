// Chantier F : run réel de bout en bout PAR L'INTERFACE, en production, avec le compte de test.
// Étape 1 (adresse, pays, langue, objectif) -> relecture -> « Lancer l'analyse » -> suivi de l'écran
// d'analyse sans le recharger (captures début / milieu / fin, bureau et mobile).
// Variables : SHOTS_BASE_URL (production), SHOTS_DIR, PROD_DOMAIN (défaut mega-coloring.com),
// PROD_COUNTRY (défaut FR). Prérequis : `pnpm shots:env && pnpm shots:seed` (compte de test).
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { loadEnv, loadPlaywright, signIn } from "./lib.mjs";

loadEnv();
const BASE = process.env.SHOTS_BASE_URL ?? "https://outreach-links.vercel.app";
const OUT = resolve(process.env.SHOTS_DIR ?? resolve(tmpdir(), "outreach-links-prod-run"));
const DOMAIN = process.env.PROD_DOMAIN ?? "mega-coloring.com";
const COUNTRY = process.env.PROD_COUNTRY ?? "FR";
mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await signIn(browser, BASE, { width: 1440, height: 900 });
const page = await ctx.newPage();
const shot = async (name) => {
  await page.screenshot({ path: resolve(OUT, `bureau-${name}.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(OUT, `mobile-${name}.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  log("capture", name);
};

// Étape 1
await page.goto(`${BASE}/app/demarrer`, { waitUntil: "networkidle" });
await shot("etape1");
await page.fill("#url", DOMAIN);
await page.selectOption("#country", COUNTRY);
const t0 = Date.now();
await page.click('button[type="submit"]');
await page.waitForSelector('[data-reading="home"][data-state="ok"]', { timeout: 90_000 });
log("accueil lu", Math.round((Date.now() - t0) / 1000), "s");
await shot("lecture-accueil-lue");
await page.waitForURL(/\/app\/demarrer\/[0-9a-f-]{36}/, { timeout: 120_000 });
log("lecture terminée", Math.round((Date.now() - t0) / 1000), "s");
const siteId = /demarrer\/([0-9a-f-]{36})/.exec(page.url())[1];
await page.waitForLoadState("networkidle");
await shot("fiche");

// Lancement de l'analyse
const launched = Date.now();
await Promise.all([
  page.waitForURL(/\/analyse/, { timeout: 120_000 }),
  page.getByRole("button", { name: /Lancer l.analyse/ }).click(),
]);
log("analyse lancée", siteId);
await page.waitForSelector("[data-analysis-status]", { timeout: 60_000 });
await shot("analyse-debut");

let middle = false;
for (;;) {
  const status = await page
    .getAttribute("[data-analysis-status]", "data-analysis-status")
    .catch(() => null);
  const pct = await page
    .locator('[role="progressbar"]')
    .getAttribute("aria-valuenow")
    .catch(() => null);
  log("statut", status, pct ?? "");
  if (!middle && pct && Number(pct) >= 50) {
    middle = true;
    await shot("analyse-milieu");
  }
  if (status === "echoue") {
    await shot("analyse-echec");
    break;
  }
  if (status === "termine" || /\/cibles/.test(page.url())) {
    await shot(page.url().includes("/cibles") ? "cibles" : "analyse-fin");
    break;
  }
  if (Date.now() - launched > 40 * 60_000) throw new Error("analyse trop longue (40 min)");
  await page.waitForTimeout(15_000);
}
log("fin", Math.round((Date.now() - launched) / 1000), "s", "site", siteId);
await browser.close();
