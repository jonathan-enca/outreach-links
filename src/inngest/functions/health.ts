import { z } from "zod";
import { inngest } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { recordCost } from "@/lib/costs";
import { logger } from "@/lib/logger";

export const healthEventSchema = z.object({
  /** Facultatif : rattache la ligne de test à un workspace. */
  workspaceId: z.uuid().optional(),
});

/**
 * Fonction de test : vérifie qu'Inngest exécute du code de l'application et que le
 * journal des coûts est écrit (ligne fournisseur "internal", coût nul).
 * Déclenchement : événement "app/health.ping".
 */
export const health = inngest.createFunction(
  { id: "health", triggers: [{ event: "app/health.ping" }] },
  async ({ event, step }) => {
    const { workspaceId } = healthEventSchema.parse(event.data ?? {});
    const log = logger.child({ fn: "health", workspaceId: workspaceId ?? null });

    const ledgerId = await step.run("record-cost", async () => {
      const row = await recordCost(createServiceClient(), {
        workspaceId,
        provider: "internal",
        operation: "health.check",
        units: 1,
        estimatedCostUsd: 0,
        metadata: { source: "inngest-health" },
      });
      return row.id;
    });

    log.info("health ok", { ledgerId });
    return { ok: true, ledgerId };
  },
);
