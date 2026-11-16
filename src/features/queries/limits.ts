import { AUDIT_BUDGET } from "@/features/audits/beta";

/**
 * Plafonds de l'univers de requêtes (MT.2b, docs/audit-v2.md phase 1) : UN appel LLM court, aucun
 * appel DataForSEO. Le nombre de requêtes gardées est réglé par le budget : une part du budget cible
 * de l'audit est réservée aux SERP de personas (la plus grosse ligne de la phase de collecte).
 */
export const QUERY_LIMITS = {
  /** Part du budget cible d'audit réservée aux recherches d'éditeurs (SERP top 30 de la collecte). */
  serpShareOfTarget: 0.256,
  /** Bornes du nombre de requêtes gardées, quel que soit le budget. */
  minQueries: 6,
  maxQueries: 60,
  /** Profondeur SERP chiffrée pour l'annonce du coût (pire cas : top 30). */
  serpDepth: 30,
  /** Requêtes demandées au modèle par persona (le classement en gardera moins si le budget l'impose). */
  perPersona: 5,
  /** Requêtes de marque (tactique 3) garanties dans l'univers, budget permettant. */
  reservedMentions: 2,
  maxMentionQueries: 3,
  /** Une même persona perd ce coefficient à chaque requête déjà retenue pour elle (diversité). */
  diversityDecay: 0.88,
  /** Plafond de dépense LLM : un seul appel, quelques millièmes de dollar. */
  llmBudgetUsd: 0.03,
  llmMaxCostPerCallUsd: 0.02,
  maxOutputTokens: 1_800,
} as const;

/** Budget USD des recherches d'éditeurs pour un budget cible d'audit (par défaut : AUDIT_BUDGET.targetUsd). */
export function queryBudgetUsd(auditTargetUsd: number = AUDIT_BUDGET.targetUsd): number {
  return Math.round(auditTargetUsd * QUERY_LIMITS.serpShareOfTarget * 1e6) / 1e6;
}

/** Version des recettes : monter ce numéro invalide tout le cache quand le prompt change. */
export const RECIPE_VERSION = 2;
