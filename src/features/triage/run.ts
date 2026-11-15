import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { TRIAGE_LIMITS } from "./limits";
import type { TriageContext, TriageItem, TriageResult } from "./types";

type Client = SupabaseClient<Database>;

export const TRIAGE_EVENT = "plan/triage.requested";

export interface TriageRun {
  planId: string;
  workspaceId: string;
  auditId: string;
}

/** en_cours -> null si le tri ne doit pas tourner (idempotent). */
export async function beginTriage(service: Client, planId: string): Promise<TriageRun | null> {
  const { data: run, error } = await service
    .from("link_plan_triage_runs")
    .select("plan_id, workspace_id, status")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw new Error(`beginTriage : ${error.message}`);
  if (!run || run.status !== "en_cours") return null;
  const { data: plan } = await service
    .from("link_plans")
    .select("audit_id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return null;
  return { planId, workspaceId: run.workspace_id, auditId: plan.audit_id };
}

/** Cibles à trier (les 40 premières par position) et contexte du site. */
export async function loadTriageInput(
  service: Client,
  run: TriageRun,
): Promise<{ items: TriageItem[]; ctx: TriageContext; skipped: number }> {
  const [itemsRes, auditRes, compRes] = await Promise.all([
    service
      .from("link_plan_items")
      .select("*")
      .eq("plan_id", run.planId)
      .order("position", { ascending: true })
      .limit(500),
    service
      .from("audits")
      .select("sites(domain, niche, language, offered_asset)")
      .eq("id", run.auditId)
      .maybeSingle(),
    service.from("competitors").select("domain").eq("audit_id", run.auditId).limit(200),
  ]);
  if (itemsRes.error) throw new Error(`loadTriageInput : ${itemsRes.error.message}`);
  const site = auditRes.data?.sites as unknown as {
    domain: string;
    niche: string | null;
    language: string;
    offered_asset: string | null;
  } | null;
  if (!site) throw new Error("loadTriageInput : site introuvable");
  const all = itemsRes.data ?? [];
  const items = all.slice(0, TRIAGE_LIMITS.maxItems).map<TriageItem>((r) => ({
    id: r.id,
    domain: r.source_domain,
    type: r.type,
    sourceUrl: r.source_url,
    urlExact: r.url_exact,
    targetPageUrl: r.target_page_url,
    expectedLinkType: r.expected_link_type,
    offer: r.offer,
    rationale: r.rationale,
    brokenUrl: r.broken_url,
  }));
  return {
    items,
    skipped: Math.max(0, all.length - items.length),
    ctx: {
      siteDomain: site.domain,
      niche: site.niche,
      language: site.language,
      offeredAsset: site.offered_asset,
      competitorDomains: new Set((compRes.data ?? []).map((c) => c.domain.replace(/^www\./, ""))),
    },
  };
}

/** Écrit (ou remplace) le verdict d'une cible : idempotent par `plan_item_id`. */
export async function saveVerdict(service: Client, run: TriageRun, r: TriageResult) {
  const { error } = await service.from("link_target_triage").upsert(
    {
      plan_item_id: r.itemId,
      plan_id: run.planId,
      workspace_id: run.workspaceId,
      verdict: r.verdict,
      reason: r.reason,
      confidence: r.confidence,
      needs_review: r.needsReview,
      source: r.source,
      resolved_url: r.resolvedUrl,
      url_status: r.urlStatus,
      url_origin: r.urlOrigin,
      hook: r.hook,
      page_title: r.pageTitle,
      cost_usd: r.costUsd,
      assessed_at: new Date().toISOString(),
    },
    { onConflict: "plan_item_id" },
  );
  if (error) throw new Error(`saveVerdict : ${error.message}`);
}

export interface TriageStats {
  triaged: number;
  skipped: number;
  byVerdict: Record<string, number>;
  needsReview: number;
  llmCalls: number;
}

export function summarize(results: TriageResult[], skipped: number): TriageStats {
  const byVerdict: Record<string, number> = {};
  for (const r of results) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
  return {
    triaged: results.length,
    skipped,
    byVerdict,
    needsReview: results.filter((r) => r.needsReview).length,
    llmCalls: results.filter((r) => r.source === "llm" && r.costUsd > 0).length,
  };
}

export async function finalizeTriage(
  service: Client,
  run: TriageRun,
  stats: TriageStats,
  costUsd: number,
) {
  const { error } = await service
    .from("link_plan_triage_runs")
    .update({
      status: "termine",
      finished_at: new Date().toISOString(),
      stats: stats as unknown as Json,
      cost_usd: costUsd,
      error_message: null,
    })
    .eq("plan_id", run.planId)
    .eq("status", "en_cours");
  if (error) throw new Error(`finalizeTriage : ${error.message}`);
}

export async function failTriage(service: Client, planId: string, message: string) {
  await service
    .from("link_plan_triage_runs")
    .update({
      status: "echoue",
      finished_at: new Date().toISOString(),
      error_message: message.slice(0, 300),
    })
    .eq("plan_id", planId)
    .eq("status", "en_cours");
}
