import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { PlannedQuery } from "@/features/queries/schema";
import { createDataForSeoClient, MemoryCache } from "@/lib/dataforseo";
import { buildCollectionPlan, estimateCollection } from "./plan";
import { executeCollection, type CollectionRun, type StepOutcome } from "./run";
import { mergeCandidates } from "./normalize";

/**
 * Run RÉEL borné de la collecte (MT.3) sur mega-coloring.com : confirme le français, les tarifs et les
 * formats de Domain Intersection, de la SERP et de Content Analysis. Payant (plafond dur 1 USD pour tout
 * le run, 0,10 USD par appel), ignoré sauf COLLECT_LIVE_DEMO=1. Aucune écriture en base : journal des
 * coûts et cache en mémoire ; aucun envoi, aucun achat. Lancer :
 *   NODE_USE_ENV_PROXY=1 DATAFORSEO_PROXY_AUTH=true COLLECT_LIVE_OUT=/chemin/rapport.json pnpm demo:collect
 * (ou avec DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD). Le rapport donne, par phase, appels, coût estimé et
 * réel, lignes, nouveaux domaines, la répartition des langues et la FORME d'un premier élément de chaque
 * endpoint : à reporter dans PROGRESS.md (« Mesures ») et à confronter aux tarifs de `PRICING`.
 */
const live = process.env.COLLECT_LIVE_DEMO === "1";

const q = (
  i: number,
  text: string,
  persona: string,
  tactic: PlannedQuery["tactic"] = "inconnus",
): PlannedQuery => ({
  q: text,
  tactic,
  persona,
  target: "home",
  keyword: null,
  score: 1 - i / 100,
  rank: i,
  estUsd: 0.006,
  origin: "regle",
});

const QUERIES: PlannedQuery[] = [
  q(1, '"Mega Coloring" -site:mega-coloring.com', "", "mentions"),
  q(2, '"megacoloring" -site:mega-coloring.com', "", "mentions"),
  q(3, "coloriages à imprimer blog de classe", "Enseignants"),
  q(4, "coloriages à imprimer ressources maternelle", "Enseignants", "ressources"),
  q(5, "activités enfants coloriages blog maman", "Parents blogueurs"),
  q(6, "coloriages à imprimer médiathèque", "Médiathèques"),
  q(7, "coloriages à imprimer centre de loisirs", "Associations"),
  q(8, "coloriages à imprimer liens utiles", "Enseignants", "ressources"),
  q(9, "forum parents activités coloriage", "Parents blogueurs"),
  q(10, "coloriages à imprimer association", "Associations"),
].map((x, i) => ({ ...x, rank: i + 1 }));

describe.skipIf(!live)("run réel borné de la collecte (mega-coloring.com)", () => {
  it("mesure les coûts, le français et les formats", async () => {
    const ledger = fakeSupabase();
    const dfsReal = createDataForSeoClient({
      costClient: ledger.client,
      cache: new MemoryCache(),
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

    // Premières lignes brutes de chaque endpoint (forme des champs), sans coût en plus.
    const formats: Record<string, unknown> = {};
    const dfs = {
      serpOrganicLive: async (...a: Parameters<typeof dfsReal.serpOrganicLive>) => {
        const out = await dfsReal.serpOrganicLive(...a);
        formats.serp ??= { keys: Object.keys(out.result ?? {}), item: out.result?.items?.[0] };
        return out;
      },
      backlinksDomainIntersection: async (
        ...a: Parameters<typeof dfsReal.backlinksDomainIntersection>
      ) => {
        const out = await dfsReal.backlinksDomainIntersection(...a);
        formats.intersection ??= {
          keys: Object.keys(out.result ?? {}),
          total_count: out.result?.total_count,
          item: out.result?.items?.[0],
        };
        return out;
      },
      contentAnalysisSearch: async (...a: Parameters<typeof dfsReal.contentAnalysisSearch>) => {
        const out = await dfsReal.contentAnalysisSearch(...a);
        const items = out.result?.items ?? [];
        const langs: Record<string, number> = {};
        for (const i of items) {
          const l = String(i.language ?? i.content_info?.language ?? "inconnue");
          langs[l] = (langs[l] ?? 0) + 1;
        }
        const list = ((formats.content as { calls: unknown[] } | undefined) ?? { calls: [] }) as {
          calls: unknown[];
          keys?: string[];
          item?: unknown;
        };
        list.keys ??= Object.keys(out.result ?? {});
        list.item ??= items[0];
        list.calls.push({
          keyword: a[0].keyword,
          pageType: a[0].page_type?.[0] ?? null,
          rows: items.length,
          total_count: out.result?.total_count,
          languages: langs,
          estimatedUsd: out.estimatedCostUsd,
          actualUsd: out.actualCostUsd,
        });
        formats.content = list;
        return out;
      },
    };

    const plan = buildCollectionPlan({
      queries: QUERIES,
      competitorDomains: ["coloriez.com", "hugolescargot.com", "tete-a-modeler.com", "momes.net"],
      theme: "coloriages à imprimer",
      nameVariants: ["Mega Coloring", "megacoloring"],
      domain: "mega-coloring.com",
      goal: "autorite_generale",
      targetKeywords: [],
    });
    const estimate = estimateCollection(plan);
    const run: CollectionRun = {
      id: "demo",
      auditId: "11111111-1111-4111-8111-111111111111",
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
      limits: {
        auditId: "11111111-1111-4111-8111-111111111111",
        auditCapUsd: 1,
        safetyCapUsd: 5,
        dailyCapUsd: 25,
      },
      targetUsd: estimate.targetUsd,
    };

    const steps: {
      id: string;
      costUsd: number;
      rows: number;
      cacheHit: boolean;
      blocked: boolean;
    }[] = [];
    const progress = await executeCollection(
      () => ({ dfs: dfs as never, service: ledger.client }),
      run,
      async (id, fn) => {
        const out = await fn();
        const o = out as unknown as StepOutcome;
        steps.push({
          id,
          costUsd: o.costUsd,
          rows: o.rows,
          cacheHit: o.cacheHit,
          blocked: o.blocked,
        });
        return out;
      },
    );
    const merged = mergeCandidates(progress.raws);
    const report = {
      announced: {
        expectedUsd: estimate.expectedUsd,
        worstUsd: estimate.worstUsd,
        calls: estimate.calls,
      },
      actual: {
        costUsd: progress.costUsd,
        candidates: merged.length,
        stop: progress.overallStop(),
      },
      phases: progress.stats,
      steps,
      formats,
      top: merged.slice(0, 40).map((m) => ({
        domain: m.domain,
        tactics: m.tactics,
        competitors: m.competitorsCount,
        rank: m.domainRank,
        sources: m.sources.map((s) => s.source),
        url: m.url,
      })),
    };
    console.log(JSON.stringify({ announced: report.announced, actual: report.actual }));
    if (process.env.COLLECT_LIVE_OUT)
      writeFileSync(process.env.COLLECT_LIVE_OUT, JSON.stringify(report, null, 2));
    expect(progress.costUsd).toBeLessThanOrEqual(1);
  }, 600_000);
});
