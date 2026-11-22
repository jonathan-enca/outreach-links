import { env } from "@/env";

/**
 * Secret qui signe les liens « Ne plus recevoir cet email ». Sans secret (poste de développement
 * sans clé de service), l'email part sans ce lien : « Gérer mes notifications » reste.
 */
export function notificationSecret(): string | null {
  return env.ABUSE_HASH_SALT ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

/** Page « Ne plus recevoir cet email » (avec confirmation), pour le lien en bas de l'email. */
export function unsubscribePath(token: string): string {
  return `/notifications/desabonnement?t=${encodeURIComponent(token)}`;
}

/**
 * Adresse de la désinscription en un clic (RFC 8058) : la messagerie (Gmail, Yahoo…) l'appelle en POST
 * depuis son propre bouton « Se désabonner », sans page intermédiaire.
 */
export function oneClickPath(token: string): string {
  return `/api/notifications/unsubscribe?t=${encodeURIComponent(token)}`;
}
