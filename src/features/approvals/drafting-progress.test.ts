import { describe, expect, it } from "vitest";
import { draftingProgress } from "./drafting-progress";

const base = { missing: 0, drafting: false, approved: 0, messages: [] as unknown[] };

describe("bloc de progression de la rédaction", () => {
  it("caché tant que rien n'est en cours ni en attente", () => {
    expect(draftingProgress(base).visible).toBe(false);
    expect(draftingProgress({ ...base, messages: [1, 2], approved: 3 }).visible).toBe(false);
  });

  it("visible dès qu'une cible validée attend son message, même sans rédaction lancée", () => {
    const p = draftingProgress({ ...base, missing: 8 });
    expect(p.visible).toBe(true);
    expect(p.running).toBe(false);
    expect(p.toWrite).toBe(8);
  });

  it("pendant une rédaction : messages en cours, prêts et approuvés", () => {
    const p = draftingProgress({
      missing: 8,
      drafting: true,
      approved: 0,
      messages: [1, 2, 3, 4, 5],
    });
    expect(p).toEqual({
      visible: true,
      running: true,
      toWrite: 8,
      ready: 5,
      approved: 0,
      percent: 38,
    });
  });

  it("la barre compte les messages écrits, approuvés compris", () => {
    const p = draftingProgress({ missing: 0, drafting: false, approved: 3, messages: [1] });
    expect(p.visible).toBe(false);
    const q = draftingProgress({ missing: 4, drafting: false, approved: 2, messages: [1, 2] });
    expect(q.percent).toBe(50);
  });

  it("zéro partout ne plante pas (barre à 0)", () => {
    const p = draftingProgress({ ...base, drafting: true });
    expect(p.visible).toBe(true);
    expect(p.percent).toBe(0);
  });
});
