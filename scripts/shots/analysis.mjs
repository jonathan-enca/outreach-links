// MU.3 : captures de l'écran « Analyse en cours » dans une session connectée, bureau (1440) et mobile (390).
//
// Mode simulé (défaut) : rejoue, sur le site de test `coloriages-demo.example`, la vie d'une analyse
// en écrivant dans la base à la main, SANS recharger la page entre deux captures (c'est l'écran qui
// interroge la route d'état toutes les 3 secondes) : début, milieu, milieu avec cibles, fin (avec
// ouverture automatique de « Vos cibles »), puis une analyse en échec. Aucun appel payant, aucun événement
// Inngest. N'écrit que dans l'espace du compte de test. Le bouton « Reprendre » n'est PAS cliqué.
//
// Mode réel (`SHOTS_REAL_SITE=<uuid du site>`) : suit une vraie analyse (lancée par `pnpm demo:analysis`)
// et capture au début, au milieu et à la fin, puis compare chaque compteur affiché à la base.
//
// `SHOTS_DIR` (défaut : dossier temporaire hors dépôt), `SHOTS_BASE_URL` (défaut http://localhost:3100).
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, loadPlaywright, need, signIn } from "./lib.mjs";

loadEnv();
const BASE = process.env.SHOTS_BASE_URL ?? "http://localhost:3100";
const OUT = resolve(process.env.SHOTS_DIR ?? resolve(tmpdir(), "outreach-links-shots-mu3"));
const REAL = process.env.SHOTS_REAL_SITE;
const VIEWPORTS = {
  bureau: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};
const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const must = async (what, q) => {
  const { data, error } = await q;
  if (error) throw new Error(`${what} : ${error.message}`);
  return data;
};
const KEYS = [
  "comprendre",
  "concurrents",
  "etat_des_lieux",
  "recherche",
  "tri",
  "contacts",
  "constats",
  "demandes",
];
const ago = (s) => new Date(Date.now() - s * 1000).toISOString();

