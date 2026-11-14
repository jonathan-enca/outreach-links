import { describe, expect, it } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { functions } from "@/inngest/functions";
import { auditDeadlinks } from "@/inngest/functions/audit-deadlinks";
import { huntDeadLinks, mergeStats, EMPTY_STATS, BOT_USER_AGENT } from "./hunt";
import { extractOutboundLinks } from "./html";
import { parseRobots, robotsFromResponse } from "./robots";
import { beginDeadlinks, failDeadlinks, finalizeDeadlinks, loadHuntInput } from "./run";
import { startDeadlinks } from "./service";
import { deadLinkOpportunities } from "./to-opportunities";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const WS_ID = "22222222-2222-4222-8222-222222222222";

/** Faux web : table URL -> réponse ; journalise toutes les requêtes. */
function fakeWeb(pages: Record<string, { status: number; text?: string }>) {
  const hits: string[] = [];
  const fetch = async (url: string) => {
    hits.push(url);
    const r = pages[url];
    return r ? { status: r.status, text: r.text ?? "" } : { status: 404, text: "" };
  };
  return { fetch, hits };
}
const deps = (
  fetch: (u: string) => Promise<{ status: number; text: string } | null>,
  over = {},
) => {
  let t = 1_000_000;
  const sleeps: number[] = [];
  return {
    fetch,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      t += ms;
    },
    now: () => t,
    limits: over,
    sleeps,
  };
};

describe("robots.txt", () => {
  const txt = `User-agent: *\nDisallow: /prive/\nAllow: /prive/ok\n\nUser-agent: OutreachLinksBot\nDisallow: /ressources/interdit$\n`;
  it("le groupe du bot prime sur *", () => {
    const r = parseRobots(txt, "OutreachLinksBot");
    expect(r.allowed("/prive/x")).toBe(true);
    expect(r.allowed("/ressources/interdit")).toBe(false);
    expect(r.allowed("/ressources/interdit/autre")).toBe(true);
  });
  it("groupe * : la règle la plus longue gagne", () => {
    const r = parseRobots(txt, "AutreBot");
    expect(r.allowed("/prive/x")).toBe(false);
    expect(r.allowed("/prive/ok")).toBe(true);
  });
  it("jokers", () => {
    const r = parseRobots("User-agent: *\nDisallow: /*.pdf$", "x");
    expect(r.allowed("/a/b.pdf")).toBe(false);
    expect(r.allowed("/a/b.pdf?x=1")).toBe(true);
  });
  it("statuts : 404 = tout permis ; 5xx ou injoignable = rien", () => {
    expect(robotsFromResponse({ status: 404, text: "" }, "x").allowed("/a")).toBe(true);
    expect(robotsFromResponse({ status: 503, text: "" }, "x").allowed("/a")).toBe(false);
    expect(robotsFromResponse(null, "x").allowed("/a")).toBe(false);
  });
});

describe("extractOutboundLinks", () => {
  const html = `<a href="/interne">i</a><a href="https://www.exemple.fr/p">mon site</a>
    <a href="https://autre.fr/a#x"> Un   lien </a><a href="https://autre.fr/a">dup</a>
    <a href="mailto:a@b.c">m</a><a href="javascript:void 0">j</a><a href="https://tiers.org/">t</a>`;
  it("externes, http(s), dédoublonnés, plafonnés", () => {
    const out = extractOutboundLinks(html, "https://exemple.fr/ressources", 10);
    expect(out.map((l) => l.url)).toEqual(["https://autre.fr/a", "https://tiers.org/"]);
    expect(out[0]?.anchor).toBe("Un lien");
    expect(extractOutboundLinks(html, "https://exemple.fr/", 1)).toHaveLength(1);
  });
});

