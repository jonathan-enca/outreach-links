/**
 * Plafonds par plan pour la découverte de concurrents (PLAN 1.3, CLAUDE.md 4.5).
 * Les plans réels (Stripe) arrivent en M6.1 : en attendant, `workspaces.plan` vaut
 * "gratuit" par défaut et seul service_role peut le changer.
 */
export const PLANS = ["gratuit", "payant"] as const;
export type PlanKey = (typeof PLANS)[number];

export interface PlanLimits {
  /** Nombre maximum de concurrents retenus. */
  maxCompetitors: number;
  /** Nombre minimum visé (si la SERP en contient assez). */
  minCompetitors: number;
  maxQueries: number;
  /** Profondeur SERP analysée par requête (CLAUDE.md : top 30). */
  serpDepth: number;
  /** Plafond du coût estimé d'un audit (USD) : au-dessus, l'audit est refusé avant tout appel. */
  costCapUsd: number;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  gratuit: { maxCompetitors: 3, minCompetitors: 3, maxQueries: 3, serpDepth: 30, costCapUsd: 0.25 },
  payant: { maxCompetitors: 20, minCompetitors: 10, maxQueries: 3, serpDepth: 30, costCapUsd: 1.5 },
};

export function isPlanKey(v: unknown): v is PlanKey {
  return typeof v === "string" && (PLANS as readonly string[]).includes(v);
}

export const AUDIT_STATUSES = [
  "en_attente",
  "estime",
  "confirme",
  "en_cours",
  "termine",
  "echoue",
] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];

/** Transitions autorisées (une seule direction ; "echoue" depuis tout état actif). */
export const AUDIT_TRANSITIONS: Record<AuditStatus, readonly AuditStatus[]> = {
  en_attente: ["estime", "echoue"],
  estime: ["confirme", "echoue"],
  confirme: ["en_cours", "echoue"],
  en_cours: ["termine", "echoue"],
  termine: [],
  echoue: [],
};

export function canTransition(from: AuditStatus, to: AuditStatus): boolean {
  return AUDIT_TRANSITIONS[from].includes(to);
}
