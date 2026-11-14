import { estimateCost } from "@/lib/dataforseo/endpoints";
import type { PlanKey } from "@/features/audits/plans";

/**
 * Lignes de backlinks demandées par concurrent (1 lien par domaine référent), selon le plan.
 * Gratuit réduit à 75 (MA.3) : c'est la limite qui absorbe la hausse des tarifs mesurés, le
 * plafond de 0,25 USD ne bouge pas.
 */
export const BACKLINKS_LIMIT: Record<PlanKey, number> = { gratuit: 75, payant: 1000 };

/**
 * Seuil de taille (domaines référents) au-delà duquel un concurrent est écarté AVANT de
 * payer ses backlinks (MA.2) : ses liens seraient inaccessibles à un petit site et le
 * coût de l'étape est proportionnel au nombre d'appels. [HYPOTHÈSE] à recaler sur les mesures.
 */
export const MAX_REFERRING_DOMAINS: Record<PlanKey, number> = { gratuit: 20_000, payant: 100_000 };

/** Sous cette limite par concurrent, l'étape est refusée plutôt que dégradée. */
export const MIN_BACKLINKS_LIMIT = 50;

/** Candidats de remplacement mesurés en plus des concurrents retenus (une seule requête groupée). */
export const SIZE_SPARES = 5;

/** Coût de la mesure de taille groupée : retenus + remplaçants possibles, en une requête. */
export function sizeCheckCostUsd(competitors: number): number {
  return estimateCost("backlinksBulkReferringDomains", {
    targets: Array.from({ length: competitors + SIZE_SPARES }, (_, i) => `exemple${i}.fr`),
  });
}

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface BacklinksEstimate {
  /** Lignes demandées par concurrent. */
  limit: number;
  competitors: number;
  perCompetitorUsd: number;
  /** Mesure de taille groupée (MA.2), incluse dans `totalUsd`. */
  sizeCheckUsd: number;
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
  const sizeCheckUsd = sizeCheckCostUsd(competitors);
  let limit = BACKLINKS_LIMIT[plan];
  while (limit >= MIN_BACKLINKS_LIMIT) {
    const per = estimateCost("backlinksBacklinks", { target: "exemple.fr", limit });
    const total = r6(per * competitors + sizeCheckUsd);
    if (total <= remainingBudgetUsd + 1e-9) {
      return { limit, competitors, perCompetitorUsd: per, sizeCheckUsd, totalUsd: total };
    }
    // Divise par deux, sans passer sous le minimum tant qu'un palier au minimum n'a pas été essayé.
    limit = limit > MIN_BACKLINKS_LIMIT ? Math.max(MIN_BACKLINKS_LIMIT, Math.floor(limit / 2)) : 0;
  }
  return null;
}
