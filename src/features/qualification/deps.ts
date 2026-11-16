import { env } from "@/env";
import { investigateItem } from "@/features/contacts/investigate";
import { createMxVerifier } from "@/features/contacts/provider";
import { BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { createSafeFetcher } from "@/features/sites/verify";
import { createJinaFallback, createPageReader } from "@/features/triage/page-reader";
import type { LlmClient } from "@/lib/llm/client";
import type { QualDeps } from "./funnel";
import { QUALIFY_LIMITS } from "./limits";
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
