import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { siteResources } from "@/features/findings/run";
import { getLatestBrandProfile } from "@/features/brand/service";
import { COLLECTION_SOURCES } from "@/features/collection/types";
import { TACTICS } from "@/features/queries/schema";
import { pisteFromTactics } from "@/features/targets/tracking";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { FunnelStats, QualInput } from "./funnel";
import { QUALIFY_LIMITS } from "./limits";
import { carriedUnreadDomains, type PriorVerdict } from "./reserve";
import type { QualCandidate, QualContext, QualResult } from "./types";

type Client = SupabaseClient<Database>;

export const QUALIFICATION_EVENT = "audit/qualification.requested";
const INSERT_CHUNK = 300;
const MAX_CANDIDATES = 5_000;

const sourceSchema = z.object({
  source: z.enum(COLLECTION_SOURCES),
  query: z.string().nullable().catch(null),
  persona: z.string().nullable().catch(null),
  rank: z.number().nullable().catch(null),
  pageType: z.string().nullable().catch(null),
});

export interface QualRunRow {
  id: string;
  auditId: string;
  collectionId: string;
  workspaceId: string;
  siteId: string;
  budgetUsd: number;
  model: string;
  auditCapUsd: number;
}

/** Contexte de qualification lu en base (site, profil, concurrents, exclusions) et candidats bruts. */
export async function loadQualificationInput(
  service: Client,
  auditId: string,
): Promise<{
  ctx: QualContext;
  candidates: QualCandidate[];
  collectionId: string;
  workspaceId: string;
  siteId: string;
} | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select("id, workspace_id, sites(id, domain, language, niche)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`loadQualificationInput : ${error.message}`);
  const site = audit?.sites as unknown as {
    id: string;
    domain: string;
    language: string;
    niche: string | null;
  } | null;
  if (!audit || !site) return null;
  const { data: col } = await service
    .from("candidate_collections")
    .select("id, status")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (!col || col.status !== "termine") return null;

  const [cands, comps, profile, sup] = await Promise.all([
    service
      .from("collection_candidates")
      .select(
        "domain, url, title, tactics, sources, competitors_count, domain_rank, spam_score, page_type, signal_count, language, niveau",
      )
      .eq("collection_id", col.id)
      .limit(MAX_CANDIDATES),
    service.from("competitors").select("domain").eq("audit_id", auditId),
    getLatestBrandProfile(service, site.id),
    service
      .from("suppressions")
      .select("domain, email, workspace_id")
      .or(`workspace_id.eq.${audit.workspace_id},workspace_id.is.null`)
      .limit(5000),
  ]);
  if (cands.error) throw new Error(`loadQualificationInput : ${cands.error.message}`);

  const candidates: QualCandidate[] = (cands.data ?? []).map(toCandidate);
  // Réserve du site : les sites trouvés dans une analyse passée et jamais lus reviennent ici, sans relecture
  // de ce qui a déjà été lu. Ils sont lus ou restent en stock selon le budget de cette analyse.
  candidates.push(
    ...(await loadCarriedCandidates(
      service,
      site.id,
      auditId,
      new Set(candidates.map((c) => c.domain)),
      MAX_CANDIDATES - candidates.length,
    )),
  );

  const contacted = await service.rpc("domains_contacted_elsewhere", {
    p_workspace: audit.workspace_id,
    p_domains: candidates.map((c) => c.domain),
    p_days: QUALIFY_LIMITS.contactedWindowDays,
  });
  if (contacted.error) throw new Error(`loadQualificationInput : ${contacted.error.message}`);

  const p = profile?.profile;
  const resources = siteResources(site.domain, p);

  return {
    collectionId: col.id,
    workspaceId: audit.workspace_id,
    siteId: site.id,
    candidates,
    ctx: {
      ownDomain: site.domain,
      competitorDomains: (comps.data ?? []).map((c) => c.domain),
      language: site.language,
      theme: site.niche ?? "",
      brandName: p?.name_variants[0] ?? site.domain,
      activity: p?.activity ?? site.niche ?? "",
      audience: p?.audience ?? [],
      resources,
      contactedElsewhere: ((contacted.data as string[] | null) ?? []).map(String),
      suppressedDomains: (sup.data ?? []).flatMap((s) =>
        s.domain ? [s.domain.toLowerCase()] : [],
      ),
      suppressedEmails: (sup.data ?? []).flatMap((s) => (s.email ? [s.email.toLowerCase()] : [])),
    },
  };
}

