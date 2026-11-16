import type { SupabaseClient } from "@supabase/supabase-js";
import { assertCanSpend, spendLimitsFor } from "@/features/collection/guard";
import { BudgetExceededError, type DataForSeoClient } from "@/lib/dataforseo";
import { estimateCost } from "@/lib/dataforseo/endpoints";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { LINKS_STATE_LIMITS } from "./estimate";
import type { StepRunner } from "./orchestrate";
import { createProgress } from "./progress";
import type { ProgressSink } from "./steps";

type Client = SupabaseClient<Database>;
type Dfs = Pick<
  DataForSeoClient,
  "backlinksSummary" | "backlinksReferringDomains" | "labsRankedKeywords"
>;

/** État des lieux des liens du site, tel qu'écrit dans `audits.links_state`. */
export interface LinksState {
  measuredAt: string;
  /** Parties qui n'ont pas pu être mesurées (plafond, panne du fournisseur). */
  missing: ("resume" | "domaines" | "mots_cles")[];
  totals: {
    referringDomains: number | null;
    backlinks: number | null;
    rank: number | null;
    spamScore: number | null;
    brokenBacklinks: number | null;
  } | null;
  referringDomains: {
    total: number | null;
    sample: { domain: string; rank: number | null }[];
  } | null;
  keywords: {
    total: number | null;
    top: { keyword: string; position: number; volume: number; url: string }[];
  } | null;
}

export interface LinksStateRun {
  auditId: string;
  workspaceId: string;
  domain: string;
  costCapUsd: number;
}

/** Null si l'état des lieux n'a pas à tourner (audit absent, étape déjà terminée). */
export async function beginLinksState(
  service: Client,
  auditId: string,
): Promise<LinksStateRun | null> {
  const [{ data: audit }, { data: step }] = await Promise.all([
    service
      .from("audits")
      .select("id, workspace_id, cost_cap_usd, sites(domain)")
      .eq("id", auditId)
      .maybeSingle(),
    service
      .from("analysis_steps")
      .select("status")
      .eq("audit_id", auditId)
      .eq("key", "etat_des_lieux")
      .maybeSingle(),
  ]);
  const site = audit?.sites as unknown as { domain: string } | null;
  if (!audit || !site || !step || step.status === "termine") return null;
  return {
    auditId,
    workspaceId: audit.workspace_id,
    domain: site.domain,
    costCapUsd: Number(audit.cost_cap_usd),
  };
}

type Part<T> = { ok: true; value: T } | { ok: false; reason: string };

/** Un appel payant gardé par les plafonds durs ; une panne ou un plafond donne une partie manquante. */
async function part<T>(
  guard: (estimateUsd: number) => Promise<void>,
  estimateUsd: number,
  call: () => Promise<T>,
): Promise<Part<T>> {
  try {
    await guard(estimateUsd);
    return { ok: true, value: await call() };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof BudgetExceededError ? "plafond" : (e as Error).message.slice(0, 200),
    };
  }
}

/**
 * État des lieux (étape 3, en parallèle) : résumé des liens, domaines référents, mots-clés classés.
 * Trois appels payants bornés, chacun dans son step et sous les plafonds durs. Une partie qui échoue
 * est notée manquante ; l'étape n'échoue que si rien n'a pu être mesuré. N'arrête JAMAIS l'analyse.
 */
