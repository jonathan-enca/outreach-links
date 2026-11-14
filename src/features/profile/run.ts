import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlanKey, type PlanKey } from "@/features/audits/plans";
import { totalCostForAudit } from "@/lib/costs";
import { BudgetExceededError, DataForSeoError, type DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import { logger } from "@/lib/logger";
import type { LlmClient } from "@/lib/llm";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  assessTechnical,
  buildAnchorProfile,
  computeGap,
  estimateRequiredDomains,
  groupKeywordsByPage,
  normalizePageUrl,
  type AnchorProfile,
  type CompetitorLinkRow,
  type RankedKeyword,
} from "./compute";
import { PROFILE_LIMITS, type ProfileLimits } from "./limits";
import { generateSummary, type SummaryFacts } from "./summary";

type Client = SupabaseClient<Database>;
type Dfs = Pick<
  DataForSeoClient,
  | "backlinksSummary"
  | "backlinksReferringDomains"
  | "backlinksBacklinks"
  | "labsRankedKeywords"
  | "onpageInstantPages"
>;

export const PROFILE_EVENT = "audit/profile.requested";
const PAGE = 1000;
const INSERT_CHUNK = 200;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface ProfileRun {
  id: string;
  workspaceId: string;
  domain: string;
  plan: PlanKey;
  limits: ProfileLimits;
  costCapUsd: number;
  /** Concurrents de repère (les mieux classés parmi les retenus). */
  benchmark: { id: string; domain: string }[];
}

export interface OwnProfile {
  totals: {
    referringDomains: number | null;
    backlinks: number | null;
    brokenBacklinks: number | null;
    rank: number | null;
    spamScore: number | null;
  };
  anchors: AnchorProfile;
  ownDomains: string[];
  /** Vrai si la liste de domaines référents du site est tronquée (l'écart est alors approximatif). */
  ownDomainsPartial: boolean;
  /** Domaines référents par page, vus dans l'échantillon de backlinks (borne basse). */
  pageDomains: Record<string, number>;
}

export interface ProfileData {
  totals: OwnProfile["totals"];
  anchors: AnchorProfile;
  ownDomainsPartial: boolean;
  benchmark: { domain: string; referringDomains: number | null }[];
  benchmarkMedian: number | null;
  pages: { total: number; keywords: number; priority: number; checked: number; problems: number };
  gap: { count: number; topCount: number };
  limits: ProfileLimits;
}

// ----- Étape 1 : démarrage ---------------------------------------------------

