import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createLlmClient } from "@/lib/llm";
import { containsRankingPromise, generateSummary, type SummaryFacts } from "./summary";

/**
 * Jeu d'évaluation RÉEL du résumé (appels payants, plafond 0,10 USD) : ignoré sauf
 * LLM_LIVE_DEMO=1. Nécessite OPENAI_API_KEY ou LLM_PROXY_AUTH=true (dev agent), ou
 * ANTHROPIC_API_KEY avec LLM_PROVIDER=anthropic. Lancer : pnpm demo:llm
 */
const live = process.env.LLM_LIVE_DEMO === "1";

const base: SummaryFacts = {
  domain: "mega-coloring.com",
  referringDomains: 58,
  backlinks: 340,
  dofollowShare: 0.8,
  brandAnchorShare: 0.2,
  overOptimizedAnchors: false,
  competitorsBenchmark: 500,
  rankedKeywords: 120,
  priorityPages: [
    {
      url: "https://mega-coloring.com/licorne",
      avgPosition: 14,
      volume: 79000,
      pageDomains: 3,
      neededDomains: 100,
    },
    {
      url: "https://mega-coloring.com/dino",
      avgPosition: 7,
      volume: 12000,
      pageDomains: 1,
      neededDomains: 70,
    },
  ],
  gapDomains: 42,
  gapTopCount: 3,
  techProblems: 1,
  techChecked: 3,
};

const cases: [string, SummaryFacts][] = [
  ["standard", base],
  ["sur-optimisation", { ...base, overOptimizedAnchors: true, brandAnchorShare: 0.02 }],
  [
    "tres proche du top",
    { ...base, priorityPages: [{ ...base.priorityPages[0]!, avgPosition: 4 }] },
  ],
  ["aucune page", { ...base, priorityPages: [] }],
  ["profil vide", { ...base, referringDomains: null, backlinks: null, dofollowShare: null }],
  ["beaucoup de besoin", { ...base, competitorsBenchmark: 5000 }],
];

describe.skipIf(!live)("résumé LLM : jeu d'évaluation réel", () => {
  it("aucun résumé ne contient de promesse de classement", async () => {
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
      budgetUsd: 0.1,
    });
    const ids = {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      auditId: "11111111-1111-4111-8111-111111111111",
    };
    const report: string[] = [];
    for (const [name, facts] of cases) {
      const r = await generateSummary(llm, facts, ids);
      report.push(`[${name}] ${r.source} (${r.model ?? "-"}) : ${r.text}`);
      expect(containsRankingPromise(r.text), name).toBe(false);
      expect(r.text.length).toBeLessThanOrEqual(900);
    }
    const total = db.tables.cost_ledger!.reduce((s, r) => s + Number(r.actual_cost_usd ?? 0), 0);
    console.log(report.join("\n"));
    console.log(
      `Appels : ${db.tables.cost_ledger!.length}, coût réel total : ${total.toFixed(6)} USD`,
    );
    expect(total).toBeLessThan(0.1);
  }, 120_000);
});
