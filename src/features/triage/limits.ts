/** Plafonds du tri (M3.1) : volume de pages lues et dépense LLM par exécution. */
export const TRIAGE_LIMITS = {
  /** Cibles triées par exécution (les suivantes restent « à trier »). */
  maxItems: 40,
  /** Requêtes HTTP par cible (robots.txt, page, recherche d'URL partielle). */
  maxRequestsPerItem: 6,
  /** Plafond de dépense LLM par exécution (USD, estimations avant appel). */
  llmBudgetUsd: 0.1,
  /** Plafond estimé par appel LLM (USD). */
  llmMaxCostPerCallUsd: 0.01,
  /** Délai minimal entre deux requêtes vers le même hôte (ms). */
  hostDelayMs: 1000,
} as const;