/** confirme -> en_cours (idempotent). Null si l'étape ne doit pas être exécutée. */
export async function beginProfile(service: Client, auditId: string): Promise<ProfileRun | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select("*, sites(domain)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginProfile : ${error.message}`);
  if (!audit || audit.status !== "termine" || audit.backlinks_status !== "termine") return null;
  if (audit.profile_status === "confirme") {
    const { data, error: uErr } = await service
      .from("audits")
      .update({ profile_status: "en_cours", profile_started_at: new Date().toISOString() })
      .eq("id", auditId)
      .eq("profile_status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginProfile : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (audit.profile_status !== "en_cours") {
    return null;
  }
  const site = audit.sites as unknown as { domain: string } | null;
  if (!site) return null;
  const plan: PlanKey = isPlanKey(audit.plan) ? audit.plan : "gratuit";
  const stored = (audit.profile_limits ?? {}) as Partial<ProfileLimits>;
  const limits: ProfileLimits = { ...PROFILE_LIMITS[plan], ...stored };
  const { data: comps, error: cErr } = await service
    .from("competitors")
    .select("id, domain")
    .eq("audit_id", auditId)
    .eq("selected", true)
    .order("score", { ascending: false });
  if (cErr) throw new Error(`beginProfile : ${cErr.message}`);
  return {
    id: audit.id,
    workspaceId: audit.workspace_id,
    domain: site.domain,
    plan,
    limits,
    costCapUsd: Number(audit.cost_cap_usd),
    benchmark: (comps ?? []).slice(0, limits.benchmarkCompetitors),
  };
}

/** Contrôle du plafond de l'audit AVANT un appel payant. */
async function assertBudget(
  service: Client,
  run: ProfileRun,
  key: Parameters<typeof estimateCost>[0],
  params: unknown,
) {
  const spent = await totalCostForAudit(service, run.id);
  const next = estimateCost(key, params as never);
  if (spent + next > run.costCapUsd + 1e-9) {
    throw new BudgetExceededError(
      `Plafond de l'audit atteint (${r6(spent)} USD engagés + ${next} > ${run.costCapUsd} USD)`,
      next,
      run.costCapUsd,
    );
  }
}

const ids = (run: ProfileRun) => ({ workspaceId: run.workspaceId, auditId: run.id });

// ----- Étape 2 : profil de liens du site -------------------------------------

export async function collectOwnProfile(
  service: Client,
  dfs: Pick<Dfs, "backlinksSummary" | "backlinksReferringDomains" | "backlinksBacklinks">,
  run: ProfileRun,
): Promise<OwnProfile> {
  const target = run.domain;
  await assertBudget(service, run, "backlinksSummary", { target });
  const summary = await dfs.backlinksSummary({ target }, ids(run));

  const refParams = { target, limit: run.limits.referringDomains };
  await assertBudget(service, run, "backlinksReferringDomains", refParams);
  const ref = await dfs.backlinksReferringDomains(refParams, ids(run));
  const refItems = ref.result?.items ?? [];

  const blParams = { target, limit: run.limits.backlinksSample, mode: "as_is" as const };
  await assertBudget(service, run, "backlinksBacklinks", blParams);
  const bl = await dfs.backlinksBacklinks(blParams, ids(run));
  const blItems = bl.result?.items ?? [];

  const anchors = buildAnchorProfile(
    blItems.map((b) => ({ anchor: b.anchor, dofollow: b.dofollow })),
    run.domain,
  );
  const perPage = new Map<string, Set<string>>();
  for (const b of blItems) {
    const url = b.url_to ? normalizePageUrl(b.url_to) : null;
    if (!url) continue;
    const set = perPage.get(url) ?? new Set<string>();
    set.add(b.domain_from.toLowerCase().replace(/^www\./, ""));
    perPage.set(url, set);
  }
  const s = summary.result;
  const totalRef = s?.referring_domains ?? ref.result?.total_count ?? null;
  const ownDomains = [
    ...new Set(refItems.map((i) => i.domain.toLowerCase().replace(/^www\./, ""))),
  ];
  return {
    totals: {
      referringDomains: totalRef ?? null,
      backlinks: s?.backlinks ?? null,
      brokenBacklinks: s?.broken_backlinks ?? null,
      rank: s?.rank ?? null,
      spamScore: s?.backlinks_spam_score ?? null,
    },
    anchors,
    ownDomains,
    ownDomainsPartial: totalRef !== null ? ownDomains.length < totalRef : false,
    pageDomains: Object.fromEntries([...perPage].map(([u, set]) => [u, set.size])),
  };
}

/** Profil de liens d'un concurrent de repère (domaines référents au niveau domaine). */
export async function fetchBenchmark(
  service: Client,
  dfs: Pick<Dfs, "backlinksSummary">,
  run: ProfileRun,
  competitor: { id: string; domain: string },
): Promise<{ domain: string; referringDomains: number | null }> {
  const params = { target: competitor.domain };
  await assertBudget(service, run, "backlinksSummary", params);
  const out = await dfs.backlinksSummary(params, ids(run));
  return { domain: competitor.domain, referringDomains: out.result?.referring_domains ?? null };
}

// ----- Étape 3 : positions et pages ------------------------------------------

export async function collectPages(
  service: Client,
  dfs: Pick<Dfs, "labsRankedKeywords">,
  run: ProfileRun,
  pageDomains: Record<string, number>,
): Promise<{ pages: number; keywords: number; priority: number }> {
  const params = {
    target: run.domain,
    limit: run.limits.keywords,
    order_by: ["keyword_data.keyword_info.search_volume,desc"],
  };
  await assertBudget(service, run, "labsRankedKeywords", params);
  const out = await dfs.labsRankedKeywords(params, ids(run));
  const items: RankedKeyword[] = [];
  for (const it of out.result?.items ?? []) {
    const el = it.ranked_serp_element?.serp_item;
    if (!el?.url || !el.rank_group) continue;
    items.push({
      keyword: it.keyword_data.keyword,
      url: el.url,
      position: el.rank_group,
      volume: it.keyword_data.keyword_info?.search_volume ?? 0,
    });
  }
  const pages = groupKeywordsByPage(items, run.domain);

  const del = await service.from("audit_pages").delete().eq("audit_id", run.id);
  if (del.error) throw new Error(`collectPages : ${del.error.message}`);
  for (let i = 0; i < pages.length; i += INSERT_CHUNK) {
    const ins = await service.from("audit_pages").insert(
      pages.slice(i, i + INSERT_CHUNK).map((p) => ({
        audit_id: run.id,
        workspace_id: run.workspaceId,
        url: p.url,
        keywords_json: p.keywords as unknown as Json,
        keywords_count: p.keywordsCount,
        total_volume: Math.round(p.totalVolume),
        avg_position: p.avgPosition,
        best_position: p.bestPosition,
        referring_domains: pageDomains[p.url] ?? 0,
        is_priority: p.isPriority,
        priority_score: p.priorityScore,
        priority_rank: p.priorityRank,
      })),
    );
    if (ins.error) throw new Error(`collectPages : ${ins.error.message}`);
  }
  return {
    pages: pages.length,
    keywords: items.length,
    priority: pages.filter((p) => p.isPriority).length,
  };
}

/** Besoin en domaines référents des pages prioritaires, d'après la médiane des concurrents. */
export async function computePageNeeds(
  service: Client,
  run: ProfileRun,
  benchmarkMedian: number | null,
): Promise<number> {
  const { data, error } = await service
    .from("audit_pages")
    .select("id, avg_position, referring_domains")
    .eq("audit_id", run.id)
    .eq("is_priority", true);
  if (error) throw new Error(`computePageNeeds : ${error.message}`);
  let n = 0;
  for (const p of data ?? []) {
    const est = estimateRequiredDomains({
      pageReferringDomains: p.referring_domains ?? 0,
      benchmarkDomains: benchmarkMedian,
      avgPosition: Number(p.avg_position ?? 20),
    });
    if (!est) continue;
    const upd = await service
      .from("audit_pages")
      .update({
        required_domains_estimated: est.estimated,
        required_domains_low: est.low,
        required_domains_high: est.high,
      })
      .eq("id", p.id);
    if (upd.error) throw new Error(`computePageNeeds : ${upd.error.message}`);
    n++;
  }
  return n;
}

// ----- Étape 4 : contrôle technique -------------------------------------------

export async function runOnpage(
  service: Client,
  dfs: Pick<Dfs, "onpageInstantPages">,
  run: ProfileRun,
): Promise<{ checked: number; problems: number }> {
  const { data, error } = await service
    .from("audit_pages")
    .select("id, url, is_priority, priority_rank, total_volume")
    .eq("audit_id", run.id)
    .order("priority_rank", { ascending: true, nullsFirst: false })
    .limit(run.limits.onpagePages * 4);
  if (error) throw new Error(`runOnpage : ${error.message}`);
  const rows = (data ?? [])
    .sort(
      (a, b) =>
        (a.priority_rank ?? 1e9) - (b.priority_rank ?? 1e9) || b.total_volume - a.total_volume,
    )
    .slice(0, run.limits.onpagePages);
  let checked = 0;
  let problems = 0;
  for (const row of rows) {
    const params = { url: row.url };
    await assertBudget(service, run, "onpageInstantPages", params);
    let item;
    try {
      const out = await dfs.onpageInstantPages(params, ids(run));
      item = out.result?.items?.[0];
    } catch (e) {
      // Une page qui échoue (timeout, blocage) ne fait pas échouer l'audit.
      if (e instanceof BudgetExceededError) throw e;
      if (!(e instanceof DataForSeoError)) throw e;
      logger.warn("onpage : page non vérifiée", {
        auditId: run.id,
        url: row.url,
        error: e.message,
      });
      continue;
    }
    if (!item) continue;
    const tech = assessTechnical(item);
    const upd = await service
      .from("audit_pages")
      .update({
        tech_status: tech.status,
        tech_issues: tech.issues,
        http_status: tech.httpStatus,
        onpage_score: tech.onpageScore,
      })
      .eq("id", row.id);
    if (upd.error) throw new Error(`runOnpage : ${upd.error.message}`);
    checked++;
    if (tech.status === "probleme") problems++;
  }
  return { checked, problems };
}

// ----- Étape 5 : écart de domaines référents ----------------------------------

export async function computeGapStep(
  service: Client,
  run: ProfileRun,
  ownDomains: string[],
): Promise<{ count: number; topCount: number }> {
  const { data: comps, error: cErr } = await service
    .from("competitors")
    .select("id, domain")
    .eq("audit_id", run.id)
    .eq("selected", true);
  if (cErr) throw new Error(`computeGapStep : ${cErr.message}`);
  const domainById = new Map((comps ?? []).map((c) => [c.id, c.domain]));
  const rows: CompetitorLinkRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await service
      .from("competitor_backlinks")
      .select("*")
      .eq("audit_id", run.id)
      .eq("clean_status", "garde")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`computeGapStep : ${error.message}`);
    for (const r of data ?? []) {
      rows.push({
        competitorDomain: domainById.get(r.competitor_id) ?? "",
        sourceDomain: r.source_domain,
        sourceUrl: r.source_url,
        anchor: r.anchor,
        dofollow: r.dofollow,
        spamScore: r.spam_score,
        sourceRank: r.source_rank,
      });
    }
    if (!data || data.length < PAGE) break;
  }
  const gap = computeGap(ownDomains, rows, run.domain);
  const del = await service.from("audit_gap_domains").delete().eq("audit_id", run.id);
  if (del.error) throw new Error(`computeGapStep : ${del.error.message}`);
  for (let i = 0; i < gap.length; i += INSERT_CHUNK) {
    const ins = await service.from("audit_gap_domains").insert(
      gap.slice(i, i + INSERT_CHUNK).map((g) => ({
        audit_id: run.id,
        workspace_id: run.workspaceId,
        domain: g.domain,
        competitors_count: g.competitorsCount,
        competitors: g.competitors,
        best_rank: g.bestRank,
        min_spam_score: g.minSpamScore,
        dofollow: g.dofollow,
        sample_url: g.sampleUrl,
        sample_anchor: g.sampleAnchor,
      })),
    );
    if (ins.error) throw new Error(`computeGapStep : ${ins.error.message}`);
  }
  return { count: gap.length, topCount: gap[0]?.competitorsCount ?? 0 };
}

