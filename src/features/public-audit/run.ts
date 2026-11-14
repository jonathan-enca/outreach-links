import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateCompetitors, selectCompetitors, serpEntries } from "@/features/audits/discover";
import type { QueryEntries } from "@/features/audits/discover";
import { cleanBacklinks } from "@/features/backlinks/clean";
import { normalizeBacklinkItems, type StoredBacklink } from "@/features/backlinks/normalize";
import {
  brandStem,
  computeGap,
  estimateRequiredDomains,
  groupKeywordsByPage,
  median,
  type RankedKeyword,
} from "@/features/profile/compute";
import { totalCostForPublicAudit } from "@/lib/costs";
import { BudgetExceededError, type DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost, type EndpointInput } from "@/lib/dataforseo/endpoints";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import { FREE_LIMITS } from "./config";
import { computeScore } from "./score";
import type { PublicAuditErrorCode, PublicAuditResult } from "./types";

type Client = SupabaseClient<Database>;
type Dfs = Pick<
  DataForSeoClient,
  | "labsRankedKeywords"
  | "serpOrganicLive"
  | "backlinksSummary"
  | "backlinksBacklinks"
  | "backlinksReferringDomains"
>;

export const PUBLIC_AUDIT_EVENT = "public-audit/requested";
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface PublicRun {
  id: string;
  domain: string;
  queries: string[];
  queriesSource: "visiteur" | "auto";
}

const ids = (run: PublicRun) => ({ publicAuditId: run.id });

/** Plafond d'un audit gratuit : coût déjà engagé + estimation de l'appel, refusé avant tout appel payant. */
async function assertBudget(
  service: Client,
  run: PublicRun,
  key: Parameters<typeof estimateCost>[0],
  params: unknown,
): Promise<void> {
  const spent = await totalCostForPublicAudit(service, run.id);
  const next = estimateCost(key, params as never);
  if (spent + next > FREE_LIMITS.costCapUsd + 1e-9) {
    throw new BudgetExceededError(
      `Plafond de l'audit gratuit atteint (${spent} USD engagés + ${next} > ${FREE_LIMITS.costCapUsd} USD)`,
      next,
      FREE_LIMITS.costCapUsd,
    );
  }
}

/**
 * Étape 1 : en_attente -> en_cours (une exécution de plus). Idempotent pour les nouvelles
 * tentatives Inngest (déjà en_cours). Null si l'audit ne doit pas (ou plus) tourner.
 */
