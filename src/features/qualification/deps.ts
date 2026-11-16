import { env } from "@/env";
import { investigateItem } from "@/features/contacts/investigate";
import { createMxVerifier } from "@/features/contacts/provider";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createJinaFallback, createPageReader } from "@/features/triage/page-reader";
import { assertCanSpend, spendLimitsFor } from "@/features/collection/guard";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { QualDeps } from "./funnel";
import { batchWorstUsd, QUALIFY_LIMITS } from "./limits";
import { readCandidate } from "./page";
import type { QualContext } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Dépendances réelles de l'entonnoir : lecteur sûr (robots.txt, SSRF, délai par hôte), enquêteur de
 * contact M3.2 SANS finder payant (MT.4), LLM et plafonds durs fournis par l'appelant (Inngest en
 * production, journal en mémoire pour la démonstration).
 */
export function realQualDeps(
  ctx: QualContext,
  opts: {
    llm: (remainingUsd: number) => LlmClient | null;
    guard: (estimateUsd: number) => Promise<void>;
  },
): QualDeps {
  const fetchPage = createSafeFetcher({
    userAgent: BOT_USER_AGENT,
    maxBytes: 256 * 1024,
    accept: "text/html,*/*;q=0.5",
  });
  const base = {
    fetch: fetchPage,
    sleep,
    now: () => Date.now(),
    fallback: env.PAGE_READER_FALLBACK === "jina" ? createJinaFallback() : null,
  };
  const emails = new Set(ctx.suppressedEmails);
  const domains = new Set(ctx.suppressedDomains);
  return {
    readPage: (c) =>
      readCandidate(
        createPageReader({
          ...base,
          hostDelayMs: QUALIFY_LIMITS.hostDelayMs,
          maxRequests: QUALIFY_LIMITS.requestsPerPage,
        }),
        c,
      ),
    llm: opts.llm,
    guard: opts.guard,
    investigate: (item) =>
      investigateItem(item, {
        ...base,
        provider: null,
        freeVerifier: env.EMAIL_FREE_VERIFY === "mx" ? createMxVerifier() : null,
        isSuppressed: (email, domain) =>
          domains.has(domain) || (email !== null && emails.has(email.toLowerCase())),
        paidCallsLeft: QUALIFY_LIMITS.contactPaidCalls,
      }),
  };
}

/**
 * Dépendances de PRODUCTION d'une qualification (job `audit-qualify` et analyse unique MU.1) : LLM de
 * l'environnement plafonné au budget restant, plafonds durs (audit, sécurité, jour) lus en base avant
 * chaque appel payant.
 */
export function productionQualDeps(
  ctx: QualContext,
  run: { auditId: string; auditCapUsd: number; model: string },
): QualDeps {
  return realQualDeps(ctx, {
    llm: (remainingUsd) => {
      if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
      if (remainingUsd <= 0) return null;
      return createLlmClientFromEnv({
        budgetUsd: remainingUsd,
        maxCostPerCallUsd: batchWorstUsd(QUALIFY_LIMITS.batchSize, run.model) * 1.5,
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
