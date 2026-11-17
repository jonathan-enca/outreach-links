/**
 * Promesse « vous recevrez un email » : affichée seulement quand un envoi réel a été constaté avec la
 * clé en place. Le 17/11 la clé Resend était refusée (« Resend 401 validation_error ») : elle avait été
 * recopiée avec un caractère en trop. Le 18/11 une nouvelle clé (envoi seul, domaine ouiouioui.app) a
 * été posée sur Vercel et un envoi réel depuis no-reply@ouiouioui.app a été constaté (réponse 200 avec
 * identifiant). À revérifier au premier `analysis.email_sent` en production ; sinon repasser à `false`.
 */
export const ANALYSIS_EMAIL_VERIFIED = true;
