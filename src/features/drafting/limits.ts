/** Plafonds du rédacteur (M3.3). */
export const DRAFT_LIMITS = {
  /**
   * Messages rédigés par exécution. 100 depuis le 18/11 (décision de Jonathan) : une campagne livre
   * maintenant 80 à 100 cibles ; à 40, les 30 dernières d'une campagne de 70 n'étaient jamais rédigées.
   */
  maxItems: 100,
  /**
   * Plafond de dépense LLM par exécution (USD, estimations avant appel). 0,45 depuis le 18/11 : mesuré
   * environ 0,004 USD par message (0,098 USD pour 25) ; à 0,10, la rédaction s'arrêtait à 25 messages.
   */
  llmBudgetUsd: 0.45,
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
