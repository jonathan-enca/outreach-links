/** Plafonds de l'enquêteur (M3.2). */
export const CONTACT_LIMITS = {
  /** Cibles traitées par exécution. */
  maxItems: 40,
  /** Requêtes HTTP par cible (robots.txt, page, accueil, pages de contact). */
  maxRequestsPerItem: 7,
  /** Pages de contact lues en plus de la page de la cible et de l'accueil. */
  maxContactPages: 3,
  /** Appels payants (finder + vérificateur) par exécution. */
  maxPaidCallsPerRun: 60,
  hostDelayMs: 1000,
} as const;
