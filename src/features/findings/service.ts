import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { configuredModel } from "@/features/qualification/service";
import { dailyCapReached, totalCostForAudit } from "@/lib/costs";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  estimateFindings,
  FINDINGS_LIMITS,
  MENTION_ONLY_REASONS,
  type FindingsEstimate,
} from "./limits";
import { FINDINGS_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.findings.messages;

export interface FindingsPreview {
  estimate: FindingsEstimate;
  remainingUsd: number;
}

type PreviewResult =
  | {
      ok: true;
      preview: FindingsPreview;
      workspaceId: string;
      siteId: string;
      qualificationRunId: string;
    }
  | { ok: false; message: string };

/**
 * Coût ANNONCÉ (attendu et pire cas) avant tout appel payant : calculé depuis le nombre de cibles de la
 * liste courte, sans requête HTTP ni LLM.
 */
export async function previewFindings(service: Client, auditId: string): Promise<PreviewResult> {
  const { data: qrun } = await service
    .from("qualification_runs")
    .select("id, status, workspace_id, site_id")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (!qrun || qrun.status !== "termine") return { ok: false, message: M.qualificationNotDone };
  const { count, error } = await service
    .from("qualified_targets")
    .select("id", { count: "exact", head: true })
    .eq("run_id", qrun.id)
    .eq("status", "liste_courte");
  if (error) return { ok: false, message: M.saveError };
  // Cibles « mentions » sans contact : examinées aussi (mention seulement), au plus `maxMentionOnly`.
  const extra = await service
    .from("qualified_targets")
    .select("id", { count: "exact", head: true })
    .eq("run_id", qrun.id)
    .eq("status", "exclu")
    .contains("tactics", ["mentions"])
    .in("exclusion_reason", [...MENTION_ONLY_REASONS])
    .not("url", "is", null);
  const extraCount = Math.min(extra.count ?? 0, FINDINGS_LIMITS.maxMentionOnly);
  if (!count && !extraCount) return { ok: false, message: M.noTargets };
  const { data: audit } = await service
    .from("audits")
    .select("cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  const spent = await totalCostForAudit(service, auditId);
  return {
    ok: true,
    workspaceId: qrun.workspace_id,
    siteId: qrun.site_id,
    qualificationRunId: qrun.id,
    preview: {
      estimate: estimateFindings((count ?? 0) + extraCount, { model: configuredModel() }),
      remainingUsd: Math.round((Number(audit?.cost_cap_usd ?? 0) - spent) * 1e6) / 1e6,
    },
  };
}

/**
 * Lance l'analyse des pages après confirmation du coût annoncé : fige modèle, budget et limites, puis
 * envoie l'événement Inngest. Refuse sans rien facturer si le pire cas dépasse le plafond d'audit
 * restant ou si le plafond du jour est atteint. Aucun envoi, aucun achat.
 */
export async function startFindings(
  service: Client,
  auditId: string,
  sendEvent: SendEvent,
  actorId: string | null,
): Promise<AuditActionState> {
  if (!actorId) return { status: "error", message: M.unauthenticated };
  const existing = await service
    .from("findings_runs")
    .select("id, status, created_at")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (existing.data && existing.data.status === "en_cours") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }
  let nonce = existing.data?.status === "confirme" ? existing.data.created_at : null;
  if (!nonce) {
    const prev = await previewFindings(service, auditId);
    if (!prev.ok) return { status: "error", message: prev.message };
    const { estimate, remainingUsd } = prev.preview;
    if (estimate.worstUsd > remainingUsd + 1e-9) return { status: "error", message: M.overCap };
    if (await dailyCapReached(service, env.DAILY_COST_CAP_USD))
      return { status: "error", message: M.dailyCap };
    nonce = new Date().toISOString();
    const row = {
      audit_id: auditId,
      qualification_run_id: prev.qualificationRunId,
      workspace_id: prev.workspaceId,
      site_id: prev.siteId,
      status: "confirme",
      plan: {
        model: estimate.model,
        budgetUsd: estimate.budgetUsd,
        limits: FINDINGS_LIMITS,
        targets: estimate.targets,
      } as unknown as Json,
      expected_cost_usd: estimate.expectedUsd,
      worst_case_usd: estimate.worstUsd,
      budget_usd: estimate.budgetUsd,
      actual_cost_usd: null,
      stats: {} as Json,
      stop_reason: null,
      error_message: null,
      confirmed_by: actorId,
      created_at: nonce,
      started_at: null,
      finished_at: null,
    };
    const { error } = await service.from("findings_runs").upsert(row, { onConflict: "audit_id" });
    if (error) return { status: "error", message: M.saveError };
  }
  try {
    await sendEvent({
      id: `audit-findings-${auditId}-${nonce}`,
      name: FINDINGS_EVENT,
      data: { auditId },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
