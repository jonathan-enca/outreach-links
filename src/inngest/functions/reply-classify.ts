import { inngest } from "@/inngest/client";
import { runClassifyTick } from "@/features/classification/service";
import { CLASSIFY_LIMITS } from "@/features/classification/types";
import { logger } from "@/lib/logger";
import { createLlmClientFromEnv } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";

export const REPLY_CLASSIFY_EVENT = "replies/classify";

/**
 * Classification des réponses (M5.1) : toutes les 10 minutes (décalée de la lecture IMAP) et à la
 * demande. Sans message à classer, aucun appel (ni LLM ni payant). Dépense plafonnée par passage.
 */
export const replyClassify = inngest.createFunction(
  {
    id: "reply-classify",
    triggers: [{ cron: "4-59/10 * * * *" }, { event: REPLY_CLASSIFY_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const res = await step.run("classification", async () => {
      const db = createServiceClient();
      return runClassifyTick({
        db,
        llm: () =>
          createLlmClientFromEnv({
            costClient: db,
            budgetUsd: CLASSIFY_LIMITS.llmBudgetUsd,
            maxCostPerCallUsd: CLASSIFY_LIMITS.llmMaxCostPerCallUsd,
          }),
      });
    });
    if (res.classified || res.waiting) logger.info("réponses : classification", { ...res });
    return res;
  },
);
