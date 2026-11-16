import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { DRAFT_LIMITS } from "./limits";
import type { DraftBrief, DraftContext, DraftItem, DraftResult } from "./types";

type Client = SupabaseClient<Database>;

export const DRAFTS_EVENT = "plan/drafts.requested";

export interface DraftRun {
  planId: string;
  workspaceId: string;
  auditId: string;
}

export async function beginDrafts(service: Client, planId: string): Promise<DraftRun | null> {
  const { data: run, error } = await service
    .from("draft_runs")
    .select("plan_id, workspace_id, status")
    .eq("plan_id", planId)
    .maybeSingle();
  if (error) throw new Error(`beginDrafts : ${error.message}`);
  if (!run || run.status !== "en_cours") return null;
  const { data: plan } = await service
    .from("link_plans")
    .select("audit_id")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) return null;
  return { planId, workspaceId: run.workspace_id, auditId: plan.audit_id };
}

/**
 * Cibles contactables (email trouvé, même à vérifier, ou formulaire) avec leur hook.
 * Une cible sans citation ni titre de page n'est pas rédigée (pas d'accroche inventée).
 */
export async function loadDraftInput(
  service: Client,
  run: DraftRun,
): Promise<{ items: DraftItem[]; skipped: number; ctx: DraftContext | null }> {
  const [contactsRes, triageRes, itemsRes, siteRes, briefsRes] = await Promise.all([
    service
      .from("target_contacts")
      .select("plan_item_id, status")
      .eq("plan_id", run.planId)
      .in("status", ["email_verifie", "email_a_verifier", "formulaire"])
      .limit(500),
    service
      .from("link_target_triage")
      .select("plan_item_id, hook, page_title, resolved_url")
      .eq("plan_id", run.planId)
      .eq("verdict", "ok")
      .limit(500),
    service.from("link_plan_items").select("*").eq("plan_id", run.planId).limit(500),
    service
      .from("audits")
      .select("sites(domain, niche, language, offered_asset, signature_first_name)")
      .eq("id", run.auditId)
      .maybeSingle(),
    service
      .from("plan_item_briefs")
      .select("plan_item_id, brief")
      .eq("plan_id", run.planId)
      .limit(500),
  ]);
  if (contactsRes.error) throw new Error(`loadDraftInput : ${contactsRes.error.message}`);
  if (briefsRes.error) throw new Error(`loadDraftInput : ${briefsRes.error.message}`);
  const briefs = new Map(
    (briefsRes.data ?? []).map((b) => [b.plan_item_id, b.brief as unknown as DraftBrief]),
  );
  const site = siteRes.data?.sites as unknown as {
    domain: string;
    niche: string | null;
    language: string;
    offered_asset: string | null;
    signature_first_name: string | null;
  } | null;
  if (!site) throw new Error("loadDraftInput : site introuvable");
  const ctx: DraftContext | null = site.signature_first_name?.trim()
    ? {
        siteDomain: site.domain,
        niche: site.niche,
        language: site.language,
        offeredAsset: site.offered_asset,
        signatureFirstName: site.signature_first_name.trim(),
      }
    : null;
  const triage = new Map((triageRes.data ?? []).map((r) => [r.plan_item_id, r]));
  const planItems = new Map((itemsRes.data ?? []).map((r) => [r.id, r]));
  const all: (DraftItem & { pos: number })[] = [];
  for (const c of contactsRes.data ?? []) {
    const tr = triage.get(c.plan_item_id);
    const it = planItems.get(c.plan_item_id);
    if (!tr || !it || !tr.resolved_url) continue;
    const brief = briefs.get(c.plan_item_id) ?? null;
    const hook = tr.hook?.trim() || tr.page_title?.trim() || "";
    if (!hook) continue;
    all.push({
      id: it.id,
      domain: it.source_domain,
      type: it.type,
      expectedLinkType: it.expected_link_type,
      offer: it.offer,
      rationale: it.rationale,
      targetPageUrl: it.target_page_url,
      anchorText: it.anchor_text,
      brokenUrl: it.broken_url,
      channel: c.status === "formulaire" ? "formulaire" : "email",
      pageUrl: tr.resolved_url,
      pageTitle: tr.page_title,
      hook,
      brief,
      pos: it.position,
    });
  }
  all.sort((a, b) => a.pos - b.pos);
  const items = all.slice(0, DRAFT_LIMITS.maxItems).map((x) => {
    const rest: DraftItem & { pos?: number } = { ...x };
    delete rest.pos;
    return rest as DraftItem;
  });
  return { items, skipped: Math.max(0, all.length - items.length), ctx };
}

/** Messages déjà écrits du plan (pour le contrôle des doublons à la reprise d'un step). */
export async function loadWrittenBodies(
  service: Client,
  planId: string,
  exceptItemId: string,
): Promise<string[]> {
  const { data } = await service
    .from("target_drafts")
    .select("plan_item_id, body")
    .eq("plan_id", planId)
    .limit(500);
  return (data ?? []).filter((d) => d.plan_item_id !== exceptItemId).map((d) => d.body);
}

/** Écrit (ou remplace) le brouillon ; renseigne le message pré-rédigé d'une tâche manuelle. */
export async function saveDraft(service: Client, run: DraftRun, r: DraftResult) {
  const { error } = await service.from("target_drafts").upsert(
    {
      plan_item_id: r.itemId,
      plan_id: run.planId,
      workspace_id: run.workspaceId,
      channel: r.channel,
      subject: r.subject,
      body: r.body,
      hook: r.hook,
      targeting_reason: r.targetingReason,
      proposed_url: r.proposedUrl,
      url_status: r.urlStatus,
      url_checked_at: new Date().toISOString(),
      lint_issues: r.issues as unknown as Json,
      ready: r.ready,
      cost_usd: r.costUsd,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "plan_item_id" },
  );
  if (error) throw new Error(`saveDraft : ${error.message}`);
  if (r.channel === "formulaire") {
    // Seule une tâche encore « à faire » reçoit le message : une tâche faite n'est pas touchée.
    const { error: te } = await service
      .from("manual_tasks")
      .update({ message: r.body })
      .eq("plan_item_id", r.itemId)
      .eq("status", "a_faire");
    if (te) throw new Error(`saveDraft (tâche) : ${te.message}`);
  }
}

export interface DraftStats {
  drafted: number;
  skipped: number;
  notDrafted: number;
  ready: number;
  withIssues: number;
  email: number;
  formulaire: number;
}

export function summarize(results: DraftResult[], notDrafted: number, skipped: number): DraftStats {
  return {
    drafted: results.length,
    skipped,
    notDrafted,
    ready: results.filter((r) => r.ready).length,
    withIssues: results.filter((r) => !r.ready).length,
    email: results.filter((r) => r.channel === "email").length,
    formulaire: results.filter((r) => r.channel === "formulaire").length,
  };
}

export async function finalizeDrafts(
  service: Client,
  run: DraftRun,
  stats: DraftStats,
  costUsd: number,
) {
  const { error } = await service
    .from("draft_runs")
    .update({
      status: "termine",
      finished_at: new Date().toISOString(),
      stats: stats as unknown as Json,
      cost_usd: costUsd,
      error_message: null,
    })
    .eq("plan_id", run.planId)
    .eq("status", "en_cours");
  if (error) throw new Error(`finalizeDrafts : ${error.message}`);
}

export async function failDrafts(service: Client, planId: string, message: string) {
  await service
    .from("draft_runs")
    .update({
      status: "echoue",
      finished_at: new Date().toISOString(),
      error_message: message.slice(0, 300),
    })
    .eq("plan_id", planId)
    .eq("status", "en_cours");
}
