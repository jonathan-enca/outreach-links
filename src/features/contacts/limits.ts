/** Plafonds de l'enquêteur (M3.2). */
export const CONTACT_LIMITS = {
  /** Cibles traitées par exécution. */
  maxItems: 40,
  /** Requêtes HTTP par cible (robots.txt, page, accueil, pages de contact). */
  maxRequestsPerItem: 18,
  /** Pages lues par tour d'exploration (les tours s'arrêtent dès qu'un email du domaine est trouvé). */
  pagesPerRound: 3,
  /** Tours d'exploration maximum (liens de la page, sitemap, puis pages trouvées). */
  maxRounds: 4,
  /** Pages de contact lues en plus de la page de la cible et de l'accueil. */
  maxContactPages: 10,
  /** Appels payants (finder + vérificateur) par exécution. */
  maxPaidCallsPerRun: 60,
  hostDelayMs: 1000,
} as const;
