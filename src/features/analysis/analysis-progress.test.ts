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
    expect(out).toContain("Analyse terminée : 22 cibles sont prêtes");
    expect(out).toContain("Rien n&#x27;a été envoyé");
  });
  it("état intermédiaire : lecture des autres sites en cours, l'écran reste « en cours »", () => {
    const out = html({ ...base, status: "termine", targetsCount: 15, background: "en_cours" });
    expect(out).toMatch(/aria-live="polite"[^>]*>Nous continuons à lire d&#x27;autres sites/);
    expect(out).toContain(
      "Vos 15 premières cibles sont déjà prêtes, d&#x27;autres peuvent s&#x27;ajouter",
    );
    expect(out).toContain("Voir vos premières cibles");
    expect(out).toContain('role="progressbar"');
    expect(out).not.toContain("Analyse terminée");
    expect(out).not.toContain("Ouverture de vos cibles");
  });
  it("liste : toutes les cibles déjà prêtes, sans « et N de plus », dans une zone qui défile", () => {
    const targets = Array.from({ length: 10 }, (_, i) => ({
      domain: `site-${i + 1}.test`,
      siteType: null,
      why: null,
    }));
    const out = html({ ...base, status: "en_cours", targets, targetsCount: 10 });
    for (const t of targets) expect(out).toContain(t.domain);
    expect(out).not.toContain("autre cible");
    expect(out).not.toContain("autres cibles");
    expect(out).toContain("overflow-y-auto");
  });
  it("état final : lecture finie, « Analyse terminée » avec le nombre réel", () => {
    const out = html({ ...base, status: "termine", targetsCount: 19, background: "termine" });
    expect(out).toContain("Analyse terminée : 19 cibles sont prêtes");
    expect(out).not.toContain('role="progressbar"');
    expect(out).not.toContain("premières cibles sont déjà prêtes");
  });
  it("en cours : la phrase d'état est annoncée, l'étape écartée est dite écartée", () => {
    const steps = base.steps.map((s) =>
      s.key === "recherche"
        ? { ...s, status: "en_cours" as const, counters: { done: 3, total: 45, found: 80 } }
        : s.key === "constats"
          ? { ...s, status: "saute" as const }
          : s,
    );
    const out = html({
      ...base,
      steps,
      skipped: { mentions: "nom de marque trop descriptif", deadPages: 0 },
    });
    expect(out).toMatch(/aria-live="polite"[^>]*>Nous cherchons les sites qui peuvent vous citer/);
    expect(out).toContain("3 recherches faites sur 45 environ · 80 sites trouvés");
    expect(out).toContain(
      "Recherche de mentions de votre marque écartée : nom de marque trop descriptif.",
    );
    expect(out).toContain("Écartée : aucune page retenue à relire.");
    expect(out).toContain("Du plus large au plus précis");
    expect(out).toContain("à venir");
  });
});
