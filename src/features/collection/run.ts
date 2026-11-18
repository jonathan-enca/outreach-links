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
import { serpLocation } from "@/features/sites/market";
import { normalizeBacklinkItems } from "@/features/backlinks/normalize";
import { spendLimitsFor, assertCanSpend, type SpendLimits } from "./guard";
import {
  citationsCallUsd,
  COLLECTION_LIMITS,
  contentCallUsd,
  deadPagesCallUsd,
  intersectionPageUsd,
  phaseBudgetUsd,
  type CollectionPhase,
} from "./limits";
import {
  fromCitations,
  fromContent,
  fromDeadPages,
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
import type { LlmClient } from "@/lib/llm/client";
import { pickResources, RESOURCE_PICK_LIMITS, type ResourceCandidate } from "./resource-judge";
import { resourcesFromSearches, searchCandidates } from "./resources";
import type { CollectionContext, MergedCandidate, RawCandidate } from "./types";

type Client = SupabaseClient<Database>;
type Dfs = Pick<
  DataForSeoClient,
  "serpOrganicLive" | "backlinksDomainIntersection" | "contentAnalysisSearch" | "backlinksBacklinks"
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
  /** Concurrents dont on cherche les pages disparues (absent des plans figés avant le chantier D). */
  deadPages: z.array(z.string()).max(10).default([]),
  /** Ressources comparables (MC.6a). Absent des plans figés avant : aucune citation cherchée, coût inchangé. */
  citations: z
    .object({
      pool: z
        .array(
          z.object({
            domain: z.string(),
            referringDomains: z.number().nullable().default(null),
            sampleUrl: z.string().nullable().default(null),
          }),
        )
        // Le réservoir de candidats va jusqu'à `poolSize` (40) : un plafond plus bas rendait tout plan « illisible ».
        .max(COLLECTION_LIMITS.citations.poolSize)
        .default([]),
      resources: z.array(z.string()).max(12).default([]),
      max: z.number().int().min(0).max(12).default(0),
      skipped: z.array(z.object({ domain: z.string(), reason: z.string() })).default([]),
    })
    .default({ pool: [], resources: [], max: 0, skipped: [] }),
  /** Ce qui n'est pas lancé faute de chance de résultat (absent des plans figés avant le 18/11/2026). */
  skipped: z
    .object({
      deadPages: z.array(z.object({ domain: z.string(), reason: z.string() })).default([]),
      mentions: z.string().nullable().default(null),
    })
    .default({ deadPages: [], mentions: null }),
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
 * Contexte d'une collecte lu en base : site, concurrents, profil de marque (qui sert à choisir les ressources
 * comparables) et plafond d'audit. Partagé par la collecte et par la boule de neige (MC.6d).
 */
