import type { PlanKey } from "@/features/audits/plans";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import {
  buildQueries,
  OPPORTUNITY_SERP_DEPTH,
  type OpportunityQuery,
  type SiteContext,
} from "./generate";

/**
 * Plafond PROPRE à l'étape (USD), indépendant du plafond de l'audit : le plafond gratuit
 * de l'audit (0,25 USD) est déjà presque consommé par M1.3 à M1.5 (~0,248 USD estimés).
 * L'étape reste très bon marché (requêtes SERP top 10 : 0,002 USD pièce).
 */
export const OPPORTUNITIES_CAP_USD: Record<PlanKey, number> = { gratuit: 0.02, payant: 0.05 };

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface OpportunitiesEstimate {
  queries: OpportunityQuery[];
  depth: number;
  totalUsd: number;
  capUsd: number;
}

export function estimateOpportunities(
  site: SiteContext,
  plan: PlanKey,
): OpportunitiesEstimate | null {
  const queries = buildQueries(site, plan);
  const perQuery = estimateCost("serpOrganicLive", {
    keyword: "exemple",
    depth: OPPORTUNITY_SERP_DEPTH,
  });
  const totalUsd = r6(queries.length * perQuery);
  const capUsd = OPPORTUNITIES_CAP_USD[plan];
  if (totalUsd > capUsd + 1e-9) return null;
  return { queries, depth: OPPORTUNITY_SERP_DEPTH, totalUsd, capUsd };
}
