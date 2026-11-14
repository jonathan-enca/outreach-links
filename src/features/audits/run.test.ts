import { describe, expect, it, vi } from "vitest";
import { BudgetExceededError, createDataForSeoClient, MemoryCache } from "@/lib/dataforseo";
import { fakeSupabase } from "./fake-supabase";
import { beginDiscovery, discoverQuery, failDiscovery, finalizeDiscovery } from "./run";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const WS_ID = "22222222-2222-4222-8222-222222222222";

/** Réponse SERP au format DataForSEO : un domaine par rang, coût réel 0,006. */
function serpEnvelope(keyword: string, domains: string[], cost = 0.006) {
  return {
    version: "x",
    status_code: 20000,
    status_message: "Ok.",
    cost,
    tasks_count: 1,
    tasks_error: 0,
    tasks: [
      {
        id: `task-${keyword}`,
        status_code: 20000,
        status_message: "Ok.",
        cost,
        result_count: 1,
        result: [
          {
            keyword,
            type: "organic",
            items_count: domains.length,
            items: domains.map((d, i) => ({
              type: "organic",
              rank_group: i + 1,
              rank_absolute: i + 1,
              domain: `www.${d}`,
              title: `Titre ${d}`,
              url: `https://www.${d}/page`,
            })),
          },
        ],
      },
    ],
  };
}

const SERPS: Record<string, string[]> = {
  "coloriage licorne": [
    "fr.wikipedia.org",
    "hugolescargot.com",
    "mega-coloring.com",
    "coloriez.com",
    "youtube.com",
    "tetes-a-modeler.com",
    "amazon.fr",
  ],
  "coloriage chat": ["hugolescargot.com", "coloriez.com", "blog.mega-coloring.com", "pinterest.fr"],
  "coloriage dinosaure": ["hugolescargot.com", "dessin-colorier.fr", "coloriez.com"],
};

