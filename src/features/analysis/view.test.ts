import { describe, expect, it } from "vitest";
import { ANALYSIS_STEP_KEYS, type AnalysisStepKey, type StepStatus } from "./steps";
import {
  buildAnalysisView,
  counterText,
  stepFraction,
  type AnalysisSnapshot,
  type StepRow,
} from "./view";

const row = (
  key: AnalysisStepKey,
  status: StepStatus,
  counters: Record<string, number> = {},
  extra: Partial<StepRow> = {},
): StepRow => ({
  key,
  status,
  counters,
  example: null,
  error: null,
  startedAt: null,
  finishedAt: null,
  ...extra,
});

const snap = (over: Partial<AnalysisSnapshot> = {}): AnalysisSnapshot => ({
  auditId: "a1",
  siteId: "s1",
  domain: "exemple.test",
  status: "en_cours",
  error: null,
  startedAt: "2026-11-16T10:00:00Z",
  finishedAt: null,
  steps: ANALYSIS_STEP_KEYS.map((k) => row(k, "attente")),
  targets: [],
  targetsCount: 0,
  ...over,
});
const withSteps = (rows: StepRow[], over: Partial<AnalysisSnapshot> = {}) =>
  snap({
    steps: ANALYSIS_STEP_KEYS.map((k) => rows.find((r) => r.key === k) ?? row(k, "attente")),
    ...over,
  });

describe("stepFraction", () => {
  it("terminé 1, attente 0, en cours d'après les compteurs, plafonné à 0,95", () => {
    expect(stepFraction({ status: "termine", counters: {} })).toBe(1);
    expect(stepFraction({ status: "attente", counters: { done: 9, total: 9 } })).toBe(0);
    expect(stepFraction({ status: "en_cours", counters: { done: 23, total: 46 } })).toBe(0.5);
    expect(stepFraction({ status: "en_cours", counters: { done: 9, total: 9 } })).toBe(0.95);
    expect(stepFraction({ status: "en_cours", counters: {} })).toBe(0.1);
    // Le jugement des pages (tri) prime sur la lecture.
    expect(
      stepFraction({
        status: "en_cours",
        counters: { done: 100, total: 100, judged: 5, to_judge: 10 },
      }),
    ).toBe(0.5);
  });
});

describe("counterText", () => {
  it("dit « 23 recherches sur 35 · 412 sites trouvés »", () => {
    expect(counterText("recherche", { done: 23, total: 35, found: 412 })).toBe(
      "23 sur 35 recherches · 412 sites trouvés",
    );
  });
  it("tri : pages lues, puis pages jugées", () => {
    expect(counterText("tri", { done: 96, total: 150 })).toBe("96 sur 150 pages lues");
    expect(counterText("tri", { done: 150, total: 150, judged: 4, to_judge: 10, found: 3 })).toBe(
      "4 sur 10 pages jugées · 3 pages pertinentes",
    );
  });
  it("rien à montrer : null, jamais « 0 » ni NaN", () => {
    expect(counterText("recherche", {})).toBeNull();
    expect(counterText("constats", { found: 0 })).toBeNull();
    expect(counterText("constats", { done: 3, total: 6, found: 0 })).toBe(
      "3 sur 6 pages vérifiées · 0 liens morts ou mentions",
    );
  });
});