export async function executeLinksState(
  deps: { service: () => Client; dfs: () => Dfs },
  run: LinksStateRun,
  runStep: StepRunner,
  progress: ProgressSink = createProgress(deps.service(), run),
): Promise<{ status: "termine" | "echoue"; state: LinksState }> {
  const ids = { workspaceId: run.workspaceId, auditId: run.auditId };
  const guard = (usd: number) =>
    assertCanSpend(deps.service(), spendLimitsFor(run.auditId, run.costCapUsd), usd);
  const L = LINKS_STATE_LIMITS;
  await runStep("debut", async () => {
    await progress.update("etat_des_lieux", {
      status: "en_cours",
      counters: { done: 0, total: 3 },
    });
    return { started: true };
  });

  const summary = await runStep("resume", async () => {
    const p = { target: run.domain };
    const out = await part(guard, estimateCost("backlinksSummary", p), async () => {
      const r = (await deps.dfs().backlinksSummary(p, ids)).result;
      return {
        referringDomains: r?.referring_domains ?? null,
        backlinks: r?.backlinks ?? null,
        rank: r?.rank ?? null,
        spamScore: r?.backlinks_spam_score ?? null,
        brokenBacklinks: r?.broken_backlinks ?? null,
      };
    });
    await progress.update("etat_des_lieux", {
      counters: {
        done: 1,
        total: 3,
        ...(out.ok ? { found: out.value.referringDomains ?? 0 } : {}),
      },
    });
    return out;
  });

  const domains = await runStep("domaines", async () => {
    const p = { target: run.domain, limit: L.referringDomains, order_by: ["rank,desc"] };
    const out = await part(guard, estimateCost("backlinksReferringDomains", p), async () => {
      const r = (await deps.dfs().backlinksReferringDomains(p, ids)).result;
      return {
        total: r?.total_count ?? null,
        sample: (r?.items ?? []).slice(0, L.keptDomains).map((i) => ({
          domain: i.domain.toLowerCase().replace(/^www\./, ""),
          rank: i.rank ?? null,
        })),
      };
    });
    await progress.update("etat_des_lieux", {
      counters: { done: 2, total: 3 },
      example: out.ok ? (out.value.sample[0]?.domain ?? null) : null,
    });
    return out;
  });

  const keywords = await runStep("mots-cles", async () => {
    const p = {
      target: run.domain,
      limit: L.rankedKeywords,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    };
    const out = await part(guard, estimateCost("labsRankedKeywords", p), async () => {
      const r = (await deps.dfs().labsRankedKeywords(p, ids)).result;
      const top = (r?.items ?? []).flatMap((it) => {
        const el = it.ranked_serp_element?.serp_item;
        if (!el?.url || !el.rank_group) return [];
        return [
          {
            keyword: it.keyword_data.keyword,
            position: el.rank_group,
            volume: it.keyword_data.keyword_info?.search_volume ?? 0,
            url: el.url,
          },
        ];
      });
      return { total: r?.total_count ?? null, top: top.slice(0, L.keptKeywords) };
    });
    await progress.update("etat_des_lieux", {
      counters: { done: 3, total: 3, ...(out.ok ? { keywords: out.value.total ?? 0 } : {}) },
      example: out.ok ? (out.value.top[0]?.keyword ?? null) : null,
    });
    return out;
  });

  return runStep("fin", async () => {
    const missing: LinksState["missing"] = [];
    if (!summary.ok) missing.push("resume");
    if (!domains.ok) missing.push("domaines");
    if (!keywords.ok) missing.push("mots_cles");
    const state: LinksState = {
      measuredAt: new Date().toISOString(),
      missing,
      totals: summary.ok ? summary.value : null,
      referringDomains: domains.ok ? domains.value : null,
      keywords: keywords.ok ? keywords.value : null,
    };
    const { error } = await deps
      .service()
      .from("audits")
      .update({ links_state: state as unknown as Json })
      .eq("id", run.auditId);
    if (error) throw new Error(`executeLinksState : ${error.message}`);
    const failed = missing.length === 3;
    if (failed) {
      const reasons = [summary, domains, keywords].flatMap((p) => (p.ok ? [] : [p.reason]));
      logger.warn("état des lieux impossible", { auditId: run.auditId, reasons });
      await failLinksState(progress, reasons[0] ?? "");
    } else {
      await progress.update("etat_des_lieux", { status: "termine" });
      await progress.feed({
        kind: "etape",
        stepKey: "etat_des_lieux",
        message: t.analysis.feed.stepDone(t.analysis.steps.etat_des_lieux),
      });
    }
    return { status: failed ? ("echoue" as const) : ("termine" as const), state };
  });
}

/** L'étape parallèle passe en échec, sans toucher au statut de l'analyse. */
export async function failLinksState(progress: ProgressSink, detail: string): Promise<void> {
  await progress.update("etat_des_lieux", {
    status: "echoue",
    error: t.analysis.feed.linksStateFailed,
  });
  await progress.feed({
    kind: "info",
    stepKey: "etat_des_lieux",
    message: t.analysis.feed.linksStateFailed,
    payload: detail ? { detail: detail.slice(0, 200) } : {},
  });
}
