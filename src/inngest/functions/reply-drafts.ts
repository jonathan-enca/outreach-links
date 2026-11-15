import { inngest } from "@/inngest/client";
import { runDraftTick } from "@/features/inbox/service";
import { REPLY_LLM_LIMITS } from "@/features/inbox/reply-writer";
import { logger } from "@/lib/logger";
import { createLlmClientFromEnv } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";

export const REPLY_DRAFTS_EVENT = "replies/draft";

/**
 * Préparation des brouillons de réponse (M5.2), workspaces « assisté » seulement. Rien n'est validé
 * ni envoyé. Sans classification éligible : aucun appel LLM (le client n'est même pas construit).
 */
export const replyDrafts = inngest.createFunction(
  {
    id: "reply-drafts",
    triggers: [{ cron: "7-59/10 * * * *" }, { event: REPLY_DRAFTS_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const res = await step.run("brouillons", async () => {
      const db = createServiceClient();
      return runDraftTick({
        db,
        llm: () =>
          createLlmClientFromEnv({
            costClient: db,
            budgetUsd: REPLY_LLM_LIMITS.budgetUsd,
            maxCostPerCallUsd: REPLY_LLM_LIMITS.maxCostPerCallUsd,
          }),
      });
    });
    if (res.drafted) logger.info("réponses : brouillons préparés", { ...res });
    return res;
  },
);
