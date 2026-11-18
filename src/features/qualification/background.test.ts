import { describe, expect, it } from "vitest";
import {
  AUTO_EXPECTED_SHARE,
  AUTO_LIMITS,
  autoEventId,
  CAMPAIGN_JUDGE_USD,
  decideNext,
} from "./background";

const base = { lots: 1, lowStreak: 0, costUsd: 0.02, startedAtMs: 0, nowMs: 90_000, stock: 200 };

describe("lecture automatique de la réserve : décision après chaque lot", () => {
  it("continue tant que rien n'arrête, avec ce qui reste de budget et de temps", () => {
    const d = decideNext(base);
    expect(d).toEqual({ continue: true, lotBudgetUsd: 0.15, lotMaxMs: 9 * 60_000 });
    const tight = decideNext({ ...base, costUsd: 0.27, nowMs: 40 * 60_000 });
    expect(tight).toMatchObject({ continue: true });
    if (tight.continue) {
      expect(tight.lotBudgetUsd).toBeCloseTo(0.03, 6);
      expect(tight.lotMaxMs).toBe(5 * 60_000);
    }
  });

  it("chaque arrêt a sa raison", () => {
    expect(decideNext({ ...base, stock: 0 })).toEqual({ continue: false, stop: "reserve_epuisee" });
    expect(decideNext({ ...base, costUsd: 0.29 })).toEqual({ continue: false, stop: "budget" });
    expect(decideNext({ ...base, nowMs: 44.5 * 60_000 })).toEqual({
      continue: false,
      stop: "duree",
    });
  });

  it("MC.6f : un rendement faible n'arrête plus la lecture tant que la réserve n'est pas vide", () => {
    expect(decideNext({ ...base, lowStreak: 2 })).toMatchObject({ continue: true });
    expect(decideNext({ ...base, lowStreak: 9 })).toMatchObject({ continue: true });
  });

  it("MC.6f : le budget de la campagne (0,50 USD, première liste comprise) borne les lots", () => {
    // Première liste : 0,40 USD dépensés, l'arrière-plan n'a rien dépensé : il reste 0,10 USD.
    const d = decideNext({ ...base, costUsd: 0, spentTotalUsd: 0.4 });
    expect(d).toMatchObject({ continue: true });
    if (d.continue) expect(d.lotBudgetUsd).toBeCloseTo(0.1, 6);
    expect(decideNext({ ...base, costUsd: 0, spentTotalUsd: 0.48 })).toEqual({
      continue: false,
      stop: "budget",
    });
  });

  it("un lot qui n'a lu aucune page arrête la chaîne (jamais de boucle sans fin)", () => {
    expect(decideNext({ ...base, noProgress: true })).toEqual({
      continue: false,
      stop: "reserve_epuisee",
    });
  });

  it("budget total de la campagne : 0,50 USD, et la lecture de fond tient dans 45 minutes", () => {
    expect(CAMPAIGN_JUDGE_USD).toBe(0.5);
    expect(AUTO_LIMITS.budgetUsd * AUTO_EXPECTED_SHARE).toBeLessThan(AUTO_LIMITS.budgetUsd);
    expect(AUTO_LIMITS.maxMs).toBe(45 * 60_000);
  });

  it("l'identifiant d'événement d'un lot est stable (un rejeu ne crée pas de second lot)", () => {
    const a = autoEventId("a", "2026-11-17T08:00:00.000Z", 2);
    expect(a).toBe(autoEventId("a", "2026-11-17T08:00:00.000Z", 2));
    expect(a).not.toBe(autoEventId("a", "2026-11-17T08:00:00.000Z", 3));
  });
});
