import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { safeFetchPage } from "@/features/sites/verify";
import { createLlmClient } from "@/lib/llm";
import { generateBrandProfile } from "./generate";
import { BRAND_LIMITS } from "./limits";
import { readSite } from "./read-site";

/**
 * Profil de marque RÉEL (MT.1) : lecture réelle du site (au plus BRAND_LIMITS.maxRequests requêtes
 * HTTP, robots.txt respecté), UN appel LLM plafonné. Ignoré sauf BRAND_LIVE_DEMO=1. Site :
 * BRAND_LIVE_DOMAIN (mega-coloring.com par défaut). Coût journalisé dans un cost_ledger en mémoire.
 * Aucun appel DataForSEO, aucune écriture en base. Lancer :
 * NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:brand
 */
const live = process.env.BRAND_LIVE_DEMO === "1";

describe.skipIf(!live)("profil de marque : run réel borné", () => {
  it("fait émerger des personas d'éditeurs adaptés au site", async () => {
    const domain = process.env.BRAND_LIVE_DOMAIN ?? "mega-coloring.com";
    const t0 = Date.now();
    const site = await readSite(domain, {
      fetch: safeFetchPage,
      sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
      now: () => Date.now(),
    });
    const readMs = Date.now() - t0;
    const db = fakeSupabase({ cost_ledger: [] });
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const llm = createLlmClient({
      costClient: db.client,
      provider,
      auth:
        provider === "anthropic"
          ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
          : process.env.OPENAI_API_KEY
            ? { apiKey: process.env.OPENAI_API_KEY }
            : "proxy",
      budgetUsd: BRAND_LIMITS.llmBudgetUsd,
      maxCostPerCallUsd: BRAND_LIMITS.llmMaxCostPerCallUsd,
    });
    const t1 = Date.now();
    const out = await generateBrandProfile({ site, llm, workspaceId: null });
    const llmMs = Date.now() - t1;
    const total = db.tables.cost_ledger!.reduce((s, r) => s + Number(r.actual_cost_usd ?? 0), 0);
    const report =
      `Site : ${domain}, accueil HTTP ${site.home.status}, sitemap ${site.sitemapUsed ? "oui" : "non"}, ` +
      `${site.pages.length} pages lues en plus de l'accueil, ${site.requests} requêtes HTTP, lecture ${readMs} ms\n` +
      `Pages : ${site.pages.map((p) => p.url).join(", ")}\n` +
      `LLM : ${db.tables.cost_ledger!.length} appel(s), ${llmMs} ms, coût réel ${total.toFixed(6)} USD\n` +
      `Profil :\n${JSON.stringify(out?.profile, null, 2)}`;
    console.log(report);
    if (process.env.BRAND_LIVE_OUT) writeFileSync(process.env.BRAND_LIVE_OUT, report);
    expect(site.home.status).toBe(200);
    expect(site.requests).toBeLessThanOrEqual(BRAND_LIMITS.maxRequests);
    expect(out).not.toBeNull();
    expect(db.tables.cost_ledger!.length).toBe(1);
    expect(total).toBeLessThan(0.01);
    const text = JSON.stringify(out!.profile.personas).toLowerCase();
    // Acceptation sur le site de test : enseignants, parents, associations, médiathèques.
    if (domain === "mega-coloring.com") {
      expect(text).toMatch(/enseignant|teacher|instituteur|professeur|école|ecole/);
      expect(text).toMatch(/parent/);
      expect(text).toMatch(/association/);
      expect(text).toMatch(/médiathèque|mediatheque|bibliothèque|bibliotheque|librar/);
    }
  }, 180_000);
});
