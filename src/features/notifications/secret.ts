import { env } from "@/env";

/**
 * Secret qui signe les liens « Ne plus recevoir cet email ». Sans secret (poste de développement
 * sans clé de service), l'email part sans ce lien : « Gérer mes notifications » reste.
 */
export function notificationSecret(): string | null {
  return env.ABUSE_HASH_SALT ?? env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

/** Adresse du lien de désinscription d'un type d'email pour un espace, ou `null` sans secret. */
export function unsubscribePath(token: string): string {
  return `/notifications/desabonnement?t=${encodeURIComponent(token)}`;
}
