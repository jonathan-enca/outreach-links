import type { SupabaseClient } from "@supabase/supabase-js";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { estimateChain } from "./chain";
import { estimateDiscovery } from "./estimate";
import { canTransition, isPlanKey, PLAN_LIMITS, type AuditStatus, type PlanKey } from "./plans";

type Client = SupabaseClient<Database>;
type AuditUpdate = Database["public"]["Tables"]["audits"]["Update"];

export const AUDIT_MESSAGES = t.audits.messages;

export const DISCOVER_EVENT = "audit/discover.requested";

export interface AuditActionState {
  status: "idle" | "ok" | "error";
  message?: string;
  auditId?: string;
}

/** Envoi d'un événement Inngest (injecté pour rester testable). */
export type SendEvent = (event: {
  id?: string;
  name: string;
  data: Record<string, unknown>;
}) => Promise<unknown>;

async function currentUserId(supabase: Client): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/**
 * Transition de statut atomique : refuse les transitions interdites et ne touche
 * la ligne que si elle est encore dans l'état de départ (deux clics = une seule
 * transition). Retourne false si la ligne n'était plus dans `from`.
 */
export async function transitionAudit(
  service: Client,
  auditId: string,
  from: AuditStatus,
  to: AuditStatus,
  patch: AuditUpdate = {},
): Promise<boolean> {
  if (!canTransition(from, to)) {
    throw new Error(`Transition d'audit interdite : ${from} -> ${to}`);
  }
  const { data, error } = await service
    .from("audits")
    .update({ ...patch, status: to })
    .eq("id", auditId)
    .eq("status", from)
    .select("id");
  if (error) throw new Error(`transitionAudit : ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Crée un audit pour un site et calcule le coût estimé : en_attente -> estime.
 * `supabase` = client de l'utilisateur (la RLS garantit l'appartenance du site) ;
 * `getServiceClient` est appelé pour écrire (statuts et coûts = faits serveur).
 * Aucun appel payant ici : l'estimation vient de la grille de prix.
 */
export async function createAudit(
  supabase: Client,
  siteId: string,
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: AUDIT_MESSAGES.unauthenticated };

  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id, domain, priority_queries, niche, offered_asset")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return { status: "error", message: AUDIT_MESSAGES.siteNotFound };

  const { data: active } = await supabase
    .from("audits")
    .select("id")
    .eq("site_id", site.id)
    .in("status", ["en_attente", "estime", "confirme", "en_cours"])
    .maybeSingle();
  if (active) return { status: "ok", auditId: active.id, message: AUDIT_MESSAGES.alreadyActive };

  const { data: ws } = await supabase
    .from("workspaces")
    .select("plan")
    .eq("id", site.workspace_id)
    .maybeSingle();
  const plan: PlanKey = isPlanKey(ws?.plan) ? ws.plan : "gratuit";
  const limits = PLAN_LIMITS[plan];

  const queries = site.priority_queries.slice(0, limits.maxQueries);
  if (queries.length === 0) return { status: "error", message: AUDIT_MESSAGES.noQueries };

  const estimate = estimateDiscovery(queries, limits);
  if (estimate.totalUsd > limits.costCapUsd) {
    return { status: "error", message: AUDIT_MESSAGES.overCap };
  }

  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: AUDIT_MESSAGES.unavailable };
  }

  const { data: audit, error } = await service
    .from("audits")
    .insert({
      workspace_id: site.workspace_id,
      site_id: site.id,
      status: "en_attente",
      plan,
      queries,
      max_competitors: limits.maxCompetitors,
      cost_cap_usd: limits.costCapUsd,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error || !audit) {
    // Index unique : un audit actif existe déjà (course entre deux clics).
    if (error?.code === "23505") return { status: "error", message: AUDIT_MESSAGES.alreadyActive };
    return { status: "error", message: AUDIT_MESSAGES.saveError };
  }

  // MA.6 : coût de tout le parcours, annoncé une seule fois.
  const chain = estimateChain({
    plan,
    discoveryUsd: estimate.totalUsd,
    capUsd: limits.costCapUsd,
    site: {
      domain: site.domain,
      niche: site.niche,
      priorityQueries: queries,
      offeredAsset: site.offered_asset,
    },
  });

  const moved = await transitionAudit(service, audit.id, "en_attente", "estime", {
    estimated_cost_usd: estimate.totalUsd,
    estimate_details: { ...estimate, chain } as unknown as Json,
    estimated_at: new Date().toISOString(),
  });
  if (!moved) return { status: "error", message: AUDIT_MESSAGES.saveError };

  await supabase.from("events").insert({
    workspace_id: site.workspace_id,
    actor_id: userId,
    type: "audit.estimated",
    payload: { audit_id: audit.id, site_id: site.id, estimated_cost_usd: estimate.totalUsd },
  });
  return { status: "ok", auditId: audit.id };
}

/**
 * L'utilisateur confirme le coût annoncé : estime -> confirme, puis l'événement
 * Inngest lance le job. Si l'envoi de l'événement échoue (clés Inngest absentes),
 * l'audit reste "confirme" et le même bouton peut relancer l'envoi.
 */
export async function confirmAudit(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const userId = await currentUserId(supabase);
  if (!userId) return { status: "error", message: AUDIT_MESSAGES.unauthenticated };

  const { data: audit } = await supabase
    .from("audits")
    .select("id, workspace_id, site_id, status, estimated_cost_usd, cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { status: "error", message: AUDIT_MESSAGES.notFound };
  if (audit.status === "en_cours" || audit.status === "termine" || audit.status === "echoue") {
    return { status: "ok", auditId, message: AUDIT_MESSAGES.alreadyStarted };
  }
  if (audit.status !== "estime" && audit.status !== "confirme") {
    return { status: "error", message: AUDIT_MESSAGES.notReady };
  }
  if (audit.estimated_cost_usd === null || audit.estimated_cost_usd > audit.cost_cap_usd) {
    return { status: "error", message: AUDIT_MESSAGES.overCap };
  }

  if (audit.status === "estime") {
    let service: Client;
    try {
      service = getServiceClient();
    } catch {
      return { status: "error", message: AUDIT_MESSAGES.unavailable };
    }
    const moved = await transitionAudit(service, audit.id, "estime", "confirme", {
      confirmed_at: new Date().toISOString(),
      // MA.6 : une seule confirmation, les étapes suivantes s'enchaînent seules.
      auto_chain: true,
    });
    if (!moved) return { status: "error", message: AUDIT_MESSAGES.notReady };
    await supabase.from("events").insert({
      workspace_id: audit.workspace_id,
      actor_id: userId,
      type: "audit.confirmed",
      payload: { audit_id: audit.id, estimated_cost_usd: audit.estimated_cost_usd },
    });
  }

  try {
    await sendEvent({
      // Identifiant d'événement : Inngest ignore un doublon, donc pas de double lancement.
      id: `audit-discover-${audit.id}`,
      name: DISCOVER_EVENT,
      data: { auditId: audit.id, workspaceId: audit.workspace_id },
    });
  } catch {
    return { status: "error", auditId, message: AUDIT_MESSAGES.sendFailed };
  }
  return { status: "ok", auditId, message: AUDIT_MESSAGES.started };
}
