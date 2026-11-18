import { describe, expect, it } from "vitest";
import { ANALYSIS_STEP_KEYS, type AnalysisStepKey, type StepStatus } from "./steps";
import {
  buildAnalysisView,
  counterText,
  exampleText,
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

describe("counterText : chaque chiffre porte le nom de ce que le moteur mesure", () => {
  // Compteurs réels des campagnes mega-coloring.com du 16/11 et du 18/11/2026.
  it("comprendre : `found` compte les contenus à proposer, pas les pages lues", () => {
    const c = { done: 9, total: 9, found: 7, redo: 0 };
    expect(counterText("comprendre", c, "termine")).toBe(
      "Votre activité est cernée · 7 pages fortes repérées",
    );
    expect(counterText("comprendre", c, "termine")).not.toMatch(/pages lues/);
    expect(counterText("comprendre", {}, "en_cours")).toBeNull();
  });
  it("concurrents : le total compte les recherches PLUS la mesure de taille", () => {
    expect(counterText("concurrents", { done: 0, total: 4 })).toBe("Recherche Google 1 sur 3");
    expect(counterText("concurrents", { done: 2, total: 4 })).toBe("Recherche Google 3 sur 3");
    expect(counterText("concurrents", { done: 3, total: 4 })).toBe(
      "Mesure de la taille de chaque concurrent",
    );
    // Recherches déjà faites avant le lancement : il ne reste que la mesure, jamais « 1 sur 1 recherches ».
    expect(counterText("concurrents", { done: 0, total: 1 })).toBe(
      "Mesure de la taille de chaque concurrent",
    );
    expect(counterText("concurrents", { done: 1, total: 1, found: 10, missed: 0 }, "termine")).toBe(
      "10 vrais concurrents repérés sur Google",
    );
  });
  it("mesure des liens : les sites qui citent et les recherches, pas « 3 sur 3 relevés »", () => {
    expect(
      counterText("etat_des_lieux", { done: 3, total: 3, found: 2, keywords: 1 }, "termine"),
    ).toBe("2 sites font déjà un lien vers vous · visible sur 1 recherche Google");
    expect(
      counterText("etat_des_lieux", { done: 3, total: 3, found: 1, keywords: 0 }, "termine"),
    ).toBe("1 site fait déjà un lien vers vous");
    expect(counterText("etat_des_lieux", { done: 1, total: 3 })).toBe("Mesure 1 sur 3");
  });
  it("recherche : le total n'est qu'une prévision (« environ »), absent une fois fini", () => {
    expect(counterText("recherche", { done: 23, total: 35, found: 412 })).toBe(
      "23 recherches faites sur 35 environ · 412 sites trouvés",
    );
    // 18/11 : 45 prévues, 54 faites ; 16/11 : 35 prévues, 27 faites.
    expect(
      counterText("recherche", { done: 54, total: 54, found: 976, missed: 1 }, "termine"),
    ).toBe("54 recherches · 976 sites trouvés");
    expect(counterText("recherche", { done: 27, total: 35, found: 677 }, "termine")).toBe(
      "27 recherches · 677 sites trouvés",
    );
    expect(counterText("recherche", { found: 544 }, "termine")).toBe("544 sites trouvés");
  });
  it("tri : pages lues, puis pages évaluées, puis le bilan", () => {
    expect(counterText("tri", { done: 96, total: 150, kept: 31 })).toBe(
      "96 pages lues sur 150 · 31 lisibles",
    );
    expect(counterText("tri", { done: 150, total: 150, judged: 4, to_judge: 10, found: 3 })).toBe(
      "4 pages évaluées sur 10 · 3 retenues",
    );
    expect(
      counterText(
        "tri",
        { done: 150, total: 150, kept: 47, judged: 47, to_judge: 47, found: 18 },
        "termine",
      ),
    ).toBe("150 pages lues · 18 retenues");
  });
  it("contacts, relecture, demandes", () => {
    expect(counterText("contacts", { done: 12, total: 18, found: 10 })).toBe(
      "12 sites vérifiés sur 18 · 10 contacts trouvés",
    );
    expect(counterText("contacts", { done: 0, total: 0, found: 0 }, "termine")).toBe(
      "Aucun site à vérifier",
    );
    expect(counterText("constats", { done: 3, total: 6, dead: 2 })).toBe("3 pages relues sur 6");
    expect(counterText("constats", { done: 15, total: 15, found: 3 }, "termine")).toBe(
      "15 pages relues · 3 occasions trouvées (liens cassés, mentions)",
    );
    expect(counterText("demandes", { done: 15, total: 15, found: 15 }, "termine")).toBe(
      "15 cibles prêtes",
    );
  });
  it("rien à montrer : null, jamais « 0 » inventé ni NaN", () => {
    expect(counterText("recherche", {})).toBeNull();
    expect(counterText("tri", {})).toBeNull();
    expect(counterText("constats", {})).toBeNull();
    expect(counterText("demandes", {})).toBeNull();
  });
});

describe("exampleText : un exemple est toujours étiqueté", () => {
  it("dit ce qu'est l'exemple, ou ne montre rien", () => {
    expect(exampleText("recherche", "coloriages gratuits à imprimer")).toBe(
      "Dernière recherche : « coloriages gratuits à imprimer »",
    );
    expect(exampleText("recherche", "exemple.test")).toBe("Dernier site trouvé : exemple.test");
    expect(exampleText("tri", "exemple.test")).toBe("Page lue : exemple.test");
    // Mesure des liens : une recherche est étiquetée ; un site qui cite (souvent sans intérêt) n'est pas montré.
    expect(exampleText("etat_des_lieux", "sapin de noel a colorier et imprimer")).toBe(
      "Votre recherche la plus populaire : « sapin de noel a colorier et imprimer »",
    );
    expect(exampleText("etat_des_lieux", "exemple-douteux.xyz")).toBeNull();
    // Un nom isolé n'aide pas (retour de Jonathan, 18/11).
    expect(exampleText("comprendre", "Exemple")).toBeNull();
    expect(exampleText("concurrents", "exemple.test")).toBeNull();
    expect(exampleText("tri", null)).toBeNull();
  });
});

describe("buildAnalysisView", () => {
  it("début : 0 %, huit étapes en attente, temps annoncé, rien à montrer", () => {
    const v = buildAnalysisView(snap({ status: "confirme" }));
    expect(v.percent).toBe(0);
    expect(v.steps).toHaveLength(8);
    expect(v.steps.every((s) => s.status === "attente" && s.counter === null)).toBe(true);
    expect(v.active).toBe(true);
    expect(v.remainingMinutes).toBe(13);
    expect(v.remainingRange).toEqual([10, 17]);
    expect(v.headline).toBe("L'analyse démarre…");
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
    // (10 + 40 + 280 × 23/35) / 762 ≈ 0,31
    expect(v.percent).toBe(31);
    expect(v.headline).toBe("Nous cherchons les sites qui peuvent vous citer");
    expect(v.steps.find((s) => s.key === "recherche")).toMatchObject({
      counter: "23 recherches faites sur 35 environ · 412 sites trouvés",
      example: "Dernière recherche : « coloriage enfant »",
      progress: 66,
    });
    expect(v.funnel).toEqual({ found: 412, read: null, kept: null, targets: null });
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

  it("du plus large au plus précis : trouvés, lus, retenus, cibles ; « à venir » tant que non mesuré", () => {
    const v = buildAnalysisView(
      withSteps(
        [
          row("recherche", "termine", { found: 677 }),
          row("tri", "termine", { done: 150, total: 150, found: 18 }),
          row("contacts", "termine"),
        ],
        { targetsCount: 15 },
      ),
    );
    expect(v.funnel).toEqual({ found: 677, read: 150, kept: 18, targets: 15 });
    // Pendant la lecture : les pages retenues ne sont pas encore connues.
    const reading = buildAnalysisView(
      withSteps([
        row("recherche", "termine", { found: 976 }),
        row("tri", "en_cours", { done: 80, total: 150, kept: 31 }),
      ]),
    );
    expect(reading.funnel).toEqual({ found: 976, read: 80, kept: null, targets: null });
  });

  it("une étape écartée s'affiche comme telle, avec sa raison, jamais comme faite", () => {
    const v = buildAnalysisView(withSteps([row("constats", "saute", { found: 0 })]));
    const step = v.steps.find((s) => s.key === "constats")!;
    expect(step).toMatchObject({ status: "saute", counter: null, example: null });
    expect(step.notes).toEqual(["Écartée : aucune page retenue à relire."]);
    expect(v.doneLabels).not.toContain(step.label);
  });

  it("recherches écartées par le plan : dites sous l'étape de recherche, avec la raison", () => {
    const skipped = { mentions: "nom de marque trop descriptif ou trop court.", deadPages: 1 };
    const v = buildAnalysisView(
      withSteps([row("recherche", "en_cours", { done: 3, total: 45, found: 80 })], { skipped }),
    );
    expect(v.steps.find((s) => s.key === "recherche")!.notes).toEqual([
      "Recherche de mentions de votre marque écartée : nom de marque trop descriptif ou trop court.",
      "Liens morts non cherchés chez 1 concurrent : trop peu de chances d'y trouver quelque chose d'utile.",
    ]);
    // Rien d'écarté, ou étape pas commencée : aucune phrase.
    const none = buildAnalysisView(withSteps([row("recherche", "en_cours")], { skipped: null }));
    expect(none.steps.find((s) => s.key === "recherche")!.notes).toEqual([]);
    const waiting = buildAnalysisView(snap({ skipped }));
    expect(waiting.steps.find((s) => s.key === "recherche")!.notes).toEqual([]);
  });

  it("« terminée » attend la fin de la lecture des autres sites trouvés", () => {
    const done = (over: Partial<AnalysisSnapshot>) =>
      buildAnalysisView(
        withSteps(
          ANALYSIS_STEP_KEYS.map((k) => row(k, "termine")),
          { status: "termine", finishedAt: "2026-11-16T10:12:00Z", targetsCount: 15, ...over },
        ),
        new Date("2026-11-16T10:13:00Z"),
      );
    expect(done({ background: "en_cours" }).backgroundPending).toBe(true);
    // Pas encore démarrée, juste après la fin : on attend avant de conclure.
    expect(done({ background: "aucun" }).backgroundPending).toBe(true);
    expect(done({ background: "termine" }).backgroundPending).toBe(false);
    expect(done({ background: "echoue" }).backgroundPending).toBe(false);
    expect(
      done({ background: "aucun", finishedAt: "2026-11-16T09:00:00Z" }).backgroundPending,
    ).toBe(false);
    expect(done({}).backgroundPending).toBe(false);
  });

  it("l'échec de la mesure des liens (en parallèle) n'est pas « l'étape qui s'est arrêtée »", () => {
    const v = buildAnalysisView(
      withSteps(
        [
          row("comprendre", "termine"),
          row("etat_des_lieux", "echoue", {}, { error: "Mesure impossible." }),
          row("recherche", "echoue", {}, { error: "Le service est indisponible." }),
        ],
        { status: "echoue" },
      ),
    );
    expect(v.failedStep).toMatchObject({ key: "recherche", position: 4 });
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
    expect(v.doneLabels).toEqual(["Comprendre votre site", "Repérer vos concurrents sur Google"]);
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
