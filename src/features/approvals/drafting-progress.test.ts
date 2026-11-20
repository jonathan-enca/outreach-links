import { describe, expect, it } from "vitest";
import { DRAFTING_LIST_SIZE, draftingList, draftingProgress } from "./drafting-progress";

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

describe("liste des cibles du bloc de progression", () => {
  const domains = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => `${prefix}${i}.fr`);

  it("pendant une rédaction : cibles en cours, puis prêtes, avec leur état", () => {
    const l = draftingList(
      { missingDomains: ["a.fr", "b.fr"], messages: [{ domain: "c.fr" }] },
      true,
    );
    expect(l.total).toBe(3);
    expect(l.hidden).toBe(0);
    expect(l.rows).toEqual([
      { key: "attente-0", domain: "a.fr", state: "en_cours" },
      { key: "attente-1", domain: "b.fr", state: "en_cours" },
      { key: "pret-0", domain: "c.fr", state: "pret" },
    ]);
  });

  it("sans rédaction en cours, les cibles attendent : « à rédiger »", () => {
    const l = draftingList({ missingDomains: ["a.fr"], messages: [] }, false);
    expect(l.rows).toEqual([{ key: "attente-0", domain: "a.fr", state: "a_rediger" }]);
  });

  it("montre au plus 10 cibles par groupe et compte le reste, sans plafond invisible", () => {
    const waiting = domains(14, "w");
    const ready = domains(3, "r").map((domain) => ({ domain }));
    const l = draftingList({ missingDomains: waiting, messages: ready }, true);
    expect(DRAFTING_LIST_SIZE).toBe(10);
    expect(l.total).toBe(17);
    expect(l.rows).toHaveLength(13);
    expect(l.hidden).toBe(4);
    expect(l.rows.filter((r) => r.state === "en_cours")).toHaveLength(10);
    expect(l.rows.filter((r) => r.state === "pret")).toHaveLength(3);
  });

  it("aucune cible : liste vide et rien à afficher", () => {
    const l = draftingList({ missingDomains: [], messages: [] }, false);
    expect(l).toEqual({ total: 0, rows: [], hidden: 0 });
  });
});
