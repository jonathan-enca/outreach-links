"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { cancelSend } from "@/features/sending/cancel";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** Annule un email programmé (il revient dans « À valider », comme aujourd'hui). */
export async function cancelEnvoiAction(draftId: string): Promise<AuditActionState> {
  const r = await cancelSend(await createClient(), createServiceClient, draftId);
  revalidatePath("/app", "layout");
  return r;
}

/**
 * Suspend (ou reprend) tous les envois de la personne : toutes ses boîtes d'envoi. Rien n'est annulé :
 * les emails programmés attendent, et partent à la reprise si leur heure n'est pas dépassée.
 */
export async function setSendingPausedAction(paused: boolean): Promise<AuditActionState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: "Connectez-vous pour modifier les envois." };
  const { data: boxes, error } = await supabase.from("mailboxes").select("id");
  if (error) return { status: "error", message: "Impossible de lire vos boîtes d'envoi." };
  const ids = (boxes ?? []).map((b) => b.id);
  if (ids.length === 0) return { status: "error", message: "Aucune boîte d'envoi à modifier." };
  const { error: writeError } = await createServiceClient()
    .from("mailboxes")
    .update({ sending_paused: paused })
    .in("id", ids);
  if (writeError)
    return { status: "error", message: "Impossible de modifier les envois. Réessayez." };
  revalidatePath("/app", "layout");
  return {
    status: "ok",
    message: paused ? "Envois suspendus. Rien n'est annulé." : "Envois repris.",
  };
}
