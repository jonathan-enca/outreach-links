import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createLlmClient } from "@/lib/llm";
import { classifyTarget } from "./classify";
import { EVAL_CASES, EVAL_COMPETITORS } from "./eval-set";
import type { PageRead } from "./page-reader";
import type { TriageContext, TriageItem } from "./types";

/**
 * Évaluation RÉELLE du jugement du LLM sur les cas non tranchés par les règles (ok, hors sujet,
 * irréaliste). Appels payants (plafond 0,05 USD) : ignoré sauf TRIAGE_LIVE_EVAL=1.
 * Lancer : pnpm demo:triage (OPENAI_API_KEY ou LLM_PROXY_AUTH=true, ou Anthropic).
 */
const live = process.env.TRIAGE_LIVE_EVAL === "1";
/** Seuil de précision exigé sur les verdicts « ok » (ne pas faire contacter de mauvaises cibles). */
const MIN_ACCURACY = 0.8;

const CTX: TriageContext = {
  siteDomain: "mega-coloring.com",
  niche: "coloriages pour enfants",
  language: "fr",
  offeredAsset: "coloriages gratuits à imprimer",
  competitorDomains: new Set(EVAL_COMPETITORS),
};

describe.skipIf(!live)("tri LLM : jeu d'évaluation réel", () => {
  it(`exactitude >= ${MIN_ACCURACY * 100} % sur les cas de jugement`, async () => {
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const llm = createLlmClient({
      costClient: fakeSupabase({ cost_ledger: [] }).client,
      provider,
      auth:
        provider === "anthropic"
          ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
          : process.env.OPENAI_API_KEY
            ? { apiKey: process.env.OPENAI_API_KEY }
            : "proxy",
      budgetUsd: 0.05,
    });
    const cases = EVAL_CASES.filter((c) => !c.byRules);
    let right = 0;
    let okWrong = 0;
    const lines: string[] = [];
    for (const c of cases) {
      const page = {
        url: `https://${c.domain}/`,
        status: 200,
        blockedByRobots: false,
        unreachable: false,
        title: "",
        description: "",
        headings: [],
        text: "",
        lang: "fr",
        links: [],
        viaFallback: false,
        ...c.page,
      } as PageRead;
      const item: TriageItem = {
        id: c.id,
        domain: c.domain,
        type: "page_ressources",
        sourceUrl: page.url,
        urlExact: true,
        targetPageUrl: "https://mega-coloring.com/",
        expectedLinkType: "editorial",
        offer: null,
        rationale: "Page ressources de la niche",
        brokenUrl: null,
      };
      const r = await classifyTarget(llm, item, page, CTX, {
        workspaceId: "22222222-2222-4222-8222-222222222222",
        auditId: "11111111-1111-4111-8111-111111111111",
      });
      const good = r.verdict === c.expected;
      if (good) right++;
      else if (r.verdict === "ok") okWrong++;
      lines.push(
        `${good ? "✔" : "✘"} ${c.id} attendu=${c.expected} obtenu=${r.verdict} (${r.confidence}) ${r.reason}`,
      );
    }
    console.log(lines.join("\n"));
    console.log(
      `exactitude ${right}/${cases.length}, mauvais « ok » : ${okWrong}, coût ${llm.spentUsd.toFixed(5)} USD`,
    );
    expect(right / cases.length).toBeGreaterThanOrEqual(MIN_ACCURACY);
    expect(okWrong).toBe(0);
  }, 180_000);
});