function setup(over: { status?: string; cap?: number; ledger?: Record<string, unknown>[] } = {}) {
  const db = fakeSupabase({
    sites: [{ id: "site-1", workspace_id: WS_ID, domain: "mega-coloring.com" }],
    audits: [
      {
        id: AUDIT_ID,
        workspace_id: WS_ID,
        site_id: "site-1",
        status: over.status ?? "confirme",
        plan: "gratuit",
        queries: Object.keys(SERPS),
        max_competitors: 3,
        estimated_cost_usd: 0.018,
        cost_cap_usd: over.cap ?? 0.25,
        estimate_details: { perQuery: [] },
      },
    ],
    cost_ledger: over.ledger ?? [],
    events: [],
  });
  const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { keyword: string }[];
    const keyword = body[0]!.keyword;
    const domains = SERPS[keyword];
    if (!domains) throw new Error(`requête inattendue : ${keyword}`);
    return new Response(JSON.stringify(serpEnvelope(keyword, domains)), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const dfs = createDataForSeoClient({
    costClient: db.client,
    cache: new MemoryCache(),
    auth: { login: "test", password: "test" },
    fetchImpl: fetchImpl as unknown as typeof fetch,
    sleep: async () => {},
  });
  return { db, dfs, fetchImpl };
}

describe("beginDiscovery", () => {
  it("passe confirme -> en_cours et renvoie le domaine du site", async () => {
    const { db } = setup();
    const audit = await beginDiscovery(db.client, AUDIT_ID);
    expect(audit).toMatchObject({ id: AUDIT_ID, domain: "mega-coloring.com", costCapUsd: 0.25 });
    expect(db.tables.audits![0]).toMatchObject({ status: "en_cours" });
    expect(db.tables.audits![0]!.started_at).toBeTruthy();
  });
  it("reprend un audit déjà en_cours (nouvelle tentative Inngest)", async () => {
    const { db } = setup({ status: "en_cours" });
    expect(await beginDiscovery(db.client, AUDIT_ID)).not.toBeNull();
  });
  it("n'exécute JAMAIS un audit non confirmé, terminé ou échoué", async () => {
    for (const status of ["en_attente", "estime", "termine", "echoue"]) {
      const { db } = setup({ status });
      expect(await beginDiscovery(db.client, AUDIT_ID), status).toBeNull();
      expect(db.tables.audits![0]!.status).toBe(status);
    }
  });
  it("audit inconnu : rien à faire", async () => {
    const { db } = setup();
    expect(await beginDiscovery(db.client, "inconnu")).toBeNull();
  });
});

describe("découverte complète (client DataForSEO réel sur fixtures, aucun appel réseau)", () => {
  it("SERP x3, agrégation, sélection gratuite, coût réel comparé à l'estimé", async () => {
    const { db, dfs, fetchImpl } = setup();
    const audit = (await beginDiscovery(db.client, AUDIT_ID))!;
    for (const q of audit.queries) {
      const r = await discoverQuery(db.client, dfs, audit, q);
      expect(r).toMatchObject({ query: q, cacheHit: false, actualCostUsd: 0.006 });
    }
    expect(fetchImpl).toHaveBeenCalledTimes(3);

    // Chaque appel est journalisé dans cost_ledger avec l'identifiant de l'audit.
    expect(db.tables.cost_ledger).toHaveLength(3);
    expect(db.tables.cost_ledger!.every((r) => r.audit_id === AUDIT_ID)).toBe(true);
    expect(db.tables.cost_ledger![0]).toMatchObject({
      provider: "dataforseo",
      operation: "serp.organic.live",
      estimated_cost_usd: 0.006,
      actual_cost_usd: 0.006,
    });

    const result = await finalizeDiscovery(db.client, audit);
    expect(result).toMatchObject({ estimatedUsd: 0.018, actualUsd: 0.018, selected: 3 });

    const audits = db.tables.audits![0]!;
    expect(audits).toMatchObject({ status: "termine", actual_cost_usd: 0.018 });
    expect(audits.finished_at).toBeTruthy();
    expect(audits.estimate_details).toMatchObject({ actual_usd: 0.018, gap_usd: 0, selected: 3 });

    const competitors = db.tables.competitors!;
    const domains = competitors.map((c) => c.domain);
    // Plateformes et site lui-même exclus.
    for (const bad of [
      "wikipedia.org",
      "youtube.com",
      "amazon.fr",
      "pinterest.fr",
      "mega-coloring.com",
    ]) {
      expect(
        domains.some((d) => String(d).endsWith(bad)),
        bad,
      ).toBe(false);
    }
    expect(domains).toContain("hugolescargot.com");
    const selected = competitors.filter((c) => c.selected).map((c) => c.domain);
    expect(selected).toEqual(expect.arrayContaining(["hugolescargot.com", "coloriez.com"]));
    expect(selected).toHaveLength(3);
    expect(db.tables.audit_serp_results!.length).toBeGreaterThan(10);
    expect(db.tables.events!.map((e) => e.type)).toContain("audit.completed");
  });

  it("rejouer une étape ne duplique ni les lignes SERP ni le coût (cache)", async () => {
    const { db, dfs, fetchImpl } = setup();
    const audit = (await beginDiscovery(db.client, AUDIT_ID))!;
    await discoverQuery(db.client, dfs, audit, "coloriage chat");
    const rows = db.tables.audit_serp_results!.length;
    const again = await discoverQuery(db.client, dfs, audit, "coloriage chat");
    expect(again.cacheHit).toBe(true);
    expect(again.actualCostUsd).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(db.tables.audit_serp_results).toHaveLength(rows);
  });

  it("refuse l'appel AVANT de payer si le plafond de l'audit serait dépassé", async () => {
    const { db, dfs, fetchImpl } = setup({
      cap: 0.01,
      ledger: [
        {
          audit_id: AUDIT_ID,
          estimated_cost_usd: 0.006,
          actual_cost_usd: 0.006,
        },
      ],
    });
    const audit = (await beginDiscovery(db.client, AUDIT_ID))!;
    await expect(discoverQuery(db.client, dfs, audit, "coloriage chat")).rejects.toBeInstanceOf(
      BudgetExceededError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("failDiscovery", () => {
  it("passe en echoue avec le message et le coût engagé", async () => {
    const { db } = setup({
      status: "en_cours",
      ledger: [{ audit_id: AUDIT_ID, estimated_cost_usd: 0.006, actual_cost_usd: 0.006 }],
    });
    await failDiscovery(db.client, AUDIT_ID, "DataForSEO : HTTP 500");
    expect(db.tables.audits![0]).toMatchObject({
      status: "echoue",
      error_message: "DataForSEO : HTTP 500",
      actual_cost_usd: 0.006,
    });
  });
  it("ne touche pas un audit déjà terminé", async () => {
    const { db } = setup({ status: "termine" });
    await failDiscovery(db.client, AUDIT_ID, "tardif");
    expect(db.tables.audits![0]!.status).toBe("termine");
  });
});
