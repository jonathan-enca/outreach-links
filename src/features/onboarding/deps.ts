import { env } from "@/env";
import { safeFetchPage } from "@/features/sites/verify";
import {
  createPageReader,
  languageVersionHref,
  type PageRead,
} from "@/features/triage/page-reader";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
import { loadRankedKeywords } from "@/features/brand/keywords";
import { BRAND_LIMITS, PAGE_RANK } from "@/features/brand/limits";
import { readSite } from "@/features/brand/read-site";
import type { BrandDeps } from "@/features/brand/service";
import { QUERY_LIMITS } from "@/features/queries/limits";
import type { QueryDeps } from "@/features/queries/service";
import { dailySpendUsd } from "@/lib/costs";
import { createDataForSeoClientFromEnv } from "@/lib/dataforseo";
import { createServiceClient } from "@/lib/supabase/service";
import { DEDUCE_LIMITS } from "./deduce";
import type { StartDeps } from "./service";

/** Lit la page d'accueil du domaine : robots.txt, protection SSRF, 2 requêtes au plus. */
async function readHomepage(domain: string, language?: string): Promise<PageRead | null> {
  const reader = createPageReader({
    fetch: safeFetchPage,
    sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
    now: () => Date.now(),
    maxRequests: 4,
  });
  const home = await reader.read(`https://${domain}/`);
  // Site à plusieurs langues : on lit la version de la campagne (jamais de traduction).
  const href = language && home.status === 200 ? languageVersionHref(home, language) : null;
  if (href) {
    const alt = await reader.read(href).catch(() => null);
    if (alt && alt.status === 200) return alt;
  }
  return home;
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

/**
 * Lecture du site, LLM plafonné du profil de marque et, depuis MC.7, mots-clés positionnés du site
 * (onboarding et analyse unique MU.1). L'appel DataForSEO est unique, plafonné par appel et par le
 * plafond quotidien de la plateforme, journalisé dans `cost_ledger` et mis en cache par domaine.
 */
export const brandDeps: BrandDeps = {
  readSite: (domain, home, language, priorityPages) =>
    readSite(domain, {
      language,
      fetch: safeFetchPage,
      sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
      now: () => Date.now(),
      home,
      priorityPages,
    }),
  makeLlm: makeBrandLlm,
  rankedKeywords: (input) =>
    loadRankedKeywords(
      {
        dfs: () =>
          createDataForSeoClientFromEnv({
            maxCostPerCallUsd: PAGE_RANK.maxCostUsd,
            timeoutMs: PAGE_RANK.timeoutMs,
            maxRetries: 0,
          }),
        dailySpendUsd: () => dailySpendUsd(createServiceClient()),
        dailyCapUsd: env.DAILY_COST_CAP_USD,
      },
      input,
    ),
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
