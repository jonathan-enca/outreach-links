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

/**
 * MC.7 : mots-clés positionnés lus dès l'onboarding. Même volume que l'état des lieux de l'analyse
 * (`LINKS_STATE_LIMITS.rankedKeywords` reprend cette valeur) : mêmes paramètres, donc même entrée de
 * cache DataForSEO, et le domaine n'est payé qu'une fois.
 */
export const RANKED_KEYWORDS_LIMIT = 100;

/**
 * MC.7 : classement des pages à pousser, par volume et par position (décision de Jonathan, 18/11/2026 :
 * formule FIXE, sans calibrage). `score = log10(1 + volume total de la page) × facteur de position`,
 * la meilleure position de la page décidant du facteur. Tout se règle ici, à la main.
 */
export const PAGE_RANK = {
  /** Paliers de position, du meilleur rang au moins bon : [dernière position du palier, facteur]. */
  positionFactors: [
    /** 1 à 3 : déjà en haut de la page 1, un lien de plus change peu. */
    [3, 0.3],
    /** 4 à 20 : un lien peut faire passer la page en haut de la page 1. */
    [20, 1.0],
    /** 21 à 50 : encore à portée. */
    [50, 0.7],
  ],
  /** Au-delà de 50 : jamais zéro, une page à fort volume en position 80 reste candidate. */
  beyondFactor: 0.4,
  /** Pages classées lues en priorité et présélectionnées dans « Pages à faire citer ». */
  preselected: 5,
  /** Pages classées gardées dans le profil (affichage, départage du rédacteur, MC.2). */
  keptPages: 20,
  /** Mots-clés gardés par page, les plus recherchés d'abord. */
  keptKeywordsPerPage: 5,
  /** Plafond de l'appel (USD, estimation) : au-delà, l'ancien tri par adresse s'applique. */
  maxCostUsd: 0.03,
  /** Délai maximal de l'appel (ms) : l'onboarding n'attend jamais davantage. */
  timeoutMs: 12_000,
} as const;
