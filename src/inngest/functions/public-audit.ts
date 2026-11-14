import { z } from "zod";
import { inngest } from "@/inngest/client";
import {
  beginPublicAudit,
  collectCompetitorLinks,
  type CompetitorLinks,
  collectOwnKeywords,
  collectOwnLinks,
  collectSerp,
  failPublicAudit,
  finalizePublicAudit,
  pickCompetitors,
  PUBLIC_AUDIT_EVENT,
} from "@/features/public-audit/run";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const publicAuditEventSchema = z.object({ publicAuditId: z.uuid() });

/**
 * Job `public-audit` (M1.6) : audit gratuit réduit (3 concurrents, 3 pages prioritaires,
 * cibles). Déclenché par la page publique APRÈS les contrôles anti-abus (limitation de débit,
 * coupe-circuit de dépense, une exécution par domaine et par période). Chaque appel payant
 * est une étape (reprise sans repayer) et passe par le client DataForSEO (cost_ledger).
 */
export const publicAudit = inngest.createFunction(
  {
    id: "public-audit",
    triggers: [{ event: PUBLIC_AUDIT_EVENT }],
    retries: 1,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = publicAuditEventSchema.safeParse(original);
      if (!parsed.success) return;
      const code = error.name === "BudgetExceededError" ? "plafond_audit" : "erreur_fournisseur";
      await failPublicAudit(createServiceClient(), parsed.data.publicAuditId, code, error.message);
    },
  },
  async ({ event, step }) => {
    const { publicAuditId } = publicAuditEventSchema.parse(event.data);
    const log = logger.child({ fn: "public-audit", publicAuditId });
    const service = () => createServiceClient();
    const dfs = () => createDataForSeoClientFromEnv();

    const run = await step.run("begin", async () => beginPublicAudit(service(), publicAuditId));
    if (!run) {
      log.warn("audit gratuit non exécutable (déjà traité, ou plus de tentatives)");
      return { skipped: true };
    }

    const own = await step.run("own-keywords", async () =>
      collectOwnKeywords(service(), dfs(), run),
    );
    if (!own.ok) {
      await step.run("fail-keywords", async () => failPublicAudit(service(), run.id, own.code));
      return { skipped: false, failed: own.code };
    }

    const perQuery = [];
    for (const [i, query] of own.queries.entries()) {
      perQuery.push(
        await step.run(`serp-${i + 1}`, async () => collectSerp(service(), dfs(), run, query)),
      );
    }
    const competitors = pickCompetitors(perQuery, run.domain);
    if (competitors.length === 0) {
      await step.run("fail-competitors", async () =>
        failPublicAudit(service(), run.id, "aucun_concurrent"),
      );
      return { skipped: false, failed: "aucun_concurrent" };
    }

    const links: CompetitorLinks[] = [];
    for (const [i, c] of competitors.entries()) {
      links.push(
        await step.run(`competitor-${i + 1}`, async () =>
          collectCompetitorLinks(service(), dfs(), run, c),
        ),
      );
    }
    const ownLinks = await step.run("own-links", async () =>
      collectOwnLinks(service(), dfs(), run),
    );

    const result = await step.run("finalize", async () =>
      finalizePublicAudit(service(), run, { own, ownLinks, competitors, links }),
    );
    log.info("audit gratuit terminé", { ...result });
    return { skipped: false, ...result };
  },
);
