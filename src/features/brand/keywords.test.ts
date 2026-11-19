import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { LINKS_STATE_LIMITS } from "@/features/analysis/estimate";
import type { CostClient } from "@/lib/costs";
import { cacheKey, MemoryCache } from "@/lib/dataforseo/cache";
import { createDataForSeoClient } from "@/lib/dataforseo/client";
import { endpoints, estimateCost } from "@/lib/dataforseo/endpoints";
import { loadRankedKeywords, rankedKeywordsParams, type KeywordsDeps } from "./keywords";
import { PAGE_RANK, RANKED_KEYWORDS_LIMIT } from "./limits";

const envelope: unknown = JSON.parse(
  readFileSync(
    path.join(__dirname, "../../lib/dataforseo/fixtures/labs-ranked-keywords.json"),
    "utf8",
  ),
);

/** Vrai client DataForSEO (cache et journal des coûts réels), réseau et base remplacés. */
function setup(
  over: { fetch?: () => Promise<Response>; dailySpend?: number; dailyCap?: number } = {},
) {
  const rows: Record<string, unknown>[] = [];
  const chain = {
    insert: (row: Record<string, unknown>) => {
      rows.push(row);
      return chain;
    },
    select: () => chain,
    single: async () => ({ data: { id: rows.length }, error: null }),
  };
  const costClient = { from: vi.fn(() => chain) } as unknown as CostClient;
  const fetchImpl = vi.fn<typeof fetch>(
    over.fetch ??
      (async () =>
        new Response(JSON.stringify(envelope), {
          status: 200,
          headers: { "content-type": "application/json" },
        })),
  );
  const cache = new MemoryCache();
  const makeClient = vi.fn(() =>
    createDataForSeoClient({
      costClient,
      cache,
      auth: { login: "user@example.com", password: "pw" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleep: async () => {},
      maxCostPerCallUsd: PAGE_RANK.maxCostUsd,
      maxRetries: 0,
    }),
  );
  const deps: KeywordsDeps = {
    dfs: makeClient,
    dailySpendUsd: async () => over.dailySpend ?? 0,
    dailyCapUsd: over.dailyCap ?? 25,
  };
  return { deps, rows, fetchImpl, makeClient };
}

const INPUT = { domain: "mega-coloring.com", country: "FR", language: "fr", workspaceId: null };

describe("mots-clés positionnés à l'onboarding (MC.7)", () => {
  it("mêmes paramètres que l'état des lieux de l'analyse : même entrée de cache", () => {
    const params = rankedKeywordsParams("exemple.fr", { country: "FR", language: "fr" });
    expect(params).toEqual({
      target: "exemple.fr",
      limit: 100,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
      location_code: 2250,
      language_code: "fr",
    });
    expect(LINKS_STATE_LIMITS.rankedKeywords).toBe(RANKED_KEYWORDS_LIMIT);
    const spec = endpoints.labsRankedKeywords;
    expect(cacheKey(spec.name, spec.params.parse(params))).toBe(
      cacheKey(spec.name, spec.params.parse(rankedKeywordsParams("exemple.fr"))),
    );
    // Un autre marché est une autre recherche : jamais la réponse d'un autre pays.
    expect(rankedKeywordsParams("exemple.fr", { country: "GB", language: "en" })).toMatchObject({
      location_code: 2826,
      language_code: "en",
    });
    expect(estimateCost("labsRankedKeywords", params)).toBeLessThanOrEqual(PAGE_RANK.maxCostUsd);
  });

  it("un appel, coût enregistré dans cost_ledger ; le même domaine n'est pas payé deux fois", async () => {
    const { deps, rows, fetchImpl } = setup();
    const first = await loadRankedKeywords(deps, { ...INPUT, workspaceId: null });
    expect(first.length).toBeGreaterThan(0);
    expect(first[0]).toMatchObject({ keyword: "coloriage licorne", position: 14, volume: 74_000 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: "dataforseo",
      operation: "labs.ranked_keywords",
      audit_id: null,
    });
    expect(Number(rows[0]!.estimated_cost_usd)).toBeGreaterThan(0);

    // Deuxième demande (l'état des lieux de l'analyse, ou un second onboarding) : servie par le cache.
    const second = await loadRankedKeywords(deps, {
      ...INPUT,
      auditId: "0b0f6a0e-5f0e-4f6e-9d57-0d5f0c0f9a11",
    });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      estimated_cost_usd: 0,
      actual_cost_usd: 0,
      audit_id: "0b0f6a0e-5f0e-4f6e-9d57-0d5f0c0f9a11",
    });
    expect((rows[1]!.metadata as { cacheHit: boolean }).cacheHit).toBe(true);
  });

  it("plafond quotidien atteint : aucun appel, liste vide", async () => {
    const { deps, fetchImpl, makeClient } = setup({ dailySpend: 24.99, dailyCap: 25 });
    expect(await loadRankedKeywords(deps, INPUT)).toEqual([]);
    expect(makeClient).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("panne du fournisseur, délai dépassé ou identifiants absents : liste vide, jamais d'exception", async () => {
    const down = setup({
      fetch: async () => {
        throw new Error("réseau coupé");
      },
    });
    expect(await loadRankedKeywords(down.deps, INPUT)).toEqual([]);
    expect(down.rows).toHaveLength(0);

    const refused = setup({ fetch: async () => new Response("{}", { status: 500 }) });
    expect(await loadRankedKeywords(refused.deps, INPUT)).toEqual([]);

    const noCredentials: KeywordsDeps = {
      dfs: () => {
        throw new Error("DATAFORSEO_LOGIN manquant");
      },
      dailySpendUsd: async () => 0,
      dailyCapUsd: 25,
    };
    expect(await loadRankedKeywords(noCredentials, INPUT)).toEqual([]);

    const ledgerDown: KeywordsDeps = {
      ...setup().deps,
      dailySpendUsd: async () => {
        throw new Error("base injoignable");
      },
    };
    expect(await loadRankedKeywords(ledgerDown, INPUT)).toEqual([]);
  });
});
