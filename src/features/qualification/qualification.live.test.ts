import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { DEMO_COMPETITORS, DEMO_QUERIES, fileCache } from "@/features/collection/demo-input";
import { assertCanSpend } from "@/features/collection/guard";
import { mergeCandidates } from "@/features/collection/normalize";
import { buildCollectionPlan, estimateCollection } from "@/features/collection/plan";
import { executeCollection, type CollectionRun } from "@/features/collection/run";
import { createDataForSeoClient } from "@/lib/dataforseo";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { realQualDeps } from "./deps";
import { EVAL_CONTEXT } from "./eval-set";
import { authorityImpact, runFreeStages } from "./free";
import { executeQualification } from "./funnel";
import { batchWorstUsd, estimateQualification, QUALIFY_LIMITS } from "./limits";
import type { QualContext } from "./types";

/**
 * Run RÉEL de bout en bout sur mega-coloring.com (MT.4) : rejoue la collecte de MT.3 (mêmes requêtes,
 * cache sur fichier : un run déjà payé n'est pas repayé), mesure l'effet du filtre « autorité > 0 »
 * sur les candidats, puis qualifie (lecture des pages, LLM, contact sans finder payant). Aucune
 * écriture en base, aucun envoi, aucun achat. Plafonds : collecte 1 USD, qualification 0,10 USD,
 * contrôlés avant chaque appel payant (journal des coûts en mémoire). Ignoré sauf QUALIFY_LIVE_DEMO=1 :
 *   NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true \
 *     COLLECT_LIVE_CACHE=/tmp/collect-cache.json QUALIFY_LIVE_OUT=/tmp/qualify.json pnpm demo:qualify
 */
const live = process.env.QUALIFY_LIVE_DEMO === "1";
const AUDIT = "11111111-1111-4111-8111-111111111111";

describe.skipIf(!live)("run réel : collecte puis qualification (mega-coloring.com)", () => {
  it("qualifie les candidats sous 0,10 USD et mesure l'autorité", async () => {
    const ledger = fakeSupabase({ cost_ledger: [] });
    const dfs = createDataForSeoClient({
      costClient: ledger.client,
      cache: fileCache(process.env.COLLECT_LIVE_CACHE),
      auth:
        process.env.DATAFORSEO_PROXY_AUTH === "true"
          ? "proxy"
          : {
              login: process.env.DATAFORSEO_LOGIN ?? "",
              password: process.env.DATAFORSEO_PASSWORD ?? "",
            },
      budgetUsd: 1,
      maxCostPerCallUsd: 0.1,
    });
    const plan = buildCollectionPlan({
      queries: DEMO_QUERIES,
      competitorDomains: DEMO_COMPETITORS,
      theme: "coloriages à imprimer",
      nameVariants: ["Mega Coloring", "megacoloring"],
      domain: "mega-coloring.com",
      goal: "autorite_generale",
      targetKeywords: [],
    });
    const collectEstimate = estimateCollection(plan);
    const limits = { auditId: AUDIT, auditCapUsd: 1.1, safetyCapUsd: 5, dailyCapUsd: 25 };
    const run: CollectionRun = {
      id: "demo",
      auditId: AUDIT,
      workspaceId: "22222222-2222-4222-8222-222222222222",
      siteId: "33333333-3333-4333-8333-333333333333",
      ctx: {
        ownDomain: "mega-coloring.com",
        competitorDomains: plan.intersectionTargets,
        language: "fr",
        theme: "coloriages à imprimer",
        nameVariants: ["Mega Coloring", "megacoloring"],
        targetKeywords: [],
      },
      plan,
      limits,
      targetUsd: collectEstimate.targetUsd,
    };
    console.log(
      `Collecte annoncée : attendu ${collectEstimate.expectedUsd} USD, pire cas ${collectEstimate.worstUsd} USD`,
    );
    const progress = await executeCollection(
      () => ({ dfs, service: ledger.client }),
      run,
      (_id, fn) => fn(),
    );
    const candidates = mergeCandidates(progress.raws);
    const authority = authorityImpact(candidates);

    const ctx: QualContext = { ...EVAL_CONTEXT, contactedElsewhere: [], suppressedDomains: [] };
    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const model = process.env.LLM_MODEL ?? DEFAULT_MODELS[provider];
    const afterFree = runFreeStages(candidates, ctx).filter((v) => v.reason === null).length;
    const qualEstimate = estimateQualification(afterFree, { model });
    console.log(
      `Qualification annoncée : ${afterFree} candidats après les filtres gratuits, attendu ${qualEstimate.expectedUsd} USD, pire cas ${qualEstimate.worstUsd} USD (budget ${qualEstimate.budgetUsd})`,
    );
    const spentBefore = progress.costUsd;
    const deps = () =>
      realQualDeps(ctx, {
        llm: (remainingUsd) =>
          remainingUsd <= 0
            ? null
            : createLlmClient({
                costClient: ledger.client,
                provider,
                model,
                auth:
                  provider === "anthropic"
                    ? { apiKey: process.env.ANTHROPIC_API_KEY ?? "" }
                    : process.env.OPENAI_API_KEY
                      ? { apiKey: process.env.OPENAI_API_KEY }
                      : "proxy",
                budgetUsd: remainingUsd,
                maxCostPerCallUsd: batchWorstUsd(QUALIFY_LIMITS.batchSize, model) * 1.5,
              }),
        guard: (est) =>
          assertCanSpend(
            ledger.client,
            { ...limits, auditCapUsd: spentBefore + qualEstimate.budgetUsd },
            est,
          ),
      });
    const started = Date.now();
    const { results, stats } = await executeQualification(
      deps,
      {
        workspaceId: null,
        auditId: AUDIT,
        ctx,
        candidates,
        budgetUsd: qualEstimate.budgetUsd,
        model,
      },
      (_id, fn) => fn(),
    );
    const zeroKept = results.filter(
      (r) => r.status === "liste_courte" && r.domainRank === 0,
    ).length;
    const report = {
      announced: { collection: collectEstimate, qualification: qualEstimate },
      collection: { costUsd: progress.costUsd, candidates: candidates.length },
      authority: { ...authority, shortlistedWithZeroAuthority: zeroKept },
      qualification: { ...stats, minutes: Math.round((Date.now() - started) / 600) / 100 },
      shortlist: results
        .filter((r) => r.status === "liste_courte")
        .map((r) => ({
          rank: r.rank,
          domain: r.domain,
          type: r.judgement?.siteType,
          score: r.score,
          contact: r.contact?.status,
          request: r.requestLines,
          why: r.why,
          platformHosted: r.platformHosted,
        })),
      excludedSample: results
        .filter((r) => r.status === "exclu")
        .slice(0, 60)
        .map((r) => ({
          domain: r.domain,
          stage: r.stageReached,
          reason: r.exclusionReason,
          detail: r.exclusionDetail,
        })),
    };
    console.log(
      JSON.stringify(
        { collection: report.collection, authority: report.authority, funnel: stats },
        null,
        2,
      ),
    );
    if (process.env.QUALIFY_LIVE_OUT)
      writeFileSync(process.env.QUALIFY_LIVE_OUT, JSON.stringify(report, null, 2));
    expect(stats.costUsd).toBeLessThanOrEqual(qualEstimate.budgetUsd + 1e-9);
  }, 3_600_000);
});
