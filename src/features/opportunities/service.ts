import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanKey, type PlanKey } from "@/features/audits/plans";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { estimateOpportunities, type OpportunitiesEstimate } from "./limits";
import { OPPORTUNITIES_EVENT } from "./run";

type Client = SupabaseClient<Database>;
const M = t.opportunities.messages;

interface SiteRow {
  domain: string;
  niche: string | null;
  priority_queries: string[];
  offered_asset: string | null;
}

export function estimateForSite(site: SiteRow, planRaw: string): OpportunitiesEstimate | null {
  const plan: PlanKey = isPlanKey(planRaw) ? planRaw : "gratuit";
  return estimateOpportunities(
    {
      domain: site.domain,
      niche: site.niche,
      priorityQueries: site.priority_queries,
      offeredAsset: site.offered_asset,
    },
    plan,
  );
}

/**
 * L'utilisateur confirme la recherche : aucun/echoue -> confirme (requêtes et coût estimé
 * figés), puis l'événement Inngest lance le job. Même mécanique que M1.3 à M1.5 : si l'envoi
 * échoue, l'état reste "confirme" et le bouton peut relancer l'envoi. Aucun contact n'est lancé.
 */
export async function startOpportunities(
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
      "id, workspace_id, plan, profile_status, opportunities_status, opportunities_limits, sites(domain, niche, priority_queries, offered_asset)",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: M.notFound };
  if (audit.profile_status !== "termine") return { status: "error", message: M.profileNotDone };
  if (audit.opportunities_status === "en_cours" || audit.opportunities_status === "termine") {
    return { status: "ok", auditId, message: M.alreadyStarted };
  }
  const site = audit.sites as unknown as SiteRow | null;
  if (!site) return { status: "error", message: M.notFound };

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }

  let nonce = (audit.opportunities_limits as { confirmedAt?: string } | null)?.confirmedAt;
  if (audit.opportunities_status !== "confirme") {
    const estimate = estimateForSite(site, audit.plan);
    if (!estimate) return { status: "error", message: M.overCap };
    nonce = new Date().toISOString();
    const { data: moved, error } = await service
      .from("audits")
      .update({
        opportunities_status: "confirme",
        opportunities_limits: {
          queries: estimate.queries,
          depth: estimate.depth,
          capUsd: estimate.capUsd,
          confirmedAt: nonce,
        } as unknown as Json,
        opportunities_estimated_cost_usd: estimate.totalUsd,
        opportunities_error: null,
        opportunities_started_at: null,
        opportunities_finished_at: null,
      })
      .eq("id", auditId)
      .in("opportunities_status", ["aucun", "echoue"])
      .select("id");
    if (error) return { status: "error", message: M.saveError };
    if (!moved?.length) return { status: "ok", auditId, message: M.alreadyStarted };
    await supabase.from("events").insert({
      workspace_id: audit.workspace_id,
      actor_id: userId,
      type: "audit.opportunities_confirmed",
      payload: { audit_id: auditId, estimated_cost_usd: estimate.totalUsd },
    });
  }

  try {
    await sendEvent({
      id: `audit-opportunities-${auditId}-${nonce ?? "0"}`,
      name: OPPORTUNITIES_EVENT,
      data: { auditId, workspaceId: audit.workspace_id },
    });
  } catch {
    return { status: "error", auditId, message: M.sendFailed };
  }
  return { status: "ok", auditId, message: M.started };
}
