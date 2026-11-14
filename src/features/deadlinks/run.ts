import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { CompetitorLink, HuntStats, ResourcePage, DeadLinkFinding } from "./hunt";
import { deadLinkOpportunities } from "./to-opportunities";
import type { PriorityPage } from "@/features/opportunities/generate";

type Client = SupabaseClient<Database>;

export const DEADLINKS_EVENT = "audit/deadlinks.requested";
const CHUNK = 200;
const BACKLINK_SCAN_LIMIT = 2000;

export interface DeadlinksRun {
  id: string;
  workspaceId: string;
  siteId: string;
  siteDomain: string;
  offeredAsset: string | null;
}

/** en_cours -> null si l'étape ne doit pas tourner (idempotent). */
export async function beginDeadlinks(
  service: Client,
  auditId: string,
): Promise<DeadlinksRun | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select(
      "id, workspace_id, opportunities_status, deadlinks_status, sites(id, domain, offered_asset)",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginDeadlinks : ${error.message}`);
  if (!audit || audit.opportunities_status !== "termine") return null;
  if (audit.deadlinks_status !== "en_cours") return null;
  const site = audit.sites as unknown as {
    id: string;
    domain: string;
    offered_asset: string | null;
  } | null;
  if (!site) return null;
  return {
    id: audit.id,
    workspaceId: audit.workspace_id,
    siteId: site.id,
    siteDomain: site.domain,
    offeredAsset: site.offered_asset,
  };
}

/** Entrées du crawl, lues en base : backlinks gardés des concurrents et pages ressources. */
export async function loadHuntInput(
  service: Client,
  auditId: string,
): Promise<{ competitorLinks: CompetitorLink[]; resourcePages: ResourcePage[] }> {
  const [linksRes, compRes, resRes] = await Promise.all([
    service
      .from("competitor_backlinks")
      .select("source_domain, source_url, target_url, competitor_id")
      .eq("audit_id", auditId)
      .eq("clean_status", "garde")
      .limit(BACKLINK_SCAN_LIMIT),
    service.from("competitors").select("id, domain").eq("audit_id", auditId),
    service
      .from("link_opportunities")
      .select("source_domain, source_url, priority_score")
      .eq("audit_id", auditId)
      .eq("type", "page_ressources")
      .order("priority_score", { ascending: false })
      .limit(40),
  ]);
  if (linksRes.error) throw new Error(`loadHuntInput : ${linksRes.error.message}`);
  if (compRes.error) throw new Error(`loadHuntInput : ${compRes.error.message}`);
  if (resRes.error) throw new Error(`loadHuntInput : ${resRes.error.message}`);
  const names = new Map((compRes.data ?? []).map((c) => [c.id, c.domain]));
  const competitorLinks: CompetitorLink[] = [];
  for (const l of linksRes.data ?? []) {
    if (!l.target_url) continue;
    competitorLinks.push({
      sourceDomain: l.source_domain,
      sourceUrl: l.source_url,
      targetUrl: l.target_url,
      competitorDomain: names.get(l.competitor_id) ?? null,
    });
  }
  const resourcePages: ResourcePage[] = [];
  for (const o of resRes.data ?? []) {
    if (o.source_url) resourcePages.push({ domain: o.source_domain, url: o.source_url });
  }
  return { competitorLinks, resourcePages };
}

export interface DeadlinksResult {
  stats: HuntStats;
  created: number;
}

/** Écrit les opportunités « lien mort » (régénération idempotente) et clôt l'étape. */
export async function finalizeDeadlinks(
  service: Client,
  run: DeadlinksRun,
  findings: DeadLinkFinding[],
  stats: HuntStats,
): Promise<DeadlinksResult> {
  const [pagesRes, compRes] = await Promise.all([
    service
      .from("audit_pages")
      .select("url, keywords_json")
      .eq("audit_id", run.id)
      .eq("is_priority", true)
      .order("priority_rank", { ascending: true })
      .limit(20),
    service.from("competitors").select("domain").eq("audit_id", run.id).eq("selected", true),
  ]);
  if (pagesRes.error) throw new Error(`finalizeDeadlinks : ${pagesRes.error.message}`);
  if (compRes.error) throw new Error(`finalizeDeadlinks : ${compRes.error.message}`);
  const pages: PriorityPage[] = (pagesRes.data ?? []).map((p) => ({
    url: p.url,
    keywords: ((p.keywords_json as { keyword?: string }[] | null) ?? [])
      .map((k) => k.keyword ?? "")
      .filter(Boolean),
  }));
  const opps = deadLinkOpportunities(findings, {
    siteDomain: run.siteDomain,
    competitorDomains: (compRes.data ?? []).map((c) => c.domain),
    pages,
    homepage: `https://${run.siteDomain}/`,
    offeredAsset: run.offeredAsset,
  });

  const delOld = await service
    .from("link_opportunities")
    .delete()
    .eq("audit_id", run.id)
    .eq("type", "lien_mort");
  if (delOld.error) throw new Error(`finalizeDeadlinks : ${delOld.error.message}`);
  if (opps.length) {
    // Un constat prouvé remplace une opportunité moins précise sur le même domaine.
    const delDup = await service
      .from("link_opportunities")
      .delete()
      .eq("audit_id", run.id)
      .in(
        "source_domain",
        opps.map((o) => o.domain),
      );
    if (delDup.error) throw new Error(`finalizeDeadlinks : ${delDup.error.message}`);
  }
  const rows = opps.map((o) => ({
    audit_id: run.id,
    workspace_id: run.workspaceId,
    site_id: run.siteId,
    type: "lien_mort",
    source_domain: o.domain,
    source_url: o.sourceUrl,
    source_title: null,
    target_page_url: o.targetPageUrl,
    expected_link_type: "reprise_lien_mort",
    offer: o.offer,
    rationale: o.rationale,
    origin_query: null,
    priority_score: o.priorityScore,
    priority: o.priority,
    broken_url: o.brokenUrl,
    broken_http_status: o.httpStatus,
    broken_checked_at: o.checkedAt,
  }));
  for (let i = 0; i < rows.length; i += CHUNK) {
    const ins = await service.from("link_opportunities").insert(rows.slice(i, i + CHUNK));
    if (ins.error) throw new Error(`finalizeDeadlinks : ${ins.error.message}`);
  }

  const upd = await service
    .from("audits")
    .update({
      deadlinks_status: "termine",
      deadlinks_stats: { ...stats, created: rows.length } as unknown as Json,
      deadlinks_error: null,
      deadlinks_finished_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .eq("deadlinks_status", "en_cours");
  if (upd.error) throw new Error(`finalizeDeadlinks : ${upd.error.message}`);
  await service.from("events").insert({
    workspace_id: run.workspaceId,
    actor_id: null,
    type: "audit.deadlinks_done",
    payload: { audit_id: run.id, ...stats, created: rows.length },
  });
  return { stats, created: rows.length };
}

export async function failDeadlinks(service: Client, auditId: string, message: string) {
  await service
    .from("audits")
    .update({
      deadlinks_status: "echoue",
      deadlinks_error: message.slice(0, 500),
      deadlinks_finished_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .eq("deadlinks_status", "en_cours");
}
