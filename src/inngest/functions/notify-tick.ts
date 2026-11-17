import { inngest } from "@/inngest/client";
import { notifyRepliesTick } from "@/features/settings/notifications";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Notifications par email (18/11) : « une réponse vous attend ». Toutes les dix minutes ; un email par
 * espace pour les nouvelles réponses proposées, jamais deux fois pour la même. Transactionnel seulement.
 */
export const notifyTick = inngest.createFunction(
  {
    id: "notify-tick",
    triggers: [{ cron: "3-59/10 * * * *" }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const res = await step.run("reponses", async () => notifyRepliesTick(createServiceClient()));
    if (res.sent) logger.info("notifications : réponses signalées", { ...res });
    return res;
  },
);
