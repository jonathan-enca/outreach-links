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
import { env } from "@/env";
import { describeCandidates, RESOURCE_PICK_LIMITS } from "@/features/collection/resource-judge";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { createLlmClientFromEnv } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { safeStep } from "@/lib/well-formed";

export const collectionEventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `audit.collect` (MT.3) : collecte de candidats BRUTS, par tactique (voir `executeCollection`).
 * Un appel payant = un step (reprise sans repayer grâce au cache DataForSEO). Déclenché UNIQUEMENT
 * après la confirmation du coût annoncé. Aucun envoi, aucun achat de lien. Un seul appel au petit modèle
 * (MC.6a) : le choix des ressources comparables, coût réservé dans le coût annoncé ; sans clé, repli sans jugement.
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
    // Tout résultat de step est rendu bien formé avant d'être mémorisé (voir `well-formed.ts`).
    const runStep: StepRunner = safeStep((id, fn) => step.run(id, fn) as Promise<unknown>);
    const progress = await executeCollection(
      () => ({
        dfs: createDataForSeoClientFromEnv(),
        service: createServiceClient(),
        llm:
          env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.LLM_PROXY_AUTH
            ? createLlmClientFromEnv({
                budgetUsd: RESOURCE_PICK_LIMITS.reservedUsd * 5,
                maxCostPerCallUsd: RESOURCE_PICK_LIMITS.reservedUsd * 5,
              })
            : null,
        describe: describeCandidates,
      }),
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
