import { estimateCost } from "@/lib/dataforseo/endpoints";
import type { PlanKey } from "@/features/audits/plans";

/** Lignes de backlinks demandées par concurrent (1 lien par domaine référent), selon le plan. */
export const BACKLINKS_LIMIT: Record<PlanKey, number> = { gratuit: 300, payant: 1000 };

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface BacklinksEstimate {
  /** Lignes demandées par concurrent. */
  limit: number;
  competitors: number;
  perCompetitorUsd: number;
  totalUsd: number;
}

/**
 * Estimation avant lancement. Si le budget restant (plafond de l'audit - déjà engagé)
 * ne couvre pas la limite du plan, la limite est réduite ; `null` si même une limite
 * minimale ne passe pas (l'utilisateur est alors refusé, jamais facturé en plus).
 */
export function estimateBacklinks(
  competitors: number,
  plan: PlanKey,
  remainingBudgetUsd: number,
): BacklinksEstimate | null {
  if (competitors < 1) return null;
  let limit = BACKLINKS_LIMIT[plan];
  while (limit >= 50) {
    const per = estimateCost("backlinksBacklinks", { target: "exemple.fr", limit });
    const total = r6(per * competitors);
    if (total <= remainingBudgetUsd + 1e-9) {
      return { limit, competitors, perCompetitorUsd: per, totalUsd: total };
    }
    limit = Math.floor(limit / 2);
  }
  return null;
}
