import { z } from "zod";
import { inngest } from "@/inngest/client";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { draftItem } from "@/features/drafting/draft";
import { DRAFT_LIMITS } from "@/features/drafting/limits";
import {
  beginDrafts,
  DRAFTS_EVENT,
  failDrafts,
  finalizeDrafts,
  loadDraftInput,
  loadWrittenBodies,
  saveDraft,
  summarize,
} from "@/features/drafting/run";
import type { DraftResult } from "@/features/drafting/types";
import { createSafeFetcher } from "@/features/sites/verify";
import { env } from "@/env";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const draftsEventSchema = z.object({
  planId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

/** Client LLM plafonné ; null sans clé ou budget épuisé (la cible n'est alors pas rédigée). */
function makeLlm(spentUsd: number): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
  const left = DRAFT_LIMITS.llmBudgetUsd - spentUsd;
  if (left <= 0) return null;
  return createLlmClientFromEnv({
    budgetUsd: left,
    maxCostPerCallUsd: DRAFT_LIMITS.llmMaxCostPerCallUsd,
  });
}

/**
 * Job `plan.drafts` (M3.3) : rédige un message par cible contactable (URL vérifiée 200, linter,
 * contrôle des doublons). Un step par cible. Aucun envoi : la validation par lot est M3.4.
 */
export const planDrafts = inngest.createFunction(
  {
    id: "plan-drafts",
    triggers: [{ event: DRAFTS_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = draftsEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failDrafts(createServiceClient(), parsed.data.planId, error.message);
    },
  },
  async ({ event, step }) => {
    const { planId } = draftsEventSchema.parse(event.data);
    const log = logger.child({ fn: "plan-drafts", planId });

    const run = await step.run("begin", async () => beginDrafts(createServiceClient(), planId));
    if (!run) {
      log.warn("rédaction non exécutable (plan introuvable ou étape non lancée)");
      return { skipped: true };
    }
    const input = await step.run("load", async () => loadDraftInput(createServiceClient(), run));
    if (!input.ctx) {
      await step.run("fail", async () =>
        failDrafts(createServiceClient(), planId, "Prénom de signature manquant."),
      );
      return { skipped: true };
    }
    const ctx = input.ctx;

    const results: DraftResult[] = [];
    let notDrafted = 0;
    for (const [i, item] of input.items.entries()) {
      const spent = results.reduce((s, r) => s + r.costUsd, 0);
      const out = await step.run(`target-${i + 1}`, async () => {
        const llm = makeLlm(spent);
        if (!llm) return { skipped: "Rédaction indisponible (clé ou budget LLM)." };
        const service = createServiceClient();
        const res = await draftItem(item, ctx, {
          llm,
          fetch: createSafeFetcher({
            userAgent: BOT_USER_AGENT,
            maxBytes: 64 * 1024,
            accept: "text/html,*/*;q=0.5",
          }),
          scope: { workspaceId: run.workspaceId, auditId: run.auditId },
          previousBodies: await loadWrittenBodies(service, planId, item.id),
        });
        if ("result" in res) await saveDraft(service, run, res.result);
        return res;
      });
      if ("result" in out) results.push(out.result);
      else notDrafted++;
    }

    const stats = summarize(results, notDrafted, input.skipped);
    const cost = results.reduce((s, r) => s + r.costUsd, 0);
    await step.run("finalize", async () => finalizeDrafts(createServiceClient(), run, stats, cost));
    log.info("rédaction terminée", { ...stats });
    return stats;
  },
);
