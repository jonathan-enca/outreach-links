// MU.0 : outils communs de la session de test connectée (données de test et captures).
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "../..");

/** Charge `.env.local` sans écraser l'environnement courant. Les valeurs ne sont jamais affichées. */
export function loadEnv() {
  const file = resolve(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export function need(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Variable ${name} absente : lancer d'abord « pnpm shots:env » (voir PROGRESS.md).`,
    );
  }
  return v;
}

/**
 * Playwright n'est pas une dépendance du dépôt : l'environnement cloud en fournit un, avec son
 * navigateur. Ailleurs : `npm i -g playwright` puis `npx playwright install chromium`.
 */
export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require("playwright");
  } catch {
    throw new Error(
      "Playwright introuvable (fourni par l'environnement cloud, sinon l'installer).",
    );
  }
}

/**
 * La « fixture » connectée : ouvre la page de connexion, saisit les identifiants du compte de test
 * et attend l'espace client. Le contexte renvoyé porte la session ; `storageState` permet de la
 * réutiliser dans d'autres contextes (mobile, autre script) sans se reconnecter.
 */
export async function signIn(browser, baseUrl, viewport) {
  const context = await browser.newContext({ viewport, locale: "fr-FR", deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/connexion`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', need("E2E_EMAIL"));
  await page.fill('input[name="password"]', need("E2E_PASSWORD"));
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 60_000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.close();
  return context;
}
