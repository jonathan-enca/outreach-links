import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import type { PlannedQuery } from "@/features/queries/schema";
import type { DataForSeoClient } from "@/lib/dataforseo";
import { COLLECTION_LIMITS, collectionTargetUsd, phaseBudgetUsd } from "./limits";
import {
  acceptDomain,
  fromContent,
  fromDeadPages,
  fromSerp,
  intersectionCandidates,
  mergeCandidates,
  mergeIntersection,
  readIntersection,
  shouldStopForYield,
} from "./normalize";
import { buildCollectionPlan, distinctVariants, estimateCollection } from "./plan";
import {
  beginCollection,
  collectionPlanSchema,
  intersectionFilters,
  CollectionProgress,
  executeCollection,
  finalizeCollection,
  runContentCall,
  runDeadPagesCall,
  runIntersectionPage,
  runSerpQuery,
  type CollectionRun,
  type StepOutcome,
  PROVIDER_RETRY,
} from "./run";
import { previewCollection, startCollection } from "./service";
import type { CollectionContext, RawCandidate } from "./types";

const AUDIT = "11111111-1111-4111-8111-111111111111";
const WS = "22222222-2222-4222-8222-222222222222";
const SITE = "33333333-3333-4333-8333-333333333333";

const ctx: CollectionContext = {
  ownDomain: "mega-coloring.com",
  competitorDomains: ["coloriez.com", "hugolescargot.com"],
  language: "fr",
  theme: "coloriages à imprimer",
  nameVariants: ["Mega Coloring", "mega-coloring", "megacoloring"],
  targetKeywords: [],
};

function query(i: number, over: Partial<PlannedQuery> = {}): PlannedQuery {
  return {
    q: `coloriages à imprimer blog ${i}`,
    tactic: "inconnus",
    persona: "Enseignants",
    target: "home",
    keyword: null,
    score: 1 - i / 100,
    rank: i,
    estUsd: 0.006,
    origin: "regle",
    ...over,
  };
}

const raw = (domain: string, over: Partial<RawCandidate> = {}): RawCandidate => ({
  domain,
  url: `https://${domain}/page`,
  title: null,
  source: "serp",
  tactic: "inconnus",
  query: "q",
  persona: null,
  rank: 3,
  pageType: null,
  competitorsCount: 0,
  domainRank: null,
  spamScore: null,
  ...over,
});

describe("acceptDomain : filtre gratuit commun", () => {
  it("écarte le site, ses sous-domaines, les concurrents, les plateformes et les faux domaines", () => {
    expect(acceptDomain("https://www.Blog-Maman.fr/x", ctx)).toBe("blog-maman.fr");
    expect(acceptDomain("mega-coloring.com", ctx)).toBeNull();
    expect(acceptDomain("fr.mega-coloring.com", ctx)).toBeNull();
    expect(acceptDomain("coloriez.com", ctx)).toBeNull();
    expect(acceptDomain("www.youtube.com", ctx)).toBeNull();
    expect(acceptDomain("il y a 3 mois", ctx)).toBeNull();
    expect(acceptDomain(null, ctx)).toBeNull();
  });
});

describe("sources : SERP, recoupement, Content Analysis", () => {
  it("SERP : un candidat par résultat accepté, marque = source mention", () => {
    const entries = [
      { rank: 1, domain: "coloriez.com", url: "https://coloriez.com/", title: "c", urlExact: true },
      {
        rank: 2,
        domain: "ecole-lilas.fr",
        url: "https://ecole-lilas.fr/a",
        title: "t",
        urlExact: true,
      },
    ];
    const out = fromSerp(query(1), entries, ctx);
    expect(out.map((c) => c.domain)).toEqual(["ecole-lilas.fr"]);
    expect(out[0]).toMatchObject({ source: "serp", tactic: "inconnus", rank: 2 });
    const mention = fromSerp(query(2, { tactic: "mentions", persona: null }), entries, ctx);
    expect(mention[0]).toMatchObject({ source: "mention", tactic: "mentions" });
  });

  const page = (rows: Record<string, Record<string, unknown>>[]) => ({
    items: rows.map((r) => ({ domain_intersection: r })),
  });

  it("recoupement : au moins 2 concurrents distincts, concurrents et soi-même exclus", () => {
    const read = readIntersection(
      page([
        {
          "1": { domain_from: "blog-maman.fr", url_from: "https://blog-maman.fr/a" },
          "2": { domain_from: "blog-maman.fr" },
        },
        { "1": { domain_from: "seul.fr" } },
        { "1": { domain_from: "mega-coloring.com" }, "2": { domain_from: "mega-coloring.com" } },
        { "1": { domain_from: "coloriez.com" }, "2": { domain_from: "coloriez.com" } },
      ]) as never,
      ctx,
    );
    expect(read.map((d) => d.domain).sort()).toEqual(["blog-maman.fr", "seul.fr"]);
    const cands = intersectionCandidates(read);
    expect(cands).toHaveLength(1);
    expect(cands[0]).toMatchObject({
      domain: "blog-maman.fr",
      competitorsCount: 2,
      source: "intersection",
      url: "https://blog-maman.fr/a",
    });
  });

  it("recoupement : un domaine vu sur deux pages cumule ses concurrents", () => {
    const p1 = readIntersection(page([{ "1": { domain_from: "asso.fr" } }]) as never, ctx);
    const p2 = readIntersection(page([{ "3": { domain_from: "asso.fr" } }]) as never, ctx);
    expect(intersectionCandidates(p1)).toHaveLength(0);
    const merged = mergeIntersection([p1, p2]);
    expect(intersectionCandidates(merged)[0]).toMatchObject({
      domain: "asso.fr",
      competitorsCount: 2,
    });
  });

  it("Content Analysis : langue et spam filtrés, langue absente gardée", () => {
    const result = {
      items: [
        {
          main_domain: "ecole.fr",
          url: "https://ecole.fr/a",
          language: "fr",
          spam_score: 4,
          domain_rank: 310,
          page_types: ["organization"],
          content_info: { title: "Classe" },
        },
        { main_domain: "usa.com", language: "en", spam_score: 1 },
        { main_domain: "spam.fr", language: "fr", spam_score: 80 },
        { domain: "sans-langue.fr", url: "https://sans-langue.fr/" },
        { main_domain: "youtube.com", language: "fr" },
      ],
    };
    const out = fromContent(result as never, ctx, {
      keyword: "coloriages",
      pageType: "organization",
      mention: false,
    });
    expect(out.map((c) => c.domain)).toEqual(["ecole.fr", "sans-langue.fr"]);
    expect(out[0]).toMatchObject({
      source: "content",
      tactic: "inconnus",
      pageType: "organization",
      domainRank: 310,
      title: "Classe",
    });
    const ment = fromContent(result as never, ctx, {
      keyword: "Mega Coloring",
      pageType: null,
      mention: true,
    });
    expect(ment[0]).toMatchObject({
      source: "mention",
      tactic: "mentions",
      pageType: "organization",
    });
  });
});

