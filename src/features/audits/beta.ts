import { env } from "@/env";
import type { PlanKey } from "./plans";

/**
 * Budgets de coût d'un audit (docs/audit-v2.md section 6) : cible annoncée à l'utilisateur, plafond
 * d'audit (contrôlé avant chaque appel payant, voir `PLAN_LIMITS.payant.costCapUsd`), et plafond de
 * sécurité contre les bugs. Valeurs proposées par Claude, à confirmer par Jonathan.
 */
export const AUDIT_BUDGET = {
  targetUsd: 1,
  capUsd: 2,
  safetyCapUsd: 5,
} as const;

/**
 * Mode bêta (MT.0) : tant qu'il n'y a pas de vrai client, tout espace est traité au niveau
 * « payant » pour construire l'outil le plus complet. Les limites par palier se rebranchent en
 * coupant `BETA_MODE`. Ne change ni la table `plans` ni la page tarifs ; ne lève aucune protection
 * de délivrabilité (10 emails par heure, heures ouvrées, validation de lot, relance unique).
 */
export function effectivePlan(base: PlanKey, beta: boolean): PlanKey {
  return beta ? "payant" : base;
}

/** Lit le réglage d'environnement (faux par défaut). */
export function betaEnabled(): boolean {
  return env.BETA_MODE;
}
