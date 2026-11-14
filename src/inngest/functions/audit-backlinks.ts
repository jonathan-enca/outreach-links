import { z } from "zod";
import { inngest } from "@/inngest/client";
import {
  BACKLINKS_EVENT,
  beginBacklinks,
  cleanAuditBacklinks,
  failBacklinks,
  fetchCompetitorBacklinks,
  finalizeBacklinks,
} from "@/features/backlinks/run";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const backlinksEventSchema = z.object({
  auditId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

/**
 * Job `audit.backlinks` (M1.4) : backlinks de chaque concurrent retenu (un appel par
 * concurrent = une étape, reprise sans repayer grâce au cache DataForSEO), puis
 * nettoyage et compteurs. Déclenché UNIQUEMENT après la confirmation du coût.
 */
export const auditBacklinks = inngest.createFunction(
  {
    id: "audit-backlinks",
    triggers: [{ event: BACKLINKS_EVENT }],
    retries: 2,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = backlinksEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failBacklinks(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = backlinksEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-backlinks", auditId });

    const run = await step.run("begin", async () => beginBacklinks(createServiceClient(), auditId));
    if (!run) {
      log.warn("backlinks non exécutables (audit non terminé ou étape non confirmée)");
      return { skipped: true };
    }

    const fetched = [];
    for (const [i, competitor] of run.competitors.entries()) {
      fetched.push(
        await step.run(`backlinks-${i + 1}`, async () =>
          fetchCompetitorBacklinks(
            createServiceClient(),
            createDataForSeoClientFromEnv(),
            run,
            competitor,
          ),
        ),
      );
    }

    const result = await step.run("clean", async () => {
      const service = createServiceClient();
      const stats = await cleanAuditBacklinks(service, run);
      return finalizeBacklinks(service, run, stats);
    });
    log.info("backlinks terminés", { before: result.stats.before, after: result.stats.after });
    return { skipped: false, fetched, ...result };
  },
);
