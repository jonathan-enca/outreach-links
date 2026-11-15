import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { TRIAGE_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.triage.messages;

/**
 * Lance le tri des cibles de la DERNIÈRE version validée du plan. Une exécution par plan :
 * (absent | echoue) -> en_cours ; un tri terminé n'est pas relancé. Si l'envoi de l'événement
 * échoue, l'état passe à « echoue » pour que le bouton relance proprement.
 */
export async function startTriage(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };

  const { data: plan } = await supabase
    .from("link_plans")
    .select("id, workspace_id")
    .eq("audit_id", auditId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return { status: "error", message: M.noPlan };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const nonce = new Date().toISOString();
  const { data: existing } = await service
    .from("link_plan_triage_runs")
    .select("status")
    .eq("plan_id", plan.id)
    .maybeSingle();
  if (existing && existing.status !== "echoue") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }
  const write = existing
    ? await service
        .from("link_plan_triage_runs")
        .update({
          status: "en_cours",
          error_message: null,
          started_at: nonce,
          finished_at: null,
          requested_by: userId,
        })
        .eq("plan_id", plan.id)
        .eq("status", "echoue")
        .select("plan_id")
    : await service
        .from("link_plan_triage_runs")
        .insert({
          plan_id: plan.id,
          workspace_id: plan.workspace_id,
          status: "en_cours",
          requested_by: userId,
          started_at: nonce,
        })
        .select("plan_id");
  if (write.error) return { status: "error", message: M.saveError };
  if (!write.data?.length) return { status: "ok", auditId, message: M.alreadyStarted };

  await supabase.from("events").insert({
    workspace_id: plan.workspace_id,
    actor_id: userId,
    type: "plan.triage_started",
    payload: { audit_id: auditId, plan_id: plan.id },
  });
  try {
    await sendEvent({
      id: `plan-triage-${plan.id}-${nonce}`,
      name: TRIAGE_EVENT,
      data: { planId: plan.id, workspaceId: plan.workspace_id },
    });
  } catch {
    await service
      .from("link_plan_triage_runs")
      .update({ status: "echoue", error_message: M.sendFailed })
      .eq("plan_id", plan.id)
      .eq("status", "en_cours");
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}

export interface TriageRowView {
  itemId: string;
  verdict: string;
  reason: string;
  confidence: number | null;
  needsReview: boolean;
  resolvedUrl: string | null;
  urlOrigin: string | null;
  hook: string | null;
}

export interface TriageView {
  planId: string;
  version: number;
  status: "aucun" | "en_cours" | "termine" | "echoue";
  error: string | null;
  costUsd: number;
  rows: TriageRowView[];
  items: { id: string; domain: string; position: number }[];
}

/** État du tri de la dernière version du plan (null : aucun plan validé). */
export async function loadTriage(supabase: Client, auditId: string): Promise<TriageView | null> {
  const { data: plan } = await supabase
    .from("link_plans")
    .select("id, version")
    .eq("audit_id", auditId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!plan) return null;
  const [runRes, rowsRes, itemsRes] = await Promise.all([
    supabase
      .from("link_plan_triage_runs")
      .select("status, error_message, cost_usd")
      .eq("plan_id", plan.id)
      .maybeSingle(),
    supabase.from("link_target_triage").select("*").eq("plan_id", plan.id).limit(500),
    supabase
      .from("link_plan_items")
      .select("id, source_domain, position")
      .eq("plan_id", plan.id)
      .order("position", { ascending: true })
      .limit(500),
  ]);
  return {
    planId: plan.id,
    version: plan.version,
    status: (runRes.data?.status as TriageView["status"] | undefined) ?? "aucun",
    error: runRes.data?.error_message ?? null,
    costUsd: Number(runRes.data?.cost_usd ?? 0),
    rows: (rowsRes.data ?? []).map((r) => ({
      itemId: r.plan_item_id,
      verdict: r.verdict,
      reason: r.reason,
      confidence: r.confidence === null ? null : Number(r.confidence),
      needsReview: r.needs_review,
      resolvedUrl: r.resolved_url,
      urlOrigin: r.url_origin,
      hook: r.hook,
    })),
    items: (itemsRes.data ?? []).map((i) => ({
      id: i.id,
      domain: i.source_domain,
      position: i.position,
    })),
  };
}
