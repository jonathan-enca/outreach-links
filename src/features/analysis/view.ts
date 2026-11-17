/**
 * MU.3 : ce que l'écran « Analyse en cours » montre, calculé à partir de lignes de base (pur, testé).
 * Le même calcul sert au rendu serveur (premier affichage) et au navigateur (toutes les 3 secondes).
 */
import { t } from "@/lib/messages";
import {
  ANALYSIS_STEP_KEYS,
  PARALLEL_STEP,
  type AnalysisStatus,
  type AnalysisStepKey,
  type StepStatus,
} from "./steps";

export interface StepRow {
  key: AnalysisStepKey;
  status: StepStatus;
  counters: Record<string, number>;
  example: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface TargetRow {
  domain: string;
  siteType: string | null;
  why: string | null;
}

/** Ce que renvoie la route d'état (JSON) et ce que le serveur lit pour le premier affichage. */
export interface AnalysisSnapshot {
  auditId: string;
  siteId: string;
  domain: string;
  status: AnalysisStatus;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  /** Date du dernier lancement (ou de la dernière reprise) : sert à repérer un démarrage bloqué. */
  confirmedAt?: string | null;
  steps: StepRow[];
  /** Cibles de la liste courte déjà prêtes (les premières, dans l'ordre du classement). */
  targets: TargetRow[];
  /** Nombre total de cibles prêtes (le tableau `targets` n'en montre que quelques-unes). */
  targetsCount: number;
}

/**
 * Durées mesurées sur le run réel de MU.1 (mega-coloring.com, secondes) : le poids de chaque étape
 * dans la durée totale. L'état des lieux tourne en parallèle : il ne compte pas dans le temps restant.
 */
export const STEP_WEIGHTS: Record<AnalysisStepKey, number> = {
  comprendre: 20,
  concurrents: 68,
  etat_des_lieux: 0,
  recherche: 457,
  tri: 314,
  contacts: 101,
  constats: 175,
  demandes: 5,
};
const TOTAL_WEIGHT = Object.values(STEP_WEIGHTS).reduce((a, b) => a + b, 0);

/** Durée annoncée tant qu'on ne sait rien de mieux (secondes). */
export const DEFAULT_DURATION_SECONDS = TOTAL_WEIGHT;

/** Part d'une étape déjà faite (0 à 1), d'après ses compteurs. */
export function stepFraction(step: Pick<StepRow, "status" | "counters">): number {
  if (step.status === "termine" || step.status === "saute") return 1;
  if (step.status !== "en_cours") return 0;
  const c = step.counters;
  const ratio = (done?: number, total?: number) =>
    done !== undefined && total ? Math.min(1, done / total) : null;
  const r = ratio(c.judged, c.to_judge) ?? ratio(c.done, c.total);
  // Une étape sans compteur exploitable : on la compte « commencée » sans promettre davantage.
  return r === null ? 0.1 : Math.min(0.95, r);
}

export interface StepView {
  key: AnalysisStepKey;
  label: string;
  status: StepStatus;
  /** « 23 recherches sur 35 · 412 sites trouvés » : null tant qu'il n'y a rien à montrer. */
  counter: string | null;
  example: string | null;
  error: string | null;
  /** « 1 recherche n'a pas abouti » : appels manqués du fournisseur, l'analyse a continué. */
  missed: string | null;
  /** Le bouton « Reprendre à partir d'ici » a un sens ici (étape commencée, analyse à l'arrêt). */
  canRestart: boolean;
}

/** Délai au-delà duquel une analyse confirmée sans aucune étape est dite « lente à démarrer ». */
export const SLOW_START_MS = 2 * 60_000;

export interface FunnelView {
  examined: number;
  afterSort: number | null;
  targets: number | null;
}

export interface AnalysisView {
  status: AnalysisStatus;
  /** Tant que vrai, l'écran interroge la route d'état. */
  active: boolean;
  steps: StepView[];
  percent: number;
  /** Minutes restantes (arrondies au-dessus), ou null si on ne sait pas / si c'est fini. */
  remainingMinutes: number | null;
  funnel: FunnelView | null;
  targets: TargetRow[];
  targetsCount: number;
  failedStep: StepView | null;
  /** Confirmée depuis plus de 2 minutes sans aucune étape commencée. */
  slowStart: boolean;
  /** Étapes qui ont abouti (pour dire « ce qui a marché » en cas d'échec). */
  doneLabels: string[];
}

const U: Record<string, { progress?: string; found?: string; judged?: string }> =
  t.analysis.screen.units;

/** « 23 recherches sur 35 · 412 sites trouvés » ; null s'il n'y a aucun compteur à montrer. */
export function counterText(key: AnalysisStepKey, c: Record<string, number>): string | null {
  const unit = U[key]!;
  const parts: string[] = [];
  const pairs: [number | undefined, number | undefined, string | undefined][] = [
    [c.judged, c.to_judge, unit.judged],
    [c.done, c.total, unit.progress],
  ];
  // Pendant le jugement des pages (tri), on montre le jugement ; sinon la lecture.
  const pair = c.to_judge ? pairs[0]! : pairs[1]!;
  if (pair[0] !== undefined && pair[1] && pair[2]) {
    parts.push(t.analysis.screen.outOf(pair[0], pair[1], pair[2]));
  }
  if (c.found !== undefined && unit.found && (c.found > 0 || parts.length > 0)) {
    parts.push(`${c.found} ${unit.found}`);
  }
  return parts.length ? parts.join(" · ") : null;
}

export function buildAnalysisView(s: AnalysisSnapshot, now: Date = new Date()): AnalysisView {
  const byKey = new Map(s.steps.map((r) => [r.key, r]));
  const L = t.analysis.steps;
  const steps: StepView[] = ANALYSIS_STEP_KEYS.map((key) => {
    const r = byKey.get(key);
    const status: StepStatus = r?.status ?? "attente";
    return {
      key,
      label: L[key],
      status,
      counter: r && status !== "attente" ? counterText(key, r.counters) : null,
      example: r && status !== "attente" ? r.example : null,
      error: status === "echoue" ? r?.error || null : null,
      missed:
        r && status !== "attente" && (r.counters.missed ?? 0) > 0
          ? t.analysis.screen.missed(r.counters.missed!)
          : null,
      canRestart: false,
    };
  });
  // Reprendre à partir d'une étape : seulement après un ÉCHEC. Sur une analyse terminée, le bouton effaçait
  // les cibles déjà livrées et repayait les étapes suivantes (retour de Jonathan, 18/11) : retiré.
  const stopped = s.status === "echoue";
  for (const step of steps) {
    step.canRestart = stopped && step.status !== "attente" && step.key !== PARALLEL_STEP;
  }

  const finished = s.status === "termine";
  const sequential = ANALYSIS_STEP_KEYS.filter((k) => k !== PARALLEL_STEP);
  let doneWeight = 0;
  for (const k of sequential) {
    const r = byKey.get(k);
    doneWeight += STEP_WEIGHTS[k] * (r ? stepFraction(r) : 0);
  }
  const percent = finished
    ? 100
    : s.status === "aucun"
      ? 0
      : Math.round((100 * doneWeight) / TOTAL_WEIGHT);

  let remainingMinutes: number | null = null;
  if (s.status === "confirme" || s.status === "en_cours") {
    let seconds = TOTAL_WEIGHT - doneWeight;
    const startedMs = s.startedAt ? Date.parse(s.startedAt) : NaN;
    // Assez avancée : la vitesse réelle de CETTE analyse vaut mieux que les durées mesurées avant.
    if (percent >= 15 && Number.isFinite(startedMs)) {
      const elapsed = Math.max(0, (now.getTime() - startedMs) / 1000);
      seconds = (elapsed * (100 - percent)) / percent;
    }
    remainingMinutes = Math.max(1, Math.ceil(seconds / 60));
  }

  const rech = byKey.get("recherche")?.counters ?? {};
  const tri = byKey.get("tri")?.counters ?? {};
  const examined = rech.found ?? 0;
  const funnel: FunnelView | null =
    examined > 0
      ? {
          examined,
          afterSort:
            tri.found !== undefined && byKey.get("tri")?.status !== "attente" ? tri.found : null,
          targets: finished || s.targetsCount > 0 ? s.targetsCount : null,
        }
      : null;

  const confirmedMs = s.confirmedAt ? Date.parse(s.confirmedAt) : NaN;
  const slowStart =
    s.status === "confirme" &&
    s.steps.every((r) => r.status === "attente") &&
    Number.isFinite(confirmedMs) &&
    now.getTime() - confirmedMs > SLOW_START_MS;

  const failedStep = steps.find((x) => x.status === "echoue") ?? null;
  return {
    status: s.status,
    active: s.status === "confirme" || s.status === "en_cours",
    steps,
    percent,
    remainingMinutes,
    funnel,
    targets: s.targets,
    targetsCount: s.targetsCount,
    failedStep,
    slowStart,
    doneLabels: steps.filter((x) => x.status === "termine").map((x) => x.label),
  };
}