type CandidateRow = Pick<
  Database["public"]["Tables"]["collection_candidates"]["Row"],
  | "domain"
  | "url"
  | "title"
  | "tactics"
  | "sources"
  | "competitors_count"
  | "domain_rank"
  | "spam_score"
  | "page_type"
  | "signal_count"
  | "language"
  | "niveau"
>;

/** Ligne de collecte -> candidat de qualification. */
function toCandidate(r: CandidateRow): QualCandidate {
  return {
    domain: r.domain,
    url: r.url,
    title: r.title,
    tactics: (r.tactics ?? []).filter((x): x is (typeof TACTICS)[number] =>
      (TACTICS as readonly string[]).includes(x),
    ),
    sources: z.array(sourceSchema).catch([]).parse(r.sources),
    competitorsCount: r.competitors_count,
    domainRank: r.domain_rank === null ? null : Number(r.domain_rank),
    spamScore: r.spam_score === null ? null : Number(r.spam_score),
    pageType: r.page_type,
    signalCount: r.signal_count,
    language: r.language,
    niveau: r.niveau,
  };
}

/**
 * Sites de la réserve d'un site, repris d'une analyse passée (pur hors lectures en base) : seuls les sites
 * dont tous les verdicts passés sont « hors_budget_lecture » (jamais lus), absents de la collecte courante.
 * Chaque site garde la ligne de collecte la plus récente qui le contient.
 */
export async function loadCarriedCandidates(
  service: Client,
  siteId: string,
  auditId: string,
  current: ReadonlySet<string>,
  room: number,
): Promise<QualCandidate[]> {
  if (room <= 0) return [];
  const { data: prev, error } = await service
    .from("qualification_runs")
    .select("id, collection_id, created_at")
    .eq("site_id", siteId)
    .neq("audit_id", auditId)
    .eq("status", "termine")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`loadCarriedCandidates : ${error.message}`);
  if (!prev?.length) return [];
  const runIds = prev.map((r) => r.id);
  const verdicts: PriorVerdict[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: vErr } = await service
      .from("qualified_targets")
      .select("domain, exclusion_reason")
      .in("run_id", runIds)
      .order("id")
      .range(from, from + 999);
    if (vErr) throw new Error(`loadCarriedCandidates : ${vErr.message}`);
    for (const r of data ?? [])
      verdicts.push({ domain: r.domain, exclusionReason: r.exclusion_reason });
    if ((data ?? []).length < 1000) break;
  }
  const domains = carriedUnreadDomains(verdicts)
    .filter((d) => !current.has(d))
    .slice(0, room);
  if (!domains.length) return [];
  // Rang de chaque collecte : la plus récente d'abord.
  const collections = prev.map((r) => r.collection_id);
  const rankOf = new Map(collections.map((c, i) => [c, i]));
  const found = new Map<string, { rank: number; row: CandidateRow }>();
  for (let i = 0; i < domains.length; i += 200) {
    const { data, error: cErr } = await service
      .from("collection_candidates")
      .select(
        "domain, url, title, tactics, sources, competitors_count, domain_rank, spam_score, page_type, signal_count, language, niveau, collection_id",
      )
      .in("collection_id", collections)
      .in("domain", domains.slice(i, i + 200));
    if (cErr) throw new Error(`loadCarriedCandidates : ${cErr.message}`);
    for (const r of data ?? []) {
      const rank = rankOf.get(r.collection_id) ?? Number.MAX_SAFE_INTEGER;
      const prevFound = found.get(r.domain);
      if (!prevFound || rank < prevFound.rank) found.set(r.domain, { rank, row: r });
    }
  }
  return [...found.values()]
    .map((f) => toCandidate(f.row))
    .sort((a, b) => a.domain.localeCompare(b.domain));
}

const planSchema = z.object({ model: z.string(), budgetUsd: z.number() });