describe("huntDeadLinks", () => {
  const competitorLinks = [
    {
      sourceDomain: "blog-a.fr",
      sourceUrl: "https://blog-a.fr/p1",
      targetUrl: "https://rival.com/mort",
      competitorDomain: "rival.com",
    },
    {
      sourceDomain: "blog-b.fr",
      sourceUrl: "https://blog-b.fr/p2",
      targetUrl: "https://rival.com/mort",
      competitorDomain: "rival.com",
    },
    {
      sourceDomain: "blog-c.fr",
      sourceUrl: "https://blog-c.fr/p3",
      targetUrl: "https://rival.com/vivant",
      competitorDomain: "rival.com",
    },
  ];
  const web = () =>
    fakeWeb({
      "https://rival.com/robots.txt": { status: 404 },
      "https://rival.com/mort": { status: 410 },
      "https://rival.com/vivant": { status: 200 },
      "https://ecole.fr/robots.txt": { status: 200, text: "User-agent: *\nDisallow: /interdit" },
      "https://ecole.fr/ressources": {
        status: 200,
        text: `<a href="https://casse.fr/x">Lien cassé</a><a href="https://ok.fr/y">OK</a><a href="https://ecole.fr/interdit">int</a><a href="https://bloque.fr/z">B</a>`,
      },
      "https://casse.fr/robots.txt": { status: 404 },
      "https://casse.fr/x": { status: 404 },
      "https://ok.fr/robots.txt": { status: 404 },
      "https://ok.fr/y": { status: 200 },
      "https://bloque.fr/robots.txt": { status: 200, text: "User-agent: *\nDisallow: /" },
    });

  it("prouve les 404/410 des pages de concurrents et des pages ressources", async () => {
    const w = web();
    const d = deps(w.fetch);
    const { findings, stats } = await huntDeadLinks(
      {
        competitorLinks,
        resourcePages: [{ domain: "ecole.fr", url: "https://ecole.fr/ressources" }],
      },
      d,
    );
    const comp = findings.filter((f) => f.kind === "competitor_page");
    expect(comp.map((f) => f.sourceDomain).sort()).toEqual(["blog-a.fr", "blog-b.fr"]);
    expect(
      comp.every((f) => f.httpStatus === 410 && f.brokenUrl === "https://rival.com/mort"),
    ).toBe(true);
    const res = findings.filter((f) => f.kind === "resource_page");
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({
      sourceDomain: "ecole.fr",
      brokenUrl: "https://casse.fr/x",
      httpStatus: 404,
      anchor: "Lien cassé",
    });
    expect(stats.blockedByRobots).toBe(1); // bloque.fr
    expect(w.hits).not.toContain("https://bloque.fr/z");
    expect(w.hits).not.toContain("https://ok.fr/interdit");
    expect(stats.dead).toBe(3);
  });

  it("respecte le délai par hôte", async () => {
    const w = web();
    const d = deps(w.fetch);
    await huntDeadLinks({ competitorLinks, resourcePages: [] }, d);
    expect(d.sleeps.length).toBeGreaterThan(0);
    expect(d.sleeps.every((ms) => ms <= 1000 && ms > 0)).toBe(true);
  });

  it("ne dépasse jamais le plafond de requêtes", async () => {
    const w = web();
    const d = deps(w.fetch, { maxRequests: 3 });
    const { stats } = await huntDeadLinks(
      {
        competitorLinks,
        resourcePages: [{ domain: "ecole.fr", url: "https://ecole.fr/ressources" }],
      },
      d,
    );
    expect(w.hits.length).toBeLessThanOrEqual(3);
    expect(stats.requests).toBeLessThanOrEqual(3);
    expect(stats.truncated).toBe(true);
  });

  it("plafonne les pages ressources lues", async () => {
    const w = web();
    const d = deps(w.fetch, { maxResourcePages: 0 });
    const { stats } = await huntDeadLinks(
      {
        competitorLinks: [],
        resourcePages: [{ domain: "ecole.fr", url: "https://ecole.fr/ressources" }],
      },
      d,
    );
    expect(stats.resourcePagesCrawled).toBe(0);
    expect(w.hits).toHaveLength(0);
  });

  it("un échec réseau n'est pas une preuve", async () => {
    const d = deps(async () => null);
    const { findings } = await huntDeadLinks({ competitorLinks, resourcePages: [] }, d);
    expect(findings).toHaveLength(0);
  });

  it("robots.txt en 5xx : aucune page vérifiée", async () => {
    const w = fakeWeb({ "https://rival.com/robots.txt": { status: 503 } });
    const { findings } = await huntDeadLinks({ competitorLinks, resourcePages: [] }, deps(w.fetch));
    expect(findings).toHaveLength(0);
    expect(w.hits).toEqual(["https://rival.com/robots.txt"]);
  });

  it("user-agent identifiable", () => {
    expect(BOT_USER_AGENT).toContain("OutreachLinksBot");
    expect(
      mergeStats(EMPTY_STATS, { ...EMPTY_STATS, requests: 2, truncated: true }).truncated,
    ).toBe(true);
  });
});

