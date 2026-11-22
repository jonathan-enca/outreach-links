/** Sans dépendance serveur : importable depuis un composant client. */

/** Adresse de l'inscription qui emporte la saisie (sans paramètre si elle est vide). */
export function signupHref(raw: string): string {
  const value = raw.trim().slice(0, 300);
  return value ? `/inscription?site=${encodeURIComponent(value)}` : "/inscription";
}