/** confirme -> en_cours (idempotent : en_cours reste en_cours pour une reprise). Null sinon. */
export async function beginQualification(
  service: Client,
  auditId: string,
): Promise<QualRunRow | null> {
  const { data: row, error } = await service
    .from("qualification_runs")
    .select("*")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginQualification : ${error.message}`);
  if (!row) return null;
  if (row.status === "confirme") {
    const { data, error: uErr } = await service
      .from("qualification_runs")
      .update({ status: "en_cours", started_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginQualification : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (row.status !== "en_cours") return null;
  const plan = planSchema.safeParse(row.plan);
  if (!plan.success) throw new Error("beginQualification : plan illisible");
  const { data: audit } = await service
    .from("audits")
    .select("cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  return {
    id: row.id,
    auditId,
    collectionId: row.collection_id,
    workspaceId: row.workspace_id,
    siteId: row.site_id,
    budgetUsd: Number(row.budget_usd),
    model: plan.data.model,
    auditCapUsd: Number(audit?.cost_cap_usd ?? 0),
  };
}

export function toInput(
  run: QualRunRow,
  loaded: { ctx: QualContext; candidates: QualCandidate[] },
): QualInput {
  return {
    workspaceId: run.workspaceId,
    auditId: run.auditId,
    ctx: loaded.ctx,
    candidates: loaded.candidates,
    budgetUsd: run.budgetUsd,
    model: run.model,
  };
}

export function toRow(run: Pick<QualRunRow, "id" | "auditId" | "workspaceId">, r: QualResult) {
  return {
    run_id: run.id,
    audit_id: run.auditId,
    workspace_id: run.workspaceId,
    domain: r.domain,
    url: r.url,
    tactics: r.tactics.length ? r.tactics : ["inconnus"],
    piste: r.piste ?? pisteFromTactics(r.tactics),
    niveau: r.niveau ?? 0,
    status: r.status,
    stage_reached: r.stageReached,
    exclusion_reason: r.exclusionReason,
    exclusion_detail: r.exclusionDetail?.slice(0, 300) ?? null,
    provisional_score: r.provisionalScore,
    platform_hosted: r.platformHosted,
    domain_rank: r.domainRank,
    competitors_count: r.competitorsCount,
    page: r.page as unknown as Json,
    site_type: r.judgement?.siteType ?? null,
    fit: r.judgement?.fit ?? null,
    judgement: r.judgement as unknown as Json,
    hook: r.judgement?.hook ?? null,
    contact_status: r.contact?.status ?? null,
    contact_email: r.contact?.email ?? null,
    contact_url: r.contact?.contactUrl ?? null,
    form_url: r.contact?.formUrl ?? null,
    sendable: r.contact?.sendable ?? false,
    score: r.score,
    score_parts: r.scoreParts as unknown as Json,
    rank: r.rank,
    request_lines: r.requestLines,
    why: r.why,
  };
}

/** Écrit tous les résultats (table propre) et clôt la qualification. */
export async function finalizeQualification(
  service: Client,
  run: QualRunRow,
  results: readonly QualResult[],
  stats: FunnelStats,
): Promise<{ shortlist: number; costUsd: number }> {
  const del = await service.from("qualified_targets").delete().eq("run_id", run.id);
  if (del.error) throw new Error(`finalizeQualification : ${del.error.message}`);
  for (let i = 0; i < results.length; i += INSERT_CHUNK) {
    const { error } = await service
      .from("qualified_targets")
      .insert(results.slice(i, i + INSERT_CHUNK).map((r) => toRow(run, r)));
    if (error) throw new Error(`finalizeQualification : ${error.message}`);
  }
  const { error } = await service
    .from("qualification_runs")
    .update({
      status: "termine",
      actual_cost_usd: stats.costUsd,
      stats: stats as unknown as Json,
      stop_reason: stats.stop,
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (error) throw new Error(`finalizeQualification : ${error.message}`);
  return { shortlist: stats.shortlist, costUsd: stats.costUsd };
}

export async function failQualification(
  service: Client,
  auditId: string,
  message: string,
): Promise<void> {
  const { error } = await service
    .from("qualification_runs")
    .update({
      status: "echoue",
      error_message: message.slice(0, 500),
      finished_at: new Date().toISOString(),
    })
    .eq("audit_id", auditId)
    .in("status", ["confirme", "en_cours"]);
  if (error)
    logger.error("qualification : échec non enregistré", { auditId, error: error.message });
}
