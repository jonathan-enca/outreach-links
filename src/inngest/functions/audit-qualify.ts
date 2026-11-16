import { z } from "zod";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { assertCanSpend, spendLimitsFor } from "@/features/collection/guard";
import { realQualDeps } from "@/features/qualification/deps";
import { executeQualification, type StepRunner } from "@/features/qualification/funnel";
import { batchWorstUsd, QUALIFY_LIMITS } from "@/features/qualification/limits";
import {
  beginQualification,
  failQualification,
  finalizeQualification,
  loadQualificationInput,
  QUALIFICATION_EVENT,
  toInput,
} from "@/features/qualification/run";
import { logger } from "@/lib/logger";
import { createLlmClientFromEnv } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";

export const qualificationEventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `audit.qualify` (MT.4) : entonnoir de qualification des candidats de la collecte. Gratuit
 * (exclusions, signaux, lecture de page, contact) puis LLM sur les seuls survivants, par lots, sous
 * un budget de 0,10 USD ; chaque lecture, lot LLM et recherche de contact est un step. Déclenché
 * UNIQUEMENT après la confirmation du coût annoncé. Aucun envoi, aucun achat de lien.
 */
export const auditQualify = inngest.createFunction(
  {
    id: "audit-qualify",
    triggers: [{ event: QUALIFICATION_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = qualificationEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failQualification(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = qualificationEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-qualify", auditId });
    const run = await step.run("begin", async () =>
      beginQualification(createServiceClient(), auditId),
    );
    if (!run) {
      log.warn("qualification non exécutable (non confirmée ou déjà terminée)");
      return { skipped: true };
    }
    const loaded = await step.run("load", async () => {
      const l = await loadQualificationInput(createServiceClient(), auditId);
      if (!l) throw new Error("qualification : collecte introuvable ou non terminée");
      return { ctx: l.ctx, candidates: l.candidates };
    });
    const runStep: StepRunner = (id, fn) => step.run(id, fn) as never;
    const deps = () =>
      realQualDeps(loaded.ctx, {
        llm: (remainingUsd) => {
          if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
          if (remainingUsd <= 0) return null;
          return createLlmClientFromEnv({
            budgetUsd: remainingUsd,
            maxCostPerCallUsd: batchWorstUsd(QUALIFY_LIMITS.batchSize, run.model) * 1.5,
          });
        },
        guard: (estimateUsd) =>
          assertCanSpend(
            createServiceClient(),
            spendLimitsFor(run.auditId, run.auditCapUsd),
            estimateUsd,
          ),
      });
    const { results, stats } = await executeQualification(deps, toInput(run, loaded), runStep);
    const out = await step.run("finalize", async () =>
      finalizeQualification(createServiceClient(), run, results, stats),
    );
    log.info("qualification terminée", { ...out, stop: stats.stop });
    return out;
  },
);
