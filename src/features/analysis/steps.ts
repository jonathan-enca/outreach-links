/**
 * MU.1 : les huit étapes de l'analyse unique (docs/jalon-mu.md section 2.2), dans l'ordre d'affichage.
 * Le nom affiché vit dans `messages/fr.ts > analysis.steps`. `etat_des_lieux` tourne en parallèle et
 * n'arrête jamais la suite.
 */
export const ANALYSIS_STEP_KEYS = [
  "comprendre",
  "concurrents",
  "etat_des_lieux",
  "recherche",
  "tri",
  "contacts",
  "constats",
  "demandes",
] as const;
export type AnalysisStepKey = (typeof ANALYSIS_STEP_KEYS)[number];

export const STEP_STATUSES = ["attente", "en_cours", "termine", "echoue", "saute"] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

/** Position affichée (1 à 8). */
export const stepPosition = (key: AnalysisStepKey): number => ANALYSIS_STEP_KEYS.indexOf(key) + 1;

/** L'étape parallèle : son échec n'arrête pas l'analyse et ne compte pas dans son statut. */
export const PARALLEL_STEP: AnalysisStepKey = "etat_des_lieux";

/** Étapes déroulées l'une après l'autre par l'orchestrateur. */
export const SEQUENTIAL_STEPS = ANALYSIS_STEP_KEYS.filter((k) => k !== PARALLEL_STEP);

export const ANALYSIS_STATUSES = ["aucun", "confirme", "en_cours", "termine", "echoue"] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

/** Sortes d'événements du fil (`analysis_feed.kind`). */
export const FEED_KINDS = ["etape", "cible", "constat", "info"] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

/** Compteurs d'une étape : `done` / `total` pour la barre, `found` pour le résultat, le reste libre. */
export type StepCounters = Record<string, number>;

export interface StepPatch {
  status?: StepStatus;
  counters?: StepCounters;
  /** Dernier exemple lisible (un domaine, une requête) : montre que l'étape avance. */
  example?: string | null;
  /** Message d'échec (avec `status: "echoue"`). */
  error?: string;
}

export interface FeedEntry {
  kind: FeedKind;
  stepKey?: AnalysisStepKey;
  message: string;
  payload?: Record<string, unknown>;
}

/**
 * Où s'écrit la progression. L'implémentation réelle écrit en base (`createProgress`) ; les tests
 * passent un enregistreur en mémoire. Aucune méthode ne lève : une progression qui ne s'écrit pas ne
 * doit jamais arrêter une analyse payée.
 */
export interface ProgressSink {
  update(key: AnalysisStepKey, patch: StepPatch): Promise<void>;
  /** Un ou plusieurs événements lisibles, écrits en une fois. */
  feed(entry: FeedEntry | readonly FeedEntry[]): Promise<void>;
}

/** Progression muette (jobs lancés hors de l'analyse unique, tests). */
export const NO_PROGRESS: ProgressSink = {
  update: async () => {},
  feed: async () => {},
};
