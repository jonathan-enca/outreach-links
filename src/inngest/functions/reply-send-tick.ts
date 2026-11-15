import { inngest } from "@/inngest/client";
import { runReplySendTick } from "@/features/inbox/send";
import { defaultSendDeps } from "@/features/sending/service";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const REPLY_SEND_EVENT = "replies/send";

/**
 * Envoi des réponses validées (M5.2b) : un passage toutes les 6 minutes (décalé de l'outreach),
 * au plus UNE réponse par boîte. Sans EMAIL_DRY_RUN=false ET OUTREACH_SENDING_ENABLED=true, il
 * ne fait que SIMULER : aucun email réel. Seuls les brouillons validés par l'utilisateur partent.
 */
export const replySendTick = inngest.createFunction(
  {
    id: "reply-send-tick",
    triggers: [{ cron: "3-59/6 * * * *" }, { event: REPLY_SEND_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const outcomes = await step.run("tick", async () =>
      runReplySendTick(defaultSendDeps(() => createServiceClient())),
    );
    const sent = outcomes.filter((o) => "replyDraftId" in o).length;
    if (sent) logger.info("réponses : passage terminé", { traites: sent });
    return { mailboxes: outcomes.length, traites: sent };
  },
);
