import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState, SendEvent } from "@/features/audits/service";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { FunnelStats, QualInput, ResourceYield } from "./funnel";
import { loadQualificationInput, toRow, type QualRunRow } from "./run";
import { AUTO_LIMITS, CAMPAIGN_JUDGE_USD, failBackground } from "./background";
import { countStock, MORE_LIMITS, STOCK_REASONS } from "./reserve";
import type { QualCandidate, QualContext, QualResult } from "./types";

export { countStock, MORE_LIMITS, STOCK_REASONS };

type Client = SupabaseClient<Database>;
const M = t.targets.more;

export const MORE_EVENT = "audit/qualification.more.requested";

/**
 * Demande la lecture d'un lot du stock. `supabase` porte les droits de l'utilisateur (il doit voir
 * l'analyse) ; l'écriture et l'événement passent par le client de service. Une demande déjà en cours
 * n'en lance pas une seconde.
 */
export async function requestMore(
  supabase: Client,
  getServiceClient: () => Client,
  auditId: string,
  sendEvent: SendEvent,
): Promise<AuditActionState> {
  const { data: run } = await supabase
    .from("qualification_runs")
    .select("id, status, more_status, auto_status")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (!run || run.status !== "termine") return { status: "error", message: M.notReady };
  if (run.more_status === "demande" || run.more_status === "en_cours") {
    return { status: "ok", auditId, message: M.already };
  }
  // La lecture automatique enchaîne les lots : un clic entre deux lots ne doit jamais en lancer un second.
  if (run.auto_status === "en_cours") return { status: "ok", auditId, message: M.autoRunning };
  if ((await countStock(supabase, run.id)) === 0) return { status: "error", message: M.empty };
  const at = new Date().toISOString();
  const { data, error } = await getServiceClient()
    .from("qualification_runs")
    .update({ more_status: "demande", more_requested_at: at })
    .eq("id", run.id)
    .in("more_status", ["aucun", "termine", "echoue"])
    .neq("auto_status", "en_cours")
    .select("id");
  if (error) return { status: "error", message: M.failed };
  if (!data?.length) return { status: "ok", auditId, message: M.already };
  try {
    await sendEvent({
      id: `qualification-more-${auditId}-${at}`,
      name: MORE_EVENT,
      data: { auditId },
    });
  } catch {
    await getServiceClient()
      .from("qualification_runs")
      .update({ more_status: "echoue" })
      .eq("id", run.id);
    return { status: "error", auditId, message: M.failed };
  }
  return { status: "ok", auditId, message: M.started };
}

export interface MoreRun extends QualRunRow {
  /** Rendement déjà mesuré par source, pour composer le premier lot. */
  priorYield: Record<string, { read: number; relevant: number }>;
  /** Rendement et décisions déjà pris par ressource comparable (MC.6b) : une ressource abandonnée le reste. */
  priorResources?: Record<string, ResourceYield>;
  /** Durée maximale de la lecture de ce lot (ms) ; 5 minutes si absent. */
  maxReadMs?: number;
  /** Lecture automatique : numéro du lot et début de la chaîne. */
  auto?: { lot: number; startedAt: string } | null;
}

