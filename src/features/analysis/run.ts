import type { SupabaseClient } from "@supabase/supabase-js";
import { limitsFor, isPlanKey } from "@/features/audits/plans";
import { beginDiscovery, discoverQuery, finalizeDiscovery } from "@/features/audits/run";
import { filterCompetitorsBySize, type BacklinksRun } from "@/features/backlinks/run";
import {
  buildAndStoreBrandProfile,
  getLatestBrandProfile,
  type BrandDeps,
} from "@/features/brand/service";
import {
  beginCollection,
  executeCollection,
  finalizeCollection,
  withProviderRetry,
  type StepOutcome,
} from "@/features/collection/run";
import { prepareCollection } from "@/features/collection/service";
import type { FindDeps, FindProgressEvent } from "@/features/findings/funnel";
import { executeFindings } from "@/features/findings/funnel";
import {
  beginFindings,
  finalizeFindings,
  loadFindingsInput,
  toInput as toFindInput,
  type FindingsRunRow,
} from "@/features/findings/run";
import { prepareFindings } from "@/features/findings/service";
import type { FindingContext } from "@/features/findings/types";
import {
  executeQualification,
  type QualDeps,
  type QualProgressEvent,
} from "@/features/qualification/funnel";
import { QUALIFY_LIMITS } from "@/features/qualification/limits";
import {
  beginQualification,
  finalizeQualification,
  loadQualificationInput,
  toInput as toQualInput,
  type QualRunRow,
} from "@/features/qualification/run";
import { prepareQualification } from "@/features/qualification/service";
import type { QualContext } from "@/features/qualification/types";
import { ensureQueryUniverse, type QueryDeps } from "@/features/queries/service";
import { totalCostForAudit } from "@/lib/costs";
import type { DataForSeoClient } from "@/lib/dataforseo";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import {
  type AnalysisRun,
  type AnalysisSummary,
  type Orchestration,
  type Stage,
  type StageResult,
  type StageTools,
} from "./orchestrate";
import { createProgress, initSteps } from "./progress";
import { PARALLEL_STEP, type AnalysisStepKey, type FeedEntry } from "./steps";

type Client = SupabaseClient<Database>;
type Dfs = Pick<
  DataForSeoClient,
  | "serpOrganicLive"
  | "backlinksBulkReferringDomains"
  | "backlinksDomainIntersection"
  | "contentAnalysisSearch"
  | "backlinksBacklinks"
>;

const E = t.analysis.errors;
const F = t.analysis.feed;
const S = t.analysis.steps;
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Tout ce dont les étapes ont besoin du monde extérieur (remplaçable dans les tests). */
export interface AnalysisDeps {
  service: () => Client;
  dfs: () => Dfs;
  brand: BrandDeps;
  queries: QueryDeps;
  qualDeps: (ctx: QualContext, run: QualRunRow) => QualDeps;
  findDeps: (run: FindingsRunRow) => FindDeps;
  /** Envoi de l'événement de l'état des lieux (étape parallèle). */
  launchLinksState: (run: AnalysisRun) => Promise<void>;
  now?: () => Date;
}

const done = (key: AnalysisStepKey): FeedEntry => ({
  kind: "etape",
  stepKey: key,
  message: F.stepDone(S[key]),
});

// ----- Début, fin, arrêt ------------------------------------------------------

/**
 * confirme -> en_cours (idempotent : une nouvelle tentative d'Inngest retrouve l'analyse en cours),
 * puis crée les lignes d'étape manquantes et remet « en attente » celles qui avaient échoué. Null si
 * l'analyse ne doit pas tourner : jamais d'appel payant sans confirmation de l'utilisateur.
 */
export async function beginAnalysis(service: Client, auditId: string): Promise<AnalysisRun | null> {
  const { data: audit, error } = await service
    .from("audits")
    .select(
      "id, workspace_id, site_id, analysis_status, analysis_confirmed_at, analysis_started_at, created_by, cost_cap_usd, sites(domain)",
    )
    .eq("id", auditId)
    .maybeSingle();
  if (error) throw new Error(`beginAnalysis : ${error.message}`);
  const site = audit?.sites as unknown as { domain: string } | null;
  if (!audit || !site || !audit.created_by) return null;
  if (audit.analysis_status === "confirme") {
    const { data, error: uErr } = await service
      .from("audits")
      .update({
        analysis_status: "en_cours",
        analysis_started_at: audit.analysis_started_at ?? new Date().toISOString(),
        analysis_error: null,
        analysis_finished_at: null,
      })
      .eq("id", auditId)
      .eq("analysis_status", "confirme")
      .select("id");
    if (uErr) throw new Error(`beginAnalysis : ${uErr.message}`);
    if (!data?.length) return null;
  } else if (audit.analysis_status !== "en_cours") {
    return null;
  }
  await initSteps(service, { auditId, workspaceId: audit.workspace_id });
  return {
    auditId,
    workspaceId: audit.workspace_id,
    siteId: audit.site_id,
    domain: site.domain,
    actorId: audit.created_by,
    costCapUsd: Number(audit.cost_cap_usd),
    nonce: audit.analysis_confirmed_at ?? "",
  };
}