describe("constats du run réel (16/11/2026)", () => {
  it("filtre du recoupement : une condition « autorité > 0 » par cible, reliées par « or »", () => {
    expect(intersectionFilters(1)).toEqual([["1.rank", ">", 0]]);
    expect(intersectionFilters(2)).toEqual([["1.rank", ">", 0], "or", ["2.rank", ">", 0]]);
    expect(intersectionFilters(8)).toHaveLength(15); // 8 conditions, la limite du fournisseur
  });

  it("recoupement : domaines à spam élevé et fermes d'hébergement gratuit écartés, spam conservé", () => {
    const row = (d: string, spam: number, rank = 100) => ({
      domain_intersection: {
        "1": { target: d, rank, backlinks_spam_score: spam },
        "2": { target: d, rank, backlinks_spam_score: spam },
      },
      summary: { intersections_count: 2 },
    });
    const read = readIntersection(
      {
        items: [
          row("bon-blog.fr", 5),
          row("casino-spam.com", 60),
          row("coloriageonly.web.app", 5),
          row("x.firebaseapp.com", 5),
        ],
      } as never,
      ctx,
    );
    expect(read.map((d) => d.domain).sort()).toEqual(["bon-blog.fr", "casino-spam.com"]);
    const cands = intersectionCandidates(read);
    expect(cands.map((c) => c.domain).sort()).toEqual(["bon-blog.fr"]);
    expect(cands.find((c) => c.domain === "bon-blog.fr")).toMatchObject({
      spamScore: 5,
      domainRank: 100,
    });
  });

  it("Content Analysis : filtre serveur de langue et de spam transmis", async () => {
    const { client } = fakeSupabase();
    const { dfs, mocks } = fakeDfs();
    await runContentCall(
      { dfs, service: client },
      makeRun(),
      { keyword: "coloriages", pageType: "blogs" },
      "content",
      0,
    );
    expect(mocks.contentAnalysisSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        page_type: ["blogs"],
        filters: [["language", "=", "fr"], "and", ["spam_score", "<", 50]],
      }),
      expect.anything(),
    );
  });
});

describe("rendement décroissant et fusion", () => {
  it("ne s'arrête jamais avant le minimum, puis sous le seuil de la fenêtre", () => {
    expect(shouldStopForYield([0, 0, 0, 0, 0, 0, 0])).toBe(false); // 7 < minQueries (8)
    expect(shouldStopForYield([20, 18, 15, 12, 9, 8, 6, 5, 4, 3])).toBe(false); // moyenne récente 4,5
    expect(shouldStopForYield([20, 18, 15, 12, 9, 8, 6, 5, 2, 1, 0, 3])).toBe(true); // 1,5 < 3
  });

  it("fusionne par domaine : tactiques et sources cumulées, ordre par recoupement", () => {
    const merged = mergeCandidates([
      raw("asso.fr", { source: "serp", tactic: "inconnus" }),
      raw("asso.fr", { source: "mention", tactic: "mentions", url: null }),
      raw("blog.fr", { source: "intersection", competitorsCount: 3, domainRank: 40 }),
      raw("blog.fr", { source: "content", domainRank: 90, spamScore: 5 }),
    ]);
    expect(merged.map((m) => m.domain)).toEqual(["blog.fr", "asso.fr"]);
    expect(merged[0]).toMatchObject({
      competitorsCount: 3,
      domainRank: 90,
      spamScore: 5,
      signalCount: 2,
    });
    expect(merged[1]!.tactics).toEqual(["inconnus", "mentions"]);
    expect(merged[1]!.sources).toHaveLength(2);
  });
});

