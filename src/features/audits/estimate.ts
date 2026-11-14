import { estimateCost } from "@/lib/dataforseo/endpoints";
import type { PlanLimits } from "./plans";

export interface DiscoveryEstimate {
  totalUsd: number;
  perQuery: { query: string; usd: number }[];
  depth: number;
  calls: number;
}

/**
 * Coût estimé de la découverte AVANT lancement : une SERP live (top `depth`) par
 * requête prioritaire. Tarifs de la grille publique ([HYPOTHÈSE], voir PRICING) :
 * le coût réel du cost_ledger fait foi.
 */
export function estimateDiscovery(
  queries: string[],
  limits: Pick<PlanLimits, "serpDepth">,
): DiscoveryEstimate {
  const perQuery = queries.map((query) => ({
    query,
    usd: estimateCost("serpOrganicLive", { keyword: query, depth: limits.serpDepth }),
  }));
  const totalUsd = Math.round(perQuery.reduce((s, q) => s + q.usd, 0) * 1e6) / 1e6;
  return { totalUsd, perQuery, depth: limits.serpDepth, calls: queries.length };
}