// ----- Étape 6 : résumé et fin -------------------------------------------------

export async function summarizeProfile(
  service: Client,
  llm: Pick<LlmClient, "generate"> | null,
  run: ProfileRun,
  data: ProfileData,
): Promise<{ source: "llm" | "modele"; model: string | null }> {
  const { data: pages, error } = await service
    .from("audit_pages")
    .select("url, avg_position, total_volume, referring_domains, required_domains_estimated")
    .eq("audit_id", run.id)
    .eq("is_priority", true)
    .order("priority_rank", { ascending: true })
    .limit(3);
  if (error) throw new Error(`summarizeProfile : ${error.message}`);
  const facts: SummaryFacts = {
    domain: run.domain,
    referringDomains: data.totals.referringDomains,
    backlinks: data.totals.backlinks,
    dofollowShare: data.anchors.dofollowShare,
    brandAnchorShare: data.anchors.sampleSize ? data.anchors.shares.marque : null,
    overOptimizedAnchors: data.anchors.overOptimized,
    competitorsBenchmark: data.benchmarkMedian,
    rankedKeywords: data.pages.keywords,
    priorityPages: (pages ?? []).map((p) => ({
      url: p.url,
      avgPosition: Number(p.avg_position ?? 0),
      volume: p.total_volume,
      pageDomains: p.referring_domains,
      neededDomains: p.required_domains_estimated,
    })),
    gapDomains: data.gap.count,
    gapTopCount: data.gap.topCount,
    techProblems: data.pages.problems,
    techChecked: data.pages.checked,
  };
  const result = await generateSummary(llm, facts, ids(run));
  const upd = await service
    .from("audits")
    .update({
      profile_summary: result.text,
      profile_summary_source: result.source,
      profile_summary_model: result.model,
    })
    .eq("id", run.id);
  if (upd.error) throw new Error(`summarizeProfile : ${upd.error.message}`);
  return { source: result.source, model: result.model };
}

