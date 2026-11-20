import type { AnalysisStepKey, ProgressSink } from "./steps";

/** Un appel externe = un step Inngest mémorisé (reprise sans refaire) ; exécution directe dans les tests. */
export type StepRunner = <T>(id: string, fn: () => Promise<T>) => Promise<T>;

/** Ce que l'orchestrateur sait d'une analyse en cours (sérialisable : il traverse les steps). */
export interface AnalysisRun {
  auditId: string;
  workspaceId: string;
  siteId: string;
  domain: string;
  /** L'utilisateur qui a confirmé l'audit : auteur des étapes préparées en son nom. */
  actorId: string;
  costCapUsd: number;
  /** Jeton du lancement (date de confirmation) : identifiant des événements envoyés. */
  nonce: string;
}

/**
 * Issue d'une étape : faite, déjà faite (reprise : rien n'est refait ni repayé), sans objet, ou arrêt
 * propre de l'analyse avec un message lisible. Une panne inattendue, elle, lève : Inngest réessaie le
 * step, puis l'analyse passe en échec.
 */
export type StageResult =
  { status: "fait" | "deja" | "saute" } | { status: "arret"; message: string };

export interface StageTools {
  runStep: StepRunner;
  progress: ProgressSink;
}

export interface Stage {
  /** Étape affichée à laquelle un arrêt est imputé. */
  key: AnalysisStepKey;
  run(run: AnalysisRun, tools: StageTools): Promise<StageResult>;
}

export interface AnalysisSummary {
  shortlist: number;
  findings: number;
  costUsd: number;
  durationSeconds: number;
}

export interface Orchestration {
  /** confirme -> en_cours, lignes d'étape créées. Null si l'analyse ne doit pas (ou plus) tourner. */
  begin(auditId: string): Promise<AnalysisRun | null>;
  /** Lance l'état des lieux en parallèle. Ne doit jamais faire échouer l'analyse. */
  launchParallel(run: AnalysisRun): Promise<void>;
  /**
   * Attend la fin de l'état des lieux avant la recherche (MQ.4 : ses requêtes Search Console y entrent).
   * Bornée : au pire on continue sans. Ne doit jamais faire échouer l'analyse.
   */
  awaitParallel?(run: AnalysisRun): Promise<void>;
  stages: readonly Stage[];
  progressFor(run: AnalysisRun): ProgressSink;
  finalize(run: AnalysisRun): Promise<AnalysisSummary>;
  /** Arrêt propre : l'analyse et l'étape passent en échec avec le message. */
  stop(run: AnalysisRun, key: AnalysisStepKey, message: string): Promise<void>;
}

export type AnalysisOutcome =
  | { status: "ignore" }
  | { status: "arret"; step: AnalysisStepKey; message: string; stages: Record<string, string> }
  | ({ status: "termine"; stages: Record<string, string> } & AnalysisSummary);

/**
 * L'analyse unique (MU.1) : un seul lancement enchaîne toutes les étapes, sans clic intermédiaire.
 * L'état des lieux part en parallèle dès le début ; les autres étapes se suivent. Chaque étape décide
 * elle-même, d'après ce qui est en base, si son travail est déjà fait : relancer après un échec ne
 * refait donc ni ne repaie rien.
 */
export async function runAnalysis(
  o: Orchestration,
  auditId: string,
  runStep: StepRunner,
): Promise<AnalysisOutcome> {
  const run = await runStep("debut", () => o.begin(auditId));
  if (!run) return { status: "ignore" };

  await runStep("etat-des-lieux:lancer", async () => {
    try {
      await o.launchParallel(run);
      return { sent: true };
    } catch {
      // L'état des lieux ne bloque jamais la suite : son étape restera « en attente ».
      return { sent: false };
    }
  });

  const progress = o.progressFor(run);
  const stages: Record<string, string> = {};
  for (const stage of o.stages) {
    if (stage.key === "recherche" && o.awaitParallel) {
      try {
        await o.awaitParallel(run);
      } catch {
        // Pas d'état des lieux à temps : la recherche part sans ses requêtes Search Console.
      }
    }
    const res = await stage.run(run, { runStep, progress });
    stages[stage.key] = res.status;
    if (res.status === "arret") {
      await runStep(`${stage.key}:arret`, async () => {
        await o.stop(run, stage.key, res.message);
        return { stopped: true };
      });
      return { status: "arret", step: stage.key, message: res.message, stages };
    }
  }
  const summary = await runStep("fin", () => o.finalize(run));
  return { status: "termine", stages, ...summary };
}

/**
 * Enrobe un `StepRunner` pour une étape : préfixe les identifiants de step, et écrit la progression
 * DANS le step qui vient de travailler (donc une seule fois, jamais au rejeu d'un step mémorisé).
 * `done` vient du rang de l'appel (déterministe au rejeu), `found` du cumul des résultats mémorisés.
 */
export function trackedRunner<T>(
  tools: StageTools,
  key: AnalysisStepKey,
  opts: {
    prefix: string;
    total: number;
    /** Ce que ce résultat ajoute au compteur `found`. */
    found: (out: T) => number;
    example: (out: T) => string | null;
  },
): StepRunner {
  let calls = 0;
  let found = 0;
  return (async (id: string, fn: () => Promise<T>) => {
    const index = ++calls;
    const before = found;
    const out = await tools.runStep(`${opts.prefix}:${id}`, async () => {
      const r = await fn();
      await tools.progress.update(key, {
        counters: {
          done: index,
          total: Math.max(opts.total, index),
          found: before + opts.found(r),
        },
        example: opts.example(r),
      });
      return r;
    });
    found += opts.found(out);
    return out;
  }) as StepRunner;
}
