import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { CostClient } from "@/lib/costs";
import { cacheKey, MemoryCache, stableStringify } from "./cache";
import {
  BudgetExceededError,
  createDataForSeoClient,
  DataForSeoError,
  type DataForSeoClientOptions,
} from "./client";
import { estimateBatch, estimateCost } from "./endpoints";
import { normalizeDomain } from "./schemas";

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(__dirname, "fixtures", `${name}.json`), "utf8"));
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Faux client Supabase : mémorise les lignes insérées dans cost_ledger. */
function fakeCostClient() {
  const rows: Record<string, unknown>[] = [];
  const chain = {
    insert: (row: Record<string, unknown>) => {
      rows.push(row);
      return chain;
    },
    select: () => chain,
    single: async () => ({ data: { id: rows.length }, error: null }),
  };
  return { client: { from: vi.fn(() => chain) } as unknown as CostClient, rows };
}

function setup(
  responses: Array<unknown | (() => Response)>,
  extra: Partial<DataForSeoClientOptions> = {},
) {
  const { client: costClient, rows } = fakeCostClient();
  const queue = [...responses];
  const fetchImpl = vi.fn<typeof fetch>(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error("fetch inattendu");
    return typeof next === "function" ? (next as () => Response)() : jsonResponse(next);
  });
  const cache = new MemoryCache();
  const client = createDataForSeoClient({
    costClient,
    cache,
    auth: { login: "user@example.com", password: "pw" },
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async () => {},
    ...extra,
  });
  return { client, rows, fetchImpl, cache };
}