export async function loadCollectionContext(
  service: Client,
  auditId: string,
): Promise<{ siteId: string; ctx: CollectionContext; capUsd: number } | null> {
  const { data: audit, error: aErr } = await service
    .from("audits")
    .select("id, cost_cap_usd, sites(id, domain, language, country, niche, target_keywords)")
    .eq("id", auditId)
    .maybeSingle();
  if (aErr) throw new Error(`loadCollectionContext : ${aErr.message}`);
  const site = audit?.sites as unknown as {
    id: string;
    domain: string;
    language: string;
    country: string;
    niche: string | null;
    target_keywords: string[];
  } | null;
  if (!audit || !site) return null;

  const [comp, profile] = await Promise.all([
    service.from("competitors").select("domain").eq("audit_id", auditId),
    getLatestBrandProfile(service, site.id),
  ]);
  if (comp.error) throw new Error(`loadCollectionContext : ${comp.error.message}`);
  const ctx: CollectionContext = {
    ownDomain: site.domain,
    competitorDomains: (comp.data ?? []).map((c) => c.domain),
    language: site.language,
    country: site.country,
    theme: site.niche ?? "",
    nameVariants: profile?.profile.name_variants ?? [],
    targetKeywords: site.target_keywords,
    ...(profile
      ? {
          site: {
            domain: site.domain,
            theme: site.niche ?? "",
            activity: profile.profile.activity,
            offer: profile.profile.offer,
            audience: profile.profile.audience,
            pages: profile.profile.linkable_resources.map((r) => r.title).slice(0, 8),
          },
        }
      : {}),
  };
  return { siteId: site.id, ctx, capUsd: Number(audit.cost_cap_usd) };
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

  const loaded = await loadCollectionContext(service, auditId);
  if (!loaded) return null;
  return {
    id: row.id,
    auditId,
    workspaceId: row.workspace_id,
    siteId: loaded.siteId,
    ctx: loaded.ctx,
    plan: plan.data as CollectionPlan,
    limits: spendLimitsFor(auditId, loaded.capUsd),
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
  /** Vrai si le fournisseur a refusé l'appel après toutes les tentatives : la requête est « manquée ». */
  failed?: boolean;
  /** Durée de l'appel, tentatives comprises (ms) : mesure de la durée par chemin. */
  ms?: number;
  /** Recherche Google : vrai si les vraies adresses (`resolve_goto_urls`) ont été refusées et la recherche refaite sans. */
  gotoFallback?: boolean;
  /** Recherche Google : adresses encore approximatives (reconstruites du fil d'Ariane) dans ce résultat. */
  approxUrls?: number;
}

/** Mesure la durée d'un appel (tentatives et attentes comprises) et la range dans son résultat. */
async function timed(fn: () => Promise<StepOutcome>): Promise<StepOutcome> {
  const t0 = Date.now();
  const out = await fn();
  return { ...out, ms: Date.now() - t0 };
}

/** Attentes entre les tentatives d'un appel fournisseur (croissantes) ; réglables dans les tests. */
export const PROVIDER_RETRY = {
  delaysMs: [1500, 5000] as number[],
  /** Durée maximale d'un appel et de ses tentatives : au-delà, l'appel est manqué (un step Inngest tient en 300 s). */
  budgetMs: 200_000,
};
const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Panne qui peut passer en attendant : erreur de tâche, HTTP 5xx / 408 / 429, réseau ou délai dépassé. */
function isTransient(e: DataForSeoError): boolean {
  if (e.kind === "task") return true;
  if (e.kind !== "http") return false;
  return e.code === undefined || e.code >= 500 || e.code === 408 || e.code === 429;
}

/**
 * Erreur du FOURNISSEUR (erreur de tâche, HTTP 500, délai dépassé, réseau ; constatés au run réel du
 * 16/11/2026) : nouvelles tentatives avec attente croissante, puis l'appel est « manqué » (null) :
 * il est compté et la collecte continue avec ce qu'elle a. Les erreurs d'authentification, de
 * paramètres ou de solde (type « api ») et les bogues remontent : elles ne se règlent pas en attendant.
 */
export async function withProviderRetry<T>(fn: () => Promise<T>): Promise<T | null> {
  const delays = PROVIDER_RETRY.delaysMs;
  const t0 = Date.now();
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof DataForSeoError) || !isTransient(e)) throw e;
      logger.warn("collecte : erreur du fournisseur", { kind: e.kind, code: e.code, attempt });
      if (attempt >= delays.length || Date.now() - t0 > PROVIDER_RETRY.budgetMs) return null;
      await sleepMs(delays[attempt]!);
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

/** Ce que les appels « qui cite cette ressource » lisent d'une collecte (aussi utilisé par la boule de neige, MC.6d). */
export type CitationsRun = Pick<CollectionRun, "auditId" | "workspaceId" | "ctx" | "limits">;

