import { inngest } from "@/inngest/client";
import { advanceChain } from "@/features/audits/chain";
import { runWatchdog } from "@/features/watchdog/run";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const WATCHDOG_EVENT = "watchdog/sweep";

/**
 * Chien de garde (MU.0) : toutes les 10 minutes, débloque toute étape longue restée « en cours » ou
 * « confirmée » au-delà de son délai (voir `features/watchdog`). Aucun appel payant ici ; une étape
 * réparée d'un audit en parcours unique reprend son enchaînement, avec les contrôles de budget
 * habituels de chaque étape.
 */
export const stepWatchdog = inngest.createFunction(
  {
    id: "step-watchdog",
    triggers: [{ cron: "8-59/10 * * * *" }, { event: WATCHDOG_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const report = await step.run("sweep", async () => {
      const service = createServiceClient();
      return runWatchdog(service, {
        onAuditRepaired: async (auditId) => {
          try {
            await advanceChain(service, auditId, (e) => inngest.send(e));
          } catch (error) {
            logger.warn("chien de garde : enchaînement impossible", {
              auditId,
              error: (error as Error).message,
            });
          }
        },
      });
    });
    return { examined: report.examined, actions: report.actions.length };
  },
);
