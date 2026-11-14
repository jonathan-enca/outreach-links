import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import type { AnchorProfile } from "@/features/profile/compute";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { moveId, suggestAnchor, type AnchorSuggestion } from "./anchors";

type Client = SupabaseClient<Database>;
const M = t.plan.messages;

export interface PlanItemView {
  id: string;
  domain: string;
  type: string;
  priority: string;
  priorityScore: number;
  status: "nouveau" | "retenu" | "ecarte";
  targetPageUrl: string;
  rationale: string;
  offer: string | null;
  brokenUrl: string | null;
  expectedLinkType: string;
  sourceUrl: string | null;
  urlExact: boolean;
  anchor: AnchorSuggestion;
}

export interface PlanVersionView {
  version: number;
  itemCount: number;
  validatedAt: string;
}

export interface PlanView {
  auditId: string;
  domain: string;
  ready: boolean;
  items: PlanItemView[];
  versions: PlanVersionView[];
}

/** Ordre d'affichage : retenus par position, puis les autres par score décroissant. */
function sortItems<
  T extends {
    status: string;
    plan_position: number | null;
    priority_score: number;
    source_domain: string;
  },
>(rows: T[]): T[] {
  const rank = (r: T) => (r.status === "retenu" ? 0 : r.status === "nouveau" ? 1 : 2);
  return [...rows].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.plan_position ?? 1e9) - (b.plan_position ?? 1e9) ||
      b.priority_score - a.priority_score ||
      a.source_domain.localeCompare(b.source_domain),
  );
}

export async function loadPlan(supabase: Client, auditId: string): Promise<PlanView | null> {
  const { data: audit } = await supabase
    .from("audits")
    .select("id, opportunities_status, profile_data, sites(domain)")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return null;
  const domain = (audit.sites as unknown as { domain: string } | null)?.domain ?? "";
  const [oppsRes, pagesRes, plansRes] = await Promise.all([
    supabase.from("link_opportunities").select("*").eq("audit_id", auditId).limit(500),
    supabase
      .from("audit_pages")
      .select("url, keywords_json")
      .eq("audit_id", auditId)
      .eq("is_priority", true)
      .limit(50),
    supabase
      .from("link_plans")
      .select("version, item_count, validated_at")
      .eq("audit_id", auditId)
      .order("version", { ascending: false })
      .limit(20),
  ]);
  const keywordOf = new Map<string, string>();
  for (const p of pagesRes.data ?? []) {
    const kw = ((p.keywords_json as { keyword?: string }[] | null) ?? [])[0]?.keyword;
    if (kw) keywordOf.set(p.url, kw);
  }
  const profile = (audit.profile_data as { anchors?: AnchorProfile } | null)?.anchors ?? null;
  const items = sortItems(oppsRes.data ?? []).map<PlanItemView>((o) => ({
    id: o.id,
    domain: o.source_domain,
    type: o.type,
    priority: o.priority,
    priorityScore: o.priority_score,
    status: o.status as PlanItemView["status"],
    targetPageUrl: o.target_page_url,
    rationale: o.rationale,
    offer: o.offer,
    brokenUrl: o.broken_url,
    expectedLinkType: o.expected_link_type,
    sourceUrl: o.source_url,
    urlExact: o.url_exact,
    anchor: suggestAnchor({
      type: o.type,
      domain,
      keyword: keywordOf.get(o.target_page_url) ?? null,
      profile: profile && profile.sampleSize !== undefined ? profile : null,
    }),
  }));
  return {
    auditId,
    domain,
    ready: audit.opportunities_status === "termine",
    items,
    versions: (plansRes.data ?? []).map((p) => ({
      version: p.version,
      itemCount: p.item_count,
      validatedAt: p.validated_at,
    })),
  };
}

async function authorize(supabase: Client, auditId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  if (!userId) return { error: M.unauthenticated } as const;
  const { data: audit } = await supabase
    .from("audits")
    .select("id, workspace_id, site_id, opportunities_status")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit) return { error: M.notFound } as const;
  if (audit.opportunities_status !== "termine") return { error: M.notReady } as const;
  return { userId, audit } as const;
}

