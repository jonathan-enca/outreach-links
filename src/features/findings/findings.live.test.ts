import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { DEMO_COMPETITORS, DEMO_QUERIES, fileCache } from "@/features/collection/demo-input";
import { assertCanSpend } from "@/features/collection/guard";
import { mergeCandidates } from "@/features/collection/normalize";
import { buildCollectionPlan } from "@/features/collection/plan";
import { executeCollection, type CollectionRun } from "@/features/collection/run";
import { createDataForSeoClient } from "@/lib/dataforseo";
import { createLlmClient, DEFAULT_MODELS } from "@/lib/llm/client";
import { realFindDeps } from "./deps";
import { FINDING_EVAL_CONTEXT } from "./eval-set";
import { executeFindings } from "./funnel";
import { callWorstUsd, estimateFindings } from "./limits";

/**
 * Run RÉEL des constats par page sur la liste courte d'un run `demo:qualify` (mega-coloring.com).
 * Les pages des cibles sont retrouvées par la collecte rejouée depuis le cache fichier (aucun appel
 * DataForSEO payant si le cache est complet). Plafond LLM 0,05 USD, aucun envoi, aucune écriture en
 * base. Ignoré sauf FINDINGS_LIVE_DEMO=1 :
 *   NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true LLM_PROXY_AUTH=true \
 *     COLLECT_LIVE_CACHE=/tmp/collect-cache.json QUALIFY_LIVE_IN=/tmp/qualify.json \
 *     FINDINGS_LIVE_OUT=/tmp/findings.json pnpm demo:findings
 */
const live = process.env.FINDINGS_LIVE_DEMO === "1";
const AUDIT = "11111111-1111-4111-8111-111111111111";

describe.skipIf(!live)("run réel : constats par page (mega-coloring.com)", () => {
  it("analyse les pages de la liste courte sous 0,05 USD", async () => {
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
      budgetUsd: 0.05,
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
      targetUsd: 0.55,
    };
    const progress = await executeCollection(
      () => ({ dfs, service: ledger.client }),
      run,
      (_id, fn) => fn(),
    );
    expect(progress.costUsd).toBeLessThan(0.05);
    const urlOf = new Map(mergeCandidates(progress.raws).map((c) => [c.domain, c.url]));
    const report = JSON.parse(readFileSync(process.env.QUALIFY_LIVE_IN ?? "", "utf8")) as {
      shortlist: { rank: number; domain: string }[];
    };
    const targets = report.shortlist.map((s) => ({
      targetId: s.domain,
      domain: s.domain,
      url: urlOf.get(s.domain) ?? `https://${s.domain}/`,
      rank: s.rank,
      resource: 0,
    }));

    const provider = process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai";
    const model = process.env.LLM_MODEL ?? DEFAULT_MODELS[provider];
    const estimate = estimateFindings(targets.length, { model });
    console.log(
      `Analyse annoncée : ${estimate.targets} pages, attendu ${estimate.expectedUsd} USD, pire cas ${estimate.worstUsd} USD (budget ${estimate.budgetUsd})`,
    );
    const ctx = { ...FINDING_EVAL_CONTEXT, competitorDomains: plan.intersectionTargets };
    const started = Date.now();
    const { findings, stats } = await executeFindings(
      () =>
        realFindDeps({
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
                  maxCostPerCallUsd: callWorstUsd(model) * 1.5,
                }),
          guard: (est) => assertCanSpend(ledger.client, limits, est),
        }),
      { workspaceId: null, auditId: AUDIT, ctx, targets, budgetUsd: estimate.budgetUsd, model },
      (_id, fn) => fn(),
    );
    const out = {
      announced: estimate,
      stats: { ...stats, minutes: Math.round((Date.now() - started) / 600) / 100 },
      findings,
    };
    console.log(JSON.stringify(out.stats, null, 2));
    if (process.env.FINDINGS_LIVE_OUT)
      writeFileSync(process.env.FINDINGS_LIVE_OUT, JSON.stringify(out, null, 2));
    expect(stats.costUsd).toBeLessThanOrEqual(estimate.budgetUsd + 1e-9);
  }, 3_600_000);
});
