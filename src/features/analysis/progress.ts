import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  ANALYSIS_STEP_KEYS,
  stepPosition,
  type AnalysisStepKey,
  type FeedEntry,
  type ProgressSink,
  type StepPatch,
} from "./steps";

type Client = SupabaseClient<Database>;

/** Ne garde que des compteurs entiers finis et positifs (un NaN ne doit jamais atteindre l'écran). */
export function cleanCounters(counters: StepPatch["counters"]): Record<string, number> | null {
  if (!counters) return null;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(counters)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[k] = Math.round(v);
  }
  return Object.keys(out).length ? out : null;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Crée les huit lignes d'étape d'un audit si elles manquent, et remet « en attente » celles qui
 * avaient échoué (reprise). Les étapes terminées gardent leur état : rien n'est refait.
 */
export async function initSteps(
  service: Client,
  ref: { auditId: string; workspaceId: string },
): Promise<void> {
  const { error } = await service.from("analysis_steps").upsert(
    ANALYSIS_STEP_KEYS.map((key) => ({
      audit_id: ref.auditId,
      workspace_id: ref.workspaceId,
      key,
      position: stepPosition(key),
    })),
    { onConflict: "audit_id,key", ignoreDuplicates: true },
  );
  if (error) throw new Error(`initSteps : ${error.message}`);
  const { data: failed, error: fErr } = await service
    .from("analysis_steps")
    .select("key")
    .eq("audit_id", ref.auditId)
    .in("status", ["echoue", "en_cours"]);
  if (fErr) throw new Error(`initSteps : ${fErr.message}`);
  for (const row of failed ?? []) {
    await service.rpc("analysis_step_update", {
      p_audit: ref.auditId,
      p_key: row.key,
      p_status: "attente",
    });
  }
}

/**
 * Le seul helper d'écriture de la progression (docs/jalon-mu.md 3.3) : `progress.update(clé, …)` à
 * chaque `step` d'un job, `progress.feed(…)` pour un événement lisible. Un aller-retour par écriture
 * (fonction SQL `analysis_step_update`), jamais d'exception.
 */
export function createProgress(
  service: Client,
  ref: { auditId: string; workspaceId: string },
): ProgressSink {
  return {
    async update(key: AnalysisStepKey, patch: StepPatch) {
      try {
        const { error } = await service.rpc("analysis_step_update", {
          p_audit: ref.auditId,
          p_key: key,
          p_status: patch.status ?? null,
          p_counters: cleanCounters(patch.counters) as Json,
          p_example: patch.example ? clip(patch.example, 300) : null,
          p_error: patch.error ? clip(patch.error, 500) : null,
        });
        if (error) throw new Error(error.message);
      } catch (e) {
        logger.warn("progression non écrite", {
          auditId: ref.auditId,
          key,
          error: (e as Error).message,
        });
      }
    },
    async feed(entry: FeedEntry | readonly FeedEntry[]) {
      const entries = Array.isArray(entry) ? (entry as readonly FeedEntry[]) : [entry as FeedEntry];
      if (entries.length === 0) return;
      try {
        const { error } = await service.from("analysis_feed").insert(
          entries.map((e) => ({
            audit_id: ref.auditId,
            workspace_id: ref.workspaceId,
            kind: e.kind,
            step_key: e.stepKey ?? null,
            message: clip(e.message, 300),
            payload: (e.payload ?? {}) as Json,
          })),
        );
        if (error) throw new Error(error.message);
      } catch (e) {
        logger.warn("événement d'analyse non écrit", {
          auditId: ref.auditId,
          count: entries.length,
          error: (e as Error).message,
        });
      }
    },
  };
}

/** Enregistreur en mémoire (tests et démonstrations) : garde l'état courant de chaque étape. */
export class MemoryProgress implements ProgressSink {
  readonly steps = new Map<
    AnalysisStepKey,
    { status: string; counters: Record<string, number>; example: string | null; error?: string }
  >();
  readonly feedEntries: FeedEntry[] = [];
  readonly writes: { key: AnalysisStepKey; patch: StepPatch }[] = [];

  async update(key: AnalysisStepKey, patch: StepPatch) {
    this.writes.push({ key, patch });
    const cur = this.steps.get(key) ?? { status: "attente", counters: {}, example: null };
    // Même règle que la fonction SQL : une étape finie n'est pas rouverte.
    const next = patch.status ?? "en_cours";
    if (["termine", "saute"].includes(cur.status) && ["attente", "en_cours"].includes(next)) return;
    this.steps.set(key, {
      status: patch.status ?? cur.status,
      counters: { ...cur.counters, ...(cleanCounters(patch.counters) ?? {}) },
      example: patch.example ?? cur.example,
      error: patch.status === "echoue" ? patch.error : undefined,
    });
  }

  async feed(entry: FeedEntry | readonly FeedEntry[]) {
    this.feedEntries.push(
      ...(Array.isArray(entry) ? (entry as FeedEntry[]) : [entry as FeedEntry]),
    );
  }
}