/** Retenir ou écarter une opportunité (la RLS a déjà prouvé l'accès à l'audit). */
export async function setSelection(
  supabase: Client,
  auditId: string,
  opportunityId: string,
  selected: boolean,
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const a = await authorize(supabase, auditId);
  if ("error" in a) return { status: "error", message: a.error };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { data: retained } = await service
    .from("link_opportunities")
    .select("id, plan_position")
    .eq("audit_id", auditId)
    .eq("status", "retenu");
  const nextPos = selected
    ? Math.max(0, ...(retained ?? []).map((r) => r.plan_position ?? 0)) + 1
    : null;
  const { data, error } = await service
    .from("link_opportunities")
    .update({ status: selected ? "retenu" : "ecarte", plan_position: nextPos })
    .eq("id", opportunityId)
    .eq("audit_id", auditId)
    .select("id");
  if (error) return { status: "error", message: M.saveError };
  if (!data?.length) return { status: "error", message: M.notFound };
  return { status: "ok", auditId, message: selected ? M.retained : M.discarded };
}

/** Monte ou descend une opportunité retenue ; les positions sont renumérotées 1..n. */
export async function moveSelection(
  supabase: Client,
  auditId: string,
  opportunityId: string,
  dir: "up" | "down",
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const a = await authorize(supabase, auditId);
  if ("error" in a) return { status: "error", message: a.error };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { data: rows, error } = await service
    .from("link_opportunities")
    .select("id, plan_position, priority_score")
    .eq("audit_id", auditId)
    .eq("status", "retenu");
  if (error) return { status: "error", message: M.saveError };
  const ordered = [...(rows ?? [])]
    .sort(
      (x, y) =>
        (x.plan_position ?? 1e9) - (y.plan_position ?? 1e9) || y.priority_score - x.priority_score,
    )
    .map((r) => r.id);
  if (!ordered.includes(opportunityId)) return { status: "error", message: M.notFound };
  const next = moveId(ordered, opportunityId, dir);
  for (const [i, id] of next.entries()) {
    const { error: uErr } = await service
      .from("link_opportunities")
      .update({ plan_position: i + 1 })
      .eq("id", id)
      .eq("audit_id", auditId);
    if (uErr) return { status: "error", message: M.saveError };
  }
  return { status: "ok", auditId, message: M.moved };
}

/**
 * Valide le plan : copie les opportunités retenues, dans l'ordre, avec leur ancre, dans un
 * instantané immuable et versionné (version = dernière + 1). Rien d'autre ne part sans lui.
 */
export async function validatePlan(
  supabase: Client,
  auditId: string,
  getServiceClient: () => Client,
): Promise<AuditActionState> {
  const a = await authorize(supabase, auditId);
  if ("error" in a) return { status: "error", message: a.error };
  const view = await loadPlan(supabase, auditId);
  const retained = (view?.items ?? []).filter((i) => i.status === "retenu");
  if (!view || retained.length === 0) return { status: "error", message: M.nothingSelected };
  let service: Client;
  try {
    service = getServiceClient();
  } catch {
    return { status: "error", message: M.unavailable };
  }
  const { data: created, error } = await service.rpc("create_link_plan", {
    p_audit_id: auditId,
    p_user_id: a.userId,
    p_items: retained.map((i) => ({
      opportunity_id: i.id,
      type: i.type,
      source_domain: i.domain,
      source_url: i.sourceUrl,
      url_exact: i.urlExact,
      target_page_url: i.targetPageUrl,
      anchor_kind: i.anchor.kind,
      anchor_text: i.anchor.text,
      expected_link_type: i.expectedLinkType,
      offer: i.offer,
      rationale: i.rationale,
      priority: i.priority,
      priority_score: i.priorityScore,
      broken_url: i.brokenUrl,
    })),
  });
  const version = created?.[0]?.version;
  if (error || version === undefined) return { status: "error", message: M.saveError };
  await supabase.from("events").insert({
    workspace_id: a.audit.workspace_id,
    actor_id: a.userId,
    type: "plan.validated",
    payload: { audit_id: auditId, version, items: retained.length },
  });
  return { status: "ok", auditId, message: M.validated.replace("{version}", String(version)) };
}