describe("deadLinkOpportunities", () => {
  const f = (over = {}) => ({
    kind: "competitor_page" as const,
    sourceDomain: "blog-a.fr",
    sourceUrl: "https://blog-a.fr/p1",
    brokenUrl: "https://rival.com/coloriage-licorne",
    httpStatus: 404 as const,
    anchor: null,
    competitorDomain: "rival.com",
    checkedAt: "2026-11-14T10:00:00.000Z",
    ...over,
  });
  const opts = {
    siteDomain: "mega-coloring.com",
    competitorDomains: ["rival.com"],
    pages: [{ url: "https://mega-coloring.com/licorne", keywords: ["coloriage licorne"] }],
    homepage: "https://mega-coloring.com/",
    offeredAsset: "des coloriages",
  };
  it("filtre site, concurrents, plateformes ; page de remplacement par recoupement", () => {
    const out = deadLinkOpportunities(
      [
        f(),
        f({ sourceDomain: "rival.com" }),
        f({ sourceDomain: "youtube.com" }),
        f({ sourceDomain: "mega-coloring.com" }),
      ],
      opts,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      domain: "blog-a.fr",
      httpStatus: 404,
      targetPageUrl: "https://mega-coloring.com/licorne",
      priority: "haute",
    });
    expect(out[0]!.rationale).toContain("404");
  });
  it("un constat par domaine, la page de concurrent prime", () => {
    const out = deadLinkOpportunities([f({ kind: "resource_page" }), f()], opts);
    expect(out).toHaveLength(1);
    expect(out[0]!.priorityScore).toBe(85);
  });
});

describe("run (base simulée)", () => {
  const tables = () => ({
    audits: [
      {
        id: AUDIT_ID,
        workspace_id: WS_ID,
        site_id: "s1",
        opportunities_status: "termine",
        deadlinks_status: "en_cours",
      },
    ],
    sites: [{ id: "s1", domain: "mega-coloring.com", offered_asset: "des coloriages" }],
    competitors: [{ id: "c1", audit_id: AUDIT_ID, domain: "rival.com", selected: true }],
    competitor_backlinks: [
      {
        audit_id: AUDIT_ID,
        clean_status: "garde",
        source_domain: "blog-a.fr",
        source_url: "https://blog-a.fr/p1",
        target_url: "https://rival.com/mort",
        competitor_id: "c1",
      },
      {
        audit_id: AUDIT_ID,
        clean_status: "exclu",
        source_domain: "spam.xyz",
        source_url: "https://spam.xyz/",
        target_url: "https://rival.com/x",
        competitor_id: "c1",
      },
      {
        audit_id: AUDIT_ID,
        clean_status: "garde",
        source_domain: "sans-cible.fr",
        source_url: "https://sans-cible.fr/",
        target_url: null,
        competitor_id: "c1",
      },
    ],
    link_opportunities: [
      {
        audit_id: AUDIT_ID,
        type: "page_ressources",
        source_domain: "ecole.fr",
        source_url: "https://ecole.fr/ressources",
        priority_score: 70,
      },
      {
        audit_id: AUDIT_ID,
        type: "annuaire",
        source_domain: "blog-a.fr",
        source_url: "https://blog-a.fr/",
        priority_score: 40,
      },
    ],
    audit_pages: [],
    events: [],
  });

  it("begin, load, finalize : remplace l'opportunité moins précise et clôt l'étape", async () => {
    const { client, tables: t } = fakeSupabase(tables());
    const run = await beginDeadlinks(client, AUDIT_ID);
    expect(run).toMatchObject({ siteDomain: "mega-coloring.com", workspaceId: WS_ID });
    const input = await loadHuntInput(client, AUDIT_ID);
    expect(input.competitorLinks).toHaveLength(1);
    expect(input.competitorLinks[0]).toMatchObject({ competitorDomain: "rival.com" });
    expect(input.resourcePages).toEqual([
      { domain: "ecole.fr", url: "https://ecole.fr/ressources" },
    ]);

    const finding = {
      kind: "competitor_page" as const,
      sourceDomain: "blog-a.fr",
      sourceUrl: "https://blog-a.fr/p1",
      brokenUrl: "https://rival.com/mort",
      httpStatus: 410 as const,
      anchor: null,
      competitorDomain: "rival.com",
      checkedAt: "2026-11-14T10:00:00.000Z",
    };
    const stats = { ...EMPTY_STATS, requests: 4, dead: 1 };
    const out = await finalizeDeadlinks(client, run!, [finding], stats);
    expect(out.created).toBe(1);
    const opps = t.link_opportunities!;
    expect(opps.map((o) => o.source_domain).sort()).toEqual(["blog-a.fr", "ecole.fr"]);
    const dead = opps.find((o) => o.type === "lien_mort")!;
    expect(dead).toMatchObject({
      broken_url: "https://rival.com/mort",
      broken_http_status: 410,
      expected_link_type: "reprise_lien_mort",
    });
    expect(t.audits![0]).toMatchObject({ deadlinks_status: "termine" });
    // idempotent : un second passage ne duplique pas
    t.audits![0]!.deadlinks_status = "en_cours";
    await finalizeDeadlinks(client, run!, [finding], stats);
    expect(t.link_opportunities!.filter((o) => o.type === "lien_mort")).toHaveLength(1);
  });

  it("begin : ignore si les opportunités ne sont pas terminées ou l'étape non lancée", async () => {
    const a = tables();
    a.audits[0]!.opportunities_status = "en_cours";
    expect(await beginDeadlinks(fakeSupabase(a).client, AUDIT_ID)).toBeNull();
    const b = tables();
    b.audits[0]!.deadlinks_status = "aucun";
    expect(await beginDeadlinks(fakeSupabase(b).client, AUDIT_ID)).toBeNull();
  });

  it("failDeadlinks marque l'étape en échec", async () => {
    const { client, tables: t } = fakeSupabase(tables());
    await failDeadlinks(client, AUDIT_ID, "boom");
    expect(t.audits![0]).toMatchObject({ deadlinks_status: "echoue", deadlinks_error: "boom" });
  });
});

