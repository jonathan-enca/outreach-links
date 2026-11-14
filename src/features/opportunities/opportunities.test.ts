import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { functions } from "@/inngest/functions";
import {
  auditOpportunities,
  opportunitiesEventSchema,
} from "@/inngest/functions/audit-opportunities";
import { BudgetExceededError } from "@/lib/dataforseo";
import {
  brandOf,
  buildQueries,
  candidatesFromSerp,
  finalizeOpportunities,
  OPPORTUNITY_TYPES,
  priorityLabel,
  type Candidate,
  type SiteContext,
} from "./generate";
import { estimateOpportunities, OPPORTUNITIES_CAP_USD } from "./limits";
import {
  beginOpportunities,
  failOpportunities,
  finalizeOpportunitiesStep,
  OPPORTUNITIES_EVENT,
  runQuery,
} from "./run";
import { startOpportunities } from "./service";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const WS_ID = "22222222-2222-4222-8222-222222222222";
const site: SiteContext = {
  domain: "mega-coloring.com",
  niche: "coloriages pour enfants",
  priorityQueries: ["coloriage licorne"],
  offeredAsset: "des coloriages gratuits à imprimer",
};

function cand(over: Partial<Candidate>): Candidate {
  return {
    type: "page_ressources",
    domain: "ecole-sympa.fr",
    url: "https://ecole-sympa.fr/ressources",
    title: "Ressources",
    rationale: "x",
    originQuery: "q",
    rank: 4,
    ...over,
  };
}

describe("requêtes", () => {
  it("marque : première étiquette du domaine", () => {
    expect(brandOf("www.mega-coloring.com")).toBe("mega coloring");
  });
  it("gratuit : 5 requêtes, 4 types SERP ; payant : 8", () => {
    const free = buildQueries(site, "gratuit");
    expect(free).toHaveLength(5);
    expect(new Set(free.map((q) => q.type)).size).toBe(4);
    expect(free[0]?.query).toContain("-site:mega-coloring.com");
    expect(buildQueries(site, "payant")).toHaveLength(8);
  });
  it("sans niche : retombe sur la première requête prioritaire", () => {
    const q = buildQueries({ ...site, niche: null }, "gratuit");
    expect(q.some((x) => x.query.includes("coloriage licorne"))).toBe(true);
  });
});

describe("coût", () => {
  it("l'estimation gratuite tient sous le plafond de l'étape", () => {
    const e = estimateOpportunities(site, "gratuit");
    expect(e?.totalUsd).toBeCloseTo(0.01, 6);
    expect(e!.totalUsd).toBeLessThanOrEqual(OPPORTUNITIES_CAP_USD.gratuit);
    expect(estimateOpportunities(site, "payant")?.totalUsd).toBeCloseTo(0.016, 6);
  });
});

