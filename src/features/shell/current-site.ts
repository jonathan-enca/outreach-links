import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

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

/**
 * Le site choisi dans le menu, ou null pour « tous les sites » : ce que les écrans passent aux
 * services pour ne montrer que ce site (accueil, « À valider », conversations, tâches).
 */
export async function selectedSiteId(supabase: SupabaseClient<Database>): Promise<string | null> {
  const { data } = await supabase.from("sites").select("id");
  const choice = await currentSiteChoice((data ?? []).map((s) => s.id));
  return choice === ALL_SITES ? null : choice;
}