/** Clôt l'analyse : coût réel (cost_ledger), durée, nombre de cibles prêtes, événement de fin. */
export async function finalizeAnalysis(
  service: Client,
  run: AnalysisRun,
  now: Date = new Date(),
): Promise<AnalysisSummary> {
  const progress = createProgress(service, run);
  await progress.update("demandes", { status: "en_cours" });
  const [targets, findings, audit, costUsd] = await Promise.all([
    service
      .from("qualified_targets")
      .select("id", { count: "exact", head: true })
      .eq("audit_id", run.auditId)
      .eq("status", "liste_courte"),
    service
      .from("target_findings")
      .select("id", { count: "exact", head: true })
      .eq("audit_id", run.auditId),
    service.from("audits").select("analysis_started_at").eq("id", run.auditId).maybeSingle(),
    totalCostForAudit(service, run.auditId),
  ]);
  const shortlist = targets.count ?? 0;
  const started = audit.data?.analysis_started_at
    ? Date.parse(audit.data.analysis_started_at)
    : now.getTime();
  const summary: AnalysisSummary = {
    shortlist,
    findings: findings.count ?? 0,
    costUsd: r6(costUsd),
    durationSeconds: Math.max(0, Math.round((now.getTime() - started) / 1000)),
  };
  await progress.update("demandes", {
    status: "termine",
    counters: { done: shortlist, total: shortlist, found: shortlist },
  });
  const { error } = await service
    .from("audits")
    .update({
      analysis_status: "termine",
      analysis_finished_at: now.toISOString(),
      analysis_cost_usd: summary.costUsd,
      analysis_error: null,
    })
    .eq("id", run.auditId)
    .eq("analysis_status", "en_cours");
  if (error) throw new Error(`finalizeAnalysis : ${error.message}`);
  await progress.feed([done("demandes"), { kind: "info", message: F.done(shortlist) }]);
  await service.from("events").insert({
    workspace_id: run.workspaceId,
    actor_id: null,
    type: "analysis.completed",
    payload: {
      audit_id: run.auditId,
      shortlist,
      findings: summary.findings,
      cost_usd: summary.costUsd,
      duration_seconds: summary.durationSeconds,
    },
  });
  return summary;
}

/**
 * Passe l'analyse en échec avec un message lisible (arrêt propre d'une étape, ou panne après les
 * nouvelles tentatives). Les étapes déjà terminées restent terminées : « Reprendre » repart de là.
 * L'étape parallèle n'est pas touchée (elle vit sa vie).
 */
export async function failAnalysis(
  service: Client,
  auditId: string,
  message: string,
  key?: AnalysisStepKey,
): Promise<void> {
  const { data: audit } = await service
    .from("audits")
    .select("workspace_id, analysis_status")
    .eq("id", auditId)
    .maybeSingle();
  if (!audit || !["confirme", "en_cours"].includes(audit.analysis_status)) return;
  const costUsd = r6(await totalCostForAudit(service, auditId));
  const { error } = await service
    .from("audits")
    .update({
      analysis_status: "echoue",
      analysis_error: message.slice(0, 500),
      analysis_finished_at: new Date().toISOString(),
      analysis_cost_usd: costUsd,
    })
    .eq("id", auditId)
    .in("analysis_status", ["confirme", "en_cours"]);
  if (error) logger.error("analyse : échec non enregistré", { auditId, error: error.message });
  const progress = createProgress(service, { auditId, workspaceId: audit.workspace_id });
  const { data: running } = await service
    .from("analysis_steps")
    .select("key")
    .eq("audit_id", auditId)
    .eq("status", "en_cours");
  const keys = new Set<string>((running ?? []).map((r) => r.key));
  if (key) keys.add(key);
  keys.delete(PARALLEL_STEP);
  for (const k of keys) {
    await progress.update(k as AnalysisStepKey, { status: "echoue", error: message });
  }
  await progress.feed({ kind: "info", stepKey: key, message: message.slice(0, 300) });
  await service.from("events").insert({
    workspace_id: audit.workspace_id,
    actor_id: null,
    type: "analysis.failed",
    payload: { audit_id: auditId, step: key ?? null, message: message.slice(0, 300) },
  });
}

