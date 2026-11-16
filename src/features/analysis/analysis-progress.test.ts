import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AnalysisProgress } from "./analysis-progress";
import { ANALYSIS_STEP_KEYS } from "./steps";
import type { AnalysisSnapshot } from "./view";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));

const base: AnalysisSnapshot = {
  auditId: "a1",
  siteId: "s1",
  domain: "exemple.test",
  status: "en_cours",
  error: null,
  startedAt: "2026-11-16T10:00:00Z",
  finishedAt: null,
  steps: ANALYSIS_STEP_KEYS.map((key) => ({
    key,
    status: "attente" as const,
    counters: {},
    example: null,
    error: null,
    startedAt: null,
    finishedAt: null,
  })),
  targets: [],
  targetsCount: 0,
};
const html = (s: AnalysisSnapshot, emailEnabled = true) =>
  renderToStaticMarkup(
    createElement(AnalysisProgress, {
      initial: s,
      resumeAction: async () => ({ status: "idle" as const }),
      restartAction: async () => ({ status: "idle" as const }),
      relaunchAction: async () => ({ status: "idle" as const }),
      emailEnabled,
    }),
  );

describe("AnalysisProgress (rendu serveur)", () => {
  it("début : les huit étapes, le message de fermeture, aucun bouton Reprendre", () => {
    const out = html({ ...base, status: "confirme" });
    expect((out.match(/data-step=/g) ?? []).length).toBe(8);
    expect(out).toContain("L&#x27;analyse démarre");
    expect(out).toContain("vous recevrez un email");
    expect(out).not.toContain("Reprendre l");
  });
  it("sans service d'email : ne promet pas d'email", () => {
    expect(html(base, false)).not.toContain("recevrez un email");
  });
  it("échec : ce qui a marché, ce qui s'est arrêté, bouton Reprendre", () => {
    const steps = base.steps.map((s) =>
      s.key === "comprendre"
        ? { ...s, status: "termine" as const }
        : s.key === "concurrents"
          ? { ...s, status: "echoue" as const, error: "Le service est indisponible." }
          : s,
    );
    const out = html({ ...base, status: "echoue", steps });
    expect(out).toContain("Reprendre l&#x27;analyse");
    expect(out).toContain("Comprendre votre site");
    expect(out).toContain("Le service est indisponible.");
  });
  it("fin : lien vers les cibles du site", () => {
    const out = html({ ...base, status: "termine", targetsCount: 22 });
    expect(out).toContain('href="/app/site/s1/cibles"');
    expect(out).toContain("22 cibles sont prêtes");
  });
});
