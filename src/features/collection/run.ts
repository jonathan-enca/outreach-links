import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { serpEntries } from "@/features/audits/discover";
import { getLatestBrandProfile } from "@/features/brand/service";
import { PLANNED_QUERY_LIST } from "./plan-schema";
import {
  BudgetExceededError,
  DataForSeoError,
  estimateCost,
  type ContentPageType,
  type DataForSeoClient,
} from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import { spendLimitsFor, assertCanSpend, type SpendLimits } from "./guard";
import {
  COLLECTION_LIMITS,
  contentCallUsd,
  intersectionPageUsd,
  phaseBudgetUsd,
  type CollectionPhase,
} from "./limits";
import {
  fromContent,
  fromSerp,
  intersectionCandidates,
  mergeCandidates,
  mergeIntersection,
  newDomains,
  readIntersection,
  shouldStopForYield,
  type IntersectionDomain,
} from "./normalize";
import type { CollectionPlan } from "./plan";
import type { CollectionContext, MergedCandidate, RawCandidate } from "./types";

type Client = SupabaseClient<Database>;
type Dfs = Pick<
  DataForSeoClient,
  "serpOrganicLive" | "backlinksDomainIntersection" | "contentAnalysisSearch"
>;

export const COLLECTION_EVENT = "audit/collection.requested";
const INSERT_CHUNK = 400;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const collectionPlanSchema = z.object({
  intersectionTargets: z.array(z.string()).max(20),
  serp: PLANNED_QUERY_LIST,
  mentionSerp: PLANNED_QUERY_LIST,
  mentionKeywords: z.array(z.string()).max(5),
  content: z
    .array(
      z.object({
        keyword: z.string().min(2),
        pageType: z.enum(["ecommerce", "news", "blogs", "message-boards", "organization"]),
      }),
    )
    .max(20),
});

export interface CollectionRun {
  /** Identifiant de la ligne candidate_collections. */
  id: string;
  auditId: string;
  workspaceId: string;
  siteId: string;
  ctx: CollectionContext;
  plan: CollectionPlan;
  limits: SpendLimits;
  targetUsd: number;
}

/**
 * confirme -> en_cours (idempotent, reprise d'un job interrompu : en_cours reste en_cours). Null si la
 * collecte ne doit pas être exécutée. Le plan lu est celui FIGÉ à la confirmation.
 */
