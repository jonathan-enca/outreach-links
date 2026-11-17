import { z } from "zod";
import { inngest } from "@/inngest/client";
import { productionFindDeps } from "@/features/findings/deps";
import { executeFindings, type StepRunner } from "@/features/findings/funnel";
import {
  beginFindings,
  failFindings,
  FINDINGS_EVENT,
  finalizeFindings,
  loadFindingsInput,
  toInput,
} from "@/features/findings/run";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";
import { safeStep } from "@/lib/well-formed";

export const findingsEventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `audit.findings` (MT.5) : constats par page pour les cibles de la liste courte (liens morts
 * constatés, liens inadaptés, mentions sans lien). Gratuit (lecture, contrôle des liens) puis un appel
 * LLM par cible qui a quelque chose à juger, sous 0,05 USD ; chaque balayage et chaque jugement est un
 * step. Déclenché UNIQUEMENT après la confirmation du coût annoncé. Aucun envoi, aucun achat de lien.
 */
export const auditFindings = inngest.createFunction(
  {
    id: "audit-findings",
    triggers: [{ event: FINDINGS_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = findingsEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failFindings(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = findingsEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-findings", auditId });
    const run = await step.run("begin", async () => beginFindings(createServiceClient(), auditId));
    if (!run) {
      log.warn("analyse des pages non exécutable (non confirmée ou déjà terminée)");
      return { skipped: true };
    }
    const loaded = await step.run("load", async () => {
      const l = await loadFindingsInput(createServiceClient(), auditId);
      if (!l) throw new Error("constats : qualification introuvable ou non terminée");
      return { ctx: l.ctx, targets: l.targets };
    });
    // Tout résultat de step est rendu bien formé avant d'être mémorisé (voir `well-formed.ts`).
    const runStep: StepRunner = safeStep((id, fn) => step.run(id, fn) as Promise<unknown>);
    const deps = () => productionFindDeps(run);
    const { findings, stats } = await executeFindings(deps, toInput(run, loaded), runStep);
    const out = await step.run("finalize", async () =>
      finalizeFindings(createServiceClient(), run, findings, stats),
    );
    log.info("analyse des pages terminée", { ...out, stop: stats.stop });
    return out;
  },
);
