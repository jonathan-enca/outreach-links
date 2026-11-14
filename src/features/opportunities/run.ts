import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanKey, type PlanKey } from "@/features/audits/plans";
import { serpEntries } from "@/features/audits/discover";
import { BudgetExceededError, type DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import type { Database, Json } from "@/lib/supabase/database.types";
import { t } from "@/lib/messages";
import {
  candidatesFromSerp,
  finalizeOpportunities,
  OPPORTUNITY_SERP_DEPTH,
  type Candidate,
  type OpportunityQuery,
  type PriorityPage,
  type SiteContext,
} from "./generate";
import { OPPORTUNITIES_CAP_USD } from "./limits";

type Client = SupabaseClient<Database>;
type Dfs = Pick<DataForSeoClient, "serpOrganicLive">;

export const OPPORTUNITIES_EVENT = "audit/opportunities.requested";
const INSERT_CHUNK = 200;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface OpportunitiesRun {
  id: string;
  workspaceId: string;
  siteId: string;
  plan: PlanKey;
  capUsd: number;
  site: SiteContext;
  queries: OpportunityQuery[];
}

export interface OpportunitiesStats {
  total: number;
  byType: Record<string, number>;
  candidates: number;
}

/** confirme -> en_cours (idempotent). Null si l'étape ne doit pas être exécutée. */
export async function beginOpportunities(
  service: Client,
  auditId: string,
): Promise<OpportunitiesRun | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select("*, sites(id, domain, niche, priority_queries, offered_asset)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginOpportunities : ${error.message}`);
  if (!audit || audit.profile_status !== "termine") return null;
  if (audit.opportunities_status === "confirme") {
    const { data, error: uErr } = await service
      .from("audits")
      .update({
        opportunities_status: "en_cours",
        opportunities_started_at: new Date().toISOString(),
      })
      .eq("id", auditId)
      .eq("opportunities_status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginOpportunities : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (audit.opportunities_status !== "en_cours") {
    return null;
  }
  const site = audit.sites as unknown as {
    id: string;
    domain: string;
    niche: string | null;
    priority_queries: string[];
    offered_asset: string | null;
  } | null;
  if (!site) return null;
  const plan: PlanKey = isPlanKey(audit.plan) ? audit.plan : "gratuit";
  // Les requêtes sont figées à la confirmation (coût annoncé = coût engagé).
  const stored = (audit.opportunities_limits ?? {}) as { queries?: OpportunityQuery[] };
  return {
    id: audit.id,
    workspaceId: audit.workspace_id,
    siteId: site.id,
    plan,
    capUsd: OPPORTUNITIES_CAP_USD[plan],
    site: {
      domain: site.domain,
      niche: site.niche,
      priorityQueries: site.priority_queries,
      offeredAsset: site.offered_asset,
    },
    queries: stored.queries ?? [],
  };
}

export interface QueryOutcome {
  query: OpportunityQuery;
  candidates: Candidate[];
  actualCostUsd: number;
}

/**
 * Une requête SERP = un step. `spentUsd` = coût déjà engagé par les requêtes précédentes
 * de l'étape : le plafond propre à l'étape est vérifié AVANT l'appel payant.
 */
export async function runQuery(
  dfs: Dfs,
  run: OpportunitiesRun,
  q: OpportunityQuery,
  spentUsd: number,
): Promise<QueryOutcome> {
  const next = estimateCost("serpOrganicLive", {
    keyword: q.query,
    depth: OPPORTUNITY_SERP_DEPTH,
  });
  if (spentUsd + next > run.capUsd + 1e-9) {
    throw new BudgetExceededError(
      `Plafond de l'étape atteint (${r6(spentUsd)} USD engagés + ${next} > ${run.capUsd} USD)`,
      next,
      run.capUsd,
    );
  }
  const out = await dfs.serpOrganicLive(
    { keyword: q.query, depth: OPPORTUNITY_SERP_DEPTH },
    { workspaceId: run.workspaceId, auditId: run.id },
  );
  const entries = serpEntries(out.result, OPPORTUNITY_SERP_DEPTH);
  return { query: q, candidates: candidatesFromSerp(q, entries), actualCostUsd: out.actualCostUsd };
}

/** Candidats « écart de domaines » (gratuit : lit audit_gap_domains de M1.5). */
export async function gapCandidates(service: Client, auditId: string): Promise<Candidate[]> {
  const { data, error } = await service
    .from("audit_gap_domains")
    .select("domain, competitors_count, competitors, sample_url")
    .eq("audit_id", auditId)
    .order("competitors_count", { ascending: false })
    .limit(200);
  if (error) throw new Error(`gapCandidates : ${error.message}`);
  return (data ?? []).map((g) => ({
    type: "ecart_domaines" as const,
    domain: g.domain,
    url: g.sample_url,
    title: null,
    rationale: `${t.opportunities.rationale.ecart_domaines} (${g.competitors_count} : ${g.competitors.slice(0, 3).join(", ")})`,
    originQuery: null,
    rank: null,
    competitorsCount: g.competitors_count,
  }));
}

/** Génère, dédoublonne et écrit les opportunités ; passe l'étape à « termine ». */
export async function finalizeOpportunitiesStep(
  service: Client,
  run: OpportunitiesRun,
  serpCandidates: Candidate[],
  costUsd: number,
): Promise<OpportunitiesStats> {
  const gap = await gapCandidates(service, run.id);
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
  if (pagesRes.error) throw new Error(`finalizeOpportunities : ${pagesRes.error.message}`);
  if (compRes.error) throw new Error(`finalizeOpportunities : ${compRes.error.message}`);
  const pages: PriorityPage[] = (pagesRes.data ?? []).map((p) => ({
    url: p.url,
    keywords: ((p.keywords_json as { keyword?: string }[] | null) ?? [])
      .map((k) => k.keyword ?? "")
      .filter(Boolean),
  }));
  const all = [...gap, ...serpCandidates];
  // Les « liens morts » (M2.2) sont prouvés en HTTP : on les conserve à la régénération.
  const keptRes = await service
    .from("link_opportunities")
    .select("source_domain")
    .eq("audit_id", run.id)
    .eq("type", "lien_mort");
  if (keptRes.error) throw new Error(`finalizeOpportunities : ${keptRes.error.message}`);
  const keptDomains = new Set((keptRes.data ?? []).map((k) => k.source_domain));
  const final = finalizeOpportunities(all, {
    site: run.site,
    competitorDomains: (compRes.data ?? []).map((c) => c.domain),
    pages,
    homepage: `https://${run.site.domain}/`,
  }).filter((o) => !keptDomains.has(o.domain));

  // Régénération idempotente : on repart d'une table propre pour cet audit (hors liens morts).
  const del = await service
    .from("link_opportunities")
    .delete()
    .eq("audit_id", run.id)
    .neq("type", "lien_mort");
  if (del.error) throw new Error(`finalizeOpportunities : ${del.error.message}`);
  const rows = final.map((o) => ({
    audit_id: run.id,
    workspace_id: run.workspaceId,
    site_id: run.siteId,
    type: o.type,
    source_domain: o.domain,
    source_url: o.url,
    source_title: o.title,
    target_page_url: o.targetPageUrl,
    expected_link_type: o.expectedLinkType,
    offer: o.offer,
    rationale: o.rationale,
    origin_query: o.originQuery,
    priority_score: o.priorityScore,
    priority: o.priority,
  }));
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const ins = await service.from("link_opportunities").insert(rows.slice(i, i + INSERT_CHUNK));
    if (ins.error) throw new Error(`finalizeOpportunities : ${ins.error.message}`);
  }

  const byType: Record<string, number> = {};
  for (const o of final) byType[o.type] = (byType[o.type] ?? 0) + 1;
  const stats: OpportunitiesStats = { total: final.length, byType, candidates: all.length };
  const upd = await service
    .from("audits")
    .update({
      opportunities_status: "termine",
      opportunities_stats: stats as unknown as Json,
      opportunities_cost_usd: r6(costUsd),
      opportunities_finished_at: new Date().toISOString(),
      opportunities_error: null,
    })
    .eq("id", run.id)
    .eq("opportunities_status", "en_cours");
  if (upd.error) throw new Error(`finalizeOpportunities : ${upd.error.message}`);
  await service.from("events").insert({
    workspace_id: run.workspaceId,
    actor_id: null,
    type: "audit.opportunities_done",
    payload: { audit_id: run.id, ...stats, cost_usd: r6(costUsd) },
  });
  return stats;
}

export async function failOpportunities(service: Client, auditId: string, message: string) {
  await service
    .from("audits")
    .update({
      opportunities_status: "echoue",
      opportunities_error: message.slice(0, 500),
      opportunities_finished_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .in("opportunities_status", ["confirme", "en_cours"]);
}
