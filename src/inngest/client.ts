import { Inngest } from "inngest";
import { env } from "@/env";
import { logger } from "@/lib/logger";

/**
 * Client Inngest. En local : INNGEST_DEV=1 et `pnpm inngest:dev`. En production :
 * INNGEST_EVENT_KEY et INNGEST_SIGNING_KEY (lus par le SDK depuis l'environnement).
 * Toute étape longue du produit passe par une fonction Inngest, jamais par une requête directe.
 */
export const inngest = new Inngest({
  id: "outreach-links",
  isDev: env.INNGEST_DEV === "1" ? true : undefined,
  logger: {
    info: (...a: unknown[]) => logger.info("inngest", { args: a }),
    warn: (...a: unknown[]) => logger.warn("inngest", { args: a }),
    error: (...a: unknown[]) => logger.error("inngest", { args: a }),
    debug: (...a: unknown[]) => logger.debug("inngest", { args: a }),
  },
});
