import { z } from "zod";
import { inngest } from "@/inngest/client";
import { productionQualDeps } from "@/features/qualification/deps";
import { executeQualification, type StepRunner } from "@/features/qualification/funnel";
import { advanceBackground, autoEventId } from "@/features/qualification/background";
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

const eventSchema = z.object({
  auditId: z.uuid(),
  /** Lecture automatique de la réserve : numéro du lot (absent = clic sur « Lire d'autres sites »). */
  auto: z.object({ lot: z.number().int().min(1) }).optional(),
});

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
    // Jamais deux lots en même temps pour une même analyse (en plus du verrou en base).
    concurrency: [{ limit: 2 }, { key: "event.data.auditId", limit: 1 }],
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = eventSchema.safeParse(original);
      if (!parsed.success) return;
      await failMore(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId, auto } = eventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-qualify-more", auditId });
    const run = await step.run("begin", async () =>
      beginMore(createServiceClient(), auditId, auto ?? null),
    );
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
    if (!auto || !run.auto) return out;
    // Lecture automatique : on compte le lot, on décide, et au plus UN événement pour le lot suivant
    // (identifiant fixe par lot : un rejeu n'en crée pas un second).
    const next = await step.run("advance", async () =>
      advanceBackground(createServiceClient(), run, auto.lot, stats, out.added),
    );
    if (next.continue) {
      await step.sendEvent("next-lot", {
        id: autoEventId(auditId, next.startedAt, next.lot),
        name: MORE_EVENT,
        data: { auditId, auto: { lot: next.lot } },
      });
    }
    log.info("arrière-plan", { lot: auto.lot, ...next });
    return { ...out, next };
  },
);
