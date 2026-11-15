/**
 * Où mener l'utilisateur après l'échange d'un code Supabase (lien d'un email) : un lien de
 * réinitialisation récent mène au choix du mot de passe, tout le reste à l'espace. Un code qui
 * atterrit sur la mauvaise page (URL de redirection non reconnue) est ainsi repris correctement.
 */
export function destinationAfterCode(
  user: { recovery_sent_at?: string | null; confirmation_sent_at?: string | null } | null,
  now: Date = new Date(),
): string {
  const recovery = user?.recovery_sent_at ? Date.parse(user.recovery_sent_at) : NaN;
  if (!Number.isFinite(recovery)) return "/app";
  const confirmation = user?.confirmation_sent_at
    ? Date.parse(user.confirmation_sent_at)
    : -Infinity;
  const recent = now.getTime() - recovery < 60 * 60 * 1000;
  return recent && recovery > confirmation ? "/reinitialiser" : "/app";
}

/** URL de l'application sans barre finale : évite `https://site//auth/...`, rejeté par Supabase. */
export function cleanAppUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
