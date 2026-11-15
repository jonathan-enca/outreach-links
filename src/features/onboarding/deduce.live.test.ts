import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { safeFetchPage } from "@/features/sites/verify";
import { createPageReader } from "@/features/triage/page-reader";
import { createLlmClient } from "@/lib/llm";
import { DEDUCE_LIMITS, deduceSite } from "./deduce";

/**
 * Déduction RÉELLE depuis une vraie page d'accueil (1 lecture HTTP, 1 appel LLM, plafond
 * DEDUCE_LIMITS.llmBudgetUsd) : ignorée sauf ONBOARDING_LIVE_DEMO=1. Site : ONBOARDING_LIVE_DOMAIN
 * (mega-coloring.com par défaut). Coût journalisé dans un cost_ledger en mémoire (la vraie base
 * n'est pas écrite). Lancer : NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true pnpm demo:onboarding
 */
const live = process.env.ONBOARDING_LIVE_DEMO === "1";

describe.skipIf(!live)("onboarding : déduction réelle", () => {
  it("déduit thème et requêtes d'une vraie page, sans citer la marque", async () => {
    const domain = process.env.ONBOARDING_LIVE_DOMAIN ?? "mega-coloring.com";
    const reader = createPageReader({
      fetch: safeFetchPage,
      sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      maxRequests: 2,
    });
    const page = await reader.read(`https://${domain}/`);
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
      budgetUsd: DEDUCE_LIMITS.llmBudgetUsd,
      maxCostPerCallUsd: DEDUCE_LIMITS.llmMaxCostPerCallUsd,
    });
    const d = await deduceSite({ domain, page, llm, workspaceId: null });
    const total = db.tables.cost_ledger!.reduce((s, r) => s + Number(r.actual_cost_usd ?? 0), 0);
    console.log(
      `Page : HTTP ${page.status}, titre « ${page.title} », ${page.text.length} caractères lus\n` +
        `Déduction (${d.source}) : thème « ${d.theme} », langue ${d.language}, pays ${d.country}\n` +
        `Requêtes : ${JSON.stringify(d.queries)}\n` +
        `Appels LLM : ${db.tables.cost_ledger!.length}, coût réel : ${total.toFixed(6)} USD`,
    );
    expect(page.status).toBe(200);
    expect(d.source).toBe("llm");
    expect(d.queries.length).toBeGreaterThanOrEqual(1);
    expect(d.queries.length).toBeLessThanOrEqual(3);
    expect(total).toBeLessThan(DEDUCE_LIMITS.llmBudgetUsd);
  }, 120_000);
});
