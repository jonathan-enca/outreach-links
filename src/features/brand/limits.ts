/** Plafonds du profil de marque (MT.1) : quelques millièmes de dollar, un seul appel LLM. */
export const BRAND_LIMITS = {
  /** Pages lues en plus de l'accueil. */
  maxExtraPages: 8,
  /** Requêtes HTTP au total (robots.txt, accueil, sitemap, pages). */
  maxRequests: 16,
  /** Sitemaps enfants lus quand le sitemap est un index. */
  maxChildSitemaps: 2,
  /** Délai minimal entre deux requêtes vers le site (ms). */
  hostDelayMs: 600,
  /** Durée maximale de la lecture (ms) : au-delà, on s'arrête avec ce qui est lu. */
  readDeadlineMs: 25_000,
  /** Plafond de dépense LLM de tout le profil (USD) et par appel. */
  llmBudgetUsd: 0.06,
  llmMaxCostPerCallUsd: 0.02,
  maxOutputTokens: 1_400,
  /** Extraits envoyés au modèle (caractères). */
  homeExcerptChars: 1_800,
  pageExcerptChars: 500,
} as const;