// ---------------------------------------------------------------- mode simulé
async function simulated(browser) {
  const site = (
    await must(
      "site",
      db.from("sites").select("id").eq("domain", "coloriages-demo.example").limit(1),
    )
  )[0];
  if (!site) throw new Error("Jeu de données absent : lancer « pnpm shots:seed ».");
  const audit = (
    await must(
      "audit",
      db.from("audits").select("id, workspace_id").eq("site_id", site.id).limit(1),
    )
  )[0];
  const ref = { audit_id: audit.id, workspace_id: audit.workspace_id };
  const url = `${BASE}/app/site/${site.id}/analyse`;

  const setSteps = async (spec) => {
    await must("étapes", db.from("analysis_steps").delete().eq("audit_id", audit.id));
    await must(
      "étapes",
      db.from("analysis_steps").insert(
        KEYS.map((key, i) => ({
          ...ref,
          key,
          position: i + 1,
          status: spec[key]?.status ?? "attente",
          counters: spec[key]?.counters ?? {},
          last_example: spec[key]?.example ?? null,
          error_message: spec[key]?.error ?? null,
          started_at: spec[key] ? ago(60) : null,
          finished_at: spec[key]?.status === "termine" ? ago(10) : null,
        })),
      ),
    );
  };
  const setAudit = (patch) => must("audit", db.from("audits").update(patch).eq("id", audit.id));
  // Les cibles du jeu de données existent déjà : on les « cache » (réserve) tant que l'analyse simulée
  // n'est pas assez avancée, puis on les rétablit avec leur rang d'origine.
  const targetRows = await must(
    "cibles",
    db.from("qualified_targets").select("id, rank, status").eq("audit_id", audit.id),
  );
  const setTargets = async (status) => {
    for (const r of targetRows.filter((x) => x.status === "liste_courte")) {
      await must(
        "cibles",
        db
          .from("qualified_targets")
          .update(status === "liste_courte" ? { status, rank: r.rank } : { status, rank: null })
          .eq("id", r.id),
      );
    }
  };

  const shots = [];
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const dir = resolve(OUT, device);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const snap = async (page, name) => {
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await page.screenshot({ path: resolve(dir, `${name}.png`), fullPage: true });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      shots.push({ device, name, horizontalOverflow: overflow });
    };
    const context = await signIn(browser, BASE, viewport);
    const page = await context.newPage();

    // 1. Début : l'analyse vient d'être lancée, rien n'a encore avancé.
    await setTargets("reserve");
    await setAudit({
      analysis_status: "en_cours",
      analysis_started_at: ago(20),
      analysis_finished_at: null,
      analysis_error: null,
    });
    await setSteps({
      comprendre: { status: "en_cours", counters: { found: 2 }, example: "Page d'accueil lue" },
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await snap(page, "1-debut");

    // 2. Milieu : la page n'est PAS rechargée, c'est la route d'état qui la met à jour.
    await setAudit({ analysis_started_at: ago(240) });
    await setSteps({
      comprendre: {
        status: "termine",
        counters: { done: 9, total: 9, found: 9 },
        example: "coloriages-demo.example",
      },
      concurrents: {
        status: "termine",
        counters: { done: 4, total: 4, found: 5 },
        example: "coloriages-du-mercredi.example",
      },
      etat_des_lieux: { status: "termine", counters: { done: 3, total: 3 } },
      recherche: {
        status: "en_cours",
        counters: { done: 23, total: 35, found: 412 },
        example: "coloriage automne maternelle",
      },
    });
    await page.waitForFunction(() => document.body.innerText.includes("23 sur 35"), null, {
      timeout: 15_000,
    });
    await snap(page, "2-milieu");

    // 3. Milieu avancé : tri fait, contacts trouvés, premières cibles prêtes.
    await setAudit({ analysis_started_at: ago(600) });
    await setTargets("liste_courte");
    await setSteps({
      comprendre: { status: "termine", counters: { found: 9 } },
      concurrents: { status: "termine", counters: { done: 4, total: 4, found: 5 } },
      etat_des_lieux: { status: "termine", counters: { done: 3, total: 3 } },
      recherche: { status: "termine", counters: { found: 544 } },
      tri: { status: "termine", counters: { done: 150, total: 150, kept: 96, found: 63 } },
      contacts: { status: "termine", counters: { done: 60, total: 60, found: 8 } },
      constats: {
        status: "en_cours",
        counters: { done: 12, total: 28, found: 2 },
        example: "maitresse-clemence.example",
      },
    });
    await page.waitForFunction(() => document.body.innerText.includes("12 sur 28"), null, {
      timeout: 15_000,
    });
    await snap(page, "3-milieu-cibles");

    // 4. Fin : tout est terminé, l'écran le montre puis ouvre « Vos cibles » tout seul.
    await setSteps(
      Object.fromEntries(
        KEYS.map((k) => [
          k,
          { status: "termine", counters: k === "recherche" ? { found: 544 } : {} },
        ]),
      ),
    );
    await setAudit({ analysis_status: "termine", analysis_finished_at: ago(0) });
    await page.waitForSelector('[data-analysis-status="termine"]', { timeout: 15_000 });
    await snap(page, "4-fin");
    await page.waitForURL(/\/cibles$/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await snap(page, "5-fin-ouverture-des-cibles");

    // 6. Échec : ce qui a marché, ce qui s'est arrêté, bouton « Reprendre » (non cliqué).
    await setTargets("reserve");
    await setAudit({
      analysis_status: "echoue",
      analysis_finished_at: ago(0),
      analysis_error:
        "L'analyse s'est interrompue avant la fin. Vous pouvez la reprendre : rien de déjà fait n'est refait.",
    });
    await setSteps({
      comprendre: { status: "termine", counters: { found: 9 } },
      concurrents: { status: "termine", counters: { done: 4, total: 4, found: 5 } },
      etat_des_lieux: { status: "termine", counters: { done: 3, total: 3 } },
      recherche: {
        status: "echoue",
        counters: { done: 23, total: 35, found: 412 },
        example: "coloriage automne maternelle",
        error:
          "Cette étape s'est interrompue avant la fin. Rien de plus n'a été lancé : vous pouvez la relancer.",
      },
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await snap(page, "6-echec");
    await context.close();
  }
  await setTargets("liste_courte");
  return shots;
}

// ---------------------------------------------------------------- mode réel
async function real(browser) {
  const siteId = REAL;
  const audit = (
    await must(
      "audit",
      db
        .from("audits")
        .select("id")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(1),
    )
  )[0];
  if (!audit) throw new Error("Aucune analyse pour ce site : lancer « pnpm demo:analysis ».");
  const url = `${BASE}/app/site/${siteId}/analyse`;
  const shots = [];
  const checks = [];
  const pages = [];
  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const dir = resolve(OUT, `reel-${device}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const context = await signIn(browser, BASE, viewport);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    pages.push({ device, dir, page, got: new Set() });
  }
  const deadline = Date.now() + 40 * 60_000;
  while (Date.now() < deadline) {
    for (const p of pages) {
      const status = await p.page
        .getAttribute("[data-analysis-status]", "data-analysis-status")
        .catch(() => null);
      const percent = Number(
        await p.page.getAttribute('[role="progressbar"]', "aria-valuenow").catch(() => "NaN"),
      );
      const hasTargets =
        (await p.page
          .locator('[data-block="targets"] li')
          .count()
          .catch(() => 0)) > 0;
      const take = async (name) => {
        if (p.got.has(name)) return;
        p.got.add(name);
        await p.page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await p.page.screenshot({ path: resolve(p.dir, `${name}.png`), fullPage: true });
        const overflow = await p.page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
        );
        // Compteurs affichés = compteurs en base (même instant, à une poignée de secondes près).
        const rows = await must(
          "étapes",
          db.from("analysis_steps").select("key, status, counters").eq("audit_id", audit.id),
        );
        const shown = await p.page.evaluate(() =>
          [...document.querySelectorAll("[data-step]")].map((li) => ({
            key: li.getAttribute("data-step"),
            status: li.getAttribute("data-status"),
            text: li.textContent,
          })),
        );
        checks.push({
          device: p.device,
          name,
          percent,
          status,
          db: rows.map((r) => `${r.key}:${r.status}:${JSON.stringify(r.counters)}`),
          shown: shown.map((s) => `${s.key}:${s.status}:${s.text}`),
        });
        shots.push({ device: p.device, name: `reel-${name}`, horizontalOverflow: overflow });
      };
      if (status === "en_cours" || status === "confirme") {
        if (percent < 10) await take("1-debut");
        if (percent >= 30) await take("2-milieu");
        if (percent >= 50 && hasTargets) await take("3-milieu-cibles");
      }
      if (status === "termine") await take("4-fin");
    }
    if (pages.every((p) => p.got.has("4-fin"))) break;
    await new Promise((r) => setTimeout(r, 2_000));
  }
  writeFileSync(resolve(OUT, "verifications-reel.json"), JSON.stringify(checks, null, 2));
  return shots;
}

mkdirSync(OUT, { recursive: true });
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
let report;
try {
  report = REAL ? await real(browser) : await simulated(browser);
} finally {
  await browser.close();
}
writeFileSync(resolve(OUT, "rapport-analyse.json"), JSON.stringify(report, null, 2));
console.log(`${report.length} captures dans ${OUT}`);
for (const r of report.filter((x) => x.horizontalOverflow)) {
  console.log(`débordement horizontal : ${r.device} ${r.name}`);
}
