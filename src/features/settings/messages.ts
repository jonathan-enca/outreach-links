import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

/** Enregistre « ce que vous offrez en échange » d'un site (la RLS limite aux sites de la personne). */
export async function saveOfferedAsset(
  supabase: Client,
  siteId: string,
  raw: unknown,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: t.settings.messages.unauthenticated };
  const offer = typeof raw === "string" ? raw.trim().slice(0, 300) : "";
  const { data, error } = await supabase
    .from("sites")
    .update({ offered_asset: offer || null })
    .eq("id", siteId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: t.settings.messages.saveError };
  return { status: "ok", message: t.settings.messages.saved };
}