// ----- Étapes -----------------------------------------------------------------

/** 1. Comprendre votre site : profil de marque, seulement s'il manque. */
function understandStage(deps: AnalysisDeps): Stage {
  return {
    key: "comprendre",
    run: (run, { runStep, progress }) =>
      runStep("comprendre", async (): Promise<StageResult> => {
        const service = deps.service();
        await progress.update("comprendre", { status: "en_cours" });
        const latest = await getLatestBrandProfile(service, run.siteId);
        // « Reprendre à partir d'ici » sur cette étape : relire le site (nouvelle version du profil).
        // Un profil corrigé par l'utilisateur n'est jamais écrasé.
        const { data: own } = await service
          .from("analysis_steps")
          .select("counters")
          .eq("audit_id", run.auditId)
          .eq("key", "comprendre")
          .maybeSingle();
        const redo = (own?.counters as Record<string, unknown> | null)?.redo === 1;
        const existing = redo && latest?.source === "llm" ? null : latest;
        const profile =
          existing ??
          (await buildAndStoreBrandProfile(
            service,
            {
              siteId: run.siteId,
              workspaceId: run.workspaceId,
              userId: run.actorId,
              domain: run.domain,
              home: null,
            },
            deps.brand,
          ));
        if (!profile) return { status: "arret", message: E.siteUnreadable };
        const pages = profile.pagesRead.length;
        await progress.update("comprendre", {
          status: "termine",
          counters: {
            done: pages,
            total: pages,
            found: profile.profile.linkable_resources.length,
            redo: 0,
          },
          example: profile.profile.name_variants[0] ?? run.domain,
        });
        if (!existing) await progress.feed(done("comprendre"));
        return { status: existing ? "deja" : "fait" };
      }),
  };
}

/** 2. Repérer vos concurrents : recherches Google, puis tailles mesurées en une requête. */
function competitorsStage(deps: AnalysisDeps): Stage {
  return {
    key: "concurrents",
    run: async (run, { runStep, progress }) => {
      const begin = await runStep("concurrents:debut", async () => {
        const service = deps.service();
        const { data } = await service
          .from("audits")
          .select("status")
          .eq("id", run.auditId)
          .maybeSingle();
        if (data?.status === "termine") return { state: "deja" as const, audit: null };
        const audit = await beginDiscovery(service, run.auditId);
        if (!audit) return { state: "impossible" as const, audit: null };
        await progress.update("concurrents", {
          status: "en_cours",
          counters: { done: 0, total: audit.queries.length + 1 },
        });
        return { state: "pret" as const, audit };
      });
      if (begin.state === "impossible") return { status: "arret", message: E.interrupted };

      let missedSearches = 0;
      if (begin.state === "pret" && begin.audit) {
        const audit = begin.audit;
        for (const [i, query] of audit.queries.entries()) {
          const res = await runStep(`concurrents:recherche-${i + 1}`, async () => {
            // Une recherche que le fournisseur ne sert pas (500, délai) est « manquée », jamais fatale.
            const out = await withProviderRetry(() =>
              discoverQuery(deps.service(), deps.dfs(), audit, query),
            );
            await progress.update("concurrents", {
              counters: { done: i + 1, total: audit.queries.length + 1 },
              example: out ? query : null,
            });
            return out
              ? {
                  entries: out.entries,
                  costUsd: out.actualCostUsd,
                  cacheHit: out.cacheHit,
                  missed: false,
                }
              : { entries: 0, costUsd: 0, cacheHit: false, missed: true };
          });
          if (res.missed) missedSearches++;
        }
        await runStep("concurrents:selection", async () => {
          const out = await finalizeDiscovery(deps.service(), audit);
          return { competitors: out.competitors, selected: out.selected };
        });
      }

      const sizes = await runStep("concurrents:tailles", async () => {
        const service = deps.service();
        const [{ data: audit }, { data: comps }] = await Promise.all([
          service.from("audits").select("plan, cost_cap_usd").eq("id", run.auditId).maybeSingle(),
          service
            .from("competitors")
            .select("id, domain, selected, referring_domains, score")
            .eq("audit_id", run.auditId)
            .order("score", { ascending: false }),
        ]);
        const selected = (comps ?? []).filter((c) => c.selected);
        const measured = (comps ?? []).some((c) => c.referring_domains !== null);
        let kept = selected.map((c) => c.domain);
        if (selected.length > 0 && !measured) {
          const plan = isPlanKey(audit?.plan) ? audit.plan : "gratuit";
          const like: BacklinksRun = {
            id: run.auditId,
            workspaceId: run.workspaceId,
            domain: run.domain,
            language: "fr",
            limit: 0,
            costCapUsd: Number(audit?.cost_cap_usd ?? limitsFor(plan, run.domain).costCapUsd),
            plan,
            competitors: selected.map((c) => ({ id: c.id, domain: c.domain })),
          };
          try {
            const out = await filterCompetitorsBySize(service, deps.dfs(), like);
            kept = out.competitors.map((c) => c.domain);
          } catch (e) {
            // Une mesure de taille en panne ne doit pas arrêter l'analyse : la liste est gardée.
            logger.warn("mesure de taille impossible", {
              auditId: run.auditId,
              error: (e as Error).message,
            });
          }
        }
        const total = begin.audit ? begin.audit.queries.length + 1 : 1;
        await progress.update("concurrents", {
          status: "termine",
          counters: { done: total, total, found: kept.length, missed: missedSearches },
          example: kept[0] ?? null,
        });
        if (begin.state === "pret") await progress.feed(done("concurrents"));
        return { kept: kept.length, alreadyMeasured: measured };
      });
      if (sizes.kept === 0) return { status: "arret", message: E.noCompetitors };
      return { status: begin.state === "deja" && sizes.alreadyMeasured ? "deja" : "fait" };
    },
  };
}

