import { describe, expect, it, vi } from "vitest";
import { dailyCapReached, dailySpendUsd } from "@/lib/costs";
import { fakeSupabase } from "./fake-supabase";
import { effectivePlan, AUDIT_BUDGET } from "./beta";
import { PLAN_LIMITS } from "./plans";
import { computeAuditEstimate, confirmAudit, DISCOVER_EVENT } from "./service";

const NOW = new Date("2026-11-15T20:00:00Z");

describe("mode bêta (MT.0)", () => {
  it("traite tout espace au niveau payant ; sans le mode, le plan de l'espace s'applique", () => {
    expect(effectivePlan("gratuit", true)).toBe("payant");
    expect(effectivePlan("gratuit", false)).toBe("gratuit");
    expect(effectivePlan("payant", false)).toBe("payant");
  });

  it("un espace gratuit obtient les limites hautes en bêta, ses limites normales sinon", () => {
    const input = {
      domain: "exemple-coloriage.fr",
      niche: "coloriages",
      offeredAsset: null,
      priorityQueries: ["coloriage licorne", "coloriage chat", "coloriage dinosaure"],
      workspacePlan: "gratuit",
    };
    const beta = computeAuditEstimate({ ...input, beta: true });
    const normal = computeAuditEstimate({ ...input, beta: false });
    expect(beta.plan).toBe("payant");
    expect(beta.limits.maxCompetitors).toBe(PLAN_LIMITS.payant.maxCompetitors);
    expect(normal.plan).toBe("gratuit");
    expect(normal.limits.maxCompetitors).toBe(PLAN_LIMITS.gratuit.maxCompetitors);
  });

  it("le plafond d'audit du plan payant suit la décision (2 USD), sous le plafond de sécurité", () => {
    expect(PLAN_LIMITS.payant.costCapUsd).toBe(AUDIT_BUDGET.capUsd);
    expect(AUDIT_BUDGET.targetUsd).toBeLessThan(AUDIT_BUDGET.capUsd);
    expect(AUDIT_BUDGET.capUsd).toBeLessThan(AUDIT_BUDGET.safetyCapUsd);
  });
});

describe("plafond quotidien de sécurité", () => {
  const ledger = (rows: { usd: number; at: string }[]) =>
    fakeSupabase({
      cost_ledger: rows.map((r, i) => ({
        id: `c${i}`,
        actual_cost_usd: r.usd,
        estimated_cost_usd: r.usd,
        created_at: r.at,
      })),
    });

  it("additionne les 24 dernières heures seulement", async () => {
    const db = ledger([
      { usd: 10, at: "2026-11-15T10:00:00Z" },
      { usd: 5, at: "2026-11-15T19:00:00Z" },
      { usd: 100, at: "2026-11-14T10:00:00Z" },
    ]);
    expect(await dailySpendUsd(db.client, NOW)).toBe(15);
    expect(await dailyCapReached(db.client, 25, NOW)).toBe(false);
    expect(await dailyCapReached(db.client, 15, NOW)).toBe(true);
  });

  it("confirmAudit refuse de lancer quand le plafond est atteint, sans rien facturer", async () => {
    const user = fakeSupabase({
      audits: [
        {
          id: "a1",
          workspace_id: "ws-1",
          site_id: "s1",
          status: "estime",
          estimated_cost_usd: 0.5,
          cost_cap_usd: 2,
        },
      ],
      events: [],
    });
    const service = fakeSupabase({
      cost_ledger: [
        {
          id: "c1",
          actual_cost_usd: 30,
          estimated_cost_usd: 30,
          created_at: new Date().toISOString(),
        },
      ],
    });
    service.tables.audits = user.tables.audits!;
    const send = vi.fn(async (..._a: unknown[]) => ({}));
    const res = await confirmAudit(user.client, "a1", () => service.client, send as never);
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/plafond de dépense quotidien/i);
    expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ name: DISCOVER_EVENT }));
    expect(user.tables.audits![0]).toMatchObject({ status: "estime" });
  });
});
