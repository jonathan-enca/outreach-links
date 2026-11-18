"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { editReplyDraft, rejectReplyDraft, validateReplyDraft } from "@/features/inbox/service";
import { draftAnyway, draftMissing } from "@/features/drafting/service";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { approveMessages, completeForm, editPendingMessage } from "./service";

const refresh = () => revalidatePath("/app", "layout");

export async function approveMessagesAction(ids: string[]): Promise<AuditActionState> {
  const r = await approveMessages(await createClient(), createServiceClient, ids);
  refresh();
  return r;
}

export async function editMessageAction(
  id: string,
  input: { subject: string; body: string },
): Promise<AuditActionState> {
  const r = await editPendingMessage(await createClient(), createServiceClient, id, input);
  refresh();
  return r;
}

export async function approveReplyAction(id: string): Promise<AuditActionState> {
  const r = await validateReplyDraft(await createClient(), createServiceClient, id);
  refresh();
  return r;
}

export async function editReplyAction(
  id: string,
  input: { subject: string; body: string },
): Promise<AuditActionState> {
  const r = await editReplyDraft(await createClient(), createServiceClient, id, input);
  refresh();
  return r;
}

export async function rejectReplyAction(id: string): Promise<AuditActionState> {
  const r = await rejectReplyDraft(await createClient(), createServiceClient, id);
  refresh();
  return r;
}

export async function completeFormAction(id: string, taskId: string): Promise<AuditActionState> {
  const r = await completeForm(await createClient(), createServiceClient, id, taskId);
  refresh();
  return r;
}

/** Relance la rédaction pour les cibles validées qui n'ont pas encore de message. */
export async function draftMissingAction(): Promise<AuditActionState> {
  const r = await draftMissing(await createClient(), createServiceClient, (e) => inngest.send(e));
  refresh();
  return r;
}

export async function draftAnywayAction(itemId: string): Promise<AuditActionState> {
  const r = await draftAnyway(
    await createClient(),
    createServiceClient,
    (e) => inngest.send(e),
    itemId,
  );
  refresh();
  return r;
}
