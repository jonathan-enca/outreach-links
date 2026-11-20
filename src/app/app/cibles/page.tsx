import { redirect } from "next/navigation";
import { siteHref } from "@/features/shell/next-step";
import { loadOverview } from "@/features/shell/overview";
import { selectedSiteId } from "@/features/shell/current-site";
import { createClient } from "@/lib/supabase/server";

/**
 * « Cibles » du menu : c'est l'étape « Vos cibles » de la campagne affichée, pas un écran à part.
 * Cette adresse y renvoie (site choisi, sinon la première campagne qui a une analyse).
 */
export default async function Page() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");
  const siteId = await selectedSiteId(supabase);
  if (siteId) redirect(siteHref.cibles(siteId));
  const overview = await loadOverview(supabase);
  const first = overview.campaigns.find((c) => c.auditId);
  redirect(first ? siteHref.cibles(first.siteId) : "/app/campagnes");
}
