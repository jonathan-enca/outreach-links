/**
 * Promesse « vous recevrez un email » : affichée seulement quand un envoi réel a été constaté avec la
 * clé en place. Au 17/11/2026 la clé Resend de production est refusée (« Resend 401 validation_error »,
 * événements `analysis.email_error`) : tant qu'un `analysis.email_sent` n'a pas été constaté, la phrase
 * reste retirée des écrans. À passer à `true` après le premier envoi réel constaté.
 */
export const ANALYSIS_EMAIL_VERIFIED = false;
