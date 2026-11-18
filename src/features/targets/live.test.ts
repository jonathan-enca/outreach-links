import { describe, expect, it } from "vitest";
import { AUTO_LIMITS } from "@/features/qualification/background";
import { newIds, remainingMinutes, roundedMinutes } from "./live";

const T0 = 1_000_000_000_000;

describe("temps restant de la recherche", () => {
  it("un lot par tranche de 250 sites, 9 minutes par lot (MC.6f)", () => {
    expect(remainingMinutes({ stock: 60, costUsd: 0, startedAtMs: T0, nowMs: T0 })).toBe(9);
    expect(remainingMinutes({ stock: 600, costUsd: 0, startedAtMs: T0, nowMs: T0 })).toBe(27);
  });
  it("borné par le budget restant : 0,30 USD, lots de 0,03 USD au moins", () => {
    // 0,28 USD dépensés : reste 0,02, mais au moins un dernier lot est annoncé
    expect(remainingMinutes({ stock: 900, costUsd: 0.28, startedAtMs: T0, nowMs: T0 })).toBe(9);
    expect(remainingMinutes({ stock: 900, costUsd: 0, startedAtMs: T0, nowMs: T0 })).toBe(36);
  });
  it("borné par la durée maximale, jamais moins de 1 minute", () => {
    const late = T0 + AUTO_LIMITS.maxMs - 2 * 60_000;
    expect(remainingMinutes({ stock: 900, costUsd: 0, startedAtMs: T0, nowMs: late })).toBe(2);
    expect(remainingMinutes({ stock: 900, costUsd: 0, startedAtMs: T0, nowMs: T0 + 10 ** 9 })).toBe(
      1,
    );
  });
  it("arrondi à 5 minutes", () => {
    expect([1, 5, 6, 10, 11].map(roundedMinutes)).toEqual([5, 5, 10, 10, 15]);
  });
});

describe("cibles nouvelles", () => {
  const cards = [
    { id: "a", addedAt: "2026-11-18T10:00:00Z" },
    { id: "b", addedAt: "2026-11-18T10:30:00Z" },
    { id: "c", addedAt: null },
  ];
  it("première visite : aucune ; ensuite, celles arrivées après la dernière visite", () => {
    expect(newIds(cards, null, new Set()).size).toBe(0);
    expect([...newIds(cards, "2026-11-18T10:10:00Z", new Set())]).toEqual(["b"]);
  });
  it("celles qu'on vient de faire afficher sont nouvelles", () => {
    expect([...newIds(cards, null, new Set(["a"]))]).toEqual(["a"]);
  });
});
