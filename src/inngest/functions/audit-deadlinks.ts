import { z } from "zod";
import { inngest } from "@/inngest/client";
import {
  DEFAULT_LIMITS,
  EMPTY_STATS,
  huntDeadLinks,
  mergeStats,
  BOT_USER_AGENT,
  type DeadLinkFinding,
  type HuntStats,
} from "@/features/deadlinks/hunt";
import {
  beginDeadlinks,
  DEADLINKS_EVENT,
  failDeadlinks,
  finalizeDeadlinks,
  loadHuntInput,
} from "@/features/deadlinks/run";
import { createSafeFetcher } from "@/features/sites/verify";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/service";

export const deadlinksEventSchema = z.object({
  auditId: z.uuid(),
  workspaceId: z.uuid().optional(),
});

const fetcher = () =>
  createSafeFetcher({
    userAgent: BOT_USER_AGENT,
    maxBytes: 256 * 1024,
    accept: "text/html,*/*;q=0.5",
  });
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Job `audit.deadlinks` (M2.2) : chasseur 404. Gratuit (aucun appel payant), plafonné en
 * requêtes (partagées entre les steps), un step pour les pages de concurrents puis un step
 * par page ressources. Aucun contact n'est lancé.
 */
export const auditDeadlinks = inngest.createFunction(
  {
    id: "audit-deadlinks",
    triggers: [{ event: DEADLINKS_EVENT }],
    retries: 1,
    concurrency: { limit: 1 },
    onFailure: async ({ event, error }) => {
      const original = (event.data as { event?: { data?: unknown } }).event?.data;
      const parsed = deadlinksEventSchema.safeParse(original);
      if (!parsed.success) return;
      await failDeadlinks(createServiceClient(), parsed.data.auditId, error.message);
    },
  },
  async ({ event, step }) => {
    const { auditId } = deadlinksEventSchema.parse(event.data);
    const log = logger.child({ fn: "audit-deadlinks", auditId });

    const run = await step.run("begin", async () => beginDeadlinks(createServiceClient(), auditId));
    if (!run) {
      log.warn("chasseur 404 non exécutable (opportunités non terminées ou étape non lancée)");
      return { skipped: true };
    }
    const input = await step.run("load", async () => loadHuntInput(createServiceClient(), auditId));

    const deps = { fetch: fetcher(), sleep, now: () => Date.now() };
    let stats: HuntStats = EMPTY_STATS;
    const findings: DeadLinkFinding[] = [];

    const left = () => Math.max(0, DEFAULT_LIMITS.maxRequests - stats.requests);

    const comp = await step.run("competitor-pages", async () =>
      huntDeadLinks(
        { competitorLinks: input.competitorLinks, resourcePages: [] },
        { ...deps, limits: { maxRequests: left() } },
      ),
    );
    stats = mergeStats(stats, comp.stats);
    findings.push(...comp.findings);

    for (const [i, page] of input.resourcePages
      .slice(0, DEFAULT_LIMITS.maxResourcePages)
      .entries()) {
      if (left() <= 0) {
        stats = { ...stats, truncated: true };
        break;
      }
      const res = await step.run(`resource-${i + 1}`, async () =>
        huntDeadLinks(
          { competitorLinks: [], resourcePages: [page] },
          { ...deps, limits: { maxRequests: left() } },
        ),
      );
      stats = mergeStats(stats, res.stats);
      findings.push(...res.findings);
    }

    const done = await step.run("finalize", async () =>
      finalizeDeadlinks(createServiceClient(), run, findings, stats),
    );
    log.info("chasseur 404 terminé", { ...done.stats, created: done.created });
    return { skipped: false, created: done.created, ...done.stats };
  },
);