describe("buildAnalysisView", () => {
  it("début : 0 %, huit étapes en attente, temps annoncé, rien à montrer", () => {
    const v = buildAnalysisView(snap({ status: "confirme" }));
    expect(v.percent).toBe(0);
    expect(v.steps).toHaveLength(8);
    expect(v.steps.every((s) => s.status === "attente" && s.counter === null)).toBe(true);
    expect(v.active).toBe(true);
    expect(v.remainingMinutes).toBe(19);
    expect(v.funnel).toBeNull();
    expect(v.targets).toEqual([]);
  });

  it("milieu : avancement pondéré par les durées mesurées, état des lieux hors calcul", () => {
    const v = buildAnalysisView(
      withSteps([
        row("comprendre", "termine"),
        row("concurrents", "termine"),
        row("etat_des_lieux", "en_cours", { done: 1, total: 3 }),
        row(
          "recherche",
          "en_cours",
          { done: 23, total: 35, found: 412 },
          { example: "coloriage enfant" },
        ),
      ]),
      new Date("2026-11-16T10:03:00Z"),
    );
    // (20 + 68 + 457 × 23/35) / 1140 ≈ 0,34
    expect(v.percent).toBe(34);
    expect(v.steps.find((s) => s.key === "recherche")).toMatchObject({
      counter: "23 sur 35 recherches · 412 sites trouvés",
      example: "coloriage enfant",
    });
    expect(v.funnel).toEqual({ examined: 412, afterSort: null, targets: null });
  });

  it("temps restant : la vitesse réelle prend le relais dès 15 %", () => {
    const rows = [
      row("comprendre", "termine"),
      row("concurrents", "termine"),
      row("recherche", "en_cours", { done: 20, total: 35 }),
    ];
    const slow = buildAnalysisView(withSteps(rows), new Date("2026-11-16T10:20:00Z"));
    const fast = buildAnalysisView(withSteps(rows), new Date("2026-11-16T10:02:00Z"));
    expect(slow.remainingMinutes!).toBeGreaterThan(fast.remainingMinutes!);
    expect(fast.remainingMinutes!).toBeGreaterThanOrEqual(1);
  });

  it("l'entonnoir en chiffres : examinés → après tri → cibles", () => {
    const v = buildAnalysisView(
      withSteps(
        [
          row("recherche", "termine", { found: 544 }),
          row("tri", "termine", { found: 96 }),
          row("contacts", "termine"),
        ],
        { targetsCount: 27 },
      ),
    );
    expect(v.funnel).toEqual({ examined: 544, afterSort: 96, targets: 27 });
  });

  it("fin : 100 %, plus de temps restant, plus d'interrogation", () => {
    const v = buildAnalysisView(
      withSteps(
        ANALYSIS_STEP_KEYS.map((k) => row(k, "termine")),
        { status: "termine", targetsCount: 22 },
      ),
    );
    expect(v).toMatchObject({ percent: 100, remainingMinutes: null, active: false });
    expect(v.funnel).toBeNull(); // pas de compteur de recherche : rien d'inventé
  });

  it("échec : ce qui a marché, ce qui s'est arrêté, motif lisible, plus d'interrogation", () => {
    const v = buildAnalysisView(
      withSteps(
        [
          row("comprendre", "termine"),
          row("concurrents", "termine"),
          row(
            "recherche",
            "echoue",
            { done: 3, total: 35 },
            { error: "Le service est indisponible." },
          ),
        ],
        { status: "echoue" },
      ),
    );
    expect(v.active).toBe(false);
    expect(v.remainingMinutes).toBeNull();
    expect(v.failedStep).toMatchObject({ key: "recherche", error: "Le service est indisponible." });
    expect(v.doneLabels).toEqual(["Comprendre votre site", "Repérer vos concurrents"]);
  });

  it("des lignes d'étape manquantes ne cassent rien (analyse tout juste confirmée)", () => {
    const v = buildAnalysisView(snap({ status: "confirme", steps: [] }));
    expect(v.steps.map((s) => s.status)).toEqual(Array(8).fill("attente"));
    expect(Number.isFinite(v.percent)).toBe(true);
  });
});

describe("chantier A : appels manqués, reprise par étape, démarrage lent", () => {
  it("affiche « 1 recherche n'a pas abouti » quand des appels ont été manqués", () => {
    const v = buildAnalysisView(
      withSteps([row("recherche", "en_cours", { done: 20, total: 35, found: 300, missed: 1 })]),
    );
    expect(v.steps.find((s) => s.key === "recherche")!.missed).toBe(
      "1 recherche n'a pas abouti : l'analyse continue avec le reste.",
    );
    const two = buildAnalysisView(withSteps([row("recherche", "termine", { missed: 2 })]));
    expect(two.steps.find((s) => s.key === "recherche")!.missed).toMatch(/^2 recherches n'ont pas/);
    const none = buildAnalysisView(withSteps([row("recherche", "termine", { missed: 0 })]));
    expect(none.steps.find((s) => s.key === "recherche")!.missed).toBeNull();
  });

  it("« Reprendre à partir d'ici » : seulement après un échec, sur les étapes commencées", () => {
    const rows = [
      row("comprendre", "termine"),
      row("concurrents", "termine"),
      row("recherche", "echoue"),
    ];
    const failed = buildAnalysisView(withSteps(rows, { status: "echoue" }));
    expect(failed.steps.filter((s) => s.canRestart).map((s) => s.key)).toEqual([
      "comprendre",
      "concurrents",
      "recherche",
    ]);
    // Analyse terminée : aucune reprise proposée (elle effacerait les cibles livrées).
    const done = buildAnalysisView(withSteps(rows, { status: "termine" }));
    expect(done.steps.some((s) => s.canRestart)).toBe(false);
    const running = buildAnalysisView(withSteps(rows, { status: "en_cours" }));
    expect(running.steps.some((s) => s.canRestart)).toBe(false);
    const etat = buildAnalysisView(
      withSteps([row("etat_des_lieux", "termine")], { status: "echoue" }),
    );
    expect(etat.steps.find((s) => s.key === "etat_des_lieux")!.canRestart).toBe(false);
  });

  it("démarrage lent : confirmée depuis plus de 2 minutes sans aucune étape commencée", () => {
    const now = new Date("2026-11-17T10:03:00Z");
    const base = { status: "confirme" as const, confirmedAt: "2026-11-17T10:00:00Z" };
    expect(buildAnalysisView(snap(base), now).slowStart).toBe(true);
    expect(
      buildAnalysisView(snap({ ...base, confirmedAt: "2026-11-17T10:01:30Z" }), now).slowStart,
    ).toBe(false);
    expect(buildAnalysisView(withSteps([row("comprendre", "en_cours")], base), now).slowStart).toBe(
      false,
    );
    expect(buildAnalysisView(snap({ ...base, status: "en_cours" }), now).slowStart).toBe(false);
  });
});
