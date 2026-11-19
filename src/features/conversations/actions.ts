"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cancelSend } from "@/features/sending/cancel";
import { markRead, setArchived, setTag } from "./service";

/** Annule l'envoi d'un message approuvé qui n'est pas encore parti (identifiant « attente-<brouillon> »). */
export async function cancelSendAction(threadId: string): Promise<AuditActionState> {
  const r = await cancelSend(
    await createClient(),
    createServiceClient,
    threadId.replace(/^attente-/, ""),
  );
  revalidatePath("/app", "layout");
  return r;
}

export async function markReadAction(threadId: string): Promise<AuditActionState> {
  const r = await markRead(await createClient(), createServiceClient, threadId);
  revalidatePath("/app", "layout");
  return r;
}

export async function setTagAction(
  threadId: string,
  tag: string,
  on: boolean,
): Promise<AuditActionState> {
  const r = await setTag(await createClient(), createServiceClient, threadId, tag, on);
  revalidatePath("/app/inbox");
  return r;
}

export async function setArchivedAction(threadId: string, on: boolean): Promise<AuditActionState> {
  const r = await setArchived(await createClient(), createServiceClient, threadId, on);
  revalidatePath("/app", "layout");
  return r;
}
