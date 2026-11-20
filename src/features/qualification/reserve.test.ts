import { describe, expect, it } from "vitest";
import { carriedUnreadDomains, countStock, STOCK_REASONS } from "./reserve";

describe("réserve reprise d'une analyse à l'autre (même site)", () => {
  it("reprend un site jamais lu (hors_budget_lecture) et ne reprend jamais un site lu", () => {
    const out = carriedUnreadDomains([
      { domain: "jamais-lu.fr", exclusionReason: "hors_budget_lecture" },
      { domain: "lu-puis-exclu.fr", exclusionReason: "hors_sujet" },
      { domain: "lu-avant.fr", exclusionReason: "hors_budget_lecture" },
      { domain: "lu-avant.fr", exclusionReason: "non_qualifie" },
      { domain: "lu-jamais-depuis.fr", exclusionReason: "hors_budget_lecture" },
    ]);
    expect(out.sort()).toEqual(["jamais-lu.fr", "lu-jamais-depuis.fr"]);
  });

  it("un site non lu dans une analyse puis lu dans une autre n'est pas repris", () => {
    const out = carriedUnreadDomains([
      { domain: "x.fr", exclusionReason: "hors_budget_lecture" },
      { domain: "x.fr", exclusionReason: null },
    ]);
    expect(out).toEqual([]);
  });

  it("aucun verdict, aucune reprise", () => {
    expect(carriedUnreadDomains([])).toEqual([]);
  });

  it("le motif hors_budget_lecture fait partie du stock", () => {
    expect(STOCK_REASONS).toContain("hors_budget_lecture");
  });
});

describe("countStock", () => {
  it("compte les lignes en stock de l'analyse", async () => {
    const calls: string[] = [];
    const chain = {
      select: () => chain,
      eq: (col: string, val: string) => {
        calls.push(`${col}=${val}`);
        return chain;
      },
      in: (col: string) => {
        calls.push(`in:${col}`);
        return Promise.resolve({ count: 3 });
      },
    };
    const fake = { from: () => chain } as unknown as Parameters<typeof countStock>[0];
    expect(await countStock(fake, "run-9")).toBe(3);
    expect(calls).toEqual(["run_id=run-9", "in:exclusion_reason"]);
  });
});