export async function beginCollection(
  service: Client,
  auditId: string,
): Promise<CollectionRun | null> {
  const { data: row, error } = await service
    .from("candidate_collections")
    .select("*")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginCollection : ${error.message}`);
  if (!row) return null;
  if (row.status === "confirme") {
    const { data, error: uErr } = await service
      .from("candidate_collections")
      .update({ status: "en_cours", started_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginCollection : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (row.status !== "en_cours") {
    return null;
  }
  const plan = collectionPlanSchema.safeParse(row.plan);
  if (!plan.success) throw new Error("beginCollection : plan de collecte illisible");

  const { data: audit, error: aErr } = await service
    .from("audits")
    .select("id, cost_cap_usd, sites(id, domain, language, niche, target_keywords)")
    .eq("id", auditId)
    .maybeSingle();
  if (aErr) throw new Error(`beginCollection : ${aErr.message}`);
  const site = audit?.sites as unknown as {
    id: string;
    domain: string;
    language: string;
    niche: string | null;
    target_keywords: string[];
  } | null;
  if (!audit || !site) return null;

  const [comp, profile] = await Promise.all([
    service.from("competitors").select("domain").eq("audit_id", auditId),
    getLatestBrandProfile(service, site.id),
  ]);
  if (comp.error) throw new Error(`beginCollection : ${comp.error.message}`);
  return {
    id: row.id,
    auditId,
    workspaceId: row.workspace_id,
    siteId: site.id,
    ctx: {
      ownDomain: site.domain,
      competitorDomains: (comp.data ?? []).map((c) => c.domain),
      language: site.language,
      theme: site.niche ?? "",
      nameVariants: profile?.profile.name_variants ?? [],
      targetKeywords: site.target_keywords,
    },
    plan: plan.data as CollectionPlan,
    limits: spendLimitsFor(auditId, Number(audit.cost_cap_usd)),
    targetUsd: Number(row.target_usd),
  };
}

/** Résultat d'un appel (= un step Inngest). Sérialisable. */
export interface StepOutcome {
  phase: CollectionPhase;
  label: string;
  raws: RawCandidate[];
  /** Recoupement : domaines agrégés par page (le filtre « ≥ 2 concurrents » se fait après fusion des pages). */
  intersection: IntersectionDomain[];
  costUsd: number;
  cacheHit: boolean;
  rows: number;
  /** Vrai si un plafond dur a empêché l'appel (rien n'a été facturé). */
  blocked: boolean;
  /** Vrai si le fournisseur a refusé l'appel deux fois (erreur de tâche) : la requête est sautée. */
  failed?: boolean;
}

/**
 * Erreur de TÂCHE du fournisseur (ex. 40101 « Internal SE Server Error », constaté au run réel du
 * 16/11/2026, transitoire) : une nouvelle tentative, puis la requête est sautée et comptée ; elle ne
 * fait jamais échouer toute la collecte. Les autres erreurs (réseau, authentification) remontent.
 */
async function withTaskRetry<T>(fn: () => Promise<T>): Promise<T | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof DataForSeoError) || e.kind !== "task") throw e;
      logger.warn("collecte : erreur de tâche du fournisseur", { code: e.code, attempt });
      if (attempt >= 1) return null;
    }
  }
}

const failedOutcome = (phase: CollectionPhase, label: string): StepOutcome => ({
  ...blockedOutcome(phase, label),
  blocked: false,
  failed: true,
});

const blockedOutcome = (phase: CollectionPhase, label: string): StepOutcome => ({
  phase,
  label,
  raws: [],
  intersection: [],
  costUsd: 0,
  cacheHit: false,
  rows: 0,
  blocked: true,
});

async function guarded(service: Client, run: CollectionRun, estimateUsd: number): Promise<boolean> {
  try {
    await assertCanSpend(service, run.limits, estimateUsd);
    return true;
  } catch (e) {
    if (e instanceof BudgetExceededError) {
      logger.warn("collecte : plafond dur, appel non lancé", {
        auditId: run.auditId,
        reason: e.message,
      });
      return false;
    }
    throw e;
  }
}

const callOpts = (run: CollectionRun) => ({ workspaceId: run.workspaceId, auditId: run.auditId });

/** Une page du recoupement des concurrents (mode partiel : domaines qui lient au moins un concurrent). */
export async function runIntersectionPage(
  deps: { dfs: Dfs; service: Client },
  run: CollectionRun,
  page: number,
): Promise<StepOutcome> {
  const L = COLLECTION_LIMITS.intersection;
  const label = `intersection-${page + 1}`;
  const est = intersectionPageUsd(L.rowsPerPage);
  if (!(await guarded(deps.service, run, est))) return blockedOutcome("intersection", label);
  const out = await withTaskRetry(() =>
    deps.dfs.backlinksDomainIntersection(
      {
        targets: run.plan.intersectionTargets,
        exclude_targets: [run.ctx.ownDomain],
        intersection_mode: "partial",
        limit: L.rowsPerPage,
        offset: page * L.rowsPerPage,
        // Mesuré au run réel : sans filtre, 85 % des lignes sont à autorité nulle (1 299 lignes, dont ~16
        // utiles). « autorité > 0 » sur au moins une cible et tri décroissant ramènent l'utile en tête.
        filters: intersectionFilters(run.plan.intersectionTargets.length),
        order_by: ["1.rank,desc"],
      },
      callOpts(run),
    ),
  );
  if (!out) return failedOutcome("intersection", label);
  return {
    phase: "intersection",
    label,
    raws: [],
    intersection: readIntersection(out.result, run.ctx),
    costUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
    rows: out.result?.items_count ?? out.result?.items?.length ?? 0,
    blocked: false,
  };
}

/** Une requête SERP top 30 (découverte ou marque). */
export async function runSerpQuery(
  deps: { dfs: Dfs; service: Client },
  run: CollectionRun,
  query: CollectionPlan["serp"][number],
  phase: "serp" | "mentions",
  index: number,
): Promise<StepOutcome> {
  const depth = COLLECTION_LIMITS.serp.depth;
  const label = `${phase}-serp-${index + 1}`;
  const est = estimateCost("serpOrganicLive", { keyword: query.q, depth });
  if (!(await guarded(deps.service, run, est))) return blockedOutcome(phase, label);
  const out = await withTaskRetry(() =>
    deps.dfs.serpOrganicLive({ keyword: query.q, depth }, callOpts(run)),
  );
  if (!out) return failedOutcome(phase, label);
  const entries = serpEntries(out.result, depth);
  return {
    phase,
    label,
    raws: fromSerp(query, entries, run.ctx),
    intersection: [],
    costUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
    rows: entries.length,
    blocked: false,
  };
}

/** Un appel Content Analysis : un type de page sur un mot-clé, ou une expression de marque. */
export async function runContentCall(
  deps: { dfs: Dfs; service: Client },
  run: CollectionRun,
  call: { keyword: string; pageType: ContentPageType | null },
  phase: "content" | "mentions",
  index: number,
): Promise<StepOutcome> {
  const rows =
    phase === "mentions"
      ? COLLECTION_LIMITS.mentions.rowsPerCall
      : COLLECTION_LIMITS.content.rowsPerCall;
  const label = `${phase}-content-${index + 1}`;
  if (!(await guarded(deps.service, run, contentCallUsd(rows))))
    return blockedOutcome(phase, label);
  const out = await withTaskRetry(() =>
    deps.dfs.contentAnalysisSearch(
      {
        keyword: call.keyword,
        ...(call.pageType ? { page_type: [call.pageType] } : {}),
        search_mode: "one_per_domain",
        limit: rows,
        // Filtre serveur confirmé au run réel (100 % de pages françaises contre ~58 % sans filtre).
        filters: [
          ["language", "=", run.ctx.language],
          "and",
          ["spam_score", "<", COLLECTION_LIMITS.content.spamMax],
        ],
      },
      callOpts(run),
    ),
  );
  if (!out) return failedOutcome(phase, label);
  return {
    phase,
    label,
    raws: fromContent(out.result, run.ctx, {
      keyword: call.keyword.replace(/^"|"$/g, ""),
      pageType: call.pageType,
      mention: phase === "mentions",
    }),
    intersection: [],
    costUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
    rows: out.result?.items_count ?? out.result?.items?.length ?? 0,
    blocked: false,
  };
}

/** Filtre serveur du recoupement : au moins une cible avec une autorité > 0 (une condition par cible). */
export function intersectionFilters(targets: number): unknown[] {
  const out: unknown[] = [];
  for (let i = 1; i <= targets; i++) {
    if (i > 1) out.push("or");
    out.push([`${i}.rank`, ">", 0]);
  }
  return out;
}

export type StopReason = "termine" | "rendement" | "budget_phase" | "plafond";

export interface PhaseStats {
  calls: number;
  cacheHits: number;
  costUsd: number;
  rows: number;
  newDomains: number;
  /** Appels refusés par le fournisseur deux fois (erreur de tâche), sautés. */
  failures: number;
  stoppedBy: StopReason;
}

export const emptyPhaseStats = (): PhaseStats => ({
  calls: 0,
  cacheHits: 0,
  costUsd: 0,
  rows: 0,
  newDomains: 0,
  failures: 0,
  stoppedBy: "termine",
});

/**
 * Accumule l'avancement de la collecte pendant le job : domaines déjà vus (rendement = domaines
 * NOUVEAUX), dépense par phase, bruts. Pure et sans effet de bord, donc rejouable à l'identique quand
 * Inngest rejoue le corps du job (les steps sont mémorisés).
 */
export class CollectionProgress {
  readonly seen = new Set<string>();
  readonly raws: RawCandidate[] = [];
  readonly intersectionPages: IntersectionDomain[][] = [];
  readonly stats: Record<CollectionPhase, PhaseStats> = {
    intersection: emptyPhaseStats(),
    mentions: emptyPhaseStats(),
    serp: emptyPhaseStats(),
    content: emptyPhaseStats(),
  };
  /** Nouveaux domaines de chaque requête de la phase `serp`, dans l'ordre (arrêt par rendement). */
  readonly serpYield: number[] = [];

  constructor(private readonly targetUsd: number) {}

  get costUsd(): number {
    return r6(Object.values(this.stats).reduce((s, p) => s + p.costUsd, 0));
  }

  /** Vrai si l'appel prévu dépasse le budget souple de sa phase (la phase s'arrête). */
  phaseOver(phase: CollectionPhase, estimateUsd: number): boolean {
    const budget = phaseBudgetUsd(phase, this.targetUsd / COLLECTION_LIMITS.shareOfTarget);
    return this.stats[phase].costUsd + estimateUsd > budget + 1e-9;
  }

  /** Vrai si les requêtes SERP récentes n'apportent presque plus de nouveaux domaines. */
  serpShouldStop(): boolean {
    return shouldStopForYield(this.serpYield);
  }

  add(o: StepOutcome): number {
    const s = this.stats[o.phase];
    s.calls++;
    if (o.cacheHit) s.cacheHits++;
    s.costUsd = r6(s.costUsd + o.costUsd);
    s.rows += o.rows;
    if (o.blocked) s.stoppedBy = "plafond";
    if (o.failed) s.failures++;
    if (o.intersection.length > 0) this.intersectionPages.push(o.intersection);
    const fresh = newDomains(o.raws, this.seen);
    for (const d of fresh) this.seen.add(d);
    this.raws.push(...o.raws);
    s.newDomains += fresh.length;
    if (o.phase === "serp") this.serpYield.push(fresh.length);
    return fresh.length;
  }

  /** Recoupement : agrège les pages et ne garde que les domaines liant ≥ 2 concurrents. */
  finishIntersection(): number {
    const merged = mergeIntersection(this.intersectionPages);
    const cands = intersectionCandidates(merged);
    const fresh = newDomains(cands, this.seen);
    for (const d of fresh) this.seen.add(d);
    this.raws.push(...cands);
    this.stats.intersection.newDomains = fresh.length;
    return fresh.length;
  }

  stop(phase: CollectionPhase, reason: StopReason): void {
    if (this.stats[phase].stoppedBy === "termine") this.stats[phase].stoppedBy = reason;
  }

  /** Raison globale : le premier arrêt non normal, sinon « termine ». */
  overallStop(): StopReason {
    const order: StopReason[] = ["plafond", "budget_phase", "rendement"];
    for (const r of order) {
      if (Object.values(this.stats).some((p) => p.stoppedBy === r)) return r;
    }
    return "termine";
  }
}

/** La 2e page du recoupement n'est demandée que si la 1re était pleine et riche en recoupements. */
export function wantsSecondIntersectionPage(first: StepOutcome, hits: number): boolean {
  const L = COLLECTION_LIMITS.intersection;
  return !first.blocked && first.rows >= L.rowsPerPage && hits >= L.secondPageMinHits;
}

export type StepRunner = <T>(id: string, fn: () => Promise<T>) => Promise<T>;

/**
 * Déroule le plan de collecte. `runStep` = `step.run` d'Inngest (un appel payant = un step, mémorisé,
 * donc rejouable sans repayer) ou une simple exécution directe dans les tests. Ordre : recoupement des
 * concurrents, marque, SERP des requêtes de l'univers (arrêt par rendement décroissant), Content
 * Analysis par type de page. Chaque phase a un budget souple ; les plafonds durs sont contrôlés avant
 * chaque appel (guard.ts). Aucun envoi, aucun achat, aucun appel LLM.
 */
export async function executeCollection(
  deps: () => { dfs: Dfs; service: Client },
  run: CollectionRun,
  runStep: StepRunner,
): Promise<CollectionProgress> {
  const progress = new CollectionProgress(run.targetUsd);
  const L = COLLECTION_LIMITS;

  // 1. Recoupement des concurrents : les domaines qui citent déjà plusieurs d'entre eux.
  if (run.plan.intersectionTargets.length >= 2) {
    const first = await runStep("intersection-1", () => runIntersectionPage(deps(), run, 0));
    progress.add(first);
    const hits = progress.intersectionPages
      .flat()
      .filter((d) => d.keys.length >= L.intersection.minCompetitors).length;
    if (wantsSecondIntersectionPage(first, hits)) {
      if (
        L.intersection.maxPages > 1 &&
        !progress.phaseOver("intersection", intersectionPageUsd(L.intersection.rowsPerPage))
      ) {
        progress.add(await runStep("intersection-2", () => runIntersectionPage(deps(), run, 1)));
      } else {
        progress.stop("intersection", "budget_phase");
      }
    }
    progress.finishIntersection();
  }

  // 2. Tactique « mentions de marque » : SERP de marque, puis Content Analysis sur chaque variante.
  for (const [i, q] of run.plan.mentionSerp.entries()) {
    const est = estimateCost("serpOrganicLive", { keyword: q.q, depth: L.serp.depth });
    if (progress.phaseOver("mentions", est)) {
      progress.stop("mentions", "budget_phase");
      break;
    }
    const out = await runStep(`mentions-serp-${i + 1}`, () =>
      runSerpQuery(deps(), run, q, "mentions", i),
    );
    progress.add(out);
    if (out.blocked) break;
  }
  for (const [i, keyword] of run.plan.mentionKeywords.entries()) {
    if (progress.phaseOver("mentions", contentCallUsd(L.mentions.rowsPerCall))) {
      progress.stop("mentions", "budget_phase");
      break;
    }
    const out = await runStep(`mentions-content-${i + 1}`, () =>
      runContentCall(deps(), run, { keyword, pageType: null }, "mentions", i),
    );
    progress.add(out);
    if (out.blocked) break;
  }

  // 3. SERP top 30 des requêtes de l'univers, dans l'ordre de rendement ; arrêt par rendement décroissant.
  for (const [i, q] of run.plan.serp.entries()) {
    const est = estimateCost("serpOrganicLive", { keyword: q.q, depth: L.serp.depth });
    if (progress.phaseOver("serp", est)) {
      progress.stop("serp", "budget_phase");
      break;
    }
    if (progress.serpShouldStop()) {
      progress.stop("serp", "rendement");
      break;
    }
    const out = await runStep(`serp-${i + 1}`, () => runSerpQuery(deps(), run, q, "serp", i));
    progress.add(out);
    if (out.blocked) break;
  }

  // 4. Content Analysis par type de page (blogs, organisations, forums, e-commerce).
  for (const [i, call] of run.plan.content.entries()) {
    if (progress.phaseOver("content", contentCallUsd(L.content.rowsPerCall))) {
      progress.stop("content", "budget_phase");
      break;
    }
    const out = await runStep(`content-${i + 1}`, () =>
      runContentCall(deps(), run, call, "content", i),
    );
    progress.add(out);
    if (out.blocked) break;
  }
  return progress;
}

/** Écrit les candidats fusionnés et clôt la collecte (idempotent : on repart d'une table propre). */
export async function finalizeCollection(
  service: Client,
  run: CollectionRun,
  progress: CollectionProgress,
): Promise<{ candidates: number; costUsd: number; stopReason: StopReason }> {
  const merged = mergeCandidates(progress.raws);
  const del = await service.from("collection_candidates").delete().eq("collection_id", run.id);
  if (del.error) throw new Error(`finalizeCollection : ${del.error.message}`);
  for (let i = 0; i < merged.length; i += INSERT_CHUNK) {
    const { error } = await service
      .from("collection_candidates")
      .insert(merged.slice(i, i + INSERT_CHUNK).map((c) => toRow(run, c)));
    if (error) throw new Error(`finalizeCollection : ${error.message}`);
  }
  const stopReason = progress.overallStop();
  const { error } = await service
    .from("candidate_collections")
    .update({
      status: "termine",
      actual_cost_usd: progress.costUsd,
      stats: progress.stats as unknown as Json,
      stop_reason: stopReason,
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (error) throw new Error(`finalizeCollection : ${error.message}`);
  return { candidates: merged.length, costUsd: progress.costUsd, stopReason };
}

function toRow(run: CollectionRun, c: MergedCandidate) {
  return {
    collection_id: run.id,
    audit_id: run.auditId,
    workspace_id: run.workspaceId,
    domain: c.domain,
    url: c.url,
    title: c.title ? c.title.slice(0, 300) : null,
    tactics: c.tactics,
    sources: c.sources as unknown as Json,
    competitors_count: c.competitorsCount,
    domain_rank: c.domainRank,
    spam_score: c.spamScore,
    page_type: c.pageType,
    signal_count: c.signalCount,
  };
}

/** Échec : message conservé, l'étape reste relançable (les réponses déjà payées sont en cache). */
export async function failCollection(
  service: Client,
  auditId: string,
  message: string,
): Promise<void> {
  const { error } = await service
    .from("candidate_collections")
    .update({
      status: "echoue",
      error_message: message.slice(0, 500),
      finished_at: new Date().toISOString(),
    })
    .eq("audit_id", auditId)
    .in("status", ["confirme", "en_cours"]);
  if (error) logger.error("collecte : échec non enregistré", { auditId, error: error.message });
}