describe("plan et coût annoncé", () => {
  const queries = [
    ...Array.from({ length: 33 }, (_, i) => query(i + 3)),
    query(1, { q: '"Mega Coloring" -site:mega-coloring.com', tactic: "mentions", persona: null }),
    query(2, { q: '"megacoloring" -site:mega-coloring.com', tactic: "mentions", persona: null }),
  ];
  const base = {
    queries,
    competitorDomains: Array.from({ length: 12 }, (_, i) => `concurrent${i}.fr`),
    theme: "coloriages à imprimer",
    nameVariants: ["Mega Coloring", "mega-coloring", "megacoloring"],
    domain: "mega-coloring.com",
    goal: "autorite_generale" as const,
    targetKeywords: [] as string[],
  };

  it("sépare les requêtes de marque, ordonne par rang, 4 types de pages", () => {
    const plan = buildCollectionPlan(base);
    expect(plan.mentionSerp).toHaveLength(2);
    expect(plan.serp).toHaveLength(33);
    expect(plan.serp[0]!.rank).toBe(3);
    expect(plan.content.map((c) => c.pageType)).toEqual([
      "blogs",
      "organization",
      "message-boards",
      "ecommerce",
    ]);
    expect(plan.mentionKeywords).toEqual(['"Mega Coloring"', '"megacoloring"']);
  });

  it("objectif mots-clés : 2 types de pages en plus par mot-clé, pas de doublon avec le thème", () => {
    const plan = buildCollectionPlan({
      ...base,
      goal: "mots_cles",
      targetKeywords: [
        "coloriage licorne",
        "Coloriages à imprimer",
        "coloriage dinosaure",
        "troisième",
      ],
    });
    const extra = plan.content.slice(4);
    expect(extra.map((c) => `${c.keyword}/${c.pageType}`)).toEqual([
      "coloriage licorne/blogs",
      "coloriage licorne/organization",
      "coloriage dinosaure/blogs",
      "coloriage dinosaure/organization",
    ]);
  });

  it("variantes du nom : « Mega Coloring » et « mega-coloring » comptent pour une, « megacoloring » pour une autre", () => {
    expect(
      distinctVariants(["Mega Coloring", "mega-coloring", "megacoloring"], "www.mega-coloring.com"),
    ).toEqual(["Mega Coloring", "megacoloring"]);
  });

  it("attendu <= pire cas <= budget cible (55 % de 1 USD), toutes phases bornées", () => {
    const plan = buildCollectionPlan(base);
    const est = estimateCollection(plan);
    expect(est.targetUsd).toBe(0.55);
    expect(est.expectedUsd).toBeGreaterThan(0.3);
    expect(est.expectedUsd).toBeLessThanOrEqual(est.worstUsd);
    expect(est.worstUsd).toBeLessThanOrEqual(est.targetUsd + 1e-9);
    for (const [phase, p] of Object.entries(est.phases)) {
      expect(p.worstUsd).toBeLessThanOrEqual(phaseBudgetUsd(phase as never) + 1e-9);
    }
    expect(est.calls).toBe(1 + 2 + 2 + 33 + 4 + 5); // + 5 concurrents pour les liens morts (chantier D)
  });

  it("moins de 2 concurrents : recoupement sauté et non facturé", () => {
    const est = estimateCollection(buildCollectionPlan({ ...base, competitorDomains: ["un.fr"] }));
    expect(est.phases.intersection).toEqual({ calls: 0, expectedUsd: 0, worstUsd: 0 });
  });

  it("les parts de phase font 100 %", () => {
    const sum = Object.values(COLLECTION_LIMITS.phaseShare).reduce((s, n) => s + n, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(collectionTargetUsd(2)).toBe(1.1);
  });
});

// ----- Exécution --------------------------------------------------------------------------------

function makeRun(over: Partial<CollectionRun> = {}): CollectionRun {
  const plan = buildCollectionPlan({
    queries: [
      ...Array.from({ length: 12 }, (_, i) => query(i + 3)),
      query(1, { q: '"Mega Coloring" -site:mega-coloring.com', tactic: "mentions", persona: null }),
    ],
    competitorDomains: ["coloriez.com", "hugolescargot.com", "tete-a-modeler.com"],
    theme: ctx.theme,
    nameVariants: ctx.nameVariants,
    domain: "mega-coloring.com",
    goal: "autorite_generale",
    targetKeywords: [],
  });
  return {
    id: "col-1",
    auditId: AUDIT,
    workspaceId: WS,
    siteId: SITE,
    ctx,
    plan,
    limits: { auditId: AUDIT, auditCapUsd: 2, safetyCapUsd: 5, dailyCapUsd: 25 },
    targetUsd: 0.55,
    ...over,
  };
}

/** Faux client DataForSEO : chaque SERP renvoie 5 domaines frais (ou aucun passé `freshUntil`). */
function fakeDfs(opts: { freshUntil?: number } = {}) {
  let serpN = 0;
  const calls: string[] = [];
  const dfs = {
    serpOrganicLive: vi.fn(async ({ keyword }: { keyword: string }) => {
      calls.push(`serp:${keyword}`);
      serpN++;
      const fresh = serpN <= (opts.freshUntil ?? 999);
      const items = Array.from({ length: 5 }, (_, k) => ({
        type: "organic",
        rank_group: k + 1,
        rank_absolute: k + 1,
        domain: fresh ? `site-${serpN}-${k}.fr` : `site-0-${k}.fr`,
        url: `https://${fresh ? `site-${serpN}-${k}.fr` : `site-0-${k}.fr`}/p`,
        title: "t",
      }));
      return {
        result: { keyword, items_count: 5, items },
        actualCostUsd: 0.006,
        cacheHit: false,
        estimatedCostUsd: 0.006,
        taskId: null,
      };
    }),
    backlinksDomainIntersection: vi.fn(async (p: { offset: number }) => {
      calls.push(`inter:${p.offset}`);
      const items = Array.from({ length: 500 }, (_, i) => ({
        domain_intersection: {
          "1": { domain_from: `asso-${p.offset}-${i}.fr` },
          ...(i < 20 ? { "2": { domain_from: `asso-${p.offset}-${i}.fr` } } : {}),
        },
      }));
      return {
        result: { items_count: 500, items },
        actualCostUsd: 0.042,
        cacheHit: false,
        estimatedCostUsd: 0.042,
        taskId: null,
      };
    }),
    backlinksBacklinks: vi.fn(async (p: { target: string }) => {
      calls.push(`morts:${p.target}`);
      return {
        result: {
          items_count: 2,
          items: [
            {
              domain_from: `ecole-${p.target}.fr`,
              url_from: `https://ecole-${p.target}.fr/liens`,
              url_to: `https://${p.target}/vieille-page`,
              anchor: "coloriages",
              dofollow: true,
              is_broken: true,
              backlink_spam_score: 3,
            },
            {
              domain_from: "spam.fr",
              url_from: "https://spam.fr/x",
              url_to: `https://${p.target}/autre`,
              dofollow: true,
              is_broken: true,
              backlink_spam_score: 80,
            },
          ],
        },
        actualCostUsd: 0.027,
        cacheHit: false,
        estimatedCostUsd: 0.027,
        taskId: null,
      };
    }),
    contentAnalysisSearch: vi.fn(async (p: { keyword: string; page_type?: string[] }) => {
      calls.push(`content:${p.keyword}:${p.page_type?.[0] ?? "-"}`);
      return {
        result: {
          items_count: 2,
          items: [
            {
              main_domain: `ca-${p.page_type?.[0] ?? "m"}-1.fr`,
              language: "fr",
              url: "https://x.fr/",
              spam_score: 3,
            },
            { main_domain: `ca-${p.page_type?.[0] ?? "m"}-2.fr`, language: "fr" },
          ],
        },
        actualCostUsd: 0.027,
        cacheHit: false,
        estimatedCostUsd: 0.027,
        taskId: null,
      };
    }),
  };
  return {
    dfs: dfs as unknown as Pick<
      DataForSeoClient,
      | "serpOrganicLive"
      | "backlinksDomainIntersection"
      | "contentAnalysisSearch"
      | "backlinksBacklinks"
    >,
    calls,
    mocks: dfs,
  };
}

describe("exécution : plafonds avant chaque appel payant", () => {
  it("un appel au-dessus du plafond d'audit n'est pas lancé et n'est pas facturé", async () => {
    const { client } = fakeSupabase({
      cost_ledger: [
        {
          audit_id: AUDIT,
          estimated_cost_usd: 1.999,
          actual_cost_usd: 1.999,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { dfs, mocks } = fakeDfs();
    const out = await runSerpQuery({ dfs, service: client }, makeRun(), query(3), "serp", 0);
    expect(out.blocked).toBe(true);
    expect(mocks.serpOrganicLive).not.toHaveBeenCalled();
  });

  it("le plafond de sécurité par audit (5 USD) bloque même un plafond d'audit plus haut (site de test)", async () => {
    const { client } = fakeSupabase({
      cost_ledger: [
        {
          audit_id: AUDIT,
          estimated_cost_usd: 4.99,
          actual_cost_usd: 4.99,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { dfs, mocks } = fakeDfs();
    const run = makeRun({
      limits: { auditId: AUDIT, auditCapUsd: 50, safetyCapUsd: 5, dailyCapUsd: 25 },
    });
    const out = await runContentCall(
      { dfs, service: client },
      run,
      { keyword: "x", pageType: "blogs" },
      "content",
      0,
    );
    expect(out.blocked).toBe(true);
    expect(mocks.contentAnalysisSearch).not.toHaveBeenCalled();
  });

  it("le plafond du jour (toute la plateforme) bloque le recoupement", async () => {
    const { client } = fakeSupabase({
      cost_ledger: [
        {
          audit_id: null,
          estimated_cost_usd: 24.99,
          actual_cost_usd: 24.99,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { dfs, mocks } = fakeDfs();
    const out = await runIntersectionPage({ dfs, service: client }, makeRun(), 0);
    expect(out.blocked).toBe(true);
    expect(mocks.backlinksDomainIntersection).not.toHaveBeenCalled();
  });

  it("sous les plafonds, l'appel part avec les bons paramètres", async () => {
    const { client } = fakeSupabase();
    const { dfs, mocks } = fakeDfs();
    const out = await runIntersectionPage({ dfs, service: client }, makeRun(), 1);
    expect(out.blocked).toBe(false);
    expect(mocks.backlinksDomainIntersection).toHaveBeenCalledWith(
      expect.objectContaining({
        intersection_mode: "partial",
        exclude_targets: ["mega-coloring.com"],
        limit: 500,
        offset: 500,
        order_by: ["1.rank,desc"],
        filters: [["1.rank", ">", 0], "or", ["2.rank", ">", 0], "or", ["3.rank", ">", 0]],
      }),
      { workspaceId: WS, auditId: AUDIT },
    );
    expect(out.rows).toBe(500);
    expect(out.intersection.length).toBe(500);
  });
});

describe("erreurs de tâche du fournisseur", () => {
  beforeEach(() => {
    PROVIDER_RETRY.delaysMs = [0, 0];
  });
  it("une erreur de tâche transitoire (40101) est retentée ; trois échecs = requête manquée, pas d'échec global", async () => {
    const { client } = fakeSupabase();
    const { DataForSeoError } = await import("@/lib/dataforseo");
    const err = () =>
      new DataForSeoError("serp : Internal SE Server Error. (40101)", "task", 40101);
    const ok = {
      result: {
        keyword: "k",
        items_count: 1,
        items: [
          {
            type: "organic",
            rank_group: 1,
            rank_absolute: 1,
            domain: "asso.fr",
            url: "https://asso.fr/",
            title: "t",
          },
        ],
      },
      actualCostUsd: 0.006,
      cacheHit: false,
    };
    const flaky = vi.fn().mockRejectedValueOnce(err()).mockResolvedValueOnce(ok);
    const a = await runSerpQuery(
      { dfs: { serpOrganicLive: flaky } as never, service: client },
      makeRun(),
      query(3),
      "serp",
      0,
    );
    expect(flaky).toHaveBeenCalledTimes(2);
    expect(a.failed).toBeUndefined();
    expect(a.failed).toBeUndefined();
    expect(a.raws.map((r) => r.domain)).toEqual(["asso.fr"]);
    const dead = vi.fn().mockRejectedValue(err());
    const b = await runSerpQuery(
      { dfs: { serpOrganicLive: dead } as never, service: client },
      makeRun(),
      query(4),
      "serp",
      1,
    );
    expect(dead).toHaveBeenCalledTimes(3);
    expect(b).toMatchObject({ failed: true, blocked: false, costUsd: 0 });
    const p = new CollectionProgress(0.55);
    p.add(b);
    expect(p.stats.serp.failures).toBe(1);
  });

  it("une erreur d'authentification remonte (rien n'est avalé)", async () => {
    const { client } = fakeSupabase();
    const { DataForSeoError } = await import("@/lib/dataforseo");
    const auth = vi.fn().mockRejectedValue(new DataForSeoError("401", "http", 401));
    await expect(
      runSerpQuery(
        { dfs: { serpOrganicLive: auth } as never, service: client },
        makeRun(),
        query(3),
        "serp",
        0,
      ),
    ).rejects.toThrow("401");
  });
});

describe("executeCollection : orchestration complète", () => {
  const direct = <T>(_id: string, fn: () => Promise<T>) => fn();

  it("déroule les quatre phases, journalise chaque appel dans l'ordre prévu et fusionne", async () => {
    const { client } = fakeSupabase();
    const { dfs, calls } = fakeDfs();
    const progress = await executeCollection(() => ({ dfs, service: client }), makeRun(), direct);
    expect(calls[0]).toBe("inter:0");
    expect(calls.some((c) => c === "inter:500")).toBe(true); // 1re page pleine et riche (20 recoupements)
    const firstSerp = calls.findIndex((c) => c.startsWith("serp:"));
    const firstContentMention = calls.findIndex((c) => c.startsWith('content:"Mega Coloring"'));
    expect(firstSerp).toBeGreaterThan(-1);
    expect(calls.at(-1)).toMatch(
      /^content:coloriages à imprimer:ecommerce$|^content:coloriages à imprimer:/,
    );
    expect(firstContentMention).toBeGreaterThan(-1);
    expect(progress.stats.intersection.newDomains).toBeGreaterThan(0);
    expect(progress.stats.content.calls).toBe(4);
    expect(progress.costUsd).toBeLessThanOrEqual(0.55 + 1e-9);
  });

  it("arrêt par rendement décroissant : les requêtes sans nouveaux domaines s'arrêtent après la fenêtre", async () => {
    const { client } = fakeSupabase();
    const { dfs, mocks } = fakeDfs({ freshUntil: 8 }); // 8 requêtes fructueuses, puis plus rien de nouveau
    const run = makeRun();
    const progress = await executeCollection(() => ({ dfs, service: client }), run, direct);
    const serpCalls = progress.stats.serp.calls;
    expect(serpCalls).toBeLessThan(run.plan.serp.length);
    expect(serpCalls).toBeGreaterThanOrEqual(COLLECTION_LIMITS.yieldStop.minQueries);
    expect(progress.stats.serp.stoppedBy).toBe("rendement");
    expect(progress.overallStop()).toBe("rendement");
    expect(mocks.serpOrganicLive.mock.calls.length).toBe(serpCalls + 1); // + la requête de marque
  });

  it("budget souple de phase : la phase s'arrête, les suivantes continuent", async () => {
    const { client } = fakeSupabase();
    const { dfs } = fakeDfs();
    const run = makeRun({ targetUsd: 0.05 }); // budget de SERP = 0,018 USD = 3 requêtes
    const progress = await executeCollection(() => ({ dfs, service: client }), run, direct);
    expect(progress.stats.serp.calls).toBeLessThanOrEqual(3);
    expect(progress.stats.serp.stoppedBy).toBe("budget_phase");
    expect(progress.overallStop()).toBe("budget_phase");
    expect(progress.costUsd).toBeLessThanOrEqual(0.2);
  });

  it("plafond dur atteint en cours de route : l'appel n'est pas lancé, la collecte se termine proprement", async () => {
    const { client } = fakeSupabase({
      cost_ledger: [
        {
          audit_id: AUDIT,
          estimated_cost_usd: 1.999,
          actual_cost_usd: 1.999,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { dfs, mocks } = fakeDfs();
    const progress = await executeCollection(() => ({ dfs, service: client }), makeRun(), direct);
    expect(mocks.serpOrganicLive).not.toHaveBeenCalled();
    expect(mocks.backlinksDomainIntersection).not.toHaveBeenCalled();
    expect(progress.overallStop()).toBe("plafond");
    expect(progress.costUsd).toBe(0);
  });
});

describe("accumulation, fin et reprise", () => {
  it("le rendement compte les domaines NOUVEAUX, pas les résultats", () => {
    const p = new CollectionProgress(0.55);
    const out = (domains: string[]): StepOutcome => ({
      phase: "serp",
      label: "x",
      raws: domains.map((d) => raw(d)),
      intersection: [],
      costUsd: 0.006,
      cacheHit: false,
      rows: domains.length,
      blocked: false,
    });
    expect(p.add(out(["a.fr", "b.fr", "a.fr"]))).toBe(2);
    expect(p.add(out(["a.fr", "c.fr"]))).toBe(1);
    expect(p.serpYield).toEqual([2, 1]);
    expect(p.costUsd).toBeCloseTo(0.012, 6);
  });

  it("finalizeCollection réécrit les candidats (idempotent) et clôt avec coût et stats", async () => {
    const { client, tables } = fakeSupabase({
      candidate_collections: [{ id: "col-1", audit_id: AUDIT, status: "en_cours" }],
      collection_candidates: [{ id: "old", collection_id: "col-1", domain: "vieux.fr" }],
    });
    const p = new CollectionProgress(0.55);
    p.add({
      phase: "serp",
      label: "x",
      raws: [raw("a.fr"), raw("b.fr")],
      intersection: [],
      costUsd: 0.006,
      cacheHit: false,
      rows: 2,
      blocked: false,
    });
    const res = await finalizeCollection(client, makeRun(), p);
    expect(res).toMatchObject({ candidates: 2, stopReason: "termine" });
    expect(tables.collection_candidates!.map((c) => c.domain).sort()).toEqual(["a.fr", "b.fr"]);
    expect(tables.candidate_collections![0]).toMatchObject({
      status: "termine",
      actual_cost_usd: 0.006,
      stop_reason: "termine",
    });
    await finalizeCollection(client, makeRun(), p); // relance : pas de doublon
    expect(tables.collection_candidates).toHaveLength(2);
  });

  it("beginCollection : confirme -> en_cours une fois, reprise possible, terminé = rien", async () => {
    const plan = makeRun().plan;
    const seed = (status: string) => ({
      audits: [{ id: AUDIT, site_id: SITE, cost_cap_usd: 2 }],
      sites: [
        {
          id: SITE,
          domain: "mega-coloring.com",
          language: "fr",
          niche: "coloriages à imprimer",
          target_keywords: [],
        },
      ],
      competitors: [{ audit_id: AUDIT, domain: "coloriez.com" }],
      candidate_collections: [
        { id: "col-1", audit_id: AUDIT, workspace_id: WS, status, plan, target_usd: 0.55 },
      ],
    });
    const a = fakeSupabase(seed("confirme"));
    const run = await beginCollection(a.client, AUDIT);
    expect(run).toMatchObject({ id: "col-1", targetUsd: 0.55 });
    expect(run!.limits.auditCapUsd).toBe(2);
    expect(run!.ctx.competitorDomains).toEqual(["coloriez.com"]);
    expect(a.tables.candidate_collections![0]!.status).toBe("en_cours");
    expect(await beginCollection(a.client, AUDIT)).not.toBeNull(); // reprise d'un job interrompu
    expect(await beginCollection(fakeSupabase(seed("termine")).client, AUDIT)).toBeNull();
    expect(await beginCollection(fakeSupabase(seed("echoue")).client, AUDIT)).toBeNull();
  });
});

describe("service : coût annoncé puis lancement", () => {
  const universe = {
    id: "u1",
    site_id: SITE,
    brand_profile_version: 1,
    goal: "autorite_generale",
    budget_usd: 0.2,
    est_cost_usd: 0.2,
    llm_cost_usd: 0.0004,
    queries: [
      ...Array.from({ length: 10 }, (_, i) => query(i + 2)),
      query(1, { q: '"Mega Coloring" -site:mega-coloring.com', tactic: "mentions", persona: null }),
    ],
    recipes: { cache: 0, generated: 4, fallback: 0 },
    created_at: "2026-11-15T20:00:00Z",
  };
  const seed = (over: Record<string, Record<string, unknown>[]> = {}) => ({
    audits: [{ id: AUDIT, status: "termine", workspace_id: WS, site_id: SITE, cost_cap_usd: 2 }],
    sites: [
      {
        id: SITE,
        domain: "mega-coloring.com",
        niche: "coloriages à imprimer",
        goal: "autorite_generale",
        target_keywords: [],
      },
    ],
    competitors: [
      { audit_id: AUDIT, domain: "coloriez.com", selected: true, score: 9 },
      { audit_id: AUDIT, domain: "hugolescargot.com", selected: true, score: 7 },
      { audit_id: AUDIT, domain: "ecarte.com", selected: false, score: 1 },
    ],
    query_universes: [universe],
    ...over,
  });
  const send = () => vi.fn(async () => ({}));

  it("aperçu : plan, coût attendu et pire cas, sans écrire ni appeler DataForSEO", async () => {
    const { client, log } = fakeSupabase(seed());
    const res = await previewCollection(client, AUDIT);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.preview.plan.intersectionTargets).toEqual(["coloriez.com", "hugolescargot.com"]);
    expect(res.preview.plan.serp).toHaveLength(10);
    expect(res.preview.estimate.worstUsd).toBeLessThanOrEqual(0.55 + 1e-9);
    expect(res.preview.remainingUsd).toBe(2);
    expect(log.filter((l) => l.op !== "select")).toEqual([]);
  });

  it("sans univers de requêtes ou avant la fin de l'audit : refus clair, rien d'écrit", async () => {
    const noUniverse = fakeSupabase(seed({ query_universes: [] }));
    expect(await previewCollection(noUniverse.client, AUDIT)).toMatchObject({ ok: false });
    const notDone = fakeSupabase(
      seed({
        audits: [
          { id: AUDIT, status: "en_cours", workspace_id: WS, site_id: SITE, cost_cap_usd: 2 },
        ],
      }),
    );
    expect(await previewCollection(notDone.client, AUDIT)).toMatchObject({ ok: false });
  });

  it("start : fige le plan et le coût, envoie l'événement (idempotent par identifiant)", async () => {
    const { client, tables } = fakeSupabase(seed());
    const sendEvent = send();
    const res = await startCollection(client, AUDIT, sendEvent, "user-1");
    expect(res.status).toBe("ok");
    const row = tables.candidate_collections![0]!;
    expect(row).toMatchObject({
      audit_id: AUDIT,
      status: "confirme",
      target_usd: 0.55,
      confirmed_by: "user-1",
    });
    expect(Number(row.expected_cost_usd)).toBeGreaterThan(0);
    expect(Number(row.worst_case_usd)).toBeGreaterThanOrEqual(Number(row.expected_cost_usd));
    expect(sendEvent).toHaveBeenCalledWith(
      expect.objectContaining({ name: "audit/collection.requested", data: { auditId: AUDIT } }),
    );
    // Deuxième clic après démarrage : aucun nouvel événement.
    tables.candidate_collections![0]!.status = "en_cours";
    const again = await startCollection(client, AUDIT, sendEvent, "user-1");
    expect(again.message).toMatch(/déjà lancée/);
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });

  it("start : refuse si le coût attendu dépasse ce qui reste du plafond d'audit", async () => {
    const { client, tables } = fakeSupabase(
      seed({
        cost_ledger: [
          {
            audit_id: AUDIT,
            estimated_cost_usd: 1.8,
            actual_cost_usd: 1.8,
            created_at: "2026-11-15T10:00:00Z",
          },
        ],
      }),
    );
    const sendEvent = send();
    const res = await startCollection(client, AUDIT, sendEvent, "user-1");
    expect(res.status).toBe("error");
    expect(sendEvent).not.toHaveBeenCalled();
    expect(tables.candidate_collections ?? []).toHaveLength(0);
  });

  it("start : plafond du jour atteint = refus, et sans utilisateur = refus", async () => {
    const day = fakeSupabase(
      seed({
        cost_ledger: [
          {
            audit_id: null,
            estimated_cost_usd: 26,
            actual_cost_usd: 26,
            created_at: new Date().toISOString(),
          },
        ],
      }),
    );
    const sendEvent = send();
    expect((await startCollection(day.client, AUDIT, sendEvent, "user-1")).status).toBe("error");
    expect(
      (await startCollection(fakeSupabase(seed()).client, AUDIT, sendEvent, null)).status,
    ).toBe("error");
    expect(sendEvent).not.toHaveBeenCalled();
  });

  it("start après un échec : la ligne repart de zéro et un nouvel événement est envoyé", async () => {
    const { client, tables } = fakeSupabase(
      seed({
        candidate_collections: [
          { id: "col-1", audit_id: AUDIT, status: "echoue", error_message: "boum" },
        ],
      }),
    );
    const sendEvent = send();
    expect((await startCollection(client, AUDIT, sendEvent, "user-1")).status).toBe("ok");
    expect(tables.candidate_collections![0]).toMatchObject({
      status: "confirme",
      error_message: null,
    });
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });
});

describe("chantier A : erreurs du fournisseur et lots parallèles", () => {
  const direct = <T>(_id: string, fn: () => Promise<T>) => fn();
  beforeEach(() => {
    PROVIDER_RETRY.delaysMs = [0, 0];
  });

  it("un HTTP 500 est retenté avec attente croissante, puis l'appel est manqué (jamais fatal)", async () => {
    const { client } = fakeSupabase();
    const { DataForSeoError } = await import("@/lib/dataforseo");
    const waits: number[] = [];
    PROVIDER_RETRY.delaysMs = [1, 2];
    const spy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      fn: () => void,
      ms?: number,
    ) => {
      waits.push(ms ?? 0);
      fn();
      return 0 as never;
    }) as never);
    try {
      const dead = vi
        .fn()
        .mockRejectedValue(new DataForSeoError("content : HTTP 500", "http", 500));
      const out = await runContentCall(
        { dfs: { contentAnalysisSearch: dead } as never, service: client },
        makeRun(),
        { keyword: "coloriages", pageType: "blogs" },
        "content",
        0,
      );
      expect(dead).toHaveBeenCalledTimes(3);
      expect(out).toMatchObject({ failed: true, blocked: false, costUsd: 0 });
      expect(waits).toEqual([1, 2]);
    } finally {
      spy.mockRestore();
    }
  });

  it("un délai dépassé (réseau, sans code) est retenté ; une erreur 401 ou 400 remonte tout de suite", async () => {
    const { client } = fakeSupabase();
    const { DataForSeoError } = await import("@/lib/dataforseo");
    const net = vi.fn().mockRejectedValue(new DataForSeoError("réseau (timeout)", "http"));
    const out = await runSerpQuery(
      { dfs: { serpOrganicLive: net } as never, service: client },
      makeRun(),
      query(1),
      "serp",
      0,
    );
    expect(net).toHaveBeenCalledTimes(3);
    expect(out.failed).toBe(true);
    for (const code of [400, 401, 403]) {
      const bad = vi.fn().mockRejectedValue(new DataForSeoError(`HTTP ${code}`, "http", code));
      await expect(
        runSerpQuery(
          { dfs: { serpOrganicLive: bad } as never, service: client },
          makeRun(),
          query(1),
          "serp",
          0,
        ),
      ).rejects.toThrow();
      expect(bad).toHaveBeenCalledTimes(1);
    }
  });

  it("une collecte dont des appels sont manqués continue avec le reste et les compte", async () => {
    const { client } = fakeSupabase();
    const { DataForSeoError } = await import("@/lib/dataforseo");
    const { dfs } = fakeDfs();
    // Tous les appels Content Analysis tombent en panne : la collecte garde le reste.
    dfs.contentAnalysisSearch = vi
      .fn()
      .mockRejectedValue(new DataForSeoError("content : HTTP 500", "http", 500)) as never;
    const progress = await executeCollection(() => ({ dfs, service: client }), makeRun(), direct);
    expect(progress.stats.content.failures).toBe(progress.stats.content.calls);
    expect(progress.missed).toBeGreaterThan(0);
    expect(progress.seen.size).toBeGreaterThan(0);
    expect(progress.stats.serp.failures).toBe(0);
  });

  it("les appels d'une phase partent par lots de 5 en parallèle, résultats dans l'ordre du plan", async () => {
    const { client } = fakeSupabase();
    let inFlight = 0;
    let peak = 0;
    const { dfs } = fakeDfs();
    const base = dfs.serpOrganicLive;
    dfs.serpOrganicLive = vi.fn(async (p: { keyword: string }) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return base(p as never);
    }) as never;
    const reports: number[] = [];
    const run = makeRun();
    const progress = await executeCollection(() => ({ dfs, service: client }), run, direct, {
      report: async (r) => {
        reports.push(r.done);
      },
    });
    expect(peak).toBe(5);
    expect(progress.stats.serp.calls).toBeGreaterThan(5);
    // Une écriture de progression par lot, jamais décroissante.
    expect(reports.length).toBeGreaterThan(2);
    expect([...reports].sort((a, b) => a - b)).toEqual(reports);
    // La durée de la phase est celle des lots (plus long appel de chacun), pas la somme des appels.
    expect(progress.stats.serp.wallMs).toBeLessThanOrEqual(progress.stats.serp.callMs);
    expect(progress.stats.serp.callMs).toBeGreaterThan(0);
  });

  it("le budget de phase est évalué avant chaque lot : jamais plus d'appels que ce qui tient", async () => {
    const { client } = fakeSupabase();
    const { dfs } = fakeDfs();
    const progress = await executeCollection(
      () => ({ dfs, service: client }),
      makeRun({ targetUsd: 0.05 }),
      direct,
    );
    expect(progress.stats.serp.calls).toBeLessThanOrEqual(3);
    expect(progress.stats.serp.stoppedBy).toBe("budget_phase");
  });
});

describe("chantier D : liens morts des concurrents", () => {
  const direct = <T>(_id: string, fn: () => Promise<T>) => fn();

  it("un appel Backlinks par concurrent, filtré sur les liens cassés suivis, un lien par domaine", async () => {
    const { client } = fakeSupabase();
    const { dfs, mocks } = fakeDfs();
    const out = await runDeadPagesCall({ dfs, service: client }, makeRun(), "coloriez.com", 0);
    expect(mocks.backlinksBacklinks).toHaveBeenCalledTimes(1);
    const params = mocks.backlinksBacklinks.mock.calls[0]![0];
    expect(params).toMatchObject({
      target: "coloriez.com",
      mode: "one_per_domain",
      filters: [["is_broken", "=", true], "and", ["dofollow", "=", true]],
    });
    // Le lien d'un domaine à spam élevé est écarté ; le candidat est la page qui CITE, pas l'accueil.
    expect(out.raws).toHaveLength(1);
    expect(out.raws[0]).toMatchObject({
      source: "lien_mort",
      tactic: "ressources",
      domain: "ecole-coloriez.com.fr",
      url: "https://ecole-coloriez.com.fr/liens",
      query: "https://coloriez.com/vieille-page",
      persona: "coloriez.com",
    });
  });

  it("jamais un concurrent, jamais le site lui-même, jamais un lien non suivi ou non cassé", () => {
    const ok = {
      sourceUrl: "https://asso.fr/liens",
      sourceDomain: "asso.fr",
      targetUrl: "https://coloriez.com/x",
      dofollow: true,
      isBroken: true,
      spamScore: 2,
      sourceRank: 10,
    };
    const rows = [
      ok,
      { ...ok, sourceDomain: "hugolescargot.com", sourceUrl: "https://hugolescargot.com/a" },
      { ...ok, sourceDomain: "mega-coloring.com", sourceUrl: "https://mega-coloring.com/a" },
      { ...ok, dofollow: false, sourceDomain: "nofollow.fr" },
      { ...ok, isBroken: false, sourceDomain: "vivant.fr" },
      { ...ok, targetUrl: null, sourceDomain: "sanscible.fr" },
    ];
    expect(fromDeadPages(rows, ctx, "coloriez.com").map((r) => r.domain)).toEqual(["asso.fr"]);
  });

  it("la fusion garde la page qui cite le lien mort, même si un autre candidat du domaine est venu avant", () => {
    const serp = raw("asso.fr", { url: "https://asso.fr/", source: "serp" });
    const mort = raw("asso.fr", {
      url: "https://asso.fr/liens",
      source: "lien_mort",
      tactic: "ressources",
      query: "https://coloriez.com/x",
      persona: "coloriez.com",
    });
    const [merged] = mergeCandidates([serp, mort]);
    expect(merged!.url).toBe("https://asso.fr/liens");
    expect(merged!.tactics).toEqual(["inconnus", "ressources"]);
    expect(merged!.sources.map((s) => s.source)).toEqual(["serp", "lien_mort"]);
  });

  it("un plan figé avant le chantier D (sans `deadPages`) reste lisible", () => {
    const plan = {
      intersectionTargets: [],
      serp: [],
      mentionSerp: [],
      mentionKeywords: [],
      content: [],
    };
    expect(collectionPlanSchema.parse(plan).deadPages).toEqual([]);
  });

  it("la phase est exécutée, comptée, et un appel manqué ne l'arrête pas", async () => {
    const { client } = fakeSupabase();
    const { dfs } = fakeDfs();
    const progress = await executeCollection(() => ({ dfs, service: client }), makeRun(), direct);
    expect(progress.stats.morts.calls).toBe(3);
    expect(progress.raws.filter((r) => r.source === "lien_mort").length).toBe(3);
    const { DataForSeoError } = await import("@/lib/dataforseo");
    PROVIDER_RETRY.delaysMs = [0, 0];
    dfs.backlinksBacklinks = vi
      .fn()
      .mockRejectedValue(new DataForSeoError("backlinks : HTTP 500", "http", 500)) as never;
    const down = await executeCollection(() => ({ dfs, service: client }), makeRun(), direct);
    expect(down.stats.morts.failures).toBe(3);
    expect(down.stats.serp.calls).toBeGreaterThan(0);
  });
});
