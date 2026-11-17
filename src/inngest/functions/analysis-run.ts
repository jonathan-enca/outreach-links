import { z } from "zod";
import { inngest } from "@/inngest/client";
import { productionAnalysisDeps } from "@/features/analysis/deps";
import { runAnalysis, type StepRunner } from "@/features/analysis/orchestrate";
import { failAnalysis, realOrchestration } from "@/features/analysis/run";
import { AUTO_EVENT } from "@/features/qualification/background";
import { ANALYSIS_EVENT, LINKS_STATE_EVENT } from "@/features/analysis/service";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";
import { safeStep } from "@/lib/well-formed";

export const analysisEventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `analysis.run` (MU.1) : l'orchestrateur UNIQUE. Un seul événement (`analysis/run.requested`,
 * envoyé après la confirmation de l'utilisateur) enchaîne profil, concurrents, requêtes, recherche des
 * sites, tri, contacts, liens morts et mentions, liste courte ; l'état des lieux part en parallèle.
 * Chaque appel externe est un step (mémorisé) ; chaque étape écrit sa progression. Reprise : les
 * étapes déjà terminées sont sautées, rien n'est refait ni repayé. Aucun envoi, aucun achat de lien.
 */
export const analysisRun = inngest.createFunction(
  {
    id: "analysis-run",
    triggers: [{ event: ANALYSIS_EVENT }],
    retries: 2,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = analysisEventSchema.safeParse(original);
      if (!parsed.success) return;
      logger.error("analyse interrompue", { auditId: parsed.data.auditId, error: error.message });
      await failAnalysis(createServiceClient(), parsed.data.auditId, t.analysis.errors.interrupted);
    },
  },
  async ({ event, step }) => {
    const { auditId } = analysisEventSchema.parse(event.data);
    const log = logger.child({ fn: "analysis-run", auditId });
    // Tout résultat de step est rendu bien formé avant d'être mémorisé (voir `well-formed.ts`).
    const runStep: StepRunner = safeStep((id, fn) => step.run(id, fn) as Promise<unknown>);
    const orchestration = realOrchestration(
      productionAnalysisDeps(async (run) => {
        await inngest.send({
          id: `analysis-links-${run.auditId}-${run.nonce}`,
          name: LINKS_STATE_EVENT,
          data: { auditId: run.auditId },
        });
      }),
    );
    const outcome = await runAnalysis(orchestration, auditId, runStep);
    if (outcome.status === "termine") {
      // Arrière-plan : la première liste est affichée ; la réserve de sites se lit maintenant toute seule,
      // lot par lot (un événement par lot, jamais une requête directe). Jamais bloquant.
      await step.sendEvent("lecture-arriere-plan", { name: AUTO_EVENT, data: { auditId } });
      // L'email « vos cibles sont prêtes » part à la fin DÉFINITIVE (fin de l'arrière-plan), pas ici :
      // voir `sendReadyEmail`, appelé par `audit-qualify-auto-start` et `audit-qualify-more`.
    }
    log.info("analyse terminée", { ...outcome });
    return outcome;
  },
);
