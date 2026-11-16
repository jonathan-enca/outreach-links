import type { SupabaseClient } from "@supabase/supabase-js";
import { totalCostForAudit } from "@/lib/costs";
import { BudgetExceededError, type DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  aggregateCompetitors,
  selectCompetitors,
  serpEntries,
  type QueryEntries,
} from "./discover";
import { serpLocation } from "@/features/sites/market";
import { isPlanKey, limitsFor, PLAN_LIMITS } from "./plans";
import { transitionAudit } from "./service";

type Client = SupabaseClient<Database>;
type AuditRow = Database["public"]["Tables"]["audits"]["Row"];

export interface RunAudit {
  id: string;
  workspaceId: string;
  domain: string;
  queries: string[];
  costCapUsd: number;
  /** Marché de la campagne (pays, langue) : lieu et langue des recherches Google. */
  market?: { country: string; language: string };
}

/**
 * Étape 1 du job : confirme -> en_cours. Idempotent (une nouvelle tentative
 * d'Inngest retrouve l'audit déjà en_cours). Retourne null si l'audit ne doit pas
 * (ou plus) être exécuté : jamais d'appel payant sans confirmation de l'utilisateur.
 */
export async function beginDiscovery(service: Client, auditId: string): Promise<RunAudit | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select("*, sites(domain, country, language)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginDiscovery : ${error.message}`);
  if (!audit) return null;
  if (audit.status === "confirme") {
    const moved = await transitionAudit(service, audit.id, "confirme", "en_cours", {
      started_at: new Date().toISOString(),
    });
    if (!moved) return null;
  } else if (audit.status !== "en_cours") {
    return null;
  }
  const site = audit.sites as unknown as {
    domain: string;
    country?: string;
    language?: string;
  } | null;
  if (!site) return null;
  return {
    market:
      site.country && site.language
        ? { country: site.country, language: site.language }
        : undefined,
    id: audit.id,
    workspaceId: audit.workspace_id,
    domain: site.domain,
    queries: audit.queries,
    costCapUsd: Number(audit.cost_cap_usd),
  };
}

/**
 * Une SERP (top `depth`) pour une requête : appel payant via le client DataForSEO
 * (donc journalisé dans cost_ledger avec audit_id), puis stockage des lignes.
 * Refait la requête sans doublon si l'étape est rejouée (le cache DataForSEO
 * évite alors de payer deux fois).
 */
export async function discoverQuery(
  service: Client,
  dfs: Pick<DataForSeoClient, "serpOrganicLive">,
  audit: RunAudit,
  query: string,
  depth = PLAN_LIMITS.gratuit.serpDepth,
): Promise<{ query: string; entries: number; actualCostUsd: number; cacheHit: boolean }> {
  // Plafond d'audit : le coût déjà engagé + l'estimation de cet appel ne doit pas le dépasser.
  const spent = await totalCostForAudit(service, audit.id);
  const next = estimateCost("serpOrganicLive", { keyword: query, depth });
  if (spent + next > audit.costCapUsd + 1e-9) {
    throw new BudgetExceededError(
      `Plafond de l'audit atteint (${spent} USD engagés + ${next} > ${audit.costCapUsd} USD)`,
      next,
      audit.costCapUsd,
    );
  }

  const out = await dfs.serpOrganicLive(
    { keyword: query, depth, ...serpLocation(audit.market?.country, audit.market?.language) },
    { workspaceId: audit.workspaceId, auditId: audit.id },
  );
  const entries = serpEntries(out.result, depth);

  const del = await service
    .from("audit_serp_results")
    .delete()
    .eq("audit_id", audit.id)
    .eq("query", query);
  if (del.error) throw new Error(`discoverQuery : ${del.error.message}`);
  if (entries.length) {
    const ins = await service.from("audit_serp_results").insert(
      entries.map((e) => ({
        audit_id: audit.id,
        workspace_id: audit.workspaceId,
        query,
        rank: e.rank,
        domain: e.domain,
        url: e.url,
        title: e.title,
      })),
    );
    if (ins.error) throw new Error(`discoverQuery : ${ins.error.message}`);
  }
  return {
    query,
    entries: entries.length,
    actualCostUsd: out.actualCostUsd,
    cacheHit: out.cacheHit,
  };
}

