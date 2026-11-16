import { AUDIT_BUDGET } from "@/features/audits/beta";
import { DEFAULT_MODELS } from "@/lib/llm/client";
import { estimateCostUsd } from "@/lib/llm/pricing";

/**
 * Plafonds des constats par page (MT.5). Seul le jugement LLM est payant : un appel par cible qui a
 * au moins un passage ou un lien à juger, sous 5 % du budget cible d'audit (0,05 USD, pris sur la
 * marge de docs/audit-v2.md section 6). Les lectures et contrôles de liens sont gratuits mais bornés.
 */
export const FINDINGS_LIMITS = {
  shareOfTarget: 0.05,
  /** Cibles examinées au plus (la liste courte, dans l'ordre du rang). */
  maxTargets: 60,
  /** Cibles « mentions » sans contact examinées en plus de la liste courte (mention seulement). */
  maxMentionOnly: 20,
  /** Cibles lues par step Inngest. */
  targetsPerStep: 6,
  /** MU.1 : pages de sites DIFFÉRENTS examinées de front dans un step. */
  scanConcurrency: 6,
  /** Requêtes HTTP au plus par cible (robots.txt, page, liens). */
  requestsPerTarget: 70,
  /** Liens vérifiés (404/410) au plus par page. */
  maxLinksChecked: 25,
  hostDelayMs: 800,
  /** Passages de mention et liens candidats montrés au modèle. */
  maxMentions: 3,
  maxLinkCandidates: 8,
  /** Jetons de sortie d'un appel (borne du coût). */
  outputTokens: 420,
  /** Part des cibles qui ont quelque chose à juger, pour le coût ATTENDU (le pire cas = toutes). */
  typicalJudgedRate: 0.7,
} as const;

/**
 * Motifs d'écart (MT.4) qui n'enlèvent rien à une page de MENTION : le site a été vu ou pas encore
 * jugé, mais il nomme déjà le nôtre. Les autres motifs (concurrent, spam, vendeur de liens, site
 * piraté, plateforme...) disqualifient le site lui-même.
 */
export const MENTION_ONLY_REASONS = [
  "sans_contact",
  "hors_budget_contact",
  "editeur_introuvable",
  "hors_budget_lecture",
  "hors_budget_llm",
  "non_qualifie",
] as const;

const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export function findingsBudgetUsd(auditTargetUsd: number = AUDIT_BUDGET.targetUsd): number {
  return r6(auditTargetUsd * FINDINGS_LIMITS.shareOfTarget);
}

/** Prompt système + contexte du site (caractères) et charge d'une cible au plus : bornes vérifiées par test. */
export const SYSTEM_CHARS = 3_200;
export const TARGET_CHARS = 5_600;

export function callWorstUsd(model: string = DEFAULT_MODELS.anthropic): number {
  return estimateCostUsd(model, SYSTEM_CHARS + TARGET_CHARS, FINDINGS_LIMITS.outputTokens);
}

export function callExpectedUsd(model: string = DEFAULT_MODELS.anthropic): number {
  return estimateCostUsd(
    model,
    SYSTEM_CHARS + Math.round(TARGET_CHARS * 0.6),
    Math.round(FINDINGS_LIMITS.outputTokens * 0.7),
  );
}

export interface FindingsEstimate {
  targets: number;
  llmCallsExpected: number;
  llmCallsMax: number;
  expectedUsd: number;
  worstUsd: number;
  budgetUsd: number;
  model: string;
}

/** Coût ANNONCÉ avant lancement (sans appel) : attendu et pire cas, bornés par le budget. */
export function estimateFindings(
  targets: number,
  opts: { model?: string; budgetUsd?: number } = {},
): FindingsEstimate {
  const model = opts.model ?? DEFAULT_MODELS.anthropic;
  const budgetUsd = opts.budgetUsd ?? findingsBudgetUsd();
  const n = Math.min(targets, FINDINGS_LIMITS.maxTargets);
  const expectedCalls = Math.round(n * FINDINGS_LIMITS.typicalJudgedRate);
  return {
    targets: n,
    llmCallsExpected: expectedCalls,
    llmCallsMax: n,
    expectedUsd: Math.min(r6(expectedCalls * callExpectedUsd(model)), budgetUsd),
    worstUsd: Math.min(r6(n * callWorstUsd(model)), budgetUsd),
    budgetUsd,
    model,
  };
}