async function guarded(
  service: Client,
  run: Pick<CollectionRun, "auditId" | "limits">,
  estimateUsd: number,
): Promise<boolean> {
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

const callOpts = (run: Pick<CollectionRun, "workspaceId" | "auditId">) => ({
  workspaceId: run.workspaceId,
  auditId: run.auditId,
});

/** Une page du recoupement des concurrents (mode partiel : domaines qui lient au moins un concurrent). */
export async function runIntersectionPage(
  deps: { dfs: Pick<Dfs, "backlinksDomainIntersection">; service: Client },
  run: CollectionRun,
  page: number,
): Promise<StepOutcome> {
  const L = COLLECTION_LIMITS.intersection;
  const label = `intersection-${page + 1}`;
  const est = intersectionPageUsd(L.rowsPerPage);
  if (!(await guarded(deps.service, run, est))) return blockedOutcome("intersection", label);
  const out = await withProviderRetry(() =>
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

/**
 * Pages disparues d'un concurrent qui reçoivent encore des liens (chantier D) : UN appel Backlinks
 * filtré sur les liens cassés, un lien par domaine source. Le fournisseur DÉCLARE le lien cassé ; la
 * preuve (404 / 410 constaté, lien présent sur la page) est établie plus tard, par une requête HTTP,
 * à l'étape des constats : rien n'est jamais déclaré mort sur la seule foi du fournisseur.
 */
export async function runDeadPagesCall(
  deps: { dfs: Pick<Dfs, "backlinksBacklinks">; service: Client },
  run: CollectionRun,
  competitor: string,
  index: number,
): Promise<StepOutcome> {
  const rows = COLLECTION_LIMITS.deadPages.rowsPerCall;
  const label = `morts-${index + 1}`;
  if (!(await guarded(deps.service, run, deadPagesCallUsd(rows)))) {
    return blockedOutcome("morts", label);
  }
  const out = await withProviderRetry(() =>
    deps.dfs.backlinksBacklinks(
      {
        target: competitor,
        limit: rows,
        mode: "one_per_domain",
        filters: [["url_to_status_code", "in", [404, 410]], "and", ["dofollow", "=", true]],
        order_by: ["rank,desc"],
      },
      callOpts(run),
    ),
  );
  if (!out) return failedOutcome("morts", label);
  const items = normalizeBacklinkItems(out.result?.items, competitor);
  const languages = new Map<string, string>();
  for (const it of (out.result?.items ?? []) as Record<string, unknown>[]) {
    if (typeof it.url_from === "string" && typeof it.page_from_language === "string") {
      languages.set(it.url_from.trim(), it.page_from_language);
    }
  }
  return {
    phase: "morts",
    label,
    raws: fromDeadPages(items, run.ctx, competitor, languages),
    intersection: [],
    costUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
    rows: out.result?.items_count ?? out.result?.items?.length ?? 0,
    blocked: false,
  };
}

/**
 * Une requête SERP top 30 (découverte ou marque). MC.1 : on demande d'abord les VRAIES adresses
 * (`resolve_goto_urls`) pour ne plus lire une page d'accueil ou une page approximative à la place de
 * l'article trouvé. Mesuré le 18/11/2026 : même prix, mais 25 à 45 s et des refus passagers du fournisseur ;
 * en cas de refus, la recherche est refaite SANS l'option (11 s) : les adresses sont alors reconstruites
 * du fil d'Ariane (approximatives, jamais présentées comme exactes).
 */
export async function runSerpQuery(
  deps: { dfs: Pick<Dfs, "serpOrganicLive">; service: Client },
  run: CollectionRun,
  query: CollectionPlan["serp"][number],
  phase: "serp" | "mentions",
  index: number,
): Promise<StepOutcome> {
  const depth = COLLECTION_LIMITS.serp.depth;
  const label = `${phase}-serp-${index + 1}`;
  const est = estimateCost("serpOrganicLive", { keyword: query.q, depth });
  if (!(await guarded(deps.service, run, est))) return blockedOutcome(phase, label);
  const base = { keyword: query.q, depth, ...serpLocation(run.ctx.country, run.ctx.language) };
  let gotoFallback = false;
  let out: Awaited<ReturnType<Dfs["serpOrganicLive"]>> | null = null;
  try {
    out = await deps.dfs.serpOrganicLive({ ...base, resolve_goto_urls: true }, callOpts(run));
  } catch (e) {
    if (!(e instanceof DataForSeoError) || !isTransient(e)) throw e;
    logger.warn("collecte : vraies adresses refusées, recherche refaite sans", {
      kind: e.kind,
      code: e.code,
    });
    gotoFallback = true;
  }
  if (gotoFallback)
    out = await withProviderRetry(() => deps.dfs.serpOrganicLive(base, callOpts(run)));
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
    gotoFallback,
    approxUrls: entries.filter((e) => e.urlExact === false).length,
  };
}

/**
 * Pages qui citent déjà UNE ressource comparable (MC.6a) : un appel Backlinks (une page par domaine, dans la
 * langue de la campagne, spam et autorité filtrés côté serveur, liens récents d'abord). Réglages de l'essai
 * MC.0b (`docs/mc0b-essai.md`). Chaque ligne est un candidat ; la lecture et le jugement viennent après.
 */
export async function runCitationsCall(
  deps: { dfs: Pick<Dfs, "backlinksBacklinks">; service: Client },
  run: CitationsRun,
  resource: string,
  index: number,
  resources: readonly string[],
): Promise<StepOutcome> {
  const L = COLLECTION_LIMITS.citations;
  const label = `citations-${index + 1}`;
  if (!(await guarded(deps.service, run, citationsCallUsd(L.rowsPerCall)))) {
    return blockedOutcome("citations", label);
  }
  const out = await withProviderRetry(() =>
    deps.dfs.backlinksBacklinks(
      {
        target: resource,
        limit: L.rowsPerCall,
        mode: "one_per_domain",
        exclude_internal_backlinks: true,
        backlinks_status_type: "live",
        filters: [
          ["page_from_language", "=", run.ctx.language],
          "and",
          ["backlink_spam_score", "<", L.spamMax],
          "and",
          ["domain_from_rank", ">", L.minDomainRank],
        ],
        order_by: ["first_seen,desc"],
      },
      callOpts(run),
    ),
  );
  if (!out) return failedOutcome("citations", label);
  const items = normalizeBacklinkItems(out.result?.items, resource);
  const meta = new Map<string, { language: string | null; title: string | null }>();
  for (const it of (out.result?.items ?? []) as Record<string, unknown>[]) {
    if (typeof it.url_from !== "string") continue;
    meta.set(it.url_from.trim(), {
      language: typeof it.page_from_language === "string" ? it.page_from_language : null,
      title: typeof it.page_from_title === "string" ? it.page_from_title : null,
    });
  }
  return {
    phase: "citations",
    label,
    raws: fromCitations(items, run.ctx, resource, resources, meta),
    intersection: [],
    costUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
    rows: out.result?.items_count ?? out.result?.items?.length ?? 0,
    blocked: false,
  };
}

/** Un appel Content Analysis : un type de page sur un mot-clé, ou une expression de marque. */
export async function runContentCall(
  deps: { dfs: Pick<Dfs, "contentAnalysisSearch">; service: Client },
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
  const out = await withProviderRetry(() =>
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
  /** Appels « manqués » : refusés par le fournisseur après toutes les tentatives, sautés. */
  failures: number;
  /** Durée cumulée des appels (ms) et durée réelle de la phase (somme des lots, plus long appel de chacun). */
  callMs: number;
  wallMs: number;
  stoppedBy: StopReason;
  /** Recherches Google refaites sans les vraies adresses (refus du fournisseur) et adresses restées approximatives (MC.1). */
  gotoFallbacks?: number;
  approxUrls?: number;
  /** Phase « citations » : ressources interrogées (MC.6a), qui les a choisies et pourquoi. */
  resources?: string[];
  resourcesBy?: "modele" | "concurrents";
  resourceReasons?: Record<string, string>;
  /** Coût du choix des ressources par le modèle (compris dans `costUsd`). */
  llmUsd?: number;
}

export const emptyPhaseStats = (): PhaseStats => ({
  calls: 0,
  cacheHits: 0,
  costUsd: 0,
  rows: 0,
  newDomains: 0,
  failures: 0,
  callMs: 0,
  wallMs: 0,
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
    morts: emptyPhaseStats(),
    serp: emptyPhaseStats(),
    content: emptyPhaseStats(),
    citations: emptyPhaseStats(),
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
    if (o.gotoFallback) s.gotoFallbacks = (s.gotoFallbacks ?? 0) + 1;
    if (o.approxUrls) s.approxUrls = (s.approxUrls ?? 0) + o.approxUrls;
    s.callMs += o.ms ?? 0;
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

  /** Coût hors fournisseur de données (appel du modèle) rattaché à une phase. */
  addExtraCost(phase: CollectionPhase, usd: number): void {
    const s = this.stats[phase];
    s.costUsd = r6(s.costUsd + usd);
    s.llmUsd = r6((s.llmUsd ?? 0) + usd);
  }

  /** Durée réelle d'un lot d'appels parallèles : celle du plus long. */
  addWall(phase: CollectionPhase, outcomes: readonly StepOutcome[]): void {
    this.stats[phase].wallMs += Math.max(0, ...outcomes.map((o) => o.ms ?? 0));
  }

  /** Appels manqués, toutes phases confondues. */
  get missed(): number {
    return Object.values(this.stats).reduce((n, p) => n + p.failures, 0);
  }

  get calls(): number {
    return Object.values(this.stats).reduce((n, p) => n + p.calls, 0);
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

/** Nombre d'appels exécutés en parallèle (docs : chantier A.3, lots de 5). */
export const COLLECTION_BATCH = 5;
/**
 * Recherches Google par lot (chantier H) : 40 requêtes garanties en lots de 5 prenaient plus de six
 * minutes (une recherche dure 10 à 40 s) ; par 14, trois lots suffisent.
 */
export const SERP_BATCH = 14;

/** Ce que la collecte raconte à l'écran après chaque lot (écrit une seule fois, dans un step). */
export interface CollectionReport {
  phase: CollectionPhase;
  /** Appels terminés, toutes phases (manqués compris). */
  done: number;
  /** Domaines distincts trouvés jusqu'ici. */
  found: number;
  /** Appels manqués jusqu'ici. */
  missed: number;
  /** Dernier exemple lisible du lot. */
  example: string | null;
}

export interface ExecuteOptions {
  batchSize?: number;
  /** Appelé dans un step mémorisé après chaque lot : jamais rejoué, jamais bloquant. */
  report?: (r: CollectionReport) => Promise<void>;
  /** Exemple lisible d'un résultat (requête cherchée, premier site). */
  example?: (o: StepOutcome) => string | null;
}

/**
 * Déroule le plan de collecte. `runStep` = `step.run` d'Inngest (un appel payant = un step, mémorisé,
 * donc rejouable sans repayer) ou une simple exécution directe dans les tests. Les appels d'une phase
 * sont indépendants : ils partent par lots de 5 en parallèle ; le budget de la phase et l'arrêt par
 * rendement décroissant sont évalués AVANT chaque lot ; les résultats sont ajoutés dans l'ordre du
 * plan (jamais dans l'ordre d'arrivée), donc un rejeu prend les mêmes décisions. Ordre des phases :
 * recoupement des concurrents, marque, SERP des requêtes de l'univers, Content Analysis par type de
 * page. Plafonds durs contrôlés avant chaque appel (guard.ts). Un appel que le fournisseur refuse
 * après toutes les tentatives est « manqué » : compté, jamais fatal. Aucun envoi, aucun achat.
 */
export async function executeCollection(
  deps: () => {
    dfs: Dfs;
    service: Client;
    llm?: LlmClient | null;
    /** Présentation des candidats au choix des ressources (MC.6b) : lecture des accueils ; absent = aucune. */
    describe?: (candidates: readonly ResourceCandidate[]) => Promise<ResourceCandidate[]>;
  },
  run: CollectionRun,
  runStep: StepRunner,
  opts: ExecuteOptions = {},
): Promise<CollectionProgress> {
  const progress = new CollectionProgress(run.targetUsd);
  const L = COLLECTION_LIMITS;
  const defaultSize = Math.max(1, opts.batchSize ?? COLLECTION_BATCH);
  const exampleOf = opts.example ?? (() => null);
  let batchNo = 0;

  const report = async (phase: CollectionPhase, outcomes: readonly StepOutcome[]) => {
    if (!opts.report) return;
    const example = outcomes
      .map((o) => (o.blocked || o.failed ? null : exampleOf(o)))
      .find(Boolean);
    const snapshot: CollectionReport = {
      phase,
      done: progress.calls,
      found: progress.seen.size,
      missed: progress.missed,
      example: example ?? null,
    };
    await runStep(`lot-${++batchNo}`, async () => {
      try {
        await opts.report!(snapshot);
      } catch (e) {
        logger.warn("collecte : progression non écrite", { error: (e as Error).message });
      }
      return { ok: true };
    });
  };

  /**
   * Une phase = une liste d'appels exécutés par lots. `estimate` sert au budget souple de la phase ;
   * `stopBefore` (rendement) est évalué avant chaque lot. Retourne les résultats dans l'ordre du plan.
   */
  async function phaseInBatches<I>(
    phase: CollectionPhase,
    items: readonly I[],
    spec: {
      estimate: (item: I) => number;
      call: (item: I, index: number) => Promise<StepOutcome>;
      /** Évalué avant chaque lot, avec l'index du premier appel du lot. */
      stopBefore?: (from: number) => StopReason | null;
      /** Taille de lot propre à la phase (défaut : celle de la collecte). */
      batch?: number;
    },
  ): Promise<void> {
    const size = Math.max(1, spec.batch ?? defaultSize);
    for (let from = 0; from < items.length;) {
      const why = spec.stopBefore?.(from);
      if (why) {
        progress.stop(phase, why);
        return;
      }
      // Combien d'appels de ce lot tiennent dans le budget souple de la phase ?
      let planned = 0;
      let spent = 0;
      const wanted = Math.min(size, items.length - from);
      for (const item of items.slice(from, from + size)) {
        const est = spec.estimate(item);
        if (progress.phaseOver(phase, spent + est)) break;
        spent += est;
        planned++;
      }
      if (planned === 0) {
        progress.stop(phase, "budget_phase");
        return;
      }
      const batch = items.slice(from, from + planned);
      // UN step par lot, appels en parallèle DANS le step : mesuré en production (17/11), un step par
      // appel coûtait autant d'allers-retours Inngest (859 s pour 440 s d'appels réels).
      const outcomes = await runStep(`${phase}-lot-${from + 1}`, () =>
        Promise.all(batch.map((item, j) => timed(() => spec.call(item, from + j)))),
      );
      for (const o of outcomes) progress.add(o);
      progress.addWall(phase, outcomes);
      await report(phase, outcomes);
      if (outcomes.some((o) => o.blocked)) return;
      from += planned;
      if (planned < wanted) {
        progress.stop(phase, "budget_phase");
        return;
      }
    }
  }

  // 1. Recoupement des concurrents : les domaines qui citent déjà plusieurs d'entre eux.
  if (run.plan.intersectionTargets.length >= 2) {
    const first = await runStep("intersection-1", () =>
      timed(() => runIntersectionPage(deps(), run, 0)),
    );
    progress.add(first);
    progress.addWall("intersection", [first]);
    const hits = progress.intersectionPages
      .flat()
      .filter((d) => d.keys.length >= L.intersection.minCompetitors).length;
    if (wantsSecondIntersectionPage(first, hits)) {
      if (
        L.intersection.maxPages > 1 &&
        !progress.phaseOver("intersection", intersectionPageUsd(L.intersection.rowsPerPage))
      ) {
        const second = await runStep("intersection-2", () =>
          timed(() => runIntersectionPage(deps(), run, 1)),
        );
        progress.add(second);
        progress.addWall("intersection", [second]);
      } else {
        progress.stop("intersection", "budget_phase");
      }
    }
    progress.finishIntersection();
    await report("intersection", [first]);
  }

  // 1 bis. Liens morts des concurrents (chantier D) : les pages disparues qui reçoivent encore des liens.
  await phaseInBatches("morts", run.plan.deadPages, {
    estimate: () => deadPagesCallUsd(L.deadPages.rowsPerCall),
    call: (competitor, i) => runDeadPagesCall(deps(), run, competitor, i),
  });

  // 2. Tactique « mentions de marque » : SERP de marque, puis Content Analysis sur chaque variante.
  await phaseInBatches("mentions", run.plan.mentionSerp, {
    estimate: (q) => estimateCost("serpOrganicLive", { keyword: q.q, depth: L.serp.depth }),
    call: (q, i) => runSerpQuery(deps(), run, q, "mentions", i),
  });
  await phaseInBatches("mentions", run.plan.mentionKeywords, {
    estimate: () => contentCallUsd(L.mentions.rowsPerCall),
    call: (keyword, i) => runContentCall(deps(), run, { keyword, pageType: null }, "mentions", i),
  });

  // 4 (lancé en avance). Content Analysis par type de page : indépendant des recherches Google et
  // long (deux minutes par appel), il part EN MÊME TEMPS qu'elles. Ses résultats ne touchent à rien
  // tant que les recherches ne sont pas finies (ajoutés ensuite, dans l'ordre du plan) : les
  // décisions de la phase précédente et le rejeu restent déterministes.
  const contentEarly = (async () => {
    const batches: StepOutcome[][] = [];
    let spent = 0;
    let stopped: StopReason | null = null;
    const items = run.plan.content;
    for (let from = 0; from < items.length;) {
      let planned = 0;
      let est = 0;
      const wanted = Math.min(defaultSize, items.length - from);
      for (let j = 0; j < wanted; j++) {
        const one = contentCallUsd(L.content.rowsPerCall);
        if (progress.phaseOver("content", spent + est + one)) break;
        est += one;
        planned++;
      }
      if (planned === 0) {
        stopped = "budget_phase";
        break;
      }
      const batch = items.slice(from, from + planned);
      const start = from;
      const outcomes = await runStep(`content-lot-${from + 1}`, () =>
        Promise.all(
          batch.map((call, j) =>
            timed(() => runContentCall(deps(), run, call, "content", start + j)),
          ),
        ),
      );
      batches.push(outcomes);
      spent += outcomes.reduce((n, o) => n + o.costUsd, 0);
      if (outcomes.some((o) => o.blocked)) break;
      from += planned;
      if (planned < wanted) {
        stopped = "budget_phase";
        break;
      }
    }
    return { batches, stopped };
  })();
  // Une panne des recherches Google ne doit pas laisser cette promesse sans gestionnaire.
  contentEarly.catch(() => undefined);

  // 3. SERP top 30 des requêtes de l'univers, dans l'ordre de rendement. Les requêtes GARANTIES des
  // types d'éditeurs (chantier H) passent toutes : l'arrêt par rendement décroissant ne s'applique
  // qu'aux suivantes.
  const guaranteed = run.plan.serp.filter((q) => q.guaranteed).length;
  await phaseInBatches("serp", run.plan.serp, {
    estimate: (q) => estimateCost("serpOrganicLive", { keyword: q.q, depth: L.serp.depth }),
    call: (q, i) => runSerpQuery(deps(), run, q, "serp", i),
    stopBefore: (from) => (from >= guaranteed && progress.serpShouldStop() ? "rendement" : null),
    batch: opts.batchSize ?? SERP_BATCH,
  });

  // 3 bis. Pages qui citent déjà une ressource comparable (MC.6a). Candidats : les concurrents de l'audit
  // (plan figé) et les sites vus sur les recherches par sujet (bruts de la phase SERP seulement : le résultat
  // ne dépend pas de l'ordre d'arrivée). Le petit modèle garde ceux qui proposent la même chose que le site ;
  // sans modèle ou en cas de panne, repli sans jugement sur les concurrents puis sur les sites vus plusieurs fois.
  const cites = run.plan.citations;
  if (cites.max > 0) {
    const poolDomains = cites.pool.map((p) => p.domain);
    const candidates: ResourceCandidate[] = [
      ...cites.pool.map((p) => ({
        domain: p.domain,
        title: null,
        url: p.sampleUrl,
        queries: 0,
        origin: "audit" as const,
        referringDomains: p.referringDomains,
      })),
      ...searchCandidates(
        progress.raws,
        poolDomains,
        run.ctx.language,
        Math.max(0, RESOURCE_PICK_LIMITS.maxCandidates - poolDomains.length),
      ),
    ];
    const picked = await runStep("citations-choix", async () => {
      const brief = run.ctx.site;
      const llm = deps().llm ?? null;
      if (!brief || !llm || candidates.length === 0) return { ok: false as const };
      if (!(await guarded(deps().service, run, RESOURCE_PICK_LIMITS.reservedUsd))) {
        return { ok: false as const };
      }
      // MC.6b : le modèle juge sur ce que chaque candidat dit de lui-même (titre et description de son
      // accueil, lecture gratuite), pas sur un simple nom de domaine.
      const describe = deps().describe;
      const described = describe ? await describe(candidates).catch(() => candidates) : candidates;
      const out = await pickResources({
        llm,
        site: brief,
        candidates: described,
        max: cites.max,
        language: run.ctx.language,
        workspaceId: run.workspaceId,
        auditId: run.auditId,
      });
      return out ? { ok: true as const, ...out } : { ok: false as const };
    });
    let resources: string[];
    if (picked.ok) {
      resources = picked.resources;
      progress.stats.citations.resourcesBy = "modele";
      progress.stats.citations.resourceReasons = picked.reasons;
      progress.addExtraCost("citations", picked.costUsd);
    } else {
      resources = [
        ...cites.resources,
        ...resourcesFromSearches(
          progress.raws,
          cites.resources,
          cites.max - cites.resources.length,
          run.ctx.language,
        ),
      ].slice(0, cites.max);
      progress.stats.citations.resourcesBy = "concurrents";
    }
    progress.stats.citations.resources = resources;
    await phaseInBatches("citations", resources, {
      estimate: () => citationsCallUsd(L.citations.rowsPerCall),
      call: (resource, i) => runCitationsCall(deps(), run, resource, i, resources),
    });
  }

  // 4 (suite). Les résultats de Content Analysis entrent maintenant, dans l'ordre du plan.
  const content = await contentEarly;
  for (const outcomes of content.batches) {
    for (const o of outcomes) progress.add(o);
    progress.addWall("content", outcomes);
    await report("content", outcomes);
  }
  if (content.stopped) progress.stop("content", content.stopped);
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

export function toRow(
  run: Pick<CollectionRun, "id" | "auditId" | "workspaceId">,
  c: MergedCandidate,
) {
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
    language: c.language ?? null,
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
