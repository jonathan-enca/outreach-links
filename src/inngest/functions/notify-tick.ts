import { inngest } from "@/inngest/client";
import {
  notifyCtx,
  notifyIdle,
  notifyLinkLive,
  notifyLinkLost,
  notifyMailbox,
  notifyMonthly,
  notifyQuota,
  notifyReplies,
  notifyToValidate,
  notifyWeekly,
} from "@/features/notifications/run";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Notifications par email (22/11), toutes les dix minutes. Chaque email est une étape à part : une
 * panne sur l'un ne bloque pas les autres. Jamais deux fois le même (trace `notify.*` dans `events`).
 * Les emails qui peuvent attendre ne partent qu'en semaine, de 8 h à 19 h. Transactionnel seulement.
 */
const STEPS = {
  reponses: notifyReplies,
  boite: notifyMailbox,
  "lien-en-ligne": notifyLinkLive,
  "lien-change": notifyLinkLost,
  "a-valider": notifyToValidate,
  quota: notifyQuota,
  "campagne-a-l-arret": notifyIdle,
} as const;

export const notifyTick = inngest.createFunction(
  {
    id: "notify-tick",
    triggers: [{ cron: "3-59/10 * * * *" }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const sent: Record<string, number> = {};
    for (const [name, run] of Object.entries(STEPS)) {
      sent[name] = await step.run(name, async () => {
        try {
          const ctx = notifyCtx(createServiceClient());
          return ctx ? await run(ctx) : 0;
        } catch (e) {
          logger.warn("notifications : étape en échec", {
            step: name,
            error: (e as Error).message.slice(0, 200),
          });
          return 0;
        }
      });
    }
    if (Object.values(sent).some(Boolean)) logger.info("notifications envoyées", sent);
    return sent;
  },
);

/** Résumé de la semaine : le lundi à 8 h (heure de Paris), seulement pour qui a du nouveau. */
export const notifyWeeklyTick = inngest.createFunction(
  {
    id: "notify-weekly",
    triggers: [{ cron: "TZ=Europe/Paris 0 8 * * 1" }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const sent = await step.run("resume", async () => {
      const ctx = notifyCtx(createServiceClient());
      return ctx ? notifyWeekly(ctx) : 0;
    });
    if (sent) logger.info("résumés de la semaine envoyés", { sent });
    return { sent };
  },
);

/** Bilan du mois : le 1er à 8 h (heure de Paris). */
export const notifyMonthlyTick = inngest.createFunction(
  {
    id: "notify-monthly",
    triggers: [{ cron: "TZ=Europe/Paris 0 8 1 * *" }],
    retries: 0,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const sent = await step.run("bilan", async () => {
      const ctx = notifyCtx(createServiceClient());
      return ctx ? notifyMonthly(ctx) : 0;
    });
    if (sent) logger.info("bilans du mois envoyés", { sent });
    return { sent };
  },
);
