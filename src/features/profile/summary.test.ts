import { describe, expect, it, vi } from "vitest";
import {
  containsRankingPromise,
  generateSummary,
  templateSummary,
  type SummaryFacts,
} from "./summary";

const facts: SummaryFacts = {
  domain: "mega-coloring.com",
  referringDomains: 58,
  backlinks: 340,
  dofollowShare: 0.8,
  brandAnchorShare: 0.2,
  overOptimizedAnchors: true,
  competitorsBenchmark: 500,
  rankedKeywords: 120,
  priorityPages: [
    {
      url: "https://mega-coloring.com/licorne",
      avgPosition: 14,
      volume: 79000,
      pageDomains: 3,
      neededDomains: 100,
    },
  ],
  gapDomains: 42,
  gapTopCount: 3,
  techProblems: 1,
  techChecked: 3,
};
const ids = { workspaceId: "w", auditId: "a" };

describe("containsRankingPromise", () => {
  it.each([
    "Nous garantissons une place dans le top 3.",
    "Ce travail vous permettra de vous classer en première page.",
    "Votre site va atteindre la première position.",
    "Vous passerez devant vos concurrents, à coup sûr.",
    "Cela fera grimper la page dans le classement.",
    "Avec ces liens, la page atteindra le top 3 assuré.",
    "We guarantee you will rank first.",
  ])("détecte : %s", (text) => {
    expect(containsRankingPromise(text)).toBe(true);
  });
  it.each([
    "La page est en position moyenne 14 avec 79 000 recherches.",
    "Il faudrait environ 100 domaines référents de plus (estimation, pas une promesse).",
    "Cela ne garantit pas de classement.",
    "Rien n'est garanti.",
    "58 domaines référents contre une médiane de 500 chez les concurrents.",
  ])("laisse passer : %s", (text) => {
    expect(containsRankingPromise(text)).toBe(false);
  });
});

describe("templateSummary", () => {
  it("est factuel, chiffré et sans promesse", () => {
    const s = templateSummary(facts);
    expect(s).toContain("58");
    expect(s).toContain("500");
    expect(s).toContain("pas une promesse");
    expect(containsRankingPromise(s)).toBe(false);
  });
  it("tient sans données", () => {
    const s = templateSummary({
      ...facts,
      referringDomains: null,
      dofollowShare: null,
      priorityPages: [],
      gapDomains: 0,
      techChecked: 0,
      overOptimizedAnchors: false,
    });
    expect(s.length).toBeGreaterThan(20);
    expect(containsRankingPromise(s)).toBe(false);
  });
});

describe("generateSummary", () => {
  const llmReturning = (...texts: string[]) => {
    const generate = vi.fn();
    for (const t of texts) {
      generate.mockResolvedValueOnce({ data: { summary: t }, model: "m", costUsd: 0.0001 });
    }
    return { generate } as never;
  };
  const OK =
    "Le site compte 58 domaines référents, contre une médiane d'environ 500 chez les concurrents mesurés. Une page est en position moyenne 14.";

  it("retourne le texte du LLM quand il est factuel", async () => {
    const r = await generateSummary(llmReturning(OK), facts, ids);
    expect(r).toEqual({ text: OK, source: "llm", model: "m" });
  });
  it("régénère une fois si une promesse apparaît", async () => {
    const llm = llmReturning(
      "Le site va atteindre la première place grâce à ces liens, c'est garanti pour la page licorne.",
      OK,
    );
    const r = await generateSummary(llm, facts, ids);
    expect(r.source).toBe("llm");
    expect(r.text).toBe(OK);
  });
  it("retombe sur le modèle si le LLM promet deux fois", async () => {
    const bad =
      "Nous garantissons que la page licorne atteindra le top 3 rapidement, sans aucun doute.";
    const r = await generateSummary(llmReturning(bad, bad), facts, ids);
    expect(r.source).toBe("modele");
    expect(containsRankingPromise(r.text)).toBe(false);
  });
  it("retombe sur le modèle sans LLM ou en cas d'erreur", async () => {
    expect((await generateSummary(null, facts, ids)).source).toBe("modele");
    const llm = { generate: vi.fn().mockRejectedValue(new Error("down")) } as never;
    expect((await generateSummary(llm, facts, ids)).source).toBe("modele");
  });
  it("envoie les chiffres comme données et interdit les promesses dans la consigne", async () => {
    const generate = vi.fn().mockResolvedValue({ data: { summary: OK }, model: "m" });
    await generateSummary({ generate } as never, facts, ids);
    const call = generate.mock.calls[0]![0] as { system: string; prompt: string; auditId: string };
    expect(call.system).toMatch(/Ne promets JAMAIS/);
    expect(call.prompt).toContain("<donnees>");
    expect(call.auditId).toBe("a");
  });
});
