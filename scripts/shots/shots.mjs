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
// `SHOTS_STATE=sans-site|analyse-en-cours|analyse-finie` : l'espace ne contient qu'UN site et on
// capture où mène `/app` (MU.2). Sans lui : tous les écrans, avec les trois sites à la fois.
const STATE = process.env.SHOTS_STATE;
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
  const analyse = (s) => `/app/site/${s.id}/analyse`;
  const cibles = (s) => `/app/site/${s.id}/cibles`;
  const doneSite = site("coloriages-demo.example");
  const runningSite = site("rando-demo.example");
  // Troisième valeur : page attendue après redirection (sinon, la page demandée).
  return [
    ["01-accueil-trois-sites", "/app"],
    ["02-demarrer", "/app/demarrer"],
    ["03-demarrer-relecture", `/app/demarrer/${fresh.id}`],
    ["04-analyse-en-cours", analyse(runningSite)],
    ["05-analyse-finie", analyse(doneSite)],
    ["06-cibles-pas-pretes", cibles(runningSite)],
    ["07-cibles-liste-courte", cibles(doneSite)],
    ["08-etat-des-lieux", `/app/site/${doneSite.id}/etat-des-lieux`],
    ["09-compte", "/app/compte"],
    ["10-ancienne-adresse-audit", `/app/audit/${done.id}`, analyse(doneSite)],
    ["11-ancienne-adresse-cibles", `/app/audit/${done.id}/cibles`, cibles(doneSite)],
    ["12-ancienne-liste-audits", "/app/audit", "/app"],
    ["13-plan-de-l-audit", `/app/audit/${done.id}/plan`],
    ["14-sites", "/app/site"],
    ["15-site-nouveau", "/app/site/nouveau"],
    ["16-site-fiche", `/app/site/${fresh.id}`],
    ["17-plan", "/app/plan"],
    ["18-lots", "/app/lots"],
    ["19-inbox", "/app/inbox"],
    ["20-liens", "/app/liens"],
    ["21-taches", "/app/taches"],
    ["22-garde-fous", "/app/garde-fous"],
    ["23-facturation", "/app/facturation"],
  ];
}

/** MU.2 : les trois états de test d'une personne qui n'a qu'UN site, et la page où `/app` doit mener. */
const STATES = {
  "sans-site": { seed: "sans-site", domain: null, target: () => "/app/demarrer" },
  "analyse-en-cours": {
    seed: "rando",
    domain: "rando-demo.example",
    target: (s) => `/app/site/${s.id}/analyse`,
  },
  "analyse-finie": {
    seed: "coloriages",
    domain: "coloriages-demo.example",
    target: (s) => `/app/site/${s.id}/cibles`,
  },
};

async function stateRoutes() {
  const state = STATES[STATE];
  if (!state) throw new Error(`SHOTS_STATE inconnu : ${STATE}`);
  const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let found = null;
  if (state.domain) {
    const { data } = await db.from("sites").select("id").eq("domain", state.domain).maybeSingle();
    if (!data) throw new Error("Jeu de données incomplet : lancer « pnpm shots:seed ».");
    found = data;
  }
  return [[`etat-${STATE}`, "/app", state.target(found)]];
}

if (process.env.SHOTS_SKIP_SEED !== "1") {
  const seeded = spawnSync(process.execPath, [resolve(import.meta.dirname, "seed.mjs")], {
    env: {
      ...process.env,
      NODE_USE_ENV_PROXY: "1",
      ...(STATE ? { SEED_ONLY: STATES[STATE].seed } : {}),
    },
    stdio: ["ignore", "ignore", "inherit"],
  });
  if (seeded.status !== 0) throw new Error("Le jeu de données n'a pas pu être écrit.");
}

const app = await startApp();
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const report = [];
try {
  const list = (STATE ? await stateRoutes() : await routes()).filter(
    ([name]) => !ONLY || ONLY.some((o) => name.includes(o)),
  );
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
    for (const [name, path, expected] of list) {
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
        expected: expected ?? path,
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
const bad = report.filter((r) => r.status !== 200 || r.landedOn !== r.expected);
console.log(`${report.length} captures dans ${OUT}`);
for (const r of report.filter((x) => x.horizontalOverflow)) {
  console.log(`débordement horizontal : ${r.device} ${r.name}`);
}
if (bad.length > 0) {
  for (const r of bad)
    console.error(`écran non atteint : ${r.device} ${r.name} (${r.status}, ${r.landedOn})`);
  process.exit(1);
}
