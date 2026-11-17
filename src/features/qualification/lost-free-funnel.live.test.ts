import { readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { assertCanSpend } from "@/features/collection/guard";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { realQualDeps } from "./deps";
import { EVAL_CONTEXT } from "./eval-set";
import { executeQualification } from "./funnel";
import { batchWorstUsd, QUALIFY_LIMITS } from "./limits";
import type { QualCandidate, QualContext } from "./types";

/**
 * Qualification RÉELLE (lecture, jugement, contact) d'une liste de candidats donnée, sans écriture en
 * base : mesure avant / après du chantier D sur des sites précis. Budget de jugement plafonné.
 *   NODE_USE_ENV_PROXY=1 LLM_PROXY_AUTH=true LOST_FUNNEL_IN=... LOST_FUNNEL_OUT=... pnpm demo:lost-funnel
 */
const input = process.env.LOST_FUNNEL_IN;

describe.skipIf(!input)("pertes gratuites : entonnoir réel sur une liste", () => {
  it("qualifie la liste et écrit le résultat", { timeout: 1_800_000 }, async () => {
    const candidates = JSON.parse(readFileSync(input!, "utf8")) as QualCandidate[];
    const ledger = fakeSupabase({ cost_ledger: [] });
    const ctx: QualContext = {
      ...EVAL_CONTEXT,
      competitorDomains: [],
      contactedElsewhere: [],
      suppressedDomains: [],
    };
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const model = process.env.LLM_MODEL ?? DEFAULT_MODELS[provider];
    const budgetUsd = Number(process.env.LOST_FUNNEL_BUDGET ?? "0.10");
    const limits = {
      auditId: "11111111-1111-4111-8111-111111111111",
      auditCapUsd: budgetUsd,
      safetyCapUsd: 5,
      dailyCapUsd: 25,
    };
    const deps = () =>
      realQualDeps(ctx, {
        llm: (remainingUsd) =>
          remainingUsd <= 0
            ? null
            : createLlmClient({
                costClient: ledger.client,
                provider,
                model,
                auth:
                  provider === "anthropic"
                    ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
                    : process.env.OPENAI_API_KEY
                      ? { apiKey: process.env.OPENAI_API_KEY }
                      : "proxy",
                budgetUsd: remainingUsd,
                maxCostPerCallUsd: batchWorstUsd(QUALIFY_LIMITS.batchSize, model) * 1.5,
              }),
        guard: (est) => assertCanSpend(ledger.client, limits, est),
      });
    const { results, stats } = await executeQualification(
      deps,
      { workspaceId: null, auditId: limits.auditId, ctx, candidates, budgetUsd, model },
      (_id, fn) => fn(),
    );
    const out = {
      stats,
      results: results.map((r) => ({
        domain: r.domain,
        status: r.status,
        reason: r.exclusionReason,
        detail: r.exclusionDetail,
        contact: r.contact?.status ?? null,
        fit: r.judgement?.fit ?? null,
      })),
    };
    writeFileSync(process.env.LOST_FUNNEL_OUT ?? "/dev/null", JSON.stringify(out, null, 1));
  });
});
