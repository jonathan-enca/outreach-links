import type { SupabaseClient } from "@supabase/supabase-js";
import { totalCostForAudit } from "@/lib/costs";
import { BudgetExceededError, type DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import { isPlanKey } from "@/features/audits/plans";
import { MAX_REFERRING_DOMAINS, SIZE_SPARES } from "./limits";
import { cleanBacklinks, computeStats, type CleanStats, type ExclusionReason } from "./clean";
import { normalizeBacklinkItems } from "./normalize";

type Client = SupabaseClient<Database>;
type BacklinkRow = Database["public"]["Tables"]["competitor_backlinks"]["Row"];

export const BACKLINKS_EVENT = "audit/backlinks.requested";
const PAGE = 1000;
const INSERT_CHUNK = 500;
const UPDATE_CHUNK = 200;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface BacklinksRun {
  id: string;
  workspaceId: string;
  domain: string;
  language: string;
  limit: number;
  costCapUsd: number;
  plan: string;
  competitors: { id: string; domain: string }[];
}

/** Étape 1 : confirme -> en_cours (idempotent). Null si l'audit ne doit pas être traité. */
export async function beginBacklinks(
  service: Client,
  auditId: string,
): Promise<BacklinksRun | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select("*, sites(domain, language)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginBacklinks : ${error.message}`);
  if (!audit || audit.status !== "termine" || !audit.backlinks_limit) return null;
  if (audit.backlinks_status === "confirme") {
    const { data, error: uErr } = await service
      .from("audits")
      .update({ backlinks_status: "en_cours", backlinks_started_at: new Date().toISOString() })
      .eq("id", auditId)
      .eq("backlinks_status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginBacklinks : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (audit.backlinks_status !== "en_cours") {
    return null;
  }
  const site = audit.sites as unknown as { domain: string; language: string } | null;
  if (!site) return null;
  const { data: comps, error: cErr } = await service
    .from("competitors")
    .select("id, domain")
    .eq("audit_id", auditId)
    .eq("selected", true)
    .order("score", { ascending: false });
  if (cErr) throw new Error(`beginBacklinks : ${cErr.message}`);
  return {
    id: audit.id,
    workspaceId: audit.workspace_id,
    domain: site.domain,
    language: site.language,
    limit: audit.backlinks_limit,
    costCapUsd: Number(audit.cost_cap_usd),
    plan: audit.plan,
    competitors: comps ?? [],
  };
}

export interface SizeFilterResult {
  competitors: { id: string; domain: string }[];
  excluded: { domain: string; referringDomains: number }[];
  replacedBy: string[];
  /** false si la mesure a été sautée (plafond de coût) ou a échoué : on garde la liste. */
  measured: boolean;
}

/**
 * MA.2 : mesure la taille des concurrents retenus (et de quelques remplaçants) en UNE requête
 * groupée, écarte ceux qui dépassent le seuil du plan et les remplace par les candidats
 * suivants (par score). Une taille inconnue ne prouve rien : le concurrent est gardé.
 * Appel payant : client DataForSEO (cost_ledger) après contrôle du plafond de l'audit.
 */
export async function filterCompetitorsBySize(
  service: Client,
  dfs: Pick<DataForSeoClient, "backlinksBulkReferringDomains">,
  run: BacklinksRun,
): Promise<SizeFilterResult> {
  const kept = run.competitors;
  const max = MAX_REFERRING_DOMAINS[isPlanKey(run.plan) ? run.plan : "gratuit"];
  const { data: spares, error } = await service
    .from("competitors")
    .select("id, domain")
    .eq("audit_id", run.id)
    .eq("selected", false)
    .eq("size_excluded", false)
    .order("score", { ascending: false })
    .limit(SIZE_SPARES);
  if (error) throw new Error(`filterCompetitorsBySize : ${error.message}`);
  const candidates = [...kept, ...(spares ?? [])];
  const targets = candidates.map((c) => c.domain);

  const spent = await totalCostForAudit(service, run.id);
  const next = estimateCost("backlinksBulkReferringDomains", { targets });
  if (spent + next > run.costCapUsd + 1e-9) {
    logger.warn("mesure de taille sautée : plafond de l'audit", { auditId: run.id });
    return { competitors: kept, excluded: [], replacedBy: [], measured: false };
  }
  const out = await dfs.backlinksBulkReferringDomains(
    { targets },
    { workspaceId: run.workspaceId, auditId: run.id },
  );
  const sizes = new Map<string, number>();
  for (const item of out.result?.items ?? []) {
    if (item.target && typeof item.referring_domains === "number") {
      sizes.set(item.target.toLowerCase().replace(/^www\./, ""), item.referring_domains);
    }
  }
  const sizeOf = (domain: string) => sizes.get(domain);
  const tooBig = (domain: string) => (sizeOf(domain) ?? 0) > max;

  const excluded: SizeFilterResult["excluded"] = [];
  const final: { id: string; domain: string }[] = [];
  for (const c of kept) {
    if (tooBig(c.domain)) excluded.push({ domain: c.domain, referringDomains: sizeOf(c.domain)! });
    else final.push(c);
  }
  const replacedBy: string[] = [];
  for (const c of spares ?? []) {
    if (final.length >= kept.length) break;
    if (!tooBig(c.domain)) {
      final.push(c);
      replacedBy.push(c.domain);
    }
  }

  // Écritures : taille connue, écartés (selected=false) et remplaçants (selected=true).
  for (const c of candidates) {
    const rd = sizeOf(c.domain);
    if (rd === undefined) continue;
    const upd = await service
      .from("competitors")
      .update({ referring_domains: rd, size_excluded: tooBig(c.domain) })
      .eq("id", c.id);
    if (upd.error) throw new Error(`filterCompetitorsBySize : ${upd.error.message}`);
  }
  const out1 = kept.filter((c) => !final.includes(c)).map((c) => c.id);
  if (out1.length) {
    const upd = await service.from("competitors").update({ selected: false }).in("id", out1);
    if (upd.error) throw new Error(`filterCompetitorsBySize : ${upd.error.message}`);
  }
  const in1 = final.filter((c) => !kept.includes(c)).map((c) => c.id);
  if (in1.length) {
    const upd = await service.from("competitors").update({ selected: true }).in("id", in1);
    if (upd.error) throw new Error(`filterCompetitorsBySize : ${upd.error.message}`);
  }
  if (excluded.length) {
    await service.from("events").insert({
      workspace_id: run.workspaceId,
      actor_id: null,
      type: "audit.competitors_size_filtered",
      payload: { audit_id: run.id, excluded, replaced_by: replacedBy, max },
    });
  }
  return { competitors: final, excluded, replacedBy, measured: true };
}

/**
 * Récupère les backlinks d'un concurrent (1 lien par domaine référent) et les stocke
 * bruts. Appel payant : passe par le client DataForSEO (cost_ledger) après contrôle du
 * plafond de l'audit. Rejouable : les lignes précédentes du concurrent sont remplacées.
 */
export async function fetchCompetitorBacklinks(
  service: Client,
  dfs: Pick<DataForSeoClient, "backlinksBacklinks">,
  run: BacklinksRun,
  competitor: { id: string; domain: string },
): Promise<{ domain: string; fetched: number; actualCostUsd: number; cacheHit: boolean }> {
  const spent = await totalCostForAudit(service, run.id);
  const next = estimateCost("backlinksBacklinks", { target: competitor.domain, limit: run.limit });
  if (spent + next > run.costCapUsd + 1e-9) {
    throw new BudgetExceededError(
      `Plafond de l'audit atteint (${spent} USD engagés + ${next} > ${run.costCapUsd} USD)`,
      next,
      run.costCapUsd,
    );
  }
  const out = await dfs.backlinksBacklinks(
    { target: competitor.domain, limit: run.limit, mode: "one_per_domain" },
    { workspaceId: run.workspaceId, auditId: run.id },
  );
  const rows = normalizeBacklinkItems(out.result?.items, competitor.domain);

  const del = await service
    .from("competitor_backlinks")
    .delete()
    .eq("competitor_id", competitor.id);
  if (del.error) throw new Error(`fetchCompetitorBacklinks : ${del.error.message}`);
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const ins = await service.from("competitor_backlinks").insert(
      rows.slice(i, i + INSERT_CHUNK).map((r) => ({
        audit_id: run.id,
        workspace_id: run.workspaceId,
        competitor_id: competitor.id,
        source_domain: r.sourceDomain,
        source_url: r.sourceUrl,
        target_url: r.targetUrl,
        anchor: r.anchor,
        item_type: r.itemType,
        dofollow: r.dofollow,
        is_broken: r.isBroken,
        spam_score: r.spamScore,
        source_rank: r.sourceRank,
        first_seen: r.firstSeen,
        last_seen: r.lastSeen,
      })),
    );
    if (ins.error) throw new Error(`fetchCompetitorBacklinks : ${ins.error.message}`);
  }
  return {
    domain: competitor.domain,
    fetched: rows.length,
    actualCostUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
  };
}

async function loadAllRows(service: Client, auditId: string): Promise<BacklinkRow[]> {
  const all: BacklinkRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await service
      .from("competitor_backlinks")
      .select("*")
      .eq("audit_id", auditId)
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`cleanBacklinks : ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

/** Dernière étape : applique les règles, écrit le statut de chaque ligne, calcule les compteurs. */
export async function cleanAuditBacklinks(service: Client, run: BacklinksRun): Promise<CleanStats> {
  const rows = await loadAllRows(service, run.id);
  const domainById = new Map(run.competitors.map((c) => [c.id, c.domain]));
  const items = rows.map((r) => ({
    id: r.id,
    competitorDomain: domainById.get(r.competitor_id) ?? "",
    sourceDomain: r.source_domain,
    sourceUrl: r.source_url,
    targetUrl: r.target_url,
    anchor: r.anchor,
    itemType: r.item_type,
    dofollow: r.dofollow,
    isBroken: r.is_broken,
    spamScore: r.spam_score,
    sourceRank: r.source_rank,
  }));
  const classified = cleanBacklinks(items, { language: run.language, ownDomain: run.domain });

  // Une mise à jour par groupe de motifs identiques (peu de groupes, pas une par ligne).
  const groups = new Map<string, { reasons: ExclusionReason[]; ids: number[] }>();
  for (const { row, reasons } of classified) {
    const key = reasons.join(",");
    const g = groups.get(key) ?? { reasons, ids: [] };
    g.ids.push(row.id);
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    for (let i = 0; i < g.ids.length; i += UPDATE_CHUNK) {
      const upd = await service
        .from("competitor_backlinks")
        .update({
          clean_status: g.reasons.length ? "exclu" : "garde",
          exclusion_reasons: g.reasons,
        })
        .in("id", g.ids.slice(i, i + UPDATE_CHUNK));
      if (upd.error) throw new Error(`cleanAuditBacklinks : ${upd.error.message}`);
    }
  }
  return computeStats(classified);
}

/** Termine : compteurs et coût réel (cost_ledger) ; le coût backlinks = total - coût de la découverte. */
export async function finalizeBacklinks(
  service: Client,
  run: BacklinksRun,
  stats: CleanStats,
): Promise<{ stats: CleanStats; backlinksCostUsd: number }> {
  const { data: audit, error } = await service
    .from("audits")
    .select("actual_cost_usd")
    .eq("id", run.id)
    .single();
  if (error || !audit)
    throw new Error(`finalizeBacklinks : ${error?.message ?? "audit introuvable"}`);
  const total = await totalCostForAudit(service, run.id);
  const backlinksCostUsd = r6(Math.max(0, total - Number(audit.actual_cost_usd ?? 0)));
  const upd = await service
    .from("audits")
    .update({
      backlinks_status: "termine",
      backlinks_stats: stats as unknown as Json,
      backlinks_cost_usd: backlinksCostUsd,
      backlinks_finished_at: new Date().toISOString(),
      backlinks_error: null,
    })
    .eq("id", run.id)
    .eq("backlinks_status", "en_cours");
  if (upd.error) throw new Error(`finalizeBacklinks : ${upd.error.message}`);
  await service.from("events").insert({
    workspace_id: run.workspaceId,
    actor_id: null,
    type: "audit.backlinks_completed",
    payload: {
      audit_id: run.id,
      before: stats.before,
      after: stats.after,
      cost_usd: backlinksCostUsd,
    },
  });
  logger.info("backlinks nettoyés", { auditId: run.id, before: stats.before, after: stats.after });
  return { stats, backlinksCostUsd };
}

/** Passe l'étape backlinks à "echoue" (l'audit lui-même reste "termine"). */
export async function failBacklinks(service: Client, auditId: string, message: string) {
  await service
    .from("audits")
    .update({
      backlinks_status: "echoue",
      backlinks_error: message.slice(0, 500),
      backlinks_finished_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .in("backlinks_status", ["confirme", "en_cours"]);
}
