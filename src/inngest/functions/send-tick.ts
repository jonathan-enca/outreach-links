import { inngest } from "@/inngest/client";
import { defaultSendDeps, runSendTick } from "@/features/sending/service";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const SEND_TICK_EVENT = "sending/tick";

/**
 * Moteur d'envoi (M4.2) : un passage toutes les 6 minutes, au plus UN message par boîte, donc
 * 10 par heure au maximum (la base applique aussi les plafonds). Sans EMAIL_DRY_RUN=false ET
 * OUTREACH_SENDING_ENABLED=true, il ne fait que SIMULER : aucun email réel.
 */
export const sendTick = inngest.createFunction(
  {
    id: "send-tick",
    triggers: [{ cron: "*/6 * * * *" }, { event: SEND_TICK_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const outcomes = await step.run("tick", async () =>
      runSendTick(defaultSendDeps(() => createServiceClient())),
    );
    const sent = outcomes.filter((o) => "draftId" in o).length;
    if (sent) logger.info("envoi : passage terminé", { traites: sent });
    return { mailboxes: outcomes.length, traites: sent };
  },
);
