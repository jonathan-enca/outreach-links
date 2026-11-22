import { normalizeDomain } from "@/features/sites/domain";

/**
 * Site tapé dans un appel à l'action d'un contenu (« votresite.fr ») avant l'inscription. Il suit la
 * personne dans un cookie le temps de créer son compte et de confirmer son email, puis préremplit
 * l'écran de démarrage. Rien n'est lancé : c'est une saisie reprise, pas une campagne.
 */
export const PENDING_SITE_COOKIE = "site_saisi";
/** Sept jours : le temps de confirmer son email. */
export const PENDING_SITE_MAX_AGE = 60 * 60 * 24 * 7;

/** Domaine propre à retenir, ou null si la saisie n'est pas un nom de domaine public plausible. */
export function pendingSite(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  return normalizeDomain(raw.slice(0, 300));
}
