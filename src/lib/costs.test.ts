import { describe, expect, it, vi } from "vitest";
import { recordCost, type CostClient } from "./costs";

function fakeClient(result: { data?: unknown; error?: { message: string } | null }) {
  const insert = vi.fn();
  const chain = {
    insert: (row: unknown) => {
      insert(row);
      return chain;
    },
    select: () => chain,
    single: async () => ({ data: result.data ?? null, error: result.error ?? null }),
  };
  const client = { from: vi.fn(() => chain) } as unknown as CostClient;
  return { client, insert };
}

describe("recordCost", () => {
  it("insère une ligne normalisée et la renvoie", async () => {
    const { client, insert } = fakeClient({ data: { id: 1 } });
    const row = await recordCost(client, {
      provider: "dataforseo",
      operation: "serp.organic.live",
      units: 3,
      estimatedCostUsd: 0.006,
    });
    expect(row).toEqual({ id: 1 });
    expect(insert).toHaveBeenCalledWith({
      workspace_id: null,
      audit_id: null,
      provider: "dataforseo",
      operation: "serp.organic.live",
      units: 3,
      estimated_cost_usd: 0.006,
      actual_cost_usd: null,
      metadata: {},
    });
  });

  it("refuse un coût négatif ou un fournisseur vide", async () => {
    const { client } = fakeClient({ data: {} });
    await expect(
      recordCost(client, { provider: "x", operation: "y", estimatedCostUsd: -1 }),
    ).rejects.toThrow();
    await expect(recordCost(client, { provider: "", operation: "y" })).rejects.toThrow();
  });

  it("propage l'erreur de la base", async () => {
    const { client } = fakeClient({ error: { message: "permission denied" } });
    await expect(recordCost(client, { provider: "x", operation: "y" })).rejects.toThrow(
      /permission denied/,
    );
  });
});
