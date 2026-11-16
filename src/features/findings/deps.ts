import { env } from "@/env";
import {
  BOT_USER_AGENT,
  createStatusChecker,
  DEFAULT_LIMITS,
  type HuntStats,
} from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createJinaFallback, createPageReader } from "@/features/triage/page-reader";
import { assertCanSpend, spendLimitsFor } from "@/features/collection/guard";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { FindDeps } from "./funnel";
import { callWorstUsd, FINDINGS_LIMITS } from "./limits";

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

/**
 * Dépendances de PRODUCTION des constats (job `audit-findings` et analyse unique MU.1) : LLM de
 * l'environnement plafonné au budget restant, plafonds durs lus en base avant chaque appel payant.
 */
export function productionFindDeps(run: {
  auditId: string;
  auditCapUsd: number;
  model: string;
}): FindDeps {
  return realFindDeps({
    llm: (remainingUsd) => {
      if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
      if (remainingUsd <= 0) return null;
      return createLlmClientFromEnv({
        budgetUsd: remainingUsd,
        maxCostPerCallUsd: callWorstUsd(run.model) * 1.5,
      });
    },
    guard: (estimateUsd) =>
      assertCanSpend(
        createServiceClient(),
        spendLimitsFor(run.auditId, run.auditCapUsd),
        estimateUsd,
      ),
  });
}
