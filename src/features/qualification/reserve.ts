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

/** Un verdict passé d'un site : le domaine et le motif donné par une analyse de ce site. */
export interface PriorVerdict {
  domain: string;
  exclusionReason: string | null;
}

/**
 * Sites à reprendre de la réserve d'un site pour une nouvelle analyse (pur). Un site n'est repris que si
 * TOUS ses verdicts passés sont « hors_budget_lecture » : il n'a jamais été lu, donc jamais relu. Un site lu
 * une fois (même dans une analyse plus ancienne) ne revient pas dans la réserve.
 */
export function carriedUnreadDomains(verdicts: readonly PriorVerdict[]): string[] {
  const byDomain = new Map<string, { unread: boolean }>();
  for (const v of verdicts) {
    const cur = byDomain.get(v.domain) ?? { unread: true };
    if (v.exclusionReason !== "hors_budget_lecture") cur.unread = false;
    byDomain.set(v.domain, cur);
  }
  return [...byDomain.entries()].filter(([, s]) => s.unread).map(([d]) => d);
}
