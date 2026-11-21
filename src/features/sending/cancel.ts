import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditActionState } from "@/features/audits/service";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;
const M = t.conversations.cancel;

/**
 * Annule l'envoi d'un message approuvé qui n'est pas encore parti : il sort de son lot validé et
 * revient en brouillon, dans « À valider ». Un message déjà parti ne peut pas être annulé.
 * L'écriture passe par le client de service (lots et brouillons), comme l'approbation. Le
 * rédacteur-envoyeur ne renvoie jamais deux fois un même brouillon (dédoublonnage par brouillon),
 * donc un départ qui survient pendant l'annulation ne crée pas de doublon.
 */
export async function cancelSend(
  supabase: Client,
  getServiceClient: () => Client,
  draftId: string,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: M.notWaiting };
  const { data: draft } = await supabase
    .from("target_drafts_v")
    .select("id, status, channel")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || draft.status !== "valide" || draft.channel !== "email") {
    return { status: "error", message: M.notWaiting };
  }
  if (await alreadySent(supabase, draftId)) return { status: "error", message: M.alreadySent };
  const service = getServiceClient();
  await service.from("batch_items").delete().eq("draft_id", draftId);
  const { error } = await service
    .from("target_drafts")
    .update({ status: "brouillon" })
    .eq("id", draftId)
    .eq("status", "valide");
  if (error) return { status: "error", message: M.notWaiting };
  // Dernière vérification : si le message est parti entre-temps, on le dit tel quel.
  if (await alreadySent(supabase, draftId)) return { status: "error", message: M.alreadySent };
  return { status: "ok", message: M.done };
}

async function alreadySent(supabase: Client, draftId: string): Promise<boolean> {
  const { data } = await supabase
    .from("sent_messages")
    .select("id")
    .eq("draft_id", draftId)
    .eq("step", "initial")
    .limit(1);
  return (data ?? []).length > 0;
}