describe("SERP organic live", () => {
  it("envoie la bonne requête (France, français, depth 30) et valide le résultat", async () => {
    const { client, fetchImpl } = setup([fixture("serp-organic-live")]);
    const out = await client.serpOrganicLive({ keyword: "  Coloriage  Licorne " });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe("https://api.dataforseo.com/v3/serp/google/organic/live/advanced");
    expect(JSON.parse(init!.body as string)).toEqual([
      {
        keyword: "coloriage licorne",
        location_code: 2250,
        language_code: "fr",
        depth: 30,
        device: "desktop",
      },
    ]);
    expect((init!.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from("user@example.com:pw").toString("base64")}`,
    );
    expect(out.result?.items?.[0]?.domain).toBe("www.hugolescargot.com");
    expect(out.estimatedCostUsd).toBe(0.006);
    expect(out.actualCostUsd).toBe(0.006);
    expect(out.cacheHit).toBe(false);
  });

  it("journalise le coût estimé et réel dans cost_ledger", async () => {
    const { client, rows } = setup([fixture("serp-organic-live")]);
    await client.serpOrganicLive(
      { keyword: "coloriage licorne" },
      { auditId: "7b0f4c1e-5b7a-4c53-9f0e-0d8f6f5a1111" },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: "dataforseo",
      operation: "serp.organic.live",
      audit_id: "7b0f4c1e-5b7a-4c53-9f0e-0d8f6f5a1111",
      estimated_cost_usd: 0.006,
      actual_cost_usd: 0.006,
    });
  });

  it("sert le deuxième appel identique depuis le cache, coût réel 0, sans réseau", async () => {
    const { client, rows, fetchImpl } = setup([fixture("serp-organic-live")]);
    await client.serpOrganicLive({ keyword: "coloriage licorne" });
    const second = await client.serpOrganicLive({ keyword: "COLORIAGE licorne", depth: 30 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second.cacheHit).toBe(true);
    expect(second.actualCostUsd).toBe(0);
    expect(second.result?.items).toHaveLength(3);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ actual_cost_usd: 0, estimated_cost_usd: 0 });
    expect((rows[1]!.metadata as { cacheHit: boolean }).cacheHit).toBe(true);
  });

  it("un cache en panne en lecture n'empêche pas l'appel", async () => {
    const broken = {
      get: async () => {
        throw new Error("panne");
      },
      set: async () => {},
    };
    const { client, fetchImpl } = setup([fixture("serp-organic-live")], { cache: broken });
    const out = await client.serpOrganicLive({ keyword: "coloriage licorne" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(out.cacheHit).toBe(false);
  });

  it("bypassCache force un appel frais", async () => {
    const { client, fetchImpl } = setup([
      fixture("serp-organic-live"),
      fixture("serp-organic-live"),
    ]);
    await client.serpOrganicLive({ keyword: "a b" });
    await client.serpOrganicLive({ keyword: "a b" }, { bypassCache: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("n'utilise plus une entrée expirée", async () => {
    let now = 1_000_000;
    const cache = new MemoryCache(() => now);
    const { client, fetchImpl } = setup(
      [fixture("serp-organic-live"), fixture("serp-organic-live")],
      { cache },
    );
    await client.serpOrganicLive({ keyword: "x y" }, { ttlSeconds: 60 });
    now += 61_000;
    await client.serpOrganicLive({ keyword: "x y" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejette des paramètres invalides avant tout appel", async () => {
    const { client, fetchImpl } = setup([]);
    await expect(client.serpOrganicLive({ keyword: "" })).rejects.toThrow();
    await expect(client.serpOrganicLive({ keyword: "ok", depth: 500 })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("authentification", () => {
  it("mode proxy : aucun en-tête Authorization", async () => {
    const { client, fetchImpl } = setup([fixture("backlinks-summary")], { auth: "proxy" });
    await client.backlinksSummary({ target: "mega-coloring.com" });
    const headers = fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("lit les identifiants au moment de l'usage (erreur claire si absents)", async () => {
    const { client, fetchImpl } = setup([], {
      auth: () => {
        throw new Error("DATAFORSEO_LOGIN : variable requise");
      },
    });
    await expect(client.backlinksSummary({ target: "mega-coloring.com" })).rejects.toThrow(
      /DATAFORSEO_LOGIN/,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("erreur API 40100 : DataForSeoError de type api, rien en cache ni dans le journal", async () => {
    const { client, rows, cache } = setup([fixture("error-unauthorized")]);
    const err = await client.backlinksSummary({ target: "mega-coloring.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(DataForSeoError);
    expect(err).toMatchObject({ kind: "api", code: 40100 });
    expect(rows).toHaveLength(0);
    expect(cache.entries.size).toBe(0);
  });
});

describe("autres endpoints", () => {
  it("Labs ranked_keywords : domaine normalisé, défauts, résultat typé", async () => {
    const { client, fetchImpl } = setup([fixture("labs-ranked-keywords")]);
    const out = await client.labsRankedKeywords({
      target: "https://www.Mega-Coloring.com/",
      limit: 2,
    });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)[0];
    expect(body).toMatchObject({ target: "mega-coloring.com", location_code: 2250, limit: 2 });
    expect(fetchImpl.mock.calls[0]![0]).toContain("/dataforseo_labs/google/ranked_keywords/live");
    expect(out.result?.items?.[0]?.keyword_data.keyword).toBe("coloriage licorne");
    // un item sans volume ni position reste valide
    expect(out.result?.items?.[1]?.ranked_serp_element).toBeNull();
  });

  it("Labs competitors_domain", async () => {
    const { client } = setup([fixture("labs-competitors-domain")]);
    const out = await client.labsCompetitorsDomain({ target: "mega-coloring.com", limit: 10 });
    expect(out.result?.items?.[0]?.domain).toBe("coloriez.com");
  });

  it("Backlinks summary, referring_domains, backlinks", async () => {
    const { client } = setup([
      fixture("backlinks-summary"),
      fixture("backlinks-referring-domains"),
      fixture("backlinks-backlinks"),
    ]);
    const s = await client.backlinksSummary({ target: "mega-coloring.com" });
    expect(s.result?.referring_domains).toBe(58);
    const d = await client.backlinksReferringDomains({ target: "mega-coloring.com" });
    expect(d.result?.items?.[0]?.domain).toBe("ecole-primaire.fr");
    const b = await client.backlinksBacklinks({ target: "mega-coloring.com", limit: 1 });
    expect(b.result?.items?.[0]).toMatchObject({ anchor: "coloriages licorne", dofollow: true });
  });

  it("Backlinks sans résultat : result null, pas d'erreur", async () => {
    const { client } = setup([fixture("backlinks-empty")]);
    const out = await client.backlinksBacklinks({ target: "nouveau-site.fr" });
    expect(out.result).toBeNull();
  });

  it("domain_intersection : construit l'objet targets { '1': ..., '2': ... }", async () => {
    const { client, fetchImpl } = setup([fixture("backlinks-domain-intersection")]);
    const out = await client.backlinksDomainIntersection({
      targets: ["coloriez.com", "https://www.hugolescargot.com"],
      exclude_targets: ["mega-coloring.com"],
    });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)[0];
    expect(body.targets).toEqual({ "1": "coloriez.com", "2": "hugolescargot.com" });
    expect(body.exclude_targets).toEqual(["mega-coloring.com"]);
    expect(out.result?.items?.[0]?.domain_intersection["1"]).toBeTruthy();
  });

  it("domain_intersection : le mode partiel est transmis", async () => {
    const { client, fetchImpl } = setup([fixture("backlinks-domain-intersection")]);
    await client.backlinksDomainIntersection({
      targets: ["coloriez.com", "hugolescargot.com", "tete-a-modeler.com"],
      intersection_mode: "partial",
      limit: 500,
    });
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)[0];
    expect(body.intersection_mode).toBe("partial");
    expect(body.limit).toBe(500);
  });

  it("domain_intersection : format RÉEL du mode partiel (summary numérique, domaine dans `target`)", async () => {
    const { client } = setup([fixture("backlinks-domain-intersection-partial.live")]);
    const out = await client.backlinksDomainIntersection({
      targets: ["coloriez.com", "hugolescargot.com", "tete-a-modeler.com"],
      intersection_mode: "partial",
      limit: 5,
    });
    expect(out.result?.items?.[0]?.domain_intersection["1"]).toMatchObject({
      target: "coloriageonly.web.app",
    });
    expect(out.result?.items?.[0]?.summary).toEqual({ intersections_count: 2 });
  });

  it("Content Analysis search : format RÉEL (langue, pays, rang, spam, types de page)", async () => {
    const { client } = setup([fixture("content-analysis-search.live")]);
    const out = await client.contentAnalysisSearch({
      keyword: "coloriages à imprimer",
      page_type: ["blogs"],
      limit: 2,
    });
    const first = out.result?.items?.[0];
    expect(first).toMatchObject({ type: "content_analysis_search" });
    expect(typeof first?.main_domain).toBe("string");
    expect(first?.language).toBe("fr");
    expect(typeof first?.domain_rank).toBe("number");
    expect(typeof first?.spam_score).toBe("number");
  });

  it("Content Analysis search : corps, résultat, coût journalisé", async () => {
    const { client, fetchImpl, rows } = setup([fixture("content-analysis-search")]);
    const out = await client.contentAnalysisSearch(
      { keyword: "coloriages à imprimer", page_type: ["blogs", "organization"], limit: 10 },
      { auditId: "11111111-1111-4111-8111-111111111111" },
    );
    const body = JSON.parse(fetchImpl.mock.calls[0]![1]!.body as string)[0];
    expect(fetchImpl.mock.calls[0]![0]).toContain("/v3/content_analysis/search/live");
    expect(body).toMatchObject({
      keyword: "coloriages à imprimer",
      page_type: ["blogs", "organization"],
      search_mode: "one_per_domain",
      limit: 10,
    });
    expect(out.result?.items).toHaveLength(3);
    expect(out.estimatedCostUsd).toBeCloseTo(0.024 + 10 * 0.000036, 6);
    expect(rows[0]).toMatchObject({ operation: "content_analysis.search" });
  });

  it("OnPage instant_pages", async () => {
    const { client } = setup([fixture("onpage-instant-pages")]);
    const out = await client.onpageInstantPages({ url: "https://mega-coloring.com/licorne" });
    expect(out.result?.items?.[0]?.status_code).toBe(200);
  });

  it("une réponse qui viole le schéma du résultat lève une erreur claire", async () => {
    const bad = structuredClone(fixture("serp-organic-live")) as { tasks: { result: unknown[] }[] };
    bad.tasks[0]!.result = [{ items: "pas un tableau" }];
    const { client } = setup([bad]);
    await expect(client.serpOrganicLive({ keyword: "x y" })).rejects.toThrow();
  });
});

describe("mode différé (SERP)", () => {
  it("task_post puis task_get ; tâche non prête = erreur de type pending", async () => {
    const { client, fetchImpl, cache } = setup([
      fixture("serp-task-post"),
      fixture("serp-task-pending"),
      fixture("serp-organic-live"),
    ]);
    const post = await client.serpOrganicTaskPost({ keyword: "coloriage licorne" });
    expect(post.taskId).toBe("11141200-1234-0001-0000-aaaaaaaaaaaa");
    expect(post.estimatedCostUsd).toBe(0.0018);
    await expect(client.serpOrganicTaskGet(post.taskId!)).rejects.toMatchObject({
      kind: "pending",
    });
    const got = await client.serpOrganicTaskGet(post.taskId!);
    expect(got.result?.keyword).toBe("coloriage licorne");
    expect(fetchImpl.mock.calls[1]![1]!.method).toBe("GET");
    expect(fetchImpl.mock.calls[1]![0]).toContain(
      "/task_get/advanced/11141200-1234-0001-0000-aaaaaaaaaaaa",
    );
    expect(cache.entries.size).toBe(0);
  });
});

describe("plafonds de coût", () => {
  it("refuse AVANT l'appel si l'estimation dépasse le plafond par appel", async () => {
    const { client, fetchImpl, rows } = setup([], { maxCostPerCallUsd: 0.01 });
    await expect(
      client.backlinksBacklinks({ target: "mega-coloring.com", limit: 1000 }),
    ).rejects.toBeInstanceOf(BudgetExceededError);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(rows).toHaveLength(0);
  });

  it("budget cumulé du client : le deuxième appel est refusé, le cache reste gratuit", async () => {
    const { client, fetchImpl } = setup([fixture("backlinks-summary")], { budgetUsd: 0.03 });
    await client.backlinksSummary({ target: "mega-coloring.com" });
    expect(client.spentEstimateUsd).toBeCloseTo(0.02);
    await client.backlinksSummary({ target: "mega-coloring.com" }); // cache
    await expect(client.backlinksSummary({ target: "autre-site.fr" })).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("nouvelles tentatives", () => {
  it("réessaie sur 500 puis réussit", async () => {
    const { client, fetchImpl } = setup([
      () => new Response("oups", { status: 500 }),
      fixture("backlinks-summary"),
    ]);
    const out = await client.backlinksSummary({ target: "mega-coloring.com" });
    expect(out.result?.backlinks).toBe(340);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("n'insiste pas sur un 4xx (hors 429)", async () => {
    const { client, fetchImpl } = setup([() => new Response("non", { status: 403 })]);
    await expect(client.backlinksSummary({ target: "mega-coloring.com" })).rejects.toMatchObject({
      kind: "http",
      code: 403,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("abandonne après maxRetries", async () => {
    const fail = () => new Response("oups", { status: 503 });
    const { client, fetchImpl } = setup([fail, fail, fail]);
    await expect(client.backlinksSummary({ target: "mega-coloring.com" })).rejects.toMatchObject({
      kind: "http",
      code: 503,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe("sécurité", () => {
  it("journalise le coût même si le résultat payé est invalide", async () => {
    const bad = {
      status_code: 20000,
      cost: 0.02,
      tasks: [
        { id: "t1", status_code: 20000, cost: 0.02, result: [{ backlinks: "pas un nombre" }] },
      ],
    };
    const { client, rows } = setup([bad]);
    await expect(client.backlinksSummary({ target: "mega-coloring.com" })).rejects.toMatchObject({
      kind: "invalid",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "dataforseo", actual_cost_usd: 0.02 });
  });

  it("refuse une URL OnPage non http(s)", async () => {
    const { client, fetchImpl } = setup([]);
    await expect(client.onpageInstantPages({ url: "file:///etc/passwd" })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("estimateCost", () => {
  it("SERP : 0,002 USD par page de 10 résultats", () => {
    expect(estimateCost("serpOrganicLive", { keyword: "a" })).toBe(0.006);
    expect(estimateCost("serpOrganicLive", { keyword: "a", depth: 100 })).toBe(0.02);
  });
  it("Labs et Backlinks : forfait + lignes", () => {
    expect(estimateCost("labsRankedKeywords", { target: "a.fr", limit: 100 })).toBe(0.022);
    expect(estimateCost("backlinksBacklinks", { target: "a.fr", limit: 1000 })).toBe(0.06);
    expect(estimateCost("backlinksSummary", { target: "a.fr" })).toBe(0.024);
  });
  it("estimateBatch additionne un plan d'appels", () => {
    const total = estimateBatch([
      { key: "serpOrganicLive", params: { keyword: "a" } },
      { key: "serpOrganicLive", params: { keyword: "b" } },
      { key: "backlinksSummary", params: { target: "a.fr" } },
    ]);
    expect(total).toBe(0.036);
  });
});

describe("clé de cache et domaines", () => {
  it("la clé est insensible à l'ordre des champs et fait 64 caractères", () => {
    const a = cacheKey("serp.organic.live", { a: 1, b: { c: 2, d: 3 } });
    const b = cacheKey("serp.organic.live", { b: { d: 3, c: 2 }, a: 1 });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(cacheKey("autre", { a: 1, b: { c: 2, d: 3 } })).not.toBe(a);
    expect(stableStringify({ z: undefined, a: [1, { y: 1, x: 2 }] })).toBe(
      '{"a":[1,{"x":2,"y":1}]}',
    );
  });
  it("normalizeDomain", () => {
    expect(normalizeDomain("HTTPS://www.Mega-Coloring.com:443/a?b=1")).toBe("mega-coloring.com");
    expect(normalizeDomain("mega-coloring.com")).toBe("mega-coloring.com");
  });
});