describe("startDeadlinks", () => {
  const base = () => {
    const x = fakeSupabase({
      audits: [
        {
          id: AUDIT_ID,
          workspace_id: WS_ID,
          opportunities_status: "termine",
          deadlinks_status: "aucun",
        },
      ],
      events: [],
    });
    return x;
  };
  it("lance l'étape et envoie l'événement", async () => {
    const { client, tables: t } = base();
    const sent: { name: string }[] = [];
    const r = await startDeadlinks(
      client,
      AUDIT_ID,
      () => client,
      async (e) => void sent.push(e),
    );
    expect(r.status).toBe("ok");
    expect(t.audits![0]!.deadlinks_status).toBe("en_cours");
    expect(sent[0]?.name).toBe("audit/deadlinks.requested");
  });
  it("refuse sans opportunités terminées et sans connexion", async () => {
    const x = base();
    x.tables.audits![0]!.opportunities_status = "aucun";
    expect(
      (
        await startDeadlinks(
          x.client,
          AUDIT_ID,
          () => x.client,
          async () => {},
        )
      ).status,
    ).toBe("error");
    const y = fakeSupabase({ audits: [] }, { userId: null });
    expect(
      (
        await startDeadlinks(
          y.client,
          AUDIT_ID,
          () => y.client,
          async () => {},
        )
      ).status,
    ).toBe("error");
  });
  it("déjà en cours : ne renvoie pas d'événement", async () => {
    const x = base();
    x.tables.audits![0]!.deadlinks_status = "en_cours";
    const sent: unknown[] = [];
    const r = await startDeadlinks(
      x.client,
      AUDIT_ID,
      () => x.client,
      async (e) => void sent.push(e),
    );
    expect(r.status).toBe("ok");
    expect(sent).toHaveLength(0);
  });
  it("échec d'envoi : repasse en échec pour permettre la relance", async () => {
    const { client, tables: t } = base();
    const r = await startDeadlinks(
      client,
      AUDIT_ID,
      () => client,
      async () => {
        throw new Error("x");
      },
    );
    expect(r.status).toBe("error");
    expect(t.audits![0]!.deadlinks_status).toBe("echoue");
  });
});

describe("enregistrement", () => {
  it("le job est enregistré", () => {
    expect(functions).toContain(auditDeadlinks);
  });
});
