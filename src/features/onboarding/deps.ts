import { env } from "@/env";
import { safeFetchPage } from "@/features/sites/verify";
import { createPageReader, type PageRead } from "@/features/triage/page-reader";
import { createLlmClientFromEnv, type LlmClient } from "@/lib/llm/client";
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

export const startDeps: StartDeps = { readHomepage, makeLlm };
