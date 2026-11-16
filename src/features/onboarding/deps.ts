import { env } from "@/env";
import { safeFetchPage } from "@/features/sites/verify";
import { createPageReader, type PageRead } from "@/features/triage/page-reader";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { BRAND_LIMITS } from "@/features/brand/limits";
import { readSite } from "@/features/brand/read-site";
import type { BrandDeps } from "@/features/brand/service";
import { QUERY_LIMITS } from "@/features/queries/limits";
import type { QueryDeps } from "@/features/queries/service";
import { createServiceClient } from "@/lib/supabase/service";
import { DEDUCE_LIMITS } from "./deduce";
import type { StartDeps } from "./service";

/** Lit la page d'accueil du domaine : robots.txt, protection SSRF, 2 requêtes au plus. */
async function readHomepage(domain: string): Promise<PageRead | null> {
  const reader = createPageReader({
    fetch: safeFetchPage,
    sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    now: () => Date.now(),
    maxRequests: 2,
  });
  return reader.read(`https://${domain}/`);
}

/** Client LLM plafonné pour la déduction ; null sans clé (le repli sans LLM prend le relais). */
function makeLlm(): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
  return createLlmClientFromEnv({
    budgetUsd: DEDUCE_LIMITS.llmBudgetUsd,
    maxCostPerCallUsd: DEDUCE_LIMITS.llmMaxCostPerCallUsd,
  });
}

/** Client LLM plafonné pour le profil de marque (MT.1) ; null sans clé. */
function makeBrandLlm(): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
  return createLlmClientFromEnv({
    budgetUsd: BRAND_LIMITS.llmBudgetUsd,
    maxCostPerCallUsd: BRAND_LIMITS.llmMaxCostPerCallUsd,
  });
}

/** Lecture du site et LLM plafonné du profil de marque (onboarding et analyse unique MU.1). */
export const brandDeps: BrandDeps = {
  readSite: (domain, home) =>
    readSite(domain, {
      fetch: safeFetchPage,
      sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      home,
    }),
  makeLlm: makeBrandLlm,
};

export const startDeps: StartDeps = { readHomepage, makeLlm, brand: brandDeps };

/** Client LLM plafonné pour l'univers de requêtes (MT.2b) : un seul appel court ; null sans clé. */
function makeQueriesLlm(): LlmClient | null {
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY && !env.LLM_PROXY_AUTH) return null;
  return createLlmClientFromEnv({
    budgetUsd: QUERY_LIMITS.llmBudgetUsd,
    maxCostPerCallUsd: QUERY_LIMITS.llmMaxCostPerCallUsd,
  });
}

export const queryDeps: QueryDeps = {
  makeLlm: makeQueriesLlm,
  getServiceClient: createServiceClient,
};