/** Termine : profil, coût réel de l'étape (total du cost_ledger moins les étapes précédentes). */
export async function finalizeProfile(
  service: Client,
  run: ProfileRun,
  data: ProfileData,
): Promise<{ profileCostUsd: number }> {
  const { data: audit, error } = await service
    .from("audits")
    .select("actual_cost_usd, backlinks_cost_usd")
    .eq("id", run.id)
    .single();
  if (error || !audit)
    throw new Error(`finalizeProfile : ${error?.message ?? "audit introuvable"}`);
  const total = await totalCostForAudit(service, run.id);
  const profileCostUsd = r6(
    Math.max(0, total - Number(audit.actual_cost_usd ?? 0) - Number(audit.backlinks_cost_usd ?? 0)),
  );
  const upd = await service
    .from("audits")
    .update({
      profile_status: "termine",
      profile_data: data as unknown as Json,
      profile_cost_usd: profileCostUsd,
      profile_finished_at: new Date().toISOString(),
      profile_error: null,
    })
    .eq("id", run.id)
    .eq("profile_status", "en_cours");
  if (upd.error) throw new Error(`finalizeProfile : ${upd.error.message}`);
  await service.from("events").insert({
    workspace_id: run.workspaceId,
    actor_id: null,
    type: "audit.profile_completed",
    payload: {
      audit_id: run.id,
      pages: data.pages.total,
      priority: data.pages.priority,
      gap: data.gap.count,
      cost_usd: profileCostUsd,
    },
  });
  logger.info("profil de liens terminé", { auditId: run.id, costUsd: profileCostUsd });
  return { profileCostUsd };
}

export async function failProfile(service: Client, auditId: string, message: string) {
  await service
    .from("audits")
    .update({
      profile_status: "echoue",
      profile_error: message.slice(0, 500),
      profile_finished_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .in("profile_status", ["confirme", "en_cours"]);
}
