// Chantier G : reprise d'une analyse « à partir d'ici » PAR L'INTERFACE, en production, avec le compte
// de test, puis suivi de l'écran jusqu'à la fin (mesure avant / après sur les mêmes candidats).
// Variables : SHOTS_BASE_URL (production), SHOTS_DIR, PROD_SITE_ID (obligatoire), PROD_STEP (défaut tri).
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { loadEnv, loadPlaywright, need, signIn } from "./lib.mjs";

loadEnv();
const BASE = process.env.SHOTS_BASE_URL ?? "https://outreach-links.vercel.app";
const OUT = resolve(process.env.SHOTS_DIR ?? resolve(tmpdir(), "outreach-links-prod-restart"));
const SITE = need("PROD_SITE_ID");
const STEP = process.env.PROD_STEP ?? "tri";
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

await page.goto(`${BASE}/app/site/${SITE}/analyse?etapes=1`, { waitUntil: "networkidle" });
await page.locator(`[data-restart="${STEP}"]`).click();
const started = Date.now();
// La confirmation est dans la ligne de l'étape (les autres lignes ont leur propre bouton).
await page
  .locator(`[data-step="${STEP}"] button:not([data-restart])`, {
    hasText: "Reprendre à partir d'ici",
  })
  .click();
log("reprise demandée", STEP);
await page.waitForSelector('[data-analysis-status="en_cours"], [data-analysis-status="confirme"]', {
  timeout: 90_000,
});
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
  if (!middle && pct && Number(pct) >= 60) {
    middle = true;
    await shot("reprise-milieu");
  }
  if (status === "echoue") {
    await shot("reprise-echec");
    break;
  }
  if (status === "termine" || /\/cibles/.test(page.url())) {
    await page.goto(`${BASE}/app/site/${SITE}/cibles`, { waitUntil: "networkidle" });
    await shot("cibles");
    break;
  }
  if (Date.now() - started > 40 * 60_000) throw new Error("reprise trop longue (40 min)");
  await page.waitForTimeout(15_000);
}
log("fin", Math.round((Date.now() - started) / 1000), "s");
await browser.close();
