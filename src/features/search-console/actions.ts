"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Déconnecte la Search Console d'un site : supprime la connexion et son jeton chiffré. Le site doit
 * appartenir à la personne (vérifié avec son propre client, RLS). Rien n'est retiré côté Google : la
 * personne peut aussi révoquer l'accès depuis son compte Google.
 */
export async function disconnectSearchConsoleAction(siteId: string): Promise<void> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).maybeSingle();
  if (!site) return;
  await createServiceClient().from("search_console_connections").delete().eq("site_id", site.id);
  revalidatePath("/app/reglages/search-console");
  revalidatePath(`/app/site/${siteId}`);
}
