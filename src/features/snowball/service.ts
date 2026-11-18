import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadCollectionContext, toRow as candidateRow } from "@/features/collection/run";
import { spendLimitsFor } from "@/features/collection/guard";
import type { FunnelStats } from "@/features/qualification/funnel";
import { toRow as targetRow } from "@/features/qualification/run";
import type { Situation } from "@/features/qualification/types";
import { SITUATIONS } from "@/features/qualification/types";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { MergedCandidate } from "@/features/collection/types";
import {
  executeSnowball,
  type SnowballDeps,
  type SnowballOutcome,
  type SnowballStats,
} from "./run";
import type { SeedSource } from "./seeds";

type Client = SupabaseClient<Database>;

const PAGE = 1000;
const INSERT_CHUNK = 300;

const citesSchema = z.object({
  sites: z.number().catch(0),
  links: z.array(z.object({ anchor: z.string().catch(""), domain: z.string() })).catch([]),
});

/** Pages du premier passage, en compact : verdict et ce que la page cite (sans son texte). */
export async function loadSeedSources(service: Client, runId: string): Promise<SeedSource[]> {
  const out: SeedSource[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await service
      .from("qualified_targets")
      .select("domain, exclusion_reason, judgement, page")
      .eq("run_id", runId)
      .not("page", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`boule de neige : ${error.message}`);
    for (const r of data ?? []) {
      const j = (r.judgement ?? null) as { situation?: string } | null;
      const situation = (SITUATIONS as readonly string[]).includes(j?.situation ?? "")
        ? (j!.situation as Situation)
        : null;
      const cites = citesSchema.safeParse((r.page as { cites?: unknown } | null)?.cites);
      out.push({
        domain: r.domain,
        situation,
        reason: r.exclusion_reason,
        cites: cites.success ? { ...cites.data } : null,
      });
    }
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

async function domainsOf(
  service: Client,
  table: "collection_candidates" | "qualified_targets",
  key: string,
  id: string,
) {
  const out = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await service
      .from(table)
      .select("domain")
      .eq(key, id)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`boule de neige : ${error.message}`);
    for (const r of data ?? []) out.add(r.domain);
    if ((data ?? []).length < PAGE) break;
  }
  return out;
}

/**
 * Range le résultat : les domaines nouveaux deviennent des candidats de la collecte ET des lignes « en réserve »
 * de la qualification (la lecture automatique de la réserve les lit ensuite, par lots, avec le pilotage par
 * ressource), puis les compteurs de la phase sont inscrits dans `qualification_runs.stats.snowball`.
 */
export async function persistSnowball(
  service: Client,
  ids: { runId: string; collectionId: string; auditId: string; workspaceId: string },
  outcome: SnowballOutcome,
  prior: Record<string, unknown>,
): Promise<MergedCandidate[]> {
  const run = { id: ids.runId, auditId: ids.auditId, workspaceId: ids.workspaceId };
  const cRun = { id: ids.collectionId, auditId: ids.auditId, workspaceId: ids.workspaceId };
  const fresh = outcome.candidates;
  for (let i = 0; i < fresh.length; i += INSERT_CHUNK) {
    const chunk = fresh.slice(i, i + INSERT_CHUNK);
    const ins = await service
      .from("collection_candidates")
      .insert(chunk.map((c) => candidateRow(cRun, c)));
    if (ins.error) throw new Error(`boule de neige : ${ins.error.message}`);
    const stock = await service.from("qualified_targets").upsert(
      chunk.map((c) =>
        targetRow(run, {
          domain: c.domain,
          url: c.url,
          tactics: c.tactics,
          status: "reserve",
          stageReached: 3,
          exclusionReason: "hors_budget_lecture",
          exclusionDetail: "en stock : trouvé par la boule de neige, pas encore lu",
          provisionalScore: 0,
          page: null,
          judgement: null,
          contact: null,
          score: null,
          scoreParts: null,
          rank: null,
          requestLines: null,
          why: null,
          platformHosted: false,
          domainRank: c.domainRank,
          competitorsCount: c.competitorsCount,
        }),
      ),
      { onConflict: "run_id,domain", ignoreDuplicates: true },
    );
    if (stock.error) throw new Error(`boule de neige : ${stock.error.message}`);
  }
  const merged = {
    ...prior,
    snowball: outcome.stats,
    stock: (typeof prior.stock === "number" ? prior.stock : 0) + fresh.length,
  };
  const up = await service
    .from("qualification_runs")
    .update({ stats: merged as unknown as Json })
    .eq("id", ids.runId);
  if (up.error) throw new Error(`boule de neige : ${up.error.message}`);
  return fresh;
}

export type SnowballResult =
  { status: "fait"; stats: SnowballStats } | { status: "deja" | "pas_prete" };

/**
 * Lance la boule de neige d'une analyse (MC.6d) : après le premier passage de qualification, une seule fois
 * (rejouée, elle ne fait rien : les compteurs sont dans `qualification_runs.stats.snowball`). Les pages
 * obtenues entrent dans le STOCK de la qualification (candidats de la collecte et lignes « en réserve »), lues
 * ensuite par les lots de lecture automatique, avec le pilotage par ressource. Aucun envoi.
 */
export async function runSnowballForAudit(
  service: Client,
  auditId: string,
  deps: Omit<SnowballDeps, "service">,
): Promise<SnowballResult> {
  const { data: qrun, error } = await service
    .from("qualification_runs")
    .select("id, status, stats, collection_id, workspace_id")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`boule de neige : ${error.message}`);
  if (!qrun || qrun.status !== "termine") return { status: "pas_prete" };
  const prior = (qrun.stats ?? {}) as Partial<FunnelStats> & { snowball?: SnowballStats };
  if (prior.snowball) return { status: "deja" };

  const [loaded, col] = await Promise.all([
    loadCollectionContext(service, auditId),
    service
      .from("candidate_collections")
      .select("id, stats, workspace_id")
      .eq("id", qrun.collection_id)
      .maybeSingle(),
  ]);
  if (!loaded || !col.data) return { status: "pas_prete" };
  const used = z
    .array(z.string())
    .catch([])
    .parse(
      (col.data.stats as { citations?: { resources?: unknown } } | null)?.citations?.resources,
    );

  const [pages, known1, known2] = await Promise.all([
    loadSeedSources(service, qrun.id),
    domainsOf(service, "collection_candidates", "collection_id", qrun.collection_id),
    domainsOf(service, "qualified_targets", "run_id", qrun.id),
  ]);
  const known = new Set([...known1, ...known2]);

  const outcome = await executeSnowball(
    { ...deps, service },
    {
      run: {
        auditId,
        workspaceId: qrun.workspace_id,
        ctx: loaded.ctx,
        limits: spendLimitsFor(auditId, loaded.capUsd),
      },
      pages,
      used,
      known,
    },
  );

  const fresh = await persistSnowball(
    service,
    {
      runId: qrun.id,
      collectionId: qrun.collection_id,
      auditId,
      workspaceId: qrun.workspace_id,
    },
    outcome,
    prior,
  );
  logger.info("boule de neige terminée", {
    auditId,
    by: outcome.stats.by,
    resources: outcome.stats.resources,
    newCandidates: fresh.length,
    costUsd: outcome.stats.costUsd,
  });
  return { status: "fait", stats: outcome.stats };
}
