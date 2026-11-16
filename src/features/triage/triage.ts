import { classifyTarget } from "./classify";
import type { LlmClient } from "@/lib/llm/client";
import { createPageReader, type PageReaderDeps } from "./page-reader";
import { ruleVerdict } from "./rules";
import { resolvePage } from "./resolve-url";
import { TRIAGE_LIMITS } from "./limits";
import type { TriageContext, TriageItem, TriageResult } from "./types";

export interface TriageDeps extends Omit<PageReaderDeps, "maxRequests"> {
  /** Absent : les cibles que les règles ne tranchent pas restent « non vérifiables ». */
  llm: LlmClient | null;
  scope: { workspaceId: string; auditId: string };
}

/**
 * Trie UNE cible : lecture de la page (HTTP 200 exigé), règles gratuites, puis LLM pour ce que
 * les règles ne tranchent pas. Ne lève jamais pour une cible : une panne LLM ou réseau devient
 * un verdict `non_verifiable` avec motif, jamais un `ok` par défaut.
 */
export async function triageItem(
  item: TriageItem,
  ctx: TriageContext,
  deps: TriageDeps,
): Promise<TriageResult> {
  const reader = createPageReader({
    ...deps,
    hostDelayMs: deps.hostDelayMs ?? TRIAGE_LIMITS.hostDelayMs,
    maxRequests: TRIAGE_LIMITS.maxRequestsPerItem,
  });
  const base = { itemId: item.id, costUsd: 0 };

  // Un concurrent direct ou notre propre site n'a pas besoin d'être lu.
  const early = ruleVerdict(item, { ...EMPTY_READ, status: 200 }, ctx);
  if (early && early.verdict === "concurrent_direct") {
    return {
      ...base,
      verdict: early.verdict,
      reason: early.reason,
      confidence: 1,
      needsReview: false,
      source: "regles",
      resolvedUrl: null,
      urlStatus: null,
      urlOrigin: null,
      hook: null,
      pageTitle: null,
    };
  }

  const { read, origin } = await resolvePage(item, reader);
  const common = {
    ...base,
    resolvedUrl: read.status === 200 ? read.url : null,
    urlStatus: read.status || null,
    urlOrigin: origin,
    pageTitle: read.title || null,
    hook: null,
  };

  const hit = ruleVerdict(item, read, ctx);
  if (hit) {
    return {
      ...common,
      verdict: hit.verdict,
      reason: hit.reason,
      confidence: hit.verdict === "non_verifiable" ? null : 1,
      needsReview: hit.verdict === "non_verifiable",
      source: "regles",
    };
  }
  if (!deps.llm) {
    return {
      ...common,
      verdict: "non_verifiable",
      reason: "Le tri par IA n'est pas configuré : la cible n'a pas pu être évaluée.",
      confidence: null,
      needsReview: true,
      source: "regles",
    };
  }
  try {
    const c = await classifyTarget(deps.llm, item, read, ctx, deps.scope);
    return {
      ...common,
      verdict: c.verdict,
      reason: c.reason,
      confidence: c.confidence,
      needsReview: c.needsReview,
      source: "llm",
      hook: c.hook,
      costUsd: c.costUsd,
    };
  } catch (e) {
    return {
      ...common,
      verdict: "non_verifiable",
      reason: `L'évaluation a échoué (${e instanceof Error ? e.name : "erreur"}) : à relancer.`,
      confidence: null,
      needsReview: true,
      source: "llm",
    };
  }
}

const EMPTY_READ = {
  url: "",
  status: 0,
  blockedByRobots: false,
  unreachable: false,
  title: "",
  description: "",
  headings: [],
  text: "",
  lang: null,
  links: [],
  mailtos: [],
  hasContactForm: false,
  viaFallback: false,
  outbound: [],
};
