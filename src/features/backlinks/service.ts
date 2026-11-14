import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanKey, type PlanKey } from "@/features/audits/plans";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { totalCostForAudit } from "@/lib/costs";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { estimateBacklinks, type BacklinksEstimate } from "./limits";
import { BACKLINKS_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.backlinks.messages;

/** Estimation affichée avant le clic (null si impossible dans le plafond de l'audit). */
export async function previewBacklinksEstimate(
  service: Client,
  audit: { id: string; plan: string; cost_cap_usd: number },
  selectedCompetitors: number,
): Promise<BacklinksEstimate | null> {
  const plan: PlanKey = isPlanKey(audit.plan) ? audit.plan : "gratuit";
  const spent = await totalCostForAudit(service, audit.id);
  return estimateBacklinks(selectedCompetitors, plan, Number(audit.cost_cap_usd) - spent);
}

/**
 * L'utilisateur confirme la récupération des backlinks : aucun → confirme (limite et coût
 * estimé figés), puis l'événement Inngest lance le job. Même mécanique que M1.3 : si
 * l'envoi échoue, l'état reste "confirme" et le bouton peut relancer l'envoi.
 */
export async function startBacklinks(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };

  const { data: audit } = await supabase
    .from("audits")
    .select("id, workspace_id, status, plan, cost_cap_usd, backlinks_status, backlinks_stats")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.status !== "termine") return { status: "error", message: M.auditNotDone };
  if (audit.backlinks_status === "en_cours" || audit.backlinks_status === "termine") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }

  const { data: comps } = await supabase
    .from("competitors")
    .select("id")
    .eq("audit_id", auditId)
    .eq("selected", true);
  const selected = comps?.length ?? 0;
  if (selected === 0) return { status: "error", message: M.noCompetitors };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }

  let nonce = (audit.backlinks_stats as { confirmedAt?: string } | null)?.confirmedAt;
  if (audit.backlinks_status !== "confirme") {
    const estimate = await previewBacklinksEstimate(service, audit, selected);
    if (!estimate) return { status: "error", message: M.overCap };
    nonce = new Date().toISOString();
    const { data: moved, error } = await service
      .from("audits")
      .update({
        backlinks_status: "confirme",
        backlinks_limit: estimate.limit,
        backlinks_estimated_cost_usd: estimate.totalUsd,
        backlinks_stats: { confirmedAt: nonce } as Json,
        backlinks_error: null,
        backlinks_started_at: null,
        backlinks_finished_at: null,
      })
      .eq("id", auditId)
      .in("backlinks_status", ["aucun", "echoue"])
      .select("id");
    if (error) return { status: "error", message: M.saveError };
    if (!moved?.length) return { status: "ok", auditId, message: M.alreadyStarted };
    await supabase.from("events").insert({
      workspace_id: audit.workspace_id,
      actor_id: userId,
      type: "audit.backlinks_confirmed",
      payload: { audit_id: auditId, estimated_cost_usd: estimate.totalUsd, limit: estimate.limit },
    });
  }

  try {
    await sendEvent({
      id: `audit-backlinks-${auditId}-${nonce ?? "0"}`,
      name: BACKLINKS_EVENT,
      data: { auditId, workspaceId: audit.workspace_id },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