export async function beginPublicAudit(service: Client, id: string): Promise<PublicRun | null> {
  const { data: row, error } = await service
    .from("public_audits")
    .select("id, domain, queries, queries_source, status, attempts")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`beginPublicAudit : ${error.message}`);
  if (!row) return null;
  if (row.status === "en_attente") {
    if (row.attempts >= FREE_LIMITS.maxAttempts) return null;
    const { data, error: uErr } = await service
      .from("public_audits")
      .update({
        status: "en_cours",
        attempts: row.attempts + 1,
        started_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("id", id)
      .eq("status", "en_attente")
      .select("id");
    if (uErr) throw new Error(`beginPublicAudit : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (row.status !== "en_cours") {
    return null;
  }
  return {
    id: row.id,
    domain: row.domain,
    queries: row.queries,
    queriesSource: row.queries_source === "auto" ? "auto" : "visiteur",
  };
}

// ----- Étape 2 : mots-clés du site, pages à pousser, requêtes ----------------

export interface OwnKeywordsOut {
  ok: true;
  queries: string[];
  keywordsTotal: number | null;
  pagesRanked: number;
  pagesTop10: number;
  priorityPages: {
    url: string;
    avgPosition: number;
    bestPosition: number;
    totalVolume: number;
    keywords: { keyword: string; position: number; volume: number }[];
  }[];
}
export type StepFailure = { ok: false; code: PublicAuditErrorCode };

/** Requêtes déduites des mots-clés classés : plus gros volumes, hors marque, dans le top 30. */
export function deriveQueries(items: RankedKeyword[], domain: string): string[] {
  const stem = brandStem(domain);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of [...items].sort((a, b) => b.volume - a.volume)) {
    const kw = it.keyword.trim().toLowerCase();
    if (!kw || kw.length > 80 || it.position > 30 || seen.has(kw)) continue;
    if (stem.length >= 3 && kw.replace(/[^a-z0-9]/g, "").includes(stem)) continue;
    seen.add(kw);
    out.push(kw);
    if (out.length >= FREE_LIMITS.queries) break;
  }
  return out;
}

export async function collectOwnKeywords(
  service: Client,
  dfs: Pick<Dfs, "labsRankedKeywords">,
  run: PublicRun,
): Promise<OwnKeywordsOut | StepFailure> {
  const params = {
    target: run.domain,
    limit: FREE_LIMITS.rankedKeywords,
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

  let queries = run.queries;
  if (run.queriesSource === "auto" || queries.length === 0) {
    queries = deriveQueries(items, run.domain);
    if (queries.length === 0) return { ok: false, code: "aucun_mot_cle" };
    const upd = await service.from("public_audits").update({ queries }).eq("id", run.id);
    if (upd.error) throw new Error(`collectOwnKeywords : ${upd.error.message}`);
  }
  return {
    ok: true,
    queries,
    keywordsTotal: out.result?.total_count ?? null,
    pagesRanked: pages.length,
    pagesTop10: pages.filter((p) => p.bestPosition <= 10).length,
    priorityPages: pages
      .filter((p) => p.isPriority)
      .slice(0, FREE_LIMITS.pages)
      .map((p) => ({
        url: p.url,
        avgPosition: p.avgPosition,
        bestPosition: p.bestPosition,
        totalVolume: p.totalVolume,
        keywords: p.keywords.slice(0, 5),
      })),
  };
}

// ----- Étape 3 : SERP puis sélection des concurrents --------------------------

export async function collectSerp(
  service: Client,
  dfs: Pick<Dfs, "serpOrganicLive">,
  run: PublicRun,
  query: string,
): Promise<QueryEntries> {
  const params = { keyword: query, depth: FREE_LIMITS.serpDepth };
  await assertBudget(service, run, "serpOrganicLive", params);
  const out = await dfs.serpOrganicLive(params, ids(run));
  return { query, entries: serpEntries(out.result, FREE_LIMITS.serpDepth) };
}

export interface FreeCompetitor {
  domain: string;
  queriesCount: number;
  bestRank: number;
}

export function pickCompetitors(perQuery: QueryEntries[], domain: string): FreeCompetitor[] {
  const candidates = aggregateCompetitors(perQuery, { ownDomain: domain });
  return selectCompetitors(candidates, {
    maxCompetitors: FREE_LIMITS.competitors,
    minCompetitors: FREE_LIMITS.competitors,
  }).map((c) => ({ domain: c.domain, queriesCount: c.queriesCount, bestRank: c.bestRank }));
}

// ----- Étape 4 : liens des concurrents et du site -----------------------------

export interface CompetitorLinks {
  domain: string;
  referringDomains: number | null;
  rows: StoredBacklink[];
}

export async function collectCompetitorLinks(
  service: Client,
  dfs: Pick<Dfs, "backlinksSummary" | "backlinksBacklinks">,
  run: PublicRun,
  competitor: FreeCompetitor,
): Promise<CompetitorLinks> {
  const summaryParams: EndpointInput<"backlinksSummary"> = { target: competitor.domain };
  await assertBudget(service, run, "backlinksSummary", summaryParams);
  const summary = await dfs.backlinksSummary(summaryParams, ids(run));

  const listParams: EndpointInput<"backlinksBacklinks"> = {
    target: competitor.domain,
    limit: FREE_LIMITS.competitorBacklinks,
    mode: "one_per_domain",
  };
  await assertBudget(service, run, "backlinksBacklinks", listParams);
  const list = await dfs.backlinksBacklinks(listParams, ids(run));
  return {
    domain: competitor.domain,
    referringDomains: summary.result?.referring_domains ?? null,
    rows: normalizeBacklinkItems(list.result?.items, competitor.domain),
  };
}

export interface OwnLinks {
  total: number | null;
  domains: string[];
  partial: boolean;
}

export async function collectOwnLinks(
  service: Client,
  dfs: Pick<Dfs, "backlinksReferringDomains">,
  run: PublicRun,
): Promise<OwnLinks> {
  const params = { target: run.domain, limit: FREE_LIMITS.ownReferringDomains };
  await assertBudget(service, run, "backlinksReferringDomains", params);
  const out = await dfs.backlinksReferringDomains(params, ids(run));
  const domains = (out.result?.items ?? []).map((i) => i.domain.toLowerCase());
  const total = out.result?.total_count ?? (out.result ? domains.length : 0);
  return { total, domains, partial: total > domains.length };
}

// ----- Étape 5 : assemblage, score, enregistrement ---------------------------

export interface FinalizeInput {
  own: OwnKeywordsOut;
  ownLinks: OwnLinks;
  competitors: FreeCompetitor[];
  links: CompetitorLinks[];
}

/** Assemblage PUR du résultat (testable sans base ni réseau). */
export function buildResult(
  domain: string,
  input: FinalizeInput,
  now = new Date(),
): PublicAuditResult {
  const rows = input.links.flatMap((l) => l.rows);
  const kept = cleanBacklinks(rows, { language: "fr", ownDomain: domain })
    .filter((c) => c.reasons.length === 0)
    .map((c) => c.row);
  const gap = computeGap(
    input.ownLinks.domains,
    kept.map((r) => ({
      competitorDomain: r.competitorDomain,
      sourceDomain: r.sourceDomain,
      sourceUrl: r.sourceUrl,
      anchor: r.anchor,
      dofollow: r.dofollow,
      spamScore: r.spamScore,
      sourceRank: r.sourceRank,
    })),
    domain,
    1000,
  );
  const benchmarkMedian = median(
    input.links.map((l) => l.referringDomains).filter((n): n is number => n !== null),
  );
  const score = computeScore({
    ownReferringDomains: input.ownLinks.total,
    benchmarkMedian,
    pagesRanked: input.own.pagesRanked,
    pagesTop10: input.own.pagesTop10,
  });
  return {
    version: 1,
    generatedAt: now.toISOString(),
    queries: input.own.queries,
    site: {
      domain,
      referringDomains: input.ownLinks.total,
      referringDomainsPartial: input.ownLinks.partial,
      rankedKeywords: input.own.keywordsTotal,
      pagesRanked: input.own.pagesRanked,
      pagesTop10: input.own.pagesTop10,
    },
    competitors: input.competitors.map((c) => ({
      ...c,
      referringDomains: input.links.find((l) => l.domain === c.domain)?.referringDomains ?? null,
    })),
    benchmarkMedian,
    pages: input.own.priorityPages.map((p) => {
      // Ordre de grandeur hors liens déjà reçus par la page (inconnus dans la version gratuite).
      const needed = estimateRequiredDomains({
        pageReferringDomains: 0,
        benchmarkDomains: benchmarkMedian,
        avgPosition: p.avgPosition,
      });
      return {
        url: p.url,
        avgPosition: p.avgPosition,
        bestPosition: p.bestPosition,
        volume: p.totalVolume,
        keywords: p.keywords,
        neededLow: needed?.low ?? null,
        neededHigh: needed?.high ?? null,
        neededEstimated: needed?.estimated ?? null,
      };
    }),
    targets: gap.slice(0, FREE_LIMITS.targetsStored).map((g) => ({
      domain: g.domain,
      competitorsCount: g.competitorsCount,
      competitors: g.competitors,
      sampleUrl: g.sampleUrl,
      dofollow: g.dofollow,
    })),
    targetsTotal: gap.length,
    score: score
      ? {
          value: score.score,
          band: score.band,
          linkRatio: score.linkRatio,
          visibility: score.visibility,
        }
      : null,
  };
}

export async function finalizePublicAudit(
  service: Client,
  run: PublicRun,
  input: FinalizeInput,
): Promise<{ targetsTotal: number; score: number | null; costUsd: number }> {
  const result = buildResult(run.domain, input);
  const costUsd = r6(await totalCostForPublicAudit(service, run.id));
  const { data, error } = await service
    .from("public_audits")
    .update({
      status: "termine",
      result: result as unknown as Json,
      score: result.score?.value ?? null,
      cost_usd: costUsd,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .eq("status", "en_cours")
    .select("id");
  if (error) throw new Error(`finalizePublicAudit : ${error.message}`);
  if (!data?.length) logger.warn("audit gratuit déjà terminé ou modifié", { id: run.id });
  return { targetsTotal: result.targetsTotal, score: result.score?.value ?? null, costUsd };
}

/** Passe l'audit à "echoue" (depuis en_attente ou en_cours). Le coût déjà engagé est conservé. */
export async function failPublicAudit(
  service: Client,
  id: string,
  code: PublicAuditErrorCode,
  message?: string,
): Promise<void> {
  const costUsd = r6(await totalCostForPublicAudit(service, id).catch(() => 0));
  const { error } = await service
    .from("public_audits")
    .update({
      status: "echoue",
      error_code: code,
      error_message: message?.slice(0, 500) ?? null,
      cost_usd: costUsd,
      finished_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["en_attente", "en_cours"]);
  if (error) logger.error("failPublicAudit", { id, error: error.message });
}
