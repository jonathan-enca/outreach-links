import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * « Lire d'autres sites » (chantier G, le stock) : les candidats jamais lus restent en base avec leur
 * score ; ce lot supplémentaire en lit et en juge une partie, sans refaire la recherche. Bornes d'un
 * lot : pages jugées, durée, budget de jugement (les plafonds durs de l'analyse restent contrôlés).
 */
export const MORE_LIMITS = {
  /** MC.6f : 120 pages utilisables par lot (40 avant) : le jugement par lots attend ~3 minutes quelle que soit sa taille. */
  targetJudged: 120,
  maxReadMs: 9 * 60_000,
  budgetUsd: 0.15,
  preflightMax: 300,
} as const;

/**
 * Motifs « en stock » : jamais lus, lus mais pas encore jugés faute de budget, ou lus dont le jugement
 * a échoué (MC.6f : « non_qualifie », 301 pages sur la campagne mega-coloring.com du 18/11, sortie du
 * modèle tronquée). Ces dernières sont relues et rejugées par la lecture de fond.
 */
export const STOCK_REASONS = [
  "hors_budget_lecture",
  "hors_budget_llm",
  "non_qualifie",
  // Motifs d'avant MC.6f, qui ne sont plus rendus : ces pages sont rejugées sous la nouvelle règle.
  "sans_angle",
  "pas_de_contenu",
  "page_commerciale",
] as const;

/** Nombre de sites encore en stock pour cette analyse (lecture avec les droits de l'appelant). */
export async function countStock(supabase: Client, runId: string): Promise<number> {
  const { count } = await supabase
    .from("qualified_targets")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .in("exclusion_reason", [...STOCK_REASONS]);
  return count ?? 0;
}
