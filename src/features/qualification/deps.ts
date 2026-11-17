import { env } from "@/env";
import { investigateItem } from "@/features/contacts/investigate";
import { createMxVerifier } from "@/features/contacts/provider";
import { BOT_TOKEN, BOT_USER_AGENT } from "@/features/deadlinks/hunt";
import { ALLOW_ALL, robotsFromResponse } from "@/features/deadlinks/robots";
import { createSafeFetcher } from "@/features/sites/verify";
import { createJinaFallback, createPageReader } from "@/features/triage/page-reader";
import { assertCanSpend, spendLimitsFor } from "@/features/collection/guard";
import { createBatchClientFromEnv, type LlmBatchClient } from "@/lib/llm/batch";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { createServiceClient } from "@/lib/supabase/service";
import type { QualDeps, RobotsCheck } from "./funnel";
import { batchWorstUsd, QUALIFY_LIMITS } from "./limits";
import { readCandidate } from "./page";
import type { QualCandidate, QualContext } from "./types";

const originOf = (url: string): string | null => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
};

/** Adresse lue pour un candidat : la page trouvée par la recherche, sinon l'accueil. */
const readUrl = (c: QualCandidate) => c.url ?? `https://${c.domain}/`;

/**
 * Vérification légère du robots.txt d'un candidat (une seule requête, délai court) : « interdit » si
 * la page à lire est fermée à notre robot, « ok » si elle est ouverte (le fichier ne sera pas relu),
 * « inconnu » sinon (la lecture tranchera).
 */
export async function checkRobotsFor(
  fetchRobots: (url: string) => Promise<{ status: number; text: string } | null>,
  c: QualCandidate,
): Promise<RobotsCheck> {
  let u: URL;
  try {
    u = new URL(readUrl(c));
  } catch {
    return "inconnu";
  }
  const res = await fetchRobots(`${u.protocol}//${u.host}/robots.txt`);
  // Pas de réponse dans le délai court : on ne conclut RIEN ici (mesuré le 17/11 : un site lent mais
  // valable était écarté). La lecture refera la demande, avec son délai normal.
  if (!res || res.status >= 500) return "inconnu";
  const rules = robotsFromResponse(res, BOT_TOKEN);
  // « ok » seulement si la page ET l'accueil sont ouverts : la lecture peut retomber sur l'accueil.
  if (!rules.allowed(u.pathname + u.search)) return "interdit";
  return rules.allowed("/") ? "ok" : "inconnu";
}

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
    batch?: () => LlmBatchClient | null;
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
  const fetchRobots = createSafeFetcher({
    userAgent: BOT_USER_AGENT,
    maxBytes: 64 * 1024,
    accept: "text/plain,*/*;q=0.5",
    timeoutMs: 5_000,
  });
  return {
    readPage: (c, o) => {
      const origin = o?.robotsOk ? originOf(readUrl(c)) : null;
      return readCandidate(
        createPageReader({
          ...base,
          hostDelayMs: QUALIFY_LIMITS.hostDelayMs,
          maxRequests: QUALIFY_LIMITS.requestsPerPage,
          robotsPreset: origin ? (key) => (key === origin ? ALLOW_ALL : undefined) : undefined,
        }),
        c,
      );
    },
    checkRobots: (c) => checkRobotsFor(fetchRobots, c),
    llm: opts.llm,
    batch: opts.batch,
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
    batch: createBatchClientFromEnv,
    guard: (estimateUsd) =>
      assertCanSpend(
        createServiceClient(),
        spendLimitsFor(run.auditId, run.auditCapUsd),
        estimateUsd,
      ),
  });
}