export interface FinalizeResult {
  competitors: number;
  selected: number;
  estimatedUsd: number;
  actualUsd: number;
}

/**
 * Dernière étape : agrège les SERP stockées, retient les concurrents selon le plan,
 * compare coût estimé et coût réel (cost_ledger) et passe l'audit à "termine".
 */
export async function finalizeDiscovery(service: Client, audit: RunAudit): Promise<FinalizeResult> {
  const { data: row, error: aErr } = await service
    .from("audits")
    .select("plan, max_competitors, estimated_cost_usd, estimate_details")
    .eq("id", audit.id)
    .single();
  if (aErr || !row) throw new Error(`finalizeDiscovery : ${aErr?.message ?? "audit introuvable"}`);

  const { data: serp, error: sErr } = await service
    .from("audit_serp_results")
    .select("query, rank, domain, url, title")
    .eq("audit_id", audit.id);
  if (sErr) throw new Error(`finalizeDiscovery : ${sErr.message}`);

  const byQuery = new Map<string, QueryEntries>();
  for (const r of serp ?? []) {
    const q = byQuery.get(r.query) ?? { query: r.query, entries: [] };
    q.entries.push({ rank: r.rank, domain: r.domain, url: r.url, title: r.title });
    byQuery.set(r.query, q);
  }
  const candidates = aggregateCompetitors([...byQuery.values()], { ownDomain: audit.domain });
  const plan = isPlanKey(row.plan) ? row.plan : "gratuit";
  const limits = {
    ...limitsFor(plan, audit.domain),
    maxCompetitors: Math.min(row.max_competitors, limitsFor(plan, audit.domain).maxCompetitors),
  };
  const chosen = new Set(selectCompetitors(candidates, limits).map((c) => c.domain));

  const del = await service.from("competitors").delete().eq("audit_id", audit.id);
  if (del.error) throw new Error(`finalizeDiscovery : ${del.error.message}`);
  if (candidates.length) {
    const ins = await service.from("competitors").insert(
      candidates.map((c) => ({
        audit_id: audit.id,
        workspace_id: audit.workspaceId,
        domain: c.domain,
        queries_count: c.queriesCount,
        appearances: c.appearances,
        best_rank: c.bestRank,
        avg_rank: c.avgRank,
        score: c.score,
        selected: chosen.has(c.domain),
        sample_url: c.sampleUrl,
      })),
    );
    if (ins.error) throw new Error(`finalizeDiscovery : ${ins.error.message}`);
  }

  const actualUsd = Math.round((await totalCostForAudit(service, audit.id)) * 1e6) / 1e6;
  const estimatedUsd = Number(row.estimated_cost_usd ?? 0);
  const details = {
    ...((row.estimate_details as Record<string, unknown> | null) ?? {}),
    actual_usd: actualUsd,
    gap_usd: Math.round((actualUsd - estimatedUsd) * 1e6) / 1e6,
    candidates: candidates.length,
    selected: chosen.size,
  };
  const moved = await transitionAudit(service, audit.id, "en_cours", "termine", {
    actual_cost_usd: actualUsd,
    estimate_details: details as Json,
    finished_at: new Date().toISOString(),
  });
  if (!moved) logger.warn("audit déjà terminé ou modifié", { auditId: audit.id });

  await service.from("events").insert({
    workspace_id: audit.workspaceId,
    actor_id: null,
    type: "audit.completed",
    payload: { audit_id: audit.id, estimated_usd: estimatedUsd, actual_usd: actualUsd },
  });
  return { competitors: candidates.length, selected: chosen.size, estimatedUsd, actualUsd };
}

/** Passe l'audit à "echoue" (depuis confirme ou en_cours) avec un message lisible. */
export async function failDiscovery(
  service: Client,
  auditId: string,
  message: string,
): Promise<void> {
  const { data } = await service.from("audits").select("status").eq("id", auditId).maybeSingle();
  const status = data?.status as AuditRow["status"] | undefined;
  if (status !== "confirme" && status !== "en_cours") return;
  await transitionAudit(service, auditId, status, "echoue", {
    error_message: message.slice(0, 500),
    finished_at: new Date().toISOString(),
    actual_cost_usd: Math.round((await totalCostForAudit(service, auditId)) * 1e6) / 1e6,
  });
}
