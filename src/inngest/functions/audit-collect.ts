import { z } from "zod";
import { inngest } from "@/inngest/client";
import {
  beginCollection,
  COLLECTION_EVENT,
  executeCollection,
  failCollection,
  finalizeCollection,
  type StepRunner,
} from "@/features/collection/run";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const collectionEventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `audit.collect` (MT.3) : collecte de candidats BRUTS, par tactique (voir `executeCollection`).
 * Un appel payant = un step (reprise sans repayer grâce au cache DataForSEO). Déclenché UNIQUEMENT
 * après la confirmation du coût annoncé. Aucun envoi, aucun achat de lien, aucun appel LLM.
 */
export const auditCollect = inngest.createFunction(
  {
    id: "audit-collect",
    triggers: [{ event: COLLECTION_EVENT }],
    retries: 2,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = collectionEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failCollection(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = collectionEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-collect", auditId });

    const run = await step.run("begin", async () =>
      beginCollection(createServiceClient(), auditId),
    );
    if (!run) {
      log.warn("collecte non exécutable (non confirmée ou déjà terminée)");
      return { skipped: true };
    }
    const runStep: StepRunner = (id, fn) => step.run(id, fn) as never;
    const progress = await executeCollection(
      () => ({ dfs: createDataForSeoClientFromEnv(), service: createServiceClient() }),
      run,
      runStep,
    );
    const result = await step.run("finalize", async () =>
      finalizeCollection(createServiceClient(), run, progress),
    );
    log.info("collecte terminée", result);
    return result;
  },
);
