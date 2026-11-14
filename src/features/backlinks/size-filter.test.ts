import { describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/features/audits/fake-supabase";
import { createDataForSeoClient, MemoryCache } from "@/lib/dataforseo";
import { estimateBacklinks, sizeCheckCostUsd } from "./limits";
import { beginBacklinks, filterCompetitorsBySize } from "./run";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";
const WS_ID = "22222222-2222-4222-8222-222222222222";

// Fixture SYNTHÉTIQUE au format backlinks/bulk_referring_domains/live (d'après la doc).
const bulkEnvelope = (sizes: Record<string, number | null>) => ({
  version: "0.1.20250101",
  status_code: 20000,
  status_message: "Ok.",
  time: "0.1 sec.",
  cost: 0.0203,
  tasks_count: 1,
  tasks_error: 0,
  tasks: [
    {
      id: "t1",
      status_code: 20000,
      status_message: "Ok.",
      time: "0.1 sec.",
      cost: 0.0203,
      result_count: 1,
      path: ["v3", "backlinks", "bulk_referring_domains", "live"],
      data: {},
      result: [
        {
          items_count: Object.keys(sizes).length,
          items: Object.entries(sizes).map(([target, referring_domains]) => ({
            type: "backlinks_bulk_referring_domains",
            target,
            referring_domains,
          })),
        },
      ],
    },
  ],
});

function setup(sizes: Record<string, number | null>, over: { plan?: string; cap?: number } = {}) {
  const comp = (id: string, domain: string, score: number, selected: boolean) => ({
    id,
    audit_id: AUDIT_ID,
    domain,
    score,
    selected,
    size_excluded: false,
    referring_domains: null,
  });
  const db = fakeSupabase({
    sites: [{ id: "site-1", workspace_id: WS_ID, domain: "mega-coloring.com", language: "fr" }],
    audits: [
      {
        id: AUDIT_ID,
        workspace_id: WS_ID,
        site_id: "site-1",
        status: "termine",
        plan: over.plan ?? "gratuit",
        cost_cap_usd: over.cap ?? 0.25,
        actual_cost_usd: 0.018,
        backlinks_status: "confirme",
        backlinks_limit: 300,
      },
    ],
    competitors: [
      comp("c1", "geant.com", 9, true),
      comp("c2", "petit-a.fr", 8, true),
      comp("c3", "petit-b.fr", 7, false),
      comp("c4", "geant-bis.com", 6, false),
      comp("c5", "petit-c.fr", 5, false),
    ],
    cost_ledger: [{ audit_id: AUDIT_ID, estimated_cost_usd: 0.018, actual_cost_usd: 0.018 }],
    events: [],
  });
  const fetchImpl = vi.fn<typeof fetch>(async () => {
    return new Response(JSON.stringify(bulkEnvelope(sizes)), {
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

const ids = (cs: { id: string }[]) => cs.map((c) => c.id);

describe("filterCompetitorsBySize (MA.2)", () => {
  it("écarte le géant avant les backlinks et le remplace par le candidat suivant", async () => {
    const { db, dfs, fetchImpl } = setup({
      "geant.com": 450_000,
      "petit-a.fr": 3_000,
      "petit-b.fr": 800,
      "geant-bis.com": 90_000,
      "petit-c.fr": 120,
    });
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    expect(run.plan).toBe("gratuit");
    const out = await filterCompetitorsBySize(db.client, dfs, run);

    expect(out.measured).toBe(true);
    expect(ids(out.competitors)).toEqual(["c2", "c3"]);
    expect(out.excluded).toEqual([{ domain: "geant.com", referringDomains: 450_000 }]);
    expect(out.replacedBy).toEqual(["petit-b.fr"]);
    // UN seul appel groupé couvre retenus + remplaçants.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchImpl.mock.calls[0]![1]?.body)) as { targets: string[] }[];
    expect(body[0]!.targets).toHaveLength(5);

    const byId = new Map(db.tables.competitors!.map((c) => [c.id, c]));
    expect(byId.get("c1")).toMatchObject({
      selected: false,
      size_excluded: true,
      referring_domains: 450_000,
    });
    expect(byId.get("c3")).toMatchObject({ selected: true, size_excluded: false });
    expect(byId.get("c4")).toMatchObject({ selected: false, size_excluded: true });
    expect(db.tables.cost_ledger!.at(-1)).toMatchObject({
      operation: "backlinks.bulk_referring_domains",
      audit_id: AUDIT_ID,
    });
    expect(db.tables.events!.at(-1)).toMatchObject({ type: "audit.competitors_size_filtered" });
  });

  it("le seuil dépend du plan : 50 000 passe en payant, pas en gratuit", async () => {
    const sizes = { "geant.com": 50_000, "petit-a.fr": 10 };
    const free = setup(sizes);
    const freeRun = (await beginBacklinks(free.db.client, AUDIT_ID))!;
    const f = await filterCompetitorsBySize(free.db.client, free.dfs, freeRun);
    expect(f.excluded.map((e) => e.domain)).toEqual(["geant.com"]);

    const paid = setup(sizes, { plan: "payant", cap: 1.5 });
    const paidRun = (await beginBacklinks(paid.db.client, AUDIT_ID))!;
    const p = await filterCompetitorsBySize(paid.db.client, paid.dfs, paidRun);
    expect(p.excluded).toEqual([]);
    expect(ids(p.competitors)).toEqual(["c1", "c2"]);
  });

  it("une taille inconnue ne prouve rien : le concurrent est gardé", async () => {
    const { db, dfs } = setup({ "petit-a.fr": 5, "geant.com": null });
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    const out = await filterCompetitorsBySize(db.client, dfs, run);
    expect(ids(out.competitors)).toEqual(["c1", "c2"]);
    expect(out.excluded).toEqual([]);
    expect(db.tables.competitors!.find((c) => c.id === "c1")!.size_excluded).toBe(false);
  });

  it("plus assez de remplaçants : liste raccourcie, jamais d'invention", async () => {
    const { db, dfs } = setup({
      "geant.com": 999_999,
      "petit-a.fr": 5,
      "petit-b.fr": 999_999,
      "geant-bis.com": 999_999,
      "petit-c.fr": 999_999,
    });
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    const out = await filterCompetitorsBySize(db.client, dfs, run);
    expect(ids(out.competitors)).toEqual(["c2"]);
  });

  it("saute la mesure (sans appel payant) si le plafond de l'audit ne la couvre pas", async () => {
    const { db, dfs, fetchImpl } = setup({ "geant.com": 999_999 }, { cap: 0.03 });
    const run = (await beginBacklinks(db.client, AUDIT_ID))!;
    const out = await filterCompetitorsBySize(db.client, dfs, run);
    expect(out.measured).toBe(false);
    expect(ids(out.competitors)).toEqual(["c1", "c2"]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("estimation avec mesure de taille", () => {
  it("inclut la requête groupée dans le total", () => {
    const size = sizeCheckCostUsd(3);
    expect(size).toBeCloseTo(0.024288, 5);
    const est = estimateBacklinks(3, "gratuit", 0.23)!;
    expect(est.sizeCheckUsd).toBe(size);
    expect(est.totalUsd).toBeCloseTo(est.perCompetitorUsd * 3 + size, 5);
  });
});
