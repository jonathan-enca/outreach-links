/** Plafonds du rédacteur (M3.3). */
export const DRAFT_LIMITS = {
  /** Messages rédigés par exécution. */
  maxItems: 40,
  /** Plafond de dépense LLM par exécution (USD, estimations avant appel). */
  llmBudgetUsd: 0.1,
  llmMaxCostPerCallUsd: 0.01,
  /** Messages courts : 3 lignes. */
  minWords: 25,
  maxWords: 110,
  maxSubjectChars: 70,
  /** Similarité (Jaccard sur 4-grammes de mots) au-delà de laquelle deux messages sont des doublons. */
  maxSimilarity: 0.35,
  /** Régénérations autorisées quand le message est un doublon ou rate le linter. */
  maxRetries: 1,
} as const;
