// Capture ciblée (viewport, pas pleine page) d'un écran : SHOTS_PATH, SHOTS_NAME, SHOTS_SCROLL (sélecteur).
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv, loadPlaywright, signIn } from "./lib.mjs";
loadEnv();
const BASE = process.env.SHOTS_BASE_URL ?? "http://localhost:3100";
const OUT = resolve(process.env.SHOTS_DIR);
mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
for (const [device, viewport] of [
  ["bureau", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }],
]) {
  const ctx = await signIn(browser, BASE, viewport);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${process.env.SHOTS_PATH}`, { waitUntil: "networkidle" });
  if (process.env.SHOTS_CLICK) await page.locator(process.env.SHOTS_CLICK).first().click();
  if (process.env.SHOTS_SCROLL)
    await page.locator(process.env.SHOTS_SCROLL).first().scrollIntoViewIfNeeded();
  await page.evaluate((dy) => window.scrollBy(0, dy), Number(process.env.SHOTS_OFFSET ?? -120));
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(OUT, `${device}-${process.env.SHOTS_NAME}.png`) });
  await ctx.close();
}
await browser.close();
