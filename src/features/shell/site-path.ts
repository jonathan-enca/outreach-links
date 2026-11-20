/**
 * Le site actif est celui du menu (cookie). Les pages d'une campagne portent aussi un site dans leur
 * adresse (/app/site/<id>/…) : ces deux helpers gardent les deux d'accord (retour de Jonathan, 20/11 :
 * changer de site mélangeait les sites entre les onglets).
 */
const SITE_PATH =
  /^\/app\/site\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/.*)?$/i;

/** Le site d'une page de campagne, ou null pour toute autre page. */
export function siteInPath(pathname: string): string | null {
  return SITE_PATH.exec(pathname)?.[1]?.toLowerCase() ?? null;
}

/**
 * Où aller quand on choisit `choice` dans le menu depuis `pathname` : la même page de l'autre site,
 * la liste des campagnes pour « tous les sites », ou null si la page ne dépend pas de l'adresse.
 */
export function pathForSite(pathname: string, choice: string): string | null {
  const m = SITE_PATH.exec(pathname);
  if (!m) return null;
  if (choice === "all") return "/app/campagnes";
  return `/app/site/${choice}${m[2] ?? ""}`;
}