describe("finalizeOpportunities", () => {
  const opts = {
    site,
    competitorDomains: ["rival.com"],
    pages: [
      { url: "https://mega-coloring.com/licorne", keywords: ["coloriage licorne"] },
      { url: "https://mega-coloring.com/dragon", keywords: ["coloriage dragon"] },
    ],
    homepage: "https://mega-coloring.com/",
  };

  it("écarte soi-même, concurrents et plateformes ; dédoublonne en gardant le meilleur score", () => {
    const out = finalizeOpportunities(
      [
        cand({ domain: "mega-coloring.com" }),
        cand({ domain: "www.rival.com" }),
        cand({ domain: "youtube.com" }),
        cand({ domain: "ecole-sympa.fr", type: "annuaire", rank: 9 }),
        cand({ domain: "ecole-sympa.fr", type: "page_ressources", rank: 1 }),
      ],
      opts,
    );
    expect(out.map((o) => o.domain)).toEqual(["ecole-sympa.fr"]);
    expect(out[0]?.type).toBe("page_ressources");
    expect(out[0]?.priorityScore).toBe(70);
  });

  it("chaque opportunité a une page cible, un type, un type de lien et une priorité", () => {
    const out = finalizeOpportunities(
      [
        cand({ type: "mention_marque", domain: "blog-a.fr", rank: 2 }),
        cand({ type: "ecart_domaines", domain: "ecole-b.fr", rank: null, competitorsCount: 3 }),
        cand({ type: "jamais_sollicite", domain: "asso-c.fr", title: "Coloriage licorne asso" }),
        cand({ type: "annuaire", domain: "annu-d.fr", rank: 8 }),
      ],
      opts,
    );
    expect(out).toHaveLength(4);
    for (const o of out) {
      expect(o.targetPageUrl).toMatch(/^https:\/\/mega-coloring\.com\//);
      expect(OPPORTUNITY_TYPES).toContain(o.type);
      expect(["haute", "moyenne", "basse"]).toContain(o.priority);
      expect(o.offer).toBe("des coloriages gratuits à imprimer");
    }
    const byDomain = Object.fromEntries(out.map((o) => [o.domain, o]));
    expect(byDomain["blog-a.fr"]?.targetPageUrl).toBe("https://mega-coloring.com/");
    expect(byDomain["blog-a.fr"]?.expectedLinkType).toBe("mention_a_lier");
    expect(byDomain["asso-c.fr"]?.targetPageUrl).toBe("https://mega-coloring.com/licorne");
    expect(byDomain["ecole-b.fr"]?.priorityScore).toBe(89);
    expect(out[0]?.priorityScore).toBeGreaterThanOrEqual(out[3]!.priorityScore);
  });

  it("sans page prioritaire : page d'accueil", () => {
    const out = finalizeOpportunities([cand({})], { ...opts, pages: [] });
    expect(out[0]?.targetPageUrl).toBe("https://mega-coloring.com/");
  });

  it("seuils de priorité", () => {
    expect(priorityLabel(75)).toBe("haute");
    expect(priorityLabel(50)).toBe("moyenne");
    expect(priorityLabel(49)).toBe("basse");
  });

  it("candidatesFromSerp : rationale lisible avec la requête", () => {
    const [c] = candidatesFromSerp({ type: "annuaire", query: "annuaire coloriages" }, [
      { rank: 2, domain: "a.fr", url: "https://a.fr/", title: "A" },
    ]);
    expect(c?.rationale).toContain("annuaire coloriages");
  });
});

function setup(over: { opStatus?: string; profileStatus?: string } = {}) {
  return fakeSupabase({
    sites: [
      {
        id: "site-1",
        workspace_id: WS_ID,
        domain: site.domain,
        niche: site.niche,
        priority_queries: site.priorityQueries,
        offered_asset: site.offeredAsset,
      },
    ],
    audits: [
      {
        id: AUDIT_ID,
        workspace_id: WS_ID,
        site_id: "site-1",
        status: "termine",
        plan: "gratuit",
        profile_status: over.profileStatus ?? "termine",
        opportunities_status: over.opStatus ?? "aucun",
        opportunities_limits: {},
      },
    ],
    competitors: [{ audit_id: AUDIT_ID, domain: "rival.com", selected: true }],
    audit_gap_domains: [
      {
        audit_id: AUDIT_ID,
        domain: "ecole-b.fr",
        competitors_count: 2,
        competitors: ["rival.com", "autre.com"],
        sample_url: "https://ecole-b.fr/liens",
      },
      {
        audit_id: AUDIT_ID,
        domain: "rival.com",
        competitors_count: 1,
        competitors: ["rival.com"],
        sample_url: null,
      },
    ],
    audit_pages: [
      {
        audit_id: AUDIT_ID,
        url: "https://mega-coloring.com/licorne",
        is_priority: true,
        priority_rank: 1,
        keywords_json: [{ keyword: "coloriage licorne", position: 6, volume: 900 }],
      },
    ],
  });
}

describe("service : confirmation", () => {
  it("passe confirme, fige les requêtes et envoie l'événement à id stable", async () => {
    const { client, tables } = setup();
    const send = vi.fn(async () => undefined);
    const res = await startOpportunities(client, AUDIT_ID, () => client, send);
    expect(res.status).toBe("ok");
    const a = tables.audits![0]!;
    expect(a.opportunities_status).toBe("confirme");
    expect((a.opportunities_limits as { queries: unknown[] }).queries).toHaveLength(5);
    expect(a.opportunities_estimated_cost_usd).toBeCloseTo(0.01, 6);
    expect(send).toHaveBeenCalledOnce();
    const evt = send.mock.calls[0] as unknown as [{ id: string; name: string }];
    expect(evt[0].name).toBe(OPPORTUNITIES_EVENT);
    expect(evt[0].id).toContain(AUDIT_ID);
  });

  it("refuse tant que le profil n'est pas terminé", async () => {
    const { client, tables } = setup({ profileStatus: "aucun" });
    const send = vi.fn(async () => undefined);
    const res = await startOpportunities(client, AUDIT_ID, () => client, send);
    expect(res.status).toBe("error");
    expect(send).not.toHaveBeenCalled();
    expect(tables.audits![0]!.opportunities_status).toBe("aucun");
  });

  it("déjà terminé : rien n'est renvoyé", async () => {
    const { client } = setup({ opStatus: "termine" });
    const send = vi.fn(async () => undefined);
    await startOpportunities(client, AUDIT_ID, () => client, send);
    expect(send).not.toHaveBeenCalled();
  });

  it("envoi en échec : l'état reste confirme", async () => {
    const { client, tables } = setup();
    const res = await startOpportunities(
      client,
      AUDIT_ID,
      () => client,
      async () => {
        throw new Error("down");
      },
    );
    expect(res.status).toBe("error");
    expect(tables.audits![0]!.opportunities_status).toBe("confirme");
  });
});

describe("run", () => {
  const serp = (rows: { rank_group: number; url: string; domain: string; title: string }[]) => ({
    result: { items: rows.map((r) => ({ type: "organic", ...r })) },
    actualCostUsd: 0.002,
    cacheHit: false,
  });

  it("begin exige confirme et le profil terminé ; fail passe à echoue", async () => {
    const none = setup();
    expect(await beginOpportunities(none.client, AUDIT_ID)).toBeNull();
    const { client, tables } = setup({ opStatus: "confirme" });
    tables.audits![0]!.opportunities_limits = { queries: buildQueries(site, "gratuit") };
    const run = await beginOpportunities(client, AUDIT_ID);
    expect(run?.queries).toHaveLength(5);
    expect(tables.audits![0]!.opportunities_status).toBe("en_cours");
    await failOpportunities(client, AUDIT_ID, "boom");
    expect(tables.audits![0]!.opportunities_status).toBe("echoue");
  });

  it("runQuery refuse avant l'appel payant si le plafond de l'étape serait dépassé", async () => {
    const { client, tables } = setup({ opStatus: "confirme" });
    tables.audits![0]!.opportunities_limits = { queries: buildQueries(site, "gratuit") };
    const run = (await beginOpportunities(client, AUDIT_ID))!;
    const dfs = { serpOrganicLive: vi.fn() };
    await expect(runQuery(dfs, run, run.queries[0]!, 0.019)).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(dfs.serpOrganicLive).not.toHaveBeenCalled();
  });

  it("génère au moins 5 types sur le site de test, écrit les lignes et clôt l'étape", async () => {
    const { client, tables } = setup({ opStatus: "confirme" });
    tables.audits![0]!.opportunities_limits = { queries: buildQueries(site, "gratuit") };
    const run = (await beginOpportunities(client, AUDIT_ID))!;
    const dfs = {
      serpOrganicLive: vi.fn(async (p: { keyword: string }) =>
        serp([
          {
            rank_group: 1,
            url: `https://site-${p.keyword.length}.fr/p`,
            domain: `site-${p.keyword.length}.fr`,
            title: p.keyword,
          },
          { rank_group: 2, url: "https://rival.com/x", domain: "rival.com", title: "rival" },
        ]),
      ),
    };
    const outcomes = [];
    let spent = 0;
    for (const q of run.queries) {
      const o = await runQuery(dfs as never, run, q, spent);
      spent += o.actualCostUsd;
      outcomes.push(o);
    }
    const stats = await finalizeOpportunitiesStep(
      client,
      run,
      outcomes.flatMap((o) => o.candidates),
      spent,
    );
    expect(Object.keys(stats.byType).length).toBeGreaterThanOrEqual(5);
    const rows = tables.link_opportunities!;
    expect(rows.length).toBe(stats.total);
    expect(rows.some((r) => r.source_domain === "rival.com")).toBe(false);
    for (const r of rows) {
      expect(r.target_page_url).toBeTruthy();
      expect(r.type).toBeTruthy();
      expect(r.priority).toBeTruthy();
    }
    const a = tables.audits![0]!;
    expect(a.opportunities_status).toBe("termine");
    expect(a.opportunities_cost_usd).toBeCloseTo(0.01, 6);
  });

  it("régénérer remplace les lignes (idempotent)", async () => {
    const { client, tables } = setup({ opStatus: "en_cours" });
    tables.audits![0]!.opportunities_limits = { queries: [] };
    const run = (await beginOpportunities(client, AUDIT_ID))!;
    await finalizeOpportunitiesStep(client, run, [], 0);
    tables.audits![0]!.opportunities_status = "en_cours";
    const n = tables.link_opportunities!.length;
    await finalizeOpportunitiesStep(client, run, [], 0);
    expect(tables.link_opportunities!.length).toBe(n);
  });
});

describe("job Inngest", () => {
  it("est enregistré et valide son événement", () => {
    expect(functions).toContain(auditOpportunities);
    expect(opportunitiesEventSchema.safeParse({ auditId: AUDIT_ID }).success).toBe(true);
    expect(opportunitiesEventSchema.safeParse({ auditId: "x" }).success).toBe(false);
  });
});
