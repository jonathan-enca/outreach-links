import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { AUDIT_BUDGET } from "@/features/audits/beta";
import { dailySpendUsd, totalCostForAudit } from "@/lib/costs";
import { BudgetExceededError } from "@/lib/dataforseo";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export interface SpendLimits {
  auditId: string;
  /** Plafond d'audit (audits.cost_cap_usd : 2 USD en payant, 5 USD pour un site de test). */
  auditCapUsd: number;
  /** Plafond de sécurité par audit (5 USD) : contre les bugs. */
  safetyCapUsd: number;
  /** Plafond de sécurité de toute la plateforme sur 24 h (25 USD). */
  dailyCapUsd: number;
}

export function spendLimitsFor(auditId: string, auditCapUsd: number): SpendLimits {
  return {
    auditId,
    auditCapUsd,
    safetyCapUsd: AUDIT_BUDGET.safetyCapUsd,
    dailyCapUsd: env.DAILY_COST_CAP_USD,
  };
}

/**
 * Contrôle AVANT chaque appel payant : cumul de l'audit + coût estimé de l'appel doit rester sous le
 * plafond d'audit, sous le plafond de sécurité par audit et sous le plafond du jour. Lève
 * `BudgetExceededError` (rien n'est facturé) ; l'appelant arrête la collecte proprement.
 */
export async function assertCanSpend(
  service: Client,
  limits: SpendLimits,
  estimateUsd: number,
): Promise<void> {
  const [auditSpent, daySpent] = await Promise.all([
    totalCostForAudit(service, limits.auditId),
    dailySpendUsd(service),
  ]);
  const eps = 1e-9;
  if (auditSpent + estimateUsd > limits.auditCapUsd + eps) {
    throw new BudgetExceededError(
      `Plafond d'audit : ${auditSpent.toFixed(4)} déjà engagés + ${estimateUsd} > ${limits.auditCapUsd} USD`,
      estimateUsd,
      limits.auditCapUsd,
    );
  }
  if (auditSpent + estimateUsd > limits.safetyCapUsd + eps) {
    throw new BudgetExceededError(
      `Plafond de sécurité par audit : ${auditSpent.toFixed(4)} + ${estimateUsd} > ${limits.safetyCapUsd} USD`,
      estimateUsd,
      limits.safetyCapUsd,
    );
  }
  if (daySpent + estimateUsd > limits.dailyCapUsd + eps) {
    throw new BudgetExceededError(
      `Plafond quotidien : ${daySpent.toFixed(4)} + ${estimateUsd} > ${limits.dailyCapUsd} USD`,
      estimateUsd,
      limits.dailyCapUsd,
    );
  }
}
