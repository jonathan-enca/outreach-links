import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getLatestBrandProfile } from "@/features/brand/service";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { FindInput, FindStats } from "./funnel";
import { FINDINGS_LIMITS } from "./limits";
import type { Finding, FindingContext, FindingTarget } from "./types";

type Client = SupabaseClient<Database>;

export const FINDINGS_EVENT = "audit/findings.requested";
const INSERT_CHUNK = 200;

export interface FindingsRunRow {
  id: string;
  auditId: string;
  qualificationRunId: string;
  workspaceId: string;
  siteId: string;
  budgetUsd: number;
  model: string;
  auditCapUsd: number;
}

/**
 * Cibles de la liste courte (dans l'ordre du rang) et contexte du site (profil de marque, concurrents,
 * pages proposables). Null si la qualification n'est pas terminée.
 */
export async function loadFindingsInput(
  service: Client,
  auditId: string,
): Promise<{
  ctx: FindingContext;
  targets: FindingTarget[];
  qualificationRunId: string;
  workspaceId: string;
  siteId: string;
} | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select("id, workspace_id, sites(id, domain, language, niche)")
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`loadFindingsInput : ${error.message}`);
  const site = audit?.sites as unknown as {
    id: string;
    domain: string;
    language: string;
    niche: string | null;
  } | null;
  if (!audit || !site) return null;
  const { data: qrun } = await service
    .from("qualification_runs")
    .select("id, status")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (!qrun || qrun.status !== "termine") return null;

  const [rows, comps, profile] = await Promise.all([
    service
      .from("qualified_targets")
      .select("id, domain, url, rank, judgement")
      .eq("run_id", qrun.id)
      .eq("status", "liste_courte")
      .order("rank", { ascending: true })
      .limit(FINDINGS_LIMITS.maxTargets),
    service.from("competitors").select("domain").eq("audit_id", auditId),
    getLatestBrandProfile(service, site.id),
  ]);
  if (rows.error) throw new Error(`loadFindingsInput : ${rows.error.message}`);

  const p = profile?.profile;
  const home = `https://${site.domain}/`;
  const resources = [
    { url: home, title: `Accueil de ${p?.name_variants[0] ?? site.domain}` },
    ...(p?.linkable_resources ?? [])
      .filter((r) => r.selected !== false && /^https?:\/\//.test(r.url) && r.url !== home)
      .map((r) => ({ url: r.url, title: r.title })),
  ].slice(0, 6);
  const resourceIdx = z.object({ resource: z.number().int().min(0).max(9) }).catch({ resource: 0 });

  return {
    qualificationRunId: qrun.id,
    workspaceId: audit.workspace_id,
    siteId: site.id,
    targets: (rows.data ?? [])
      .filter((r) => r.rank !== null && r.url)
      .map((r) => ({
        targetId: r.id,
        domain: r.domain,
        url: r.url!,
        rank: r.rank!,
        resource: resourceIdx.parse(r.judgement).resource,
      })),
    ctx: {
      ownDomain: site.domain,
      brandName: p?.name_variants[0] ?? site.domain,
      nameVariants: p?.name_variants ?? [],
      language: site.language,
      theme: site.niche ?? "",
      activity: p?.activity ?? site.niche ?? "",
      competitorDomains: (comps.data ?? []).map((c) => c.domain),
      resources,
    },
  };
}

const planSchema = z.object({ model: z.string(), budgetUsd: z.number() });

/** confirme -> en_cours (idempotent : en_cours reste en_cours pour une reprise). Null sinon. */
export async function beginFindings(
  service: Client,
  auditId: string,
): Promise<FindingsRunRow | null> {
  const { data: row, error } = await service
    .from("findings_runs")
    .select("*")
    .eq("audit_id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginFindings : ${error.message}`);
  if (!row) return null;
  if (row.status === "confirme") {
    const { data, error: uErr } = await service
      .from("findings_runs")
      .update({ status: "en_cours", started_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginFindings : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (row.status !== "en_cours") return null;
  const plan = planSchema.safeParse(row.plan);
  if (!plan.success) throw new Error("beginFindings : plan illisible");
  const { data: audit } = await service
    .from("audits")
    .select("cost_cap_usd")
    .eq("id", auditId)
    .maybeSingle();
  return {
    id: row.id,
    auditId,
    qualificationRunId: row.qualification_run_id,
    workspaceId: row.workspace_id,
    siteId: row.site_id,
    budgetUsd: Number(row.budget_usd),
    model: plan.data.model,
    auditCapUsd: Number(audit?.cost_cap_usd ?? 0),
  };
}

export function toInput(
  run: FindingsRunRow,
  loaded: { ctx: FindingContext; targets: FindingTarget[] },
): FindInput {
  return {
    workspaceId: run.workspaceId,
    auditId: run.auditId,
    ctx: loaded.ctx,
    targets: loaded.targets,
    budgetUsd: run.budgetUsd,
    model: run.model,
  };
}

function toRow(run: FindingsRunRow, f: Finding) {
  return {
    run_id: run.id,
    audit_id: run.auditId,
    workspace_id: run.workspaceId,
    target_id: f.targetId,
    domain: f.domain,
    kind: f.kind,
    page_url: f.pageUrl,
    quote: f.quote.slice(0, 600),
    link_url: f.linkUrl,
    http_status: f.httpStatus,
    anchor: f.anchor,
    resource_url: f.resourceUrl,
    resource_title: f.resourceTitle,
    replacement_how: f.replacementHow,
    proposed_sentence: f.proposedSentence,
    reason: f.reason,
    request_lines: f.requestLines,
    brief: f.brief as unknown as Json,
  };
}

/** Écrit les constats (réécrits à chaque exécution) et clôt l'analyse. */
export async function finalizeFindings(
  service: Client,
  run: FindingsRunRow,
  findings: readonly Finding[],
  stats: FindStats,
): Promise<{ findings: number; costUsd: number }> {
  const del = await service.from("target_findings").delete().eq("run_id", run.id);
  if (del.error) throw new Error(`finalizeFindings : ${del.error.message}`);
  for (let i = 0; i < findings.length; i += INSERT_CHUNK) {
    const { error } = await service
      .from("target_findings")
      .insert(findings.slice(i, i + INSERT_CHUNK).map((f) => toRow(run, f)));
    if (error) throw new Error(`finalizeFindings : ${error.message}`);
  }
  const { error } = await service
    .from("findings_runs")
    .update({
      status: "termine",
      actual_cost_usd: stats.costUsd,
      stats: stats as unknown as Json,
      stop_reason: stats.stop,
      error_message: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (error) throw new Error(`finalizeFindings : ${error.message}`);
  return { findings: findings.length, costUsd: stats.costUsd };
}

export async function failFindings(
  service: Client,
  auditId: string,
  message: string,
): Promise<void> {
  const { error } = await service
    .from("findings_runs")
    .update({
      status: "echoue",
      error_message: message.slice(0, 500),
      finished_at: new Date().toISOString(),
    })
    .eq("audit_id", auditId)
    .in("status", ["confirme", "en_cours"]);
  if (error) logger.error("constats : échec non enregistré", { auditId, error: error.message });
}
