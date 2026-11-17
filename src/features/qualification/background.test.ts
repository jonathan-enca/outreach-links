import { describe, expect, it } from "vitest";
import { AUTO_EXPECTED_SHARE, AUTO_LIMITS, autoEventId, decideNext } from "./background";

const base = { lots: 1, lowStreak: 0, costUsd: 0.09, startedAtMs: 0, nowMs: 90_000, stock: 200 };

describe("lecture automatique de la réserve : décision après chaque lot", () => {
  it("continue tant que rien n'arrête, avec ce qui reste de budget et de temps", () => {
    const d = decideNext(base);
    expect(d).toEqual({ continue: true, lotBudgetUsd: 0.15, lotMaxMs: 5 * 60_000 });
    const tight = decideNext({ ...base, costUsd: 0.2, nowMs: 12 * 60_000 });
    expect(tight).toMatchObject({ continue: true });
    if (tight.continue) {
      expect(tight.lotBudgetUsd).toBeCloseTo(0.05, 6);
      expect(tight.lotMaxMs).toBe(3 * 60_000);
    }
  });

  it("chaque arrêt a sa raison", () => {
    expect(decideNext({ ...base, stock: 0 })).toEqual({ continue: false, stop: "reserve_epuisee" });
    expect(decideNext({ ...base, lowStreak: 2 })).toEqual({
      continue: false,
      stop: "rendement_faible",
    });
    expect(decideNext({ ...base, costUsd: 0.23 })).toEqual({ continue: false, stop: "budget" });
    expect(decideNext({ ...base, nowMs: 14.5 * 60_000 })).toEqual({
      continue: false,
      stop: "duree",
    });
  });

  it("un seul lot sous le seuil ne suffit pas à s'arrêter", () => {
    expect(decideNext({ ...base, lowStreak: 1 })).toMatchObject({ continue: true });
  });

  it("le budget d'arrière-plan est borné et attendu sous le plafond", () => {
    expect(AUTO_LIMITS.budgetUsd).toBeLessThanOrEqual(0.25);
    expect(AUTO_LIMITS.budgetUsd * AUTO_EXPECTED_SHARE).toBeLessThan(0.2);
    expect(AUTO_LIMITS.maxMs).toBe(15 * 60_000);
  });

  it("l'identifiant d'événement d'un lot est stable (un rejeu ne crée pas de second lot)", () => {
    const a = autoEventId("a", "2026-11-17T08:00:00.000Z", 2);
    expect(a).toBe(autoEventId("a", "2026-11-17T08:00:00.000Z", 2));
    expect(a).not.toBe(autoEventId("a", "2026-11-17T08:00:00.000Z", 3));
  });
});
