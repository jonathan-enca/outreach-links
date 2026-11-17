import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * « Lire d'autres sites » (chantier G, le stock) : les candidats jamais lus restent en base avec leur
 * score ; ce lot supplémentaire en lit et en juge une partie, sans refaire la recherche. Bornes d'un
 * lot : pages jugées, durée, budget de jugement (les plafonds durs de l'analyse restent contrôlés).
 */
export const MORE_LIMITS = {
  targetJudged: 40,
  maxReadMs: 5 * 60_000,
  budgetUsd: 0.15,
  preflightMax: 150,
} as const;

/** Motifs « en stock » : jamais lus, ou lus mais pas encore jugés faute de budget. */
export const STOCK_REASONS = ["hors_budget_lecture", "hors_budget_llm"] as const;

/** Nombre de sites encore en stock pour cette analyse (lecture avec les droits de l'appelant). */
export async function countStock(supabase: Client, runId: string): Promise<number> {
  const { count } = await supabase
    .from("qualified_targets")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .in("exclusion_reason", [...STOCK_REASONS]);
  return count ?? 0;
}
