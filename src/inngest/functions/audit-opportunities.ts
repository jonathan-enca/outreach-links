import { z } from "zod";
import { inngest } from "@/inngest/client";
import {
  beginOpportunities,
  failOpportunities,
  finalizeOpportunitiesStep,
  OPPORTUNITIES_EVENT,
  runQuery,
  type QueryOutcome,
} from "@/features/opportunities/run";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const opportunitiesEventSchema = z.object({
  auditId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

/**
 * Job `audit.opportunities` (M2.1) : génère les opportunités de liens. Déclenché UNIQUEMENT
 * après la confirmation du coût. Une requête SERP = un step (le cache évite de repayer).
 * Aucun contact n'est lancé ici.
 */
export const auditOpportunities = inngest.createFunction(
  {
    id: "audit-opportunities",
    triggers: [{ event: OPPORTUNITIES_EVENT }],
    retries: 2,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = opportunitiesEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failOpportunities(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = opportunitiesEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-opportunities", auditId });

    const run = await step.run("begin", async () =>
      beginOpportunities(createServiceClient(), auditId),
    );
    if (!run) {
      log.warn("opportunités non exécutables (profil non terminé ou étape non confirmée)");
      return { skipped: true };
    }

    const outcomes: QueryOutcome[] = [];
    let spent = 0;
    for (const [i, q] of run.queries.entries()) {
      const spentBefore = spent;
      const out = await step.run(`serp-${i + 1}`, async () =>
        runQuery(createDataForSeoClientFromEnv(), run, q, spentBefore),
      );
      outcomes.push(out);
      spent += out.actualCostUsd;
    }

    const stats = await step.run("finalize", async () =>
      finalizeOpportunitiesStep(
        createServiceClient(),
        run,
        outcomes.flatMap((o) => o.candidates),
        spent,
      ),
    );
    log.info("opportunités générées", { ...stats });
    return { skipped: false, ...stats };
  },
);
