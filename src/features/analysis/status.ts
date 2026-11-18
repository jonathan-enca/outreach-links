import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AnalysisStatus, AnalysisStepKey, StepStatus } from "./steps";
import type { AnalysisSnapshot, BackgroundStatus, SkippedSearches, StepRow } from "./view";

type Client = SupabaseClient<Database>;

/** Combien de cibles prêtes l'écran montre pendant l'attente. */
export const PREVIEW_TARGETS = 6;

const asCounters = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, n] of Object.entries(v))
      if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  }
  return out;
};

/** Ce que le plan figé n'a pas lancé (absent des plans d'avant le 18/11/2026 : rien d'écarté). */
export function skippedOf(plan: unknown): SkippedSearches | null {
  const sk = (plan as { skipped?: { mentions?: unknown; deadPages?: unknown } } | null)?.skipped;
  if (!sk) return null;
  return {
    mentions: typeof sk.mentions === "string" && sk.mentions.trim() ? sk.mentions.trim() : null,
    deadPages: Array.isArray(sk.deadPages) ? sk.deadPages.length : 0,
  };
}

const BACKGROUND: readonly BackgroundStatus[] = ["aucun", "en_cours", "termine", "echoue"];

/**
 * L'état lu par l'écran d'analyse et par sa route légère (MU.3). Lecture seule, avec le client de la
 * personne : la RLS limite aux membres de l'espace. Six petites lectures en parallèle (le plan de
 * recherche et la lecture en arrière-plan ont été ajoutés le 18/11/2026, pour dire ce qui est écarté
 * et ne dire « terminée » qu'une fois tout fini).
 */
export async function loadAnalysisSnapshot(
  supabase: Client,
  auditId: string,
): Promise<AnalysisSnapshot | null> {
  const [audit, steps, targets, count, collection, qualification] = await Promise.all([
    supabase
      .from("audits")
      .select(
        "id, site_id, analysis_status, analysis_error, analysis_started_at, analysis_confirmed_at, analysis_finished_at, sites(domain)",
      )
      .eq("id", auditId)
      .maybeSingle(),
    supabase
      .from("analysis_steps")
      .select("key, status, counters, last_example, error_message, started_at, finished_at")
      .eq("audit_id", auditId),
    supabase
      .from("qualified_targets")
      .select("domain, site_type, why")
      .eq("audit_id", auditId)
      .eq("status", "liste_courte")
      .order("rank", { ascending: true, nullsFirst: false })
      .limit(PREVIEW_TARGETS),
    supabase
      .from("qualified_targets")
      .select("id", { count: "exact", head: true })
      .eq("audit_id", auditId)
      .eq("status", "liste_courte"),
    supabase.from("candidate_collections").select("plan").eq("audit_id", auditId).maybeSingle(),
    supabase
      .from("qualification_runs")
      .select("auto_status, more_status")
      .eq("audit_id", auditId)
      .maybeSingle(),
  ]);
  const a = audit.data;
  if (!a) return null;
  const site = a.sites as unknown as { domain: string } | null;
  const rows: StepRow[] = (steps.data ?? []).map((r) => ({
    key: r.key as AnalysisStepKey,
    status: r.status as StepStatus,
    counters: asCounters(r.counters),
    example: r.last_example,
    error: r.error_message,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
  }));
  return {
    auditId: a.id,
    siteId: a.site_id,
    domain: site?.domain ?? "",
    status: a.analysis_status as AnalysisStatus,
    error: a.analysis_error,
    startedAt: a.analysis_started_at,
    finishedAt: a.analysis_finished_at,
    confirmedAt: a.analysis_confirmed_at,
    steps: rows,
    targets: (targets.data ?? []).map((r) => ({
      domain: r.domain,
      siteType: r.site_type,
      why: r.why,
    })),
    targetsCount: count.count ?? 0,
    skipped: skippedOf(collection.data?.plan),
    background: BACKGROUND.includes(qualification.data?.auto_status as BackgroundStatus)
      ? (qualification.data!.auto_status as BackgroundStatus)
      : null,
    moreRunning: ["demande", "en_cours"].includes(qualification.data?.more_status ?? ""),
  };
}