/** Exemple lisible d'un appel de collecte : la requête cherchée, sinon le premier site trouvé (jamais l'id technique du step). */
const exampleOf = (o: StepOutcome): string | null =>
  o.raws.find((r) => r.query)?.query ?? o.raws[0]?.domain ?? null;

/** 4. Chercher les sites qui peuvent vous citer : requêtes par type d'éditeur, puis collecte. */
function searchStage(deps: AnalysisDeps): Stage {
  return {
    key: "recherche",
    run: async (run, tools) => {
      const { runStep, progress } = tools;
      const begin = await runStep("recherche:debut", async () => {
        const service = deps.service();
        await progress.update("recherche", { status: "en_cours" });
        const universe = await ensureQueryUniverse(
          service,
          { siteId: run.siteId, userId: run.actorId },
          deps.queries,
        );
        if (universe.status === "impossible") {
          return { state: "arret" as const, message: E.noQueries, run: null, total: 0 };
        }
        const prep = await prepareCollection(service, run.auditId, run.actorId, { resume: true });
        if (prep.status === "error") {
          return { state: "arret" as const, message: prep.message, run: null, total: 0 };
        }
        if (prep.status === "already") {
          const { count } = await service
            .from("collection_candidates")
            .select("id", { count: "exact", head: true })
            .eq("audit_id", run.auditId);
          await progress.update("recherche", {
            status: "termine",
            counters: { found: count ?? 0 },
          });
          return { state: "deja" as const, message: "", run: null, total: 0 };
        }
        const col = await beginCollection(service, run.auditId);
        if (!col) return { state: "arret" as const, message: E.interrupted, run: null, total: 0 };
        const p = col.plan;
        const total =
          (p.intersectionTargets.length >= 2 ? 1 : 0) +
          p.mentionSerp.length +
          p.mentionKeywords.length +
          p.serp.length +
          p.content.length;
        await progress.update("recherche", { counters: { done: 0, total, found: 0 } });
        return { state: "pret" as const, message: "", run: col, total };
      });
      if (begin.state === "arret") return { status: "arret", message: begin.message };
      if (begin.state === "deja" || !begin.run) return { status: "deja" };

      const col = begin.run;
      const collected = await executeCollection(
        () => ({ dfs: deps.dfs(), service: deps.service() }),
        col,
        runStep,
        {
          example: exampleOf,
          report: (r) =>
            progress.update("recherche", {
              counters: {
                done: r.done,
                total: Math.max(begin.total, r.done),
                found: r.found,
                missed: r.missed,
              },
              example: r.example,
            }),
        },
      );
      const finished = await runStep("recherche:fin", async () => {
        const out = await finalizeCollection(deps.service(), col, collected);
        await progress.update("recherche", {
          ...(out.candidates > 0 ? { status: "termine" as const } : {}),
          counters: { found: out.candidates, missed: collected.missed },
        });
        if (out.candidates > 0) await progress.feed(done("recherche"));
        return out;
      });
      // Une panne partielle ne coûte que les appels manqués ; la recherche n'échoue que si elle n'a
      // rien trouvé du tout (tous les appels manqués, ou aucun site utile).
      if (finished.candidates === 0) {
        return {
          status: "arret",
          message: collected.missed > 0 ? E.searchMissedAll : E.noCandidates,
        };
      }
      return { status: "fait" };
    },
  };
}

