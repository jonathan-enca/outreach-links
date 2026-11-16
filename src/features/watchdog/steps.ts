/**
 * MU.0 : registre des étapes longues surveillées par le chien de garde. Une étape = une colonne de
 * statut sur une ligne. Toute nouvelle étape longue (Inngest) doit avoir sa ligne ici : sans elle,
 * un job tué sans `onFailure` laisse l'écran afficher « en cours » pour toujours.
 */
export interface StepDef {
  /** Nom stable, journalisé dans `events` (`watchdog.step_failed` / `watchdog.step_repaired`). */
  key: string;
  table: string;
  idCol: string;
  statusCol: string;
  /** Statuts « en vol ». `confirme` = l'événement Inngest n'a pas (encore) été pris en charge. */
  running: readonly string[];
  /** Début de l'étape ; à défaut (étape seulement confirmée), `fallbackCol`. */
  startedCol: string;
  fallbackCol: string;
  errorCol: string;
  finishedCol: string;
  /** Faux pour les tables sans espace (audit public) : pas de ligne dans `events`. */
  hasWorkspace: boolean;
  /**
   * Événement écrit par le job quand l'étape aboutit (`payload.audit_id`). S'il existe alors que le
   * statut est resté « en vol », l'étape est RÉPARÉE (terminée) au lieu d'être marquée en échec.
   */
  doneEvent?: string;
  /** Colonnes recopiées depuis la charge utile de l'événement à la réparation (colonne -> clé). */
  restore?: Record<string, string>;
  /** Délai propre à l'étape pour le statut « en cours » (défaut : `WATCHDOG_LIMITS.runningMinutes`). */
  runningMinutes?: number;
  /** Délai propre à l'étape pour le statut « confirmé » (défaut : `WATCHDOG_LIMITS.confirmedMinutes`). */
  confirmedMinutes?: number;
  /**
   * MU.1 : ligne parente à passer en échec avec l'étape (l'analyse d'un audit, quand une de ses
   * étapes est bloquée), pour que « Reprendre » redevienne possible. `unless` : lignes qui ne
   * touchent jamais leur parent (l'étape parallèle).
   */
  parent?: {
    table: string;
    /** Colonne de la ligne surveillée qui porte l'identifiant du parent. */
    refCol: string;
    statusCol: string;
    running: readonly string[];
    errorCol: string;
    finishedCol: string;
    unless?: { col: string; value: string };
  };
}

const auditStep = (
  key: string,
  prefix: string,
  doneEvent: string | undefined,
  running: readonly string[] = ["confirme", "en_cours"],
): StepDef => ({
  key,
  table: "audits",
  idCol: "id",
  statusCol: `${prefix}status`,
  running,
  startedCol: `${prefix}started_at`,
  fallbackCol: "updated_at",
  errorCol: prefix ? `${prefix}error` : "error_message",
  finishedCol: `${prefix}finished_at`,
  hasWorkspace: true,
  doneEvent,
});

const run = (key: string, table: string, idCol: string, running: readonly string[]): StepDef => ({
  key,
  table,
  idCol,
  statusCol: "status",
  running,
  startedCol: "started_at",
  fallbackCol: idCol === "id" ? "updated_at" : "started_at",
  errorCol: "error_message",
  finishedCol: "finished_at",
  hasWorkspace: true,
});

export const WATCHED_STEPS: readonly StepDef[] = [
  auditStep("audit.discover", "", "audit.completed"),
  auditStep("audit.backlinks", "backlinks_", "audit.backlinks_completed"),
  auditStep("audit.profile", "profile_", "audit.profile_completed"),
  {
    ...auditStep("audit.opportunities", "opportunities_", "audit.opportunities_done"),
    restore: { opportunities_cost_usd: "cost_usd" },
  },
  auditStep("audit.deadlinks", "deadlinks_", undefined, ["en_cours"]),
  // MU.1 : l'analyse unique. Le délai court depuis le dernier lancement (ou la dernière reprise).
  {
    ...auditStep("audit.analysis", "analysis_", "analysis.completed"),
    startedCol: "analysis_confirmed_at",
    // Chantier A.4 : une analyse confirmée dont le job ne démarre pas (événement perdu, Inngest non
    // synchronisé) est traitée vite ; l'écran, lui, le dit dès 2 minutes.
    confirmedMinutes: 5,
  },
  // Une étape de l'analyse écrit sa progression à chaque step : « en cours » sans écriture depuis
  // 15 minutes = job mort (docs/jalon-mu.md 3.3). L'étape et l'analyse passent en échec.
  {
    ...run("analysis.step", "analysis_steps", "id", ["en_cours"]),
    startedCol: "updated_at",
    runningMinutes: 15,
    parent: {
      table: "audits",
      refCol: "audit_id",
      statusCol: "analysis_status",
      running: ["en_cours"],
      errorCol: "analysis_error",
      finishedCol: "analysis_finished_at",
      unless: { col: "key", value: "etat_des_lieux" },
    },
  },
  run("collection", "candidate_collections", "id", ["confirme", "en_cours"]),
  run("qualification", "qualification_runs", "id", ["confirme", "en_cours"]),
  run("findings", "findings_runs", "id", ["confirme", "en_cours"]),
  run("plan.triage", "link_plan_triage_runs", "plan_id", ["en_cours"]),
  run("plan.contacts", "contact_runs", "plan_id", ["en_cours"]),
  run("plan.drafts", "draft_runs", "plan_id", ["en_cours"]),
  {
    ...run("public_audit", "public_audits", "id", ["en_cours"]),
    fallbackCol: "created_at",
    hasWorkspace: false,
  },
];

/** Délais au-delà desquels une étape est considérée comme bloquée. */
export const WATCHDOG_LIMITS = {
  /** Étape démarrée : la plus longue mesurée dure quelques minutes ; marge large pour les reprises. */
  runningMinutes: 60,
  /** Étape confirmée dont le job n'a jamais démarré (événement perdu ou non envoyé). */
  confirmedMinutes: 30,
  /** Lignes examinées par étape et par passage. */
  maxRowsPerStep: 200,
} as const;

type Row = Record<string, unknown>;

/** Instant de référence d'une ligne : début de l'étape, sinon dernière écriture. Null si illisible. */
export function referenceTime(def: StepDef, row: Row): number | null {
  const raw = row[def.startedCol] ?? row[def.fallbackCol];
  const ms = typeof raw === "string" ? Date.parse(raw) : NaN;
  return Number.isFinite(ms) ? ms : null;
}

/** Vrai si la ligne est « en vol » depuis plus longtemps que le délai de son statut. Pur. */
export function isStuck(def: StepDef, row: Row, nowMs: number): boolean {
  const status = row[def.statusCol];
  if (typeof status !== "string" || !def.running.includes(status)) return false;
  const ref = referenceTime(def, row);
  if (ref === null) return false; // sans date fiable, on ne touche à rien
  const minutes =
    status === "confirme"
      ? (def.confirmedMinutes ?? WATCHDOG_LIMITS.confirmedMinutes)
      : (def.runningMinutes ?? WATCHDOG_LIMITS.runningMinutes);
  return nowMs - ref > minutes * 60_000;
}
