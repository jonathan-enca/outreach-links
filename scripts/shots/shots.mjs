// MU.0 : `pnpm shots` capture chaque écran de l'espace client, connecté avec le compte de test,
// en bureau (1440) et en mobile (390), dans un dossier HORS dépôt (`SHOTS_DIR`, sinon le dossier
// temporaire du système). Les états viennent du jeu de données de `seed.mjs` (rejoué avant les
// captures, sauf `SHOTS_SKIP_SEED=1`). Si aucune application ne répond sur `SHOTS_BASE_URL`, le
// script démarre `next dev` le temps des captures.
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, loadPlaywright, need, ROOT, signIn } from "./lib.mjs";

loadEnv();
const PORT = process.env.SHOTS_PORT ?? "3100";
const BASE = process.env.SHOTS_BASE_URL ?? `http://localhost:${PORT}`;
const OUT = resolve(process.env.SHOTS_DIR ?? resolve(tmpdir(), "outreach-links-shots"));
const ONLY = process.env.SHOTS_ONLY?.split(",").map((s) => s.trim());
const VIEWPORTS = {
  bureau: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

async function reachable() {
  try {
    const res = await fetch(`${BASE}/connexion`, { signal: AbortSignal.timeout(5_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function startApp() {
  if (await reachable()) return null;
  const child = spawn("pnpm", ["exec", "next", "dev", "--port", PORT], {
    cwd: ROOT,
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
    stdio: ["ignore", "ignore", "inherit"],
    detached: true,
  });
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2_000));
    if (await reachable()) return child;
  }
  process.kill(-child.pid);
  throw new Error(`L'application ne répond pas sur ${BASE}.`);
}

/** Écrans de l'espace : routes fixes, puis routes des trois états du jeu de données. */
async function routes() {
  const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sites, error } = await db
    .from("sites")
    .select("id, domain, audits(id, backlinks_status)")
    .in("domain", ["poterie-demo.example", "rando-demo.example", "coloriages-demo.example"]);
  if (error) throw new Error(`lecture du jeu de données : ${error.message}`);
  const site = (domain) => sites?.find((s) => s.domain === domain);
  const fresh = site("poterie-demo.example");
  const running = site("rando-demo.example")?.audits?.[0];
  const done = site("coloriages-demo.example")?.audits?.[0];
  if (!fresh || !running || !done) {
    throw new Error("Jeu de données incomplet : lancer « pnpm shots:seed ».");
  }
  return [
    ["01-accueil-espace", "/app"],
    ["02-demarrer", "/app/demarrer"],
    ["03-demarrer-relecture", `/app/demarrer/${fresh.id}`],
    ["04-audit-liste", "/app/audit"],
    ["05-audit-en-cours", `/app/audit/${running.id}`],
    ["06-audit-fini", `/app/audit/${done.id}`],
    ["07-cibles-avant-collecte", `/app/audit/${running.id}/cibles`],
    ["08-cibles-liste-courte", `/app/audit/${done.id}/cibles`],
    ["09-plan-de-l-audit", `/app/audit/${done.id}/plan`],
    ["10-sites", "/app/site"],
    ["11-site-nouveau", "/app/site/nouveau"],
    ["12-site-fiche", `/app/site/${fresh.id}`],
    ["13-plan", "/app/plan"],
    ["14-lots", "/app/lots"],
    ["15-inbox", "/app/inbox"],
    ["16-liens", "/app/liens"],
    ["17-taches", "/app/taches"],
    ["18-garde-fous", "/app/garde-fous"],
    ["19-facturation", "/app/facturation"],
  ];
}

if (process.env.SHOTS_SKIP_SEED !== "1") {
  const seeded = spawnSync(process.execPath, [resolve(import.meta.dirname, "seed.mjs")], {
    env: { ...process.env, NODE_USE_ENV_PROXY: "1" },
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (seeded.status !== 0) throw new Error("Le jeu de données n'a pas pu être écrit.");
}

const app = await startApp();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const report = [];
try {
  const list = (await routes()).filter(([name]) => !ONLY || ONLY.some((o) => name.includes(o)));
  let state;
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const dir = resolve(OUT, device);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const context = state
      ? await browser.newContext({
          viewport,
          locale: "fr-FR",
          storageState: state,
          deviceScaleFactor: 2,
        })
      : await signIn(browser, BASE, viewport);
    state ??= await context.storageState();
    const page = await context.newPage();
    for (const [name, path] of list) {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120_000 });
      // L'indicateur de `next dev` n'existe pas en production : on le masque.
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      await page.screenshot({ path: resolve(dir, `${name}.png`), fullPage: true });
      report.push({
        device,
        name,
        path,
        status: res?.status() ?? 0,
        landedOn: new URL(page.url()).pathname,
        horizontalOverflow: overflow,
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
  if (app) process.kill(-app.pid);
}
writeFileSync(resolve(OUT, "rapport.json"), JSON.stringify(report, null, 2));
const bad = report.filter((r) => r.status !== 200 || r.landedOn !== r.path);
console.log(`${report.length} captures dans ${OUT}`);
for (const r of report.filter((x) => x.horizontalOverflow)) {
  console.log(`débordement horizontal : ${r.device} ${r.name}`);
}
if (bad.length > 0) {
  for (const r of bad)
    console.error(`écran non atteint : ${r.device} ${r.name} (${r.status}, ${r.landedOn})`);
  process.exit(1);
}
