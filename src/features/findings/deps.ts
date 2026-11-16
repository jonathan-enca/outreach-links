import { env } from "@/env";
import {
  BOT_USER_AGENT,
  createStatusChecker,
  DEFAULT_LIMITS,
  type HuntStats,
} from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createJinaFallback, createPageReader } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import type { FindDeps } from "./funnel";
import { FINDINGS_LIMITS } from "./limits";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Dépendances réelles des constats : lecteur sûr de la qualification (robots.txt, SSRF, délai par
 * hôte), vérificateur de statut du chasseur 404 (même politesse, même jeton robots), LLM et plafonds
 * durs fournis par l'appelant (Inngest en production, journal en mémoire pour la démonstration).
 */
export function realFindDeps(opts: {
  llm: (remainingUsd: number) => LlmClient | null;
  guard: (estimateUsd: number) => Promise<void>;
}): FindDeps {
  const fetchPage = createSafeFetcher({
    userAgent: BOT_USER_AGENT,
    maxBytes: 256 * 1024,
    accept: "text/html,*/*;q=0.5",
  });
  const base = {
    fetch: fetchPage,
    sleep,
    now: () => Date.now(),
  };
  return {
    readPage: (url) =>
      createPageReader({
        ...base,
        fallback: env.PAGE_READER_FALLBACK === "jina" ? createJinaFallback() : null,
        hostDelayMs: FINDINGS_LIMITS.hostDelayMs,
        maxRequests: 4,
      }).read(url),
    checkStatuses: async (urls, limits) => {
      const stats: HuntStats = {
        requests: 0,
        competitorUrlsChecked: 0,
        resourcePagesCrawled: 0,
        linksChecked: 0,
        blockedByRobots: 0,
        dead: 0,
        truncated: false,
      };
      const checker = createStatusChecker(
        { ...base, limits: { hostDelayMs: FINDINGS_LIMITS.hostDelayMs, ...limits } },
        stats,
        {
          ...DEFAULT_LIMITS,
          hostDelayMs: FINDINGS_LIMITS.hostDelayMs,
          maxRequests: limits.maxRequests,
        },
      );
      const statuses = new Map<string, number | null>();
      for (const u of urls) statuses.set(u, await checker.statusOf(u));
      return { statuses, requests: stats.requests };
    },
    llm: opts.llm,
    guard: opts.guard,
  };
}
