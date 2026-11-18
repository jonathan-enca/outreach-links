import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { runFreeStages } from "@/features/qualification/free";
import type { QualCandidate, QualContext } from "@/features/qualification/types";
import { createDataForSeoClient } from "@/lib/dataforseo";
import { createLlmClient } from "@/lib/llm";
import { fileCache } from "./demo-input";
import { mergeCandidates } from "./normalize";
import { buildCollectionPlan, estimateCollection } from "./plan";
import { executeCollection, type CollectionRun, type StepOutcome } from "./run";

/**
 * Mesure RÉELLE de MC.6a sur un site (payant : ~0,26 USD, ignoré sauf CITATIONS_LIVE=1). Entrée : un fichier
 * JSON (CITATIONS_LIVE_INPUT) avec le site, les concurrents retenus de l'audit et les recherches par sujet.
 * Elle exécute la VRAIE collecte, réduite à un lot de recherches Google (vraies adresses comprises) puis la
 * phase « citations », et écrit un rapport (CITATIONS_LIVE_OUT) : ressources choisies, coût et durée par
 * appel, entonnoir du filtre gratuit, exemples de pages. Aucune écriture en base, aucun envoi. Lancer :
 *   CITATIONS_LIVE=1 CITATIONS_LIVE_INPUT=entree.json CITATIONS_LIVE_OUT=rapport.json \
 *   NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true pnpm vitest run src/features/collection/citations.live.test.ts
 */
const live = process.env.CITATIONS_LIVE === "1";

