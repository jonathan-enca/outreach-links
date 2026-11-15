import { inngest } from "@/inngest/client";
import { safeFetchPage } from "@/features/sites/verify";
import { runLinkChecks } from "@/features/links/service";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const LINK_CHECK_EVENT = "links/check";

/**
 * Vérification des liens posés (M5.3) : toutes les heures, au plus 20 pages relues, via le
 * récupérateur sécurisé (SSRF), robots.txt respecté. Aucune requête payante, aucun envoi.
 */
export const linkCheckTick = inngest.createFunction(
  {
    id: "link-check-tick",
    triggers: [{ cron: "17 * * * *" }, { event: LINK_CHECK_EVENT }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const stats = await step.run("tick", async () =>
      runLinkChecks(createServiceClient(), {
        fetch: safeFetchPage,
        now: () => new Date(),
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      }),
    );
    if (stats.checked) logger.info("liens : passage terminé", stats);
    return stats;
  },
);
