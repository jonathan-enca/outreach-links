import { z } from "zod";
import { inngest } from "@/inngest/client";
import { productionQualDeps } from "@/features/qualification/deps";
import { executeQualification, type StepRunner } from "@/features/qualification/funnel";
import {
  beginMore,
  failMore,
  finalizeMore,
  loadMoreInput,
  MORE_EVENT,
  toMoreInput,
} from "@/features/qualification/more";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { safeStep } from "@/lib/well-formed";

const eventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `audit.qualify.more` (chantier G, « Lire d'autres sites ») : lit et juge un lot supplémentaire
 * des candidats restés en stock, sans refaire la recherche. Mêmes règles de tri, même argumentaire,
 * mêmes plafonds durs que l'analyse ; les cibles déjà livrées ne sont jamais modifiées. Aucun envoi.
 */
export const auditQualifyMore = inngest.createFunction(
  {
    id: "audit-qualify-more",
    triggers: [{ event: MORE_EVENT }],
    retries: 1,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = eventSchema.safeParse(original);
      if (!parsed.success) return;
      await failMore(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = eventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-qualify-more", auditId });
    const run = await step.run("begin", async () => beginMore(createServiceClient(), auditId));
    if (!run) {
      log.warn("lot supplémentaire non exécutable (rien de demandé)");
      return { skipped: true };
    }
    const loaded = await step.run("load", async () => {
      const l = await loadMoreInput(createServiceClient(), run);
      if (!l) throw new Error("lot supplémentaire : recherche introuvable");
      return l;
    });
    // Tout résultat de step est rendu bien formé avant d'être mémorisé (voir `well-formed.ts`).
    const runStep: StepRunner = safeStep((id, fn) => step.run(id, fn) as Promise<unknown>);
    const { results, stats } = await executeQualification(
      () => productionQualDeps(loaded.ctx, run),
      toMoreInput(run, loaded),
      runStep,
    );
    const out = await step.run("finalize", async () =>
      finalizeMore(createServiceClient(), run, results, stats),
    );
    log.info("lot supplémentaire terminé", { ...out, readStop: stats.readStop });
    return out;
  },
);
