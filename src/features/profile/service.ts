import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanKey, type PlanKey } from "@/features/audits/plans";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { totalCostForAudit } from "@/lib/costs";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { estimateProfile, type ProfileEstimate } from "./limits";
import { PROFILE_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.profile.messages;

/** Estimation affichée avant le clic (null si impossible dans le plafond de l'audit). */
export async function previewProfileEstimate(
  service: Client,
  audit: { id: string; plan: string; cost_cap_usd: number },
  selectedCompetitors: number,
): Promise<ProfileEstimate | null> {
  const plan: PlanKey = isPlanKey(audit.plan) ? audit.plan : "gratuit";
  const spent = await totalCostForAudit(service, audit.id);
  const { data: sized } = await service
    .from("competitors")
    .select("referring_domains")
    .eq("audit_id", audit.id)
    .eq("selected", true);
  const known = (sized ?? []).filter((c) => c.referring_domains != null).length;
  return estimateProfile(selectedCompetitors, plan, Number(audit.cost_cap_usd) - spent, known);
}

/**
 * L'utilisateur confirme l'analyse : aucun/echoue -> confirme (limites et coût estimé
 * figés), puis l'événement Inngest lance le job. Même mécanique que M1.3 et M1.4 : si
 * l'envoi échoue, l'état reste "confirme" et le bouton peut relancer l'envoi.
 */
export async function startProfile(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
  /** MA.6 : enchaînement automatique, sans session (id de l'utilisateur qui a confirmé l'audit). */
  actorId?: string,
): Promise<AuditActionState> {
  const userId = actorId ?? (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!userId) return { status: "error", message: M.unauthenticated };

  const { data: audit } = await supabase
    .from("audits")
    .select(
      "id, workspace_id, status, plan, cost_cap_usd, backlinks_status, profile_status, profile_limits",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.status !== "termine" || audit.backlinks_status !== "termine") {
    return { status: "error", message: M.backlinksNotDone };
  }
  if (audit.profile_status === "en_cours" || audit.profile_status === "termine") {
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

  let nonce = (audit.profile_limits as { confirmedAt?: string } | null)?.confirmedAt;
  if (audit.profile_status !== "confirme") {
    const estimate = await previewProfileEstimate(service, audit, selected);
    if (!estimate) return { status: "error", message: M.overCap };
    nonce = new Date().toISOString();
    const { data: moved, error } = await service
      .from("audits")
      .update({
        profile_status: "confirme",
        profile_limits: { ...estimate.limits, confirmedAt: nonce } as unknown as Json,
        profile_estimated_cost_usd: estimate.totalUsd,
        profile_error: null,
        profile_started_at: null,
        profile_finished_at: null,
      })
      .eq("id", auditId)
      .in("profile_status", ["aucun", "echoue"])
      .select("id");
    if (error) return { status: "error", message: M.saveError };
    if (!moved?.length) return { status: "ok", auditId, message: M.alreadyStarted };
    await supabase.from("events").insert({
      workspace_id: audit.workspace_id,
      actor_id: userId,
      type: "audit.profile_confirmed",
      payload: { audit_id: auditId, estimated_cost_usd: estimate.totalUsd },
    });
  }

  try {
    await sendEvent({
      id: `audit-profile-${auditId}-${nonce ?? "0"}`,
      name: PROFILE_EVENT,
      data: { auditId, workspaceId: audit.workspace_id },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
