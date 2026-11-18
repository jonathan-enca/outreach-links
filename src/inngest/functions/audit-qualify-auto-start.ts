import { z } from "zod";
import { inngest } from "@/inngest/client";
import { AUTO_EVENT, autoEventId, startBackground } from "@/features/qualification/background";
import { MORE_EVENT } from "@/features/qualification/more";
import { sendReadyEmail } from "@/features/analysis/ready-email";
import { env } from "@/env";
import { describeCandidates, RESOURCE_PICK_LIMITS } from "@/features/collection/resource-judge";
import { runSnowballForAudit } from "@/features/snowball/service";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { createLlmClientFromEnv } from "@/lib/llm/client";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

const eventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `audit.qualify.auto.start` : lance la lecture automatique de la réserve après la première liste
 * (envoyé par `analysis-run` à la fin de l'analyse). Prend le verrou « un seul lot à la fois », puis
 * envoie le lot 1 ; les lots suivants s'enchaînent depuis `audit-qualify-more`. MC.6d : avant le lot 1, la
 * boule de neige ajoute au stock les pages qui citent les sites cités par les cibles retenues (coût annoncé et
 * plafonné ; jamais bloquant : une panne laisse la lecture de la réserve se faire comme avant).
 */
export const auditQualifyAutoStart = inngest.createFunction(
  { id: "audit-qualify-auto-start", triggers: [{ event: AUTO_EVENT }], retries: 2 },
  async ({ event, step }) => {
    const { auditId } = eventSchema.parse(event.data);
    await step.run("boule-de-neige", async () => {
      try {
        const out = await runSnowballForAudit(createServiceClient(), auditId, {
          dfs: createDataForSeoClientFromEnv(),
          llm:
            env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY || env.LLM_PROXY_AUTH
              ? createLlmClientFromEnv({
                  budgetUsd: RESOURCE_PICK_LIMITS.reservedUsd * 5,
                  maxCostPerCallUsd: RESOURCE_PICK_LIMITS.reservedUsd * 5,
                })
              : null,
          describe: describeCandidates,
        });
        return { status: out.status };
      } catch (e) {
        logger.error("boule de neige impossible, lecture de la réserve seule", {
          auditId,
          error: (e as Error).message,
        });
        return { status: "erreur" };
      }
    });
    const started = await step.run("start", async () =>
      startBackground(createServiceClient(), auditId),
    );
    if (!started) {
      logger.info("arrière-plan non lancé (réserve vide, déjà en cours ou analyse non terminée)", {
        auditId,
      });
      // Rien à lire en arrière-plan : la liste est définitive, on prévient maintenant (un seul essai,
      // jamais bloquant).
      await step.run("email-fin", async () => sendReadyEmail(createServiceClient(), auditId));
      return { started: false };
    }
    await step.sendEvent("first-lot", {
      id: autoEventId(auditId, started.startedAt, started.lot),
      name: MORE_EVENT,
      data: { auditId, auto: { lot: started.lot } },
    });
    return { started: true };
  },
);