/** 5 et 6. Trier, puis trouver un contact : l'entonnoir de qualification, liste courte comprise. */
function qualifyStage(deps: AnalysisDeps): Stage {
  return {
    key: "tri",
    run: async (run, { runStep, progress }) => {
      const begin = await runStep("tri:debut", async () => {
        const service = deps.service();
        await progress.update("tri", { status: "en_cours" });
        const prep = await prepareQualification(service, run.auditId, run.actorId, {
          resume: true,
          keepDone: true,
        });
        if (prep.status === "error") {
          return { state: "arret" as const, message: prep.message, run: null };
        }
        if (prep.status === "already") {
          const { data } = await service
            .from("qualification_runs")
            .select("stats")
            .eq("audit_id", run.auditId)
            .maybeSingle();
          const s = (data?.stats ?? {}) as Record<string, number>;
          await progress.update("tri", {
            status: "termine",
            counters: { kept: s.alive ?? 0, found: s.relevant ?? 0 },
          });
          await progress.update("contacts", {
            status: "termine",
            counters: {
              done: s.contactsSearched ?? 0,
              total: s.contactsSearched ?? 0,
              found: s.withContact ?? 0,
            },
          });
          return { state: "deja" as const, message: "", run: null };
        }
        const q = await beginQualification(service, run.auditId);
        if (!q) return { state: "arret" as const, message: E.interrupted, run: null };
        return { state: "pret" as const, message: "", run: q };
      });
      if (begin.state === "arret") return { status: "arret", message: begin.message };
      if (begin.state === "deja" || !begin.run) return { status: "deja" };

      const q = begin.run;
      const loaded = await runStep("tri:chargement", async () => {
        const l = await loadQualificationInput(deps.service(), run.auditId);
        if (!l) throw new Error("qualification : collecte introuvable ou non terminée");
        return { ctx: l.ctx, candidates: l.candidates };
      });
      const onProgress = async (e: QualProgressEvent) => {
        if (e.phase === "lecture") {
          await progress.update("tri", {
            counters: { done: e.done, total: e.total, kept: e.found },
            example: e.example,
          });
        } else if (e.phase === "jugement") {
          await progress.update("tri", {
            counters: { judged: e.done, to_judge: e.total, found: e.found },
            example: e.example,
          });
        } else {
          if (e.done <= QUALIFY_LIMITS.contactsPerStep) {
            await progress.update("tri", { status: "termine" });
            await progress.feed(done("tri"));
          }
          await progress.update("contacts", {
            status: "en_cours",
            counters: { done: e.done, total: e.total, found: e.found },
            example: e.example,
          });
        }
      };
      const { results, stats } = await executeQualification(
        () => deps.qualDeps(loaded.ctx, q),
        toQualInput(q, loaded),
        (id, fn) => runStep(`tri:${id}`, fn),
        { onProgress },
      );
      await runStep("tri:fin", async () => {
        const out = await finalizeQualification(deps.service(), q, results, stats);
        await progress.update("tri", {
          status: "termine",
          counters: {
            done: stats.pagesRead,
            total: stats.pagesRead,
            kept: stats.alive,
            judged: stats.judged,
            found: stats.relevant,
          },
        });
        await progress.update("contacts", {
          status: "termine",
          counters: {
            done: stats.contactsSearched,
            total: stats.contactsSearched,
            found: stats.withContact,
          },
        });
        const ready = results.filter((r) => r.status === "liste_courte");
        await progress.feed([
          ...(stats.contactsSearched === 0 ? [done("tri")] : []),
          done("contacts"),
          ...ready.map((r): FeedEntry => ({
            kind: "cible",
            stepKey: "contacts",
            message: F.targetReady(r.domain),
            payload: {
              domain: r.domain,
              rank: r.rank,
              site_type: r.judgement?.siteType ?? null,
              tactics: r.tactics,
              contact: r.contact?.status ?? null,
            },
          })),
        ]);
        return out;
      });
      return { status: "fait" };
    },
  };
}

