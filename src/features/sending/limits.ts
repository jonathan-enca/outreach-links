/** Plafonds et délais du moteur d'envoi (CLAUDE.md 4.4 : 10 emails/heure max, heures ouvrées). */
export const SEND_LIMITS = {
  /** Plafond dur par heure et par boîte (aussi appliqué en base). */
  hourlyMax: 10,
  /** Relance unique, en jours après l'envoi initial (M4.3). */
  followUpDays: 10,
  /** Tentatives d'envoi par message (échecs temporaires seulement). */
  maxAttempts: 3,
  retryDelayMinutes: 30,
  /** Échauffement : plafond journalier par semaine d'utilisation de la boîte (réel seulement). */
  warmupDaily: [5, 10, 15] as readonly number[],
} as const;
