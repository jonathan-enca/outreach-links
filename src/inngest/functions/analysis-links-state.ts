import { z } from "zod";
import { env } from "@/env";
import { googleConfig } from "@/features/google/config";
import { parseKeyRing } from "@/features/mailboxes/crypto";
import { loadSearchConsoleSnapshot, searchConsoleEnabled } from "@/features/search-console/load";
import { inngest } from "@/inngest/client";
import {
  beginLinksState,
  executeLinksState,
  failLinksState,
} from "@/features/analysis/links-state";
import type { StepRunner } from "@/features/analysis/orchestrate";
import { createProgress } from "@/features/analysis/progress";
import { LINKS_STATE_EVENT } from "@/features/analysis/service";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const linksStateEventSchema = z.object({ auditId: z.uuid() });

/**
 * Job `analysis.links-state` (MU.1) : état des lieux des liens du site (résumé, domaines référents,
 * mots-clés classés), lancé par l'orchestrateur et exécuté EN PARALLÈLE. Son échec ne touche que sa
 * propre étape : l'analyse continue.
 */
export const analysisLinksState = inngest.createFunction(
  {
    id: "analysis-links-state",
    triggers: [{ event: LINKS_STATE_EVENT }],
    retries: 1,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = linksStateEventSchema.safeParse(original);
      if (!parsed.success) return;
      const service = createServiceClient();
      const { data } = await service
        .from("audits")
        .select("workspace_id")
        .eq("id", parsed.data.auditId)
        .maybeSingle();
      if (!data) return;
      await failLinksState(
        createProgress(service, { auditId: parsed.data.auditId, workspaceId: data.workspace_id }),
        error.message,
      );
    },
  },
  async ({ event, step }) => {
    const { auditId } = linksStateEventSchema.parse(event.data);
    const run = await step.run("charger", async () =>
      beginLinksState(createServiceClient(), auditId),
    );
    if (!run) return { skipped: true };
    const runStep: StepRunner = (id, fn) => step.run(id, fn) as never;
    const out = await executeLinksState(
      {
        service: createServiceClient,
        dfs: () => createDataForSeoClientFromEnv(),
        searchConsole: (siteId) =>
          loadSearchConsoleSnapshot(siteId, {
            db: createServiceClient(),
            config: searchConsoleEnabled() ? googleConfig() : null,
            keyRing: () => parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS),
          }),
      },
      run,
      runStep,
    );
    logger.info("état des lieux terminé", {
      auditId,
      status: out.status,
      missing: out.state.missing,
    });
    return { status: out.status, missing: out.state.missing };
  },
);
