import { inngest } from "@/inngest/client";
import { defaultReplyDeps, runReplyTick } from "@/features/replies/service";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const REPLY_TICK_EVENT = "replies/tick";

/**
 * Lecture des réponses (M4.4) : un passage toutes les 10 minutes, en LECTURE SEULE, limité aux
 * boîtes qui ont au moins un envoi réel (aucune connexion IMAP sinon) et aux fils de campagne.
 */
export const replyTick = inngest.createFunction(
  {
    id: "reply-tick",
    triggers: [{ cron: "*/10 * * * *" }, { event: REPLY_TICK_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const outcomes = await step.run("lecture", async () =>
      runReplyTick(defaultReplyDeps(() => createServiceClient())),
    );
    const lus = outcomes.filter((o) => o.result === "lu").length;
    if (lus) logger.info("réponses : passage terminé", { boites_lues: lus });
    return { mailboxes: outcomes.length, lues: lus };
  },
);