describe.skipIf(!live)("mesure réelle : pages qui citent des ressources comparables", () => {
  it("mesure coût, délai, entonnoir et exemples", async () => {
    const input = JSON.parse(readFileSync(process.env.CITATIONS_LIVE_INPUT ?? "", "utf8")) as {
      site: { domain: string; niche: string; language: string; country: string };
      competitors: { domain: string; ref: number | null; sample: string | null }[];
      profile?: { activity: string; offer: string; audience: string[]; pages: string[] };
      queries: { q: string; tactic: "inconnus" | "ressources"; persona: string; rank: number }[];
    };
    const ledger = fakeSupabase();
    const dfs = createDataForSeoClient({
      costClient: ledger.client,
      cache: fileCache(process.env.CITATIONS_LIVE_CACHE),
      auth: "proxy",
      budgetUsd: 1,
      maxCostPerCallUsd: 0.1,
    });
    const queries = input.queries.map((x, i) => ({
      ...x,
      target: "home" as const,
      keyword: null,
      score: 1 - i / 100,
      estUsd: 0.006,
      origin: "regle" as const,
    }));
    const competitorDomains = input.competitors.map((c) => c.domain);
    const plan = buildCollectionPlan({
      queries,
      competitorDomains,
      competitors: input.competitors.map((c) => ({
        domain: c.domain,
        referringDomains: c.ref,
        sampleUrl: c.sample,
      })),
      language: input.site.language,
      theme: input.site.niche,
      nameVariants: [],
      domain: input.site.domain,
      goal: "autorite_generale",
      targetKeywords: [],
    });
    // Mesure réduite : ni recoupement, ni liens morts, ni mentions, ni Content Analysis.
    const reduced = {
      ...plan,
      intersectionTargets: [],
      deadPages: [],
      mentionSerp: [],
      mentionKeywords: [],
      content: [],
      serp: plan.serp.slice(0, 14),
    };
    const estimate = estimateCollection(reduced);
    const ctx = {
      ownDomain: input.site.domain,
      competitorDomains,
      language: input.site.language,
      country: input.site.country,
      theme: input.site.niche,
      nameVariants: [],
      targetKeywords: [],
      ...(input.profile
        ? {
            site: {
              domain: input.site.domain,
              theme: input.site.niche,
              ...input.profile,
            },
          }
        : {}),
    };
    const llm = createLlmClient({
      costClient: ledger.client as never,
      provider: process.env.ANTHROPIC_API_KEY ? "anthropic" : "openai",
      auth: process.env.ANTHROPIC_API_KEY
        ? { apiKey: process.env.ANTHROPIC_API_KEY }
        : process.env.OPENAI_API_KEY
          ? { apiKey: process.env.OPENAI_API_KEY }
          : "proxy",
      budgetUsd: 0.1,
      maxCostPerCallUsd: 0.05,
    });
    const run: CollectionRun = {
      id: "mesure",
      auditId: "11111111-1111-4111-8111-111111111111",
      workspaceId: "22222222-2222-4222-8222-222222222222",
      siteId: "33333333-3333-4333-8333-333333333333",
      ctx,
      plan: reduced,
      limits: {
        auditId: "11111111-1111-4111-8111-111111111111",
        auditCapUsd: 1,
        safetyCapUsd: 5,
        dailyCapUsd: 25,
      },
      targetUsd: estimate.targetUsd,
    };
    const steps: { id: string; costUsd: number; rows: number; ms: number | undefined }[] = [];
    const progress = await executeCollection(
      () => ({ dfs: dfs as never, service: ledger.client, llm }),
      run,
      async (id, fn) => {
        const out = await fn();
        if (Array.isArray(out)) {
          for (const o of out as StepOutcome[]) {
            steps.push({ id: `${id}/${o.label}`, costUsd: o.costUsd, rows: o.rows, ms: o.ms });
          }
        }
        return out;
      },
    );

    const merged = mergeCandidates(progress.raws);
    const citations = progress.raws.filter((r) => r.source === "citation");
    const qctx: QualContext = {
      ownDomain: input.site.domain,
      competitorDomains,
      language: input.site.language,
      theme: input.site.niche,
      brandName: "",
      activity: "",
      audience: [],
      resources: [],
      contactedElsewhere: [],
      suppressedDomains: [],
      suppressedEmails: [],
    };
    const asQual = (m: (typeof merged)[number]): QualCandidate => ({ ...m });
    const verdicts = runFreeStages(merged.map(asQual), qctx);
    const reasons: Record<string, number> = {};
    for (const v of verdicts) {
      const k = v.reason ?? "garde";
      reasons[k] = (reasons[k] ?? 0) + 1;
    }
    const keptCites = verdicts
      .filter((v) => !v.reason && v.candidate.sources.some((s) => s.source === "citation"))
      .map((v) => v.candidate);
    const byResource: Record<string, { rows: number; kept: number }> = {};
    for (const r of citations) {
      const b = (byResource[r.persona ?? "?"] ??= { rows: 0, kept: 0 });
      b.rows++;
    }
    for (const c of keptCites) {
      for (const s of c.sources) {
        if (s.source === "citation" && s.persona && byResource[s.persona])
          byResource[s.persona]!.kept++;
      }
    }
    const report = {
      site: input.site.domain,
      announced: { expectedUsd: estimate.expectedUsd, worstUsd: estimate.worstUsd },
      actualCostUsd: progress.costUsd,
      stats: progress.stats,
      resources: progress.stats.citations.resources,
      planned: plan.citations,
      citationRaws: citations.length,
      mergedCandidates: merged.length,
      freeFilter: reasons,
      citationsKept: keptCites.length,
      byResource,
      steps,
      examples: keptCites.slice(0, 40).map((c) => ({
        domain: c.domain,
        url: c.url,
        title: c.title,
        cites: c.sources.find((s) => s.source === "citation")?.persona,
        rank: c.domainRank,
      })),
    };
    console.log(
      JSON.stringify({ site: report.site, cost: report.actualCostUsd, kept: report.citationsKept }),
    );
    if (process.env.CITATIONS_LIVE_OUT)
      writeFileSync(process.env.CITATIONS_LIVE_OUT, JSON.stringify(report, null, 2));
    expect(progress.costUsd).toBeLessThanOrEqual(1);
  }, 900_000);
});
