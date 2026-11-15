import { z } from "zod";
import { inngest } from "@/inngest/client";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { TRIAGE_LIMITS } from "@/features/triage/limits";
import { createJinaFallback } from "@/features/triage/page-reader";
import {
  beginTriage,
  failTriage,
  finalizeTriage,
  loadTriageInput,
  saveVerdict,
  summarize,
  TRIAGE_EVENT,
} from "@/features/triage/run";
import { triageItem } from "@/features/triage/triage";
import type { TriageResult } from "@/features/triage/types";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";

export const triageEventSchema = z.object({
  planId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Client LLM du tri, plafonné ; null sans clé (les cibles non tranchées restent « non vérifiables »). */
function makeLlm(spentUsd: number): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
  const left = TRIAGE_LIMITS.llmBudgetUsd - spentUsd;
  if (left <= 0) return null;
  return createLlmClientFromEnv({
    budgetUsd: left,
    maxCostPerCallUsd: TRIAGE_LIMITS.llmMaxCostPerCallUsd,
  });
}

/**
 * Job `plan.triage` (M3.1) : lit la page de chaque cible du plan validé (HTTP 200 exigé,
 * robots.txt respecté), applique les règles gratuites puis le LLM, et enregistre un verdict
 * lisible par cible. Un step par cible (idempotent) ; aucun contact, aucun envoi.
 */
export const planTriage = inngest.createFunction(
  {
    id: "plan-triage",
    triggers: [{ event: TRIAGE_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = triageEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failTriage(createServiceClient(), parsed.data.planId, error.message);
    },
  },
  async ({ event, step }) => {
    const { planId } = triageEventSchema.parse(event.data);
    const log = logger.child({ fn: "plan-triage", planId });

    const run = await step.run("begin", async () => beginTriage(createServiceClient(), planId));
    if (!run) {
      log.warn("tri non exécutable (plan introuvable ou étape non lancée)");
      return { skipped: true };
    }
    const input = await step.run("load", async () => {
      const i = await loadTriageInput(createServiceClient(), run);
      return { ...i, ctx: { ...i.ctx, competitorDomains: [...i.ctx.competitorDomains] } };
    });
    const ctx = { ...input.ctx, competitorDomains: new Set(input.ctx.competitorDomains) };

    const results: TriageResult[] = [];
    for (const [i, item] of input.items.entries()) {
      const spent = results.reduce((s, x) => s + x.costUsd, 0);
      const r = await step.run(`target-${i + 1}`, async () => {
        const service = createServiceClient();
        const fetchPage = createSafeFetcher({
          userAgent: BOT_USER_AGENT,
          maxBytes: 256 * 1024,
          accept: "text/html,*/*;q=0.5",
        });
        const res = await triageItem(item, ctx, {
          fetch: fetchPage,
          sleep,
          now: () => Date.now(),
          fallback: env.PAGE_READER_FALLBACK === "jina" ? createJinaFallback() : null,
          llm: makeLlm(spent),
          scope: { workspaceId: run.workspaceId, auditId: run.auditId },
        });
        await saveVerdict(service, run, res);
        return res;
      });
      results.push(r);
    }

    const stats = summarize(results, input.skipped);
    const cost = results.reduce((s, r) => s + r.costUsd, 0);
    await step.run("finalize", async () => finalizeTriage(createServiceClient(), run, stats, cost));
    log.info("tri terminé", { ...stats, costUsd: cost });
    return { ...stats, costUsd: cost };
  },
);
