import { cookies } from "next/headers";

/** Site choisi dans le menu (cookie) : filtre les écrans ; « all » = tous les sites. */
export const SITE_COOKIE = "site";
export const ALL_SITES = "all";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un choix valide : un site que la personne voit, sinon « tous les sites ». */
export function parseSiteChoice(value: string | undefined, visibleIds: readonly string[]): string {
  return value && UUID.test(value) && visibleIds.includes(value) ? value : ALL_SITES;
}

export async function currentSiteChoice(visibleIds: readonly string[]): Promise<string> {
  return parseSiteChoice((await cookies()).get(SITE_COOKIE)?.value, visibleIds);
}