/** 7. Chercher liens morts et mentions : constats par page sur la liste courte. */
function findingsStage(deps: AnalysisDeps): Stage {
  return {
    key: "constats",
    run: async (run, { runStep, progress }) => {
      const begin = await runStep("constats:debut", async () => {
        const service = deps.service();
        await progress.update("constats", { status: "en_cours" });
        const prep = await prepareFindings(service, run.auditId, run.actorId, {
          resume: true,
          keepDone: true,
        });
        if (prep.status === "error") {
          // Liste courte vide : l'étape n'a pas d'objet, l'analyse se termine normalement.
          if (prep.message === t.findings.messages.noTargets) {
            await progress.update("constats", { status: "saute" });
            await progress.feed({
              kind: "etape",
              stepKey: "constats",
              message: F.stepSkipped(S.constats),
            });
            return { state: "saute" as const, message: "", run: null };
          }
          return { state: "arret" as const, message: prep.message, run: null };
        }
        if (prep.status === "already") {
          const { count } = await service
            .from("target_findings")
            .select("id", { count: "exact", head: true })
            .eq("audit_id", run.auditId);
          await progress.update("constats", { status: "termine", counters: { found: count ?? 0 } });
          return { state: "deja" as const, message: "", run: null };
        }
        const f = await beginFindings(service, run.auditId);
        if (!f) return { state: "arret" as const, message: E.interrupted, run: null };
        return { state: "pret" as const, message: "", run: f };
      });
      if (begin.state === "arret") return { status: "arret", message: begin.message };
      if (begin.state === "saute") return { status: "saute" };
      if (begin.state === "deja" || !begin.run) return { status: "deja" };

      const f = begin.run;
      const loaded = await runStep("constats:chargement", async () => {
        const l = await loadFindingsInput(deps.service(), run.auditId);
        if (!l) throw new Error("constats : qualification introuvable ou non terminée");
        return { ctx: l.ctx as FindingContext, targets: l.targets };
      });
      const onProgress = async (e: FindProgressEvent) => {
        await progress.update("constats", {
          counters:
            e.phase === "lecture"
              ? { done: e.done, total: e.total, dead: e.found }
              : { judged: e.done, to_judge: e.total, judged_found: e.found },
          example: e.example,
        });
      };
      const { findings, stats } = await executeFindings(
        () => deps.findDeps(f),
        toFindInput(f, loaded),
        (id, fn) => runStep(`constats:${id}`, fn),
        { onProgress },
      );
      await runStep("constats:fin", async () => {
        const out = await finalizeFindings(deps.service(), f, findings, stats);
        await progress.update("constats", {
          status: "termine",
          counters: { done: stats.targets, total: stats.targets, found: findings.length },
        });
        await progress.feed([
          done("constats"),
          ...findings.map((x): FeedEntry => ({
            kind: "constat",
            stepKey: "constats",
            message: F.finding[x.kind](x.domain),
            payload: { domain: x.domain, kind: x.kind, page_url: x.pageUrl },
          })),
        ]);
        return out;
      });
      return { status: "fait" };
    },
  };
}

/**
 * L'orchestration réelle : mêmes modules que les jobs par étape (découverte M1.3, collecte MT.3,
 * qualification MT.4, constats MT.5), enchaînés sans clic. L'ancienne chaîne (téléchargement des
 * backlinks des concurrents, liste d'opportunités, chasseur 404 d'origine) n'en fait pas partie.
 */
export function realOrchestration(deps: AnalysisDeps): Orchestration {
  return {
    begin: (auditId) => beginAnalysis(deps.service(), auditId),
    launchParallel: (run) => deps.launchLinksState(run),
    stages: [
      understandStage(deps),
      competitorsStage(deps),
      searchStage(deps),
      qualifyStage(deps),
      findingsStage(deps),
    ],
    progressFor: (run) => createProgress(deps.service(), run),
    finalize: (run) => finalizeAnalysis(deps.service(), run, deps.now?.()),
    stop: (run, key, message) => failAnalysis(deps.service(), run.auditId, message, key),
  };
}

export type { StageTools };
