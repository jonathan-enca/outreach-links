import { AUTO_LIMITS } from "@/features/qualification/background";

/** Minutes que prend un lot de lecture d'arrière-plan (mesure du 18/11 : environ 5 minutes par lot). */
export const MINUTES_PER_LOT = 5;
/** Sites lus par lot (`MORE_LIMITS`, environ 80 pages). */
const SITES_PER_LOT = 80;
/** Coût minimal d'un lot : sous ce reste de budget, plus de lot (`AUTO_LIMITS.minLotBudgetUsd`). */
const LOT_COST_USD = AUTO_LIMITS.minLotBudgetUsd;

/**
 * Minutes restantes avant la fin DÉFINITIVE de la recherche (pur). Trois bornes, la plus courte gagne :
 * les sites encore à lire (un lot = environ 80 sites), le budget de lecture restant, et la durée
 * maximale. Au moins 1 minute tant que la recherche tourne : on ne promet jamais « 0 ».
 */
export function remainingMinutes(input: {
  stock: number;
  costUsd: number;
  startedAtMs: number;
  nowMs: number;
}): number {
  const byStock = Math.ceil(input.stock / SITES_PER_LOT);
  const byBudget = Math.max(1, Math.floor((AUTO_LIMITS.budgetUsd - input.costUsd) / LOT_COST_USD));
  const lots = Math.max(1, Math.min(byStock, byBudget));
  const byLots = lots * MINUTES_PER_LOT;
  const timeLeftMin = Math.ceil((AUTO_LIMITS.maxMs - (input.nowMs - input.startedAtMs)) / 60_000);
  return Math.max(1, Math.min(byLots, Math.max(1, timeLeftMin)));
}

/** Arrondi à 5 minutes pour ne pas faire croire à une précision qu'on n'a pas. */
export function roundedMinutes(min: number): number {
  return min <= 5 ? 5 : Math.ceil(min / 5) * 5;
}

/**
 * Cibles « nouvelles » : celles arrivées depuis la dernière visite de l'utilisateur sur cet écran
 * (date lue dans son navigateur), plus celles qu'il vient de faire afficher. Première visite : aucune.
 */
export function newIds(
  cards: readonly { id: string; addedAt?: string | null }[],
  lastSeenIso: string | null,
  revealed: ReadonlySet<string>,
): Set<string> {
  const out = new Set<string>();
  const seen = lastSeenIso ? Date.parse(lastSeenIso) : NaN;
  for (const c of cards) {
    if (revealed.has(c.id)) out.add(c.id);
    else if (Number.isFinite(seen) && c.addedAt && Date.parse(c.addedAt) > seen) out.add(c.id);
  }
  return out;
}
