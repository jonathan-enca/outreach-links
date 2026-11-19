import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/**
 * Identifiants des campagnes (plans) d'un site. Le filtre « un seul site » de l'espace client passe
 * par eux : tout ce qui porte un plan (message, réponse, tâche, envoi) se rattache à son site.
 * La RLS limite déjà aux sites de la personne ; un site sans plan donne un ensemble vide.
 */
export async function planIdsOfSite(supabase: Client, siteId: string): Promise<Set<string>> {
  const { data } = await supabase.from("link_plans").select("id").eq("site_id", siteId);
  return new Set((data ?? []).map((p) => p.id));
}
