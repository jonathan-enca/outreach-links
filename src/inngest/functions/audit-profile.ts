import { z } from "zod";
import { inngest } from "@/inngest/client";
import { median } from "@/features/profile/compute";
import {
  beginProfile,
  collectOwnProfile,
  collectPages,
  computeGapStep,
  computePageNeeds,
  failProfile,
  fetchBenchmark,
  finalizeProfile,
  PROFILE_EVENT,
  runOnpage,
  summarizeProfile,
  type OwnProfile,
  type ProfileData,
} from "@/features/profile/run";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm";
import { createServiceClient } from "@/lib/supabase/service";

export const profileEventSchema = z.object({
  auditId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

/**
 * Job `audit.profile` (M1.5) : profil de liens du site, positions, pages à pousser,
 * repère concurrents, contrôle technique, écart de domaines, puis résumé LLM court.
 * Déclenché UNIQUEMENT après la confirmation du coût. Chaque appel payant est une étape ;
 * le cache DataForSEO évite de repayer en cas de reprise.
 */
export const auditProfile = inngest.createFunction(
  {
    id: "audit-profile",
    triggers: [{ event: PROFILE_EVENT }],
    retries: 2,
    concurrency: { limit: 2 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = profileEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failProfile(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = profileEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-profile", auditId });

    const run = await step.run("begin", async () => beginProfile(createServiceClient(), auditId));
    if (!run) {
      log.warn("profil non exécutable (backlinks non terminés ou étape non confirmée)");
      return { skipped: true };
    }

    const own: OwnProfile = await step.run("own-profile", async () =>
      collectOwnProfile(createServiceClient(), createDataForSeoClientFromEnv(), run),
    );

    const benchmark: { domain: string; referringDomains: number | null }[] = [];
    for (const [i, competitor] of run.benchmark.entries()) {
      benchmark.push(
        await step.run(`benchmark-${i + 1}`, async () =>
          fetchBenchmark(createServiceClient(), createDataForSeoClientFromEnv(), run, competitor),
        ),
      );
    }
    const benchmarkMedian = median(
      benchmark.map((b) => b.referringDomains).filter((n): n is number => n !== null),
    );

    const pages = await step.run("pages", async () => {
      const service = createServiceClient();
      const out = await collectPages(
        service,
        createDataForSeoClientFromEnv(),
        run,
        own.pageDomains,
      );
      await computePageNeeds(service, run, benchmarkMedian);
      return out;
    });

    const tech = await step.run("onpage", async () =>
      runOnpage(createServiceClient(), createDataForSeoClientFromEnv(), run),
    );

    const gap = await step.run("gap", async () =>
      computeGapStep(createServiceClient(), run, own.ownDomains),
    );

    const data: ProfileData = {
      totals: own.totals,
      anchors: own.anchors,
      ownDomainsPartial: own.ownDomainsPartial,
      benchmark,
      benchmarkMedian,
      pages: {
        total: pages.pages,
        keywords: pages.keywords,
        priority: pages.priority,
        checked: tech.checked,
        problems: tech.problems,
      },
      gap,
      limits: run.limits,
    };

    const summary = await step.run("summary", async () => {
      const service = createServiceClient();
      let llm: LlmClient | null = null;
      try {
        llm = createLlmClientFromEnv({
          costClient: service,
          maxCostPerCallUsd: 0.05,
          budgetUsd: 0.05,
        });
      } catch {
        llm = null;
      }
      return summarizeProfile(service, llm, run, data);
    });

    const done = await step.run("finalize", async () =>
      finalizeProfile(createServiceClient(), run, data),
    );
    log.info("profil terminé", { ...done, summary: summary.source });
    return { skipped: false, pages, gap, ...done };
  },
);
