/** Plafonds du rédacteur (M3.3, refondu le 17/11/2026 : recherche d'angle avant d'écrire). */
export const DRAFT_LIMITS = {
  /**
   * Messages rédigés par exécution. 100 depuis le 18/11 (décision de Jonathan) : une campagne livre
   * maintenant 80 à 100 cibles ; à 40, les 30 dernières d'une campagne de 70 n'étaient jamais rédigées.
   */
  maxItems: 100,
  /**
   * Plafond de dépense LLM par exécution (USD, estimations avant appel). Estimé le 17/11/2026 pour
   * 100 cibles : tri ≈ 0,15 USD (petit modèle), jugement et rédaction ≈ 1,50 USD (modèle fort, sur les
   * seules cibles retenues par le tri). 4 USD laisse de la marge ; à mesurer sur une vraie campagne.
   */
  llmBudgetUsd: 4,
  /** Plafond par appel (estimation avant appel, sortie au maximum). */
  triageMaxCostPerCallUsd: 0.03,
  writerMaxCostPerCallUsd: 0.35,
  /** Jetons de sortie, réflexion du modèle comprise. */
  triageMaxOutputTokens: 2_000,
  writerMaxOutputTokens: 6_000,
  /** Texte de la page de la cible envoyé aux modèles (caractères). */
  targetPageChars: 16_000,
  /** Pages du site à promouvoir lues pour le catalogue, et texte gardé pour chacune. */
  cataloguePages: 80,
  cataloguePageChars: 6_000,
  catalogueChunk: 20,
  catalogueHostDelayMs: 250,
  /** Un catalogue plus vieux est relu (jours). */
  catalogueMaxAgeDays: 7,
  /** Pages du catalogue que le tri transmet au rédacteur (lues en entier par lui). */
  candidatePages: 3,
  /** Message court : il se lit en une fois. */
  minWords: 35,
  maxWords: 150,
  maxSubjectChars: 80,
  /** Similarité (Jaccard sur 4-grammes de mots) au-delà de laquelle deux messages sont des doublons. */
  maxSimilarity: 0.35,
  /** Régénérations autorisées quand le message est un doublon ou rate le linter. */
  maxRetries: 1,
} as const;

/**
 * Modèles de la rédaction (décision de Jonathan, 17/11/2026, après essai sur 20 cibles) : le petit
 * modèle trie, le modèle fort rejuge et rédige. Sur ces 20 cibles, les modèles intermédiaire et fort
 * ont rendu les mêmes verdicts ; le petit a retenu 4 angles en trop mais n'en a manqué aucun.
 * Hors Anthropic (développement), le modèle par défaut du fournisseur sert aux deux étapes.
 */
export const DRAFT_MODELS = {
  triage: "claude-haiku-5-5",
  writer: "claude-opus-5-5",
} as const;
