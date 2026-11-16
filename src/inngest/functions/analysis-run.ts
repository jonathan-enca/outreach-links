import { z } from "zod";
import { inngest } from "@/inngest/client";
import { productionAnalysisDeps } from "@/features/analysis/deps";
import { runAnalysis, type StepRunner } from "@/features/analysis/orchestrate";
import { failAnalysis, realOrchestration } from "@/features/analysis/run";
import { notifyAnalysisReady } from "@/features/analysis/notify";
import { ANALYSIS_EVENT, LINKS_STATE_EVENT } from "@/features/analysis/service";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";

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
    const runStep: StepRunner = (id, fn) => step.run(id, fn) as never;
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
      // D7 : un seul essai, jamais bloquant (sans service d'email, l'écran suffit). Étape mémorisée :
      // un rejeu du job ne renvoie pas l'email.
      const emailed = await step.run("email-fin", async () => {
        const service = createServiceClient();
        const { data: audit } = await service
          .from("audits")
          .select("workspace_id, site_id, created_by, sites(domain)")
          .eq("id", auditId)
          .maybeSingle();
        const site = audit?.sites as unknown as { domain: string } | null;
        if (!audit || !site || !audit.created_by) return "sans_adresse";
        return notifyAnalysisReady(
          service,
          {
            auditId,
            workspaceId: audit.workspace_id,
            siteId: audit.site_id,
            domain: site.domain,
            actorId: audit.created_by,
          },
          outcome.shortlist,
        );
      });
      log.info("email de fin", { emailed });
      // Trace durable du résultat (essai du 17/11 : aucun moyen de savoir pourquoi l'email n'était pas parti).
      await step.run("email-fin-trace", async () => {
        const service = createServiceClient();
        const { data: audit } = await service
          .from("audits")
          .select("workspace_id")
          .eq("id", auditId)
          .maybeSingle();
        if (audit) {
          await service.from("events").insert({
            workspace_id: audit.workspace_id,
            actor_id: null,
            type: "analysis.email_result",
            payload: { audit_id: auditId, result: emailed },
          });
        }
        return { traced: true };
      });
    }
    log.info("analyse terminée", { ...outcome });
    return outcome;
  },
);