/** demande -> en_cours (idempotent pour une nouvelle tentative). Null si rien n'est demandé. */
export async function beginMore(
  service: Client,
  auditId: string,
  auto?: { lot: number } | null,
  now: Date = new Date(),
): Promise<MoreRun | null> {
  const { data: row, error } = await service
    .from("qualification_runs")
    .select("*")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginMore : ${error.message}`);
  if (!row || row.status !== "termine") return null;
  // Lot automatique : seulement si la chaîne est en cours et que c'est bien le lot attendu (un
  // événement rejoué ou en retard ne relance jamais un lot déjà fait).
  if (auto && (row.auto_status !== "en_cours" || row.auto_lots !== auto.lot - 1)) return null;
  if (row.more_status === "demande") {
    const { error: uErr } = await service
      .from("qualification_runs")
      .update({ more_status: "en_cours" })
      .eq("id", row.id)
      .eq("more_status", "demande");
    if (uErr) throw new Error(`beginMore : ${uErr.message}`);
  } else if (row.more_status !== "en_cours") return null;
  const { data: audit } = await service
    .from("audits")
    .select("cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  const stats = (row.stats ?? {}) as Partial<FunnelStats>;
  const priorYield: MoreRun["priorYield"] = {};
  for (const [src, y] of Object.entries(stats.bySource ?? {})) {
    priorYield[src] = { read: y.read, relevant: y.relevant };
  }
  const plan = (row.plan ?? {}) as { model?: string };
  const startedAt = row.auto_started_at;
  // Plafonds durs de l'arrière-plan : ce qui reste du budget total et du temps total.
  const budgetUsd = auto
    ? Math.min(
        MORE_LIMITS.budgetUsd,
        Math.max(0, AUTO_LIMITS.budgetUsd - Number(row.auto_cost_usd)),
        // MC.6f : budget de la campagne entière (0,50 USD) moins tout ce qui est déjà dépensé.
        Math.max(0, CAMPAIGN_JUDGE_USD - Number(row.actual_cost_usd)),
      )
    : MORE_LIMITS.budgetUsd;
  const maxReadMs =
    auto && startedAt
      ? Math.min(
          MORE_LIMITS.maxReadMs,
          Math.max(0, AUTO_LIMITS.maxMs - (now.getTime() - Date.parse(startedAt))),
        )
      : MORE_LIMITS.maxReadMs;
  return {
    id: row.id,
    auditId,
    collectionId: row.collection_id,
    workspaceId: row.workspace_id,
    siteId: row.site_id,
    budgetUsd,
    maxReadMs,
    auto: auto && startedAt ? { lot: auto.lot, startedAt } : null,
    model: plan.model ?? "",
    auditCapUsd: Number(audit?.cost_cap_usd ?? 0),
    priorYield,
    priorResources: stats.byResource ?? {},
  };
}

/** Contexte et candidats EN STOCK seulement (les autres ont déjà leur verdict). */
export async function loadMoreInput(
  service: Client,
  run: MoreRun,
): Promise<{ ctx: QualContext; candidates: QualCandidate[] } | null> {
  const loaded = await loadQualificationInput(service, run.auditId);
  if (!loaded) return null;
  const stock = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from("qualified_targets")
      .select("domain")
      .eq("run_id", run.id)
      .in("exclusion_reason", [...STOCK_REASONS])
      .range(from, from + 999);
    if (error) throw new Error(`loadMoreInput : ${error.message}`);
    for (const r of data ?? []) stock.add(r.domain);
    if ((data ?? []).length < 1000) break;
  }
  const bare = (d: string) => d.toLowerCase().replace(/^www\./, "");
  return {
    ctx: loaded.ctx,
    candidates: loaded.candidates.filter((c) => stock.has(c.domain) || stock.has(bare(c.domain))),
  };
}

export function toMoreInput(
  run: MoreRun,
  loaded: { ctx: QualContext; candidates: QualCandidate[] },
): QualInput {
  return {
    workspaceId: run.workspaceId,
    auditId: run.auditId,
    ctx: loaded.ctx,
    candidates: loaded.candidates,
    budgetUsd: run.budgetUsd,
    model: run.model,
    tuning: {
      targetJudged: MORE_LIMITS.targetJudged,
      maxReadMs: run.maxReadMs ?? MORE_LIMITS.maxReadMs,
      preflightMax: MORE_LIMITS.preflightMax,
    },
    priorYield: run.priorYield,
    priorResources: run.priorResources,
  };
}

const add = (a: number | undefined, b: number | undefined) => (a ?? 0) + (b ?? 0);

/** Compteurs de l'analyse après un lot supplémentaire (pur). */
export function mergeStats(
  base: Partial<FunnelStats>,
  lot: FunnelStats,
  shortlist: number,
): Partial<FunnelStats> {
  const bySource = { ...(base.bySource ?? {}) };
  for (const [k, y] of Object.entries(lot.bySource ?? {})) {
    const cur = bySource[k];
    bySource[k] = cur
      ? {
          candidates: cur.candidates,
          read: cur.read + y.read,
          alive: cur.alive + y.alive,
          judged: cur.judged + y.judged,
          relevant: cur.relevant + y.relevant,
          shortlist: cur.shortlist + y.shortlist,
        }
      : y;
  }
  // Par ressource : le lot rend des compteurs CUMULÉS (il part de ceux de la base), sauf la liste courte.
  const byResource = { ...(base.byResource ?? {}) };
  for (const [k, y] of Object.entries(lot.byResource ?? {})) {
    byResource[k] = { ...y, shortlist: (byResource[k]?.shortlist ?? 0) + y.shortlist };
  }
  return {
    ...base,
    pagesRead: add(base.pagesRead, lot.pagesRead),
    alive: add(base.alive, lot.alive),
    judged: add(base.judged, lot.judged),
    relevant: add(base.relevant, lot.relevant),
    contactsSearched: add(base.contactsSearched, lot.contactsSearched),
    withContact: add(base.withContact, lot.withContact),
    llmCalls: add(base.llmCalls, lot.llmCalls),
    llmFailures: add(base.llmFailures, lot.llmFailures),
    costUsd: Math.round(add(base.costUsd, lot.costUsd) * 1e6) / 1e6,
    lots: add(base.lots, lot.lots),
    stock: lot.stock,
    shortlist,
    bySource,
    ...(Object.keys(byResource).length > 0 ? { byResource } : {}),
  };
}

/** Rang final de toute la liste : les cibles déjà livrées et les nouvelles, par score puis par domaine (pur). */
export function rankAll(
  existing: readonly { id: string; domain: string; score: number; rank: number | null }[],
  added: readonly { domain: string; score: number }[],
): { rankOf: Map<string, number>; changed: { id: string; rank: number }[]; total: number } {
  const fresh = new Set(added.map((a) => a.domain));
  const all = [
    ...existing
      .filter((e) => !fresh.has(e.domain))
      .map((e) => ({ ...e, id: e.id as string | null })),
    ...added.map((a) => ({ id: null, domain: a.domain, score: a.score, rank: null })),
  ].sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain));
  const rankOf = new Map<string, number>();
  const changed: { id: string; rank: number }[] = [];
  all.forEach((r, i) => {
    rankOf.set(r.domain, i + 1);
    if (r.id && r.rank !== i + 1) changed.push({ id: r.id, rank: i + 1 });
  });
  return { rankOf, changed, total: all.length };
}

/**
 * Range le lot. Chaque site traité REMPLACE sa ligne « en stock » en une seule écriture (jamais de
 * suppression préalable : au premier essai en production, une écriture refusée après la suppression
 * avait fait disparaître 82 sites de la réserve). Les cibles déjà livrées gardent leur identifiant et
 * leurs décisions ; le rang de toute la liste est calculé AVANT d'écrire (une cible livrée a toujours
 * un rang). Rejouable : un site qui n'est plus en stock n'est pas réécrit.
 */
export async function finalizeMore(
  service: Client,
  run: MoreRun,
  results: readonly QualResult[],
  stats: FunnelStats,
): Promise<{ added: number; shortlist: number; stock: number }> {
  const stock = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await service
      .from("qualified_targets")
      .select("domain")
      .eq("run_id", run.id)
      .in("exclusion_reason", [...STOCK_REASONS])
      .range(from, from + 999);
    if (error) throw new Error(`finalizeMore : ${error.message}`);
    for (const r of data ?? []) stock.add(r.domain);
    if ((data ?? []).length < 1000) break;
  }
  const processed = results.filter(
    (r) => r.exclusionReason !== "hors_budget_lecture" && stock.has(r.domain),
  );
  const { data: scored, error } = await service
    .from("qualified_targets")
    .select("id, domain, score, rank")
    .eq("run_id", run.id)
    .eq("status", "liste_courte")
    .limit(1000);
  if (error) throw new Error(`finalizeMore : ${error.message}`);
  const delivered = processed.filter((r) => r.status === "liste_courte" && r.score !== null);
  const ranking = rankAll(
    (scored ?? []).map((r) => ({
      id: r.id,
      domain: r.domain,
      score: Number(r.score),
      rank: r.rank,
    })),
    delivered.map((r) => ({ domain: r.domain, score: r.score! })),
  );
  for (let i = 0; i < processed.length; i += 200) {
    const rows = processed.slice(i, i + 200).map((r) => ({
      ...toRow(run, r),
      rank: r.status === "liste_courte" ? (ranking.rankOf.get(r.domain) ?? null) : null,
    }));
    const up = await service
      .from("qualified_targets")
      .upsert(rows, { onConflict: "run_id,domain" });
    if (up.error) throw new Error(`finalizeMore : ${up.error.message}`);
  }
  for (let i = 0; i < ranking.changed.length; i += 20) {
    const out = await Promise.all(
      ranking.changed
        .slice(i, i + 20)
        .map((c) => service.from("qualified_targets").update({ rank: c.rank }).eq("id", c.id)),
    );
    const failed = out.find((o) => o.error);
    if (failed?.error) throw new Error(`finalizeMore : ${failed.error.message}`);
  }
  const added = delivered.length;
  const { data: row } = await service
    .from("qualification_runs")
    .select("stats, actual_cost_usd")
    .eq("id", run.id)
    .maybeSingle();
  const merged = mergeStats((row?.stats ?? {}) as Partial<FunnelStats>, stats, ranking.total);
  const up = await service
    .from("qualification_runs")
    .update({
      more_status: "termine",
      more_stats: { ...stats, added } as unknown as Json,
      stats: merged as unknown as Json,
      actual_cost_usd: Math.round((Number(row?.actual_cost_usd ?? 0) + stats.costUsd) * 1e6) / 1e6,
    })
    .eq("id", run.id);
  if (up.error) throw new Error(`finalizeMore : ${up.error.message}`);
  return { added, shortlist: ranking.total, stock: stats.stock ?? 0 };
}

export async function failMore(service: Client, auditId: string, message: string): Promise<void> {
  const { error } = await service
    .from("qualification_runs")
    .update({ more_status: "echoue", more_stats: { error: message.slice(0, 300) } as Json })
    .eq("audit_id", auditId)
    .in("more_status", ["demande", "en_cours"]);
  if (error) logger.error("lot supplémentaire : échec non enregistré", { auditId });
  // Un lot automatique en échec arrête la chaîne : l'écran le dit, le bouton reste utilisable.
  await failBackground(service, auditId);
}
