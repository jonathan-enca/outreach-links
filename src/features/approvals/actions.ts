"use server";

import { trackServer } from "@/features/analytics/track-server";
import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { editReplyDraft, rejectReplyDraft, validateReplyDraft } from "@/features/inbox/service";
import { draftAnyway, draftMissing } from "@/features/drafting/service";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  approveMessages,
  completeForm,
  editPendingMessage,
  refuseMessages,
  snoozeItems,
  wakeSnoozed,
} from "./service";
import { t } from "@/lib/messages";

const refresh = () => revalidatePath("/app", "layout");

export async function approveMessagesAction(ids: string[]): Promise<AuditActionState> {
  const r = await approveMessages(await createClient(), createServiceClient, ids);
  if (r.status === "ok") await trackServer("messages_approved");
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
export async function draftMissingAction(siteId: string | null = null): Promise<AuditActionState> {
  const r = await draftMissing(
    await createClient(),
    createServiceClient,
    (e) => inngest.send(e),
    siteId,
  );
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

/** « Plus tard » durable : les éléments sortent de la file et du compteur pendant 24 h. */
export async function snoozeAction(ids: string[]): Promise<AuditActionState> {
  const r = await snoozeItems(await createClient(), createServiceClient, ids);
  refresh();
  return r;
}

/** Remet dans la file tout ce qui est « à plus tard », ou seulement les éléments nommés. */
export async function wakeSnoozedAction(ids?: string[]): Promise<AuditActionState> {
  const r = await wakeSnoozed(await createClient(), createServiceClient, ids);
  refresh();
  return r;
}

/** Refus en lot : messages écartés (cible gardée en « écartées »), réponses rejetées. Rien ne part. */
export async function refuseItemsAction(
  messageIds: string[],
  replyIds: string[],
): Promise<AuditActionState> {
  const supabase = await createClient();
  const parts: string[] = [];
  if (messageIds.length > 0) {
    const r = await refuseMessages(supabase, createServiceClient, messageIds);
    if (r.status === "error") {
      refresh();
      return r;
    }
    if (r.message) parts.push(r.message);
  }
  if (replyIds.length > 0) {
    let done = 0;
    for (const id of replyIds.slice(0, 100)) {
      const r = await rejectReplyDraft(supabase, createServiceClient, id);
      if (r.status !== "error") done++;
    }
    if (done > 0) parts.push(t.toValidate.messages.repliesDeclined(done));
  }
  refresh();
  return parts.length > 0
    ? { status: "ok", message: parts.join(" ") }
    : { status: "error", message: t.toValidate.messages.notFound };
}

/** Approuve plusieurs réponses proposées, une par une (chacune garde ses garde-fous). */
export async function approveRepliesAction(ids: string[]): Promise<AuditActionState> {
  const supabase = await createClient();
  let done = 0;
  let last: AuditActionState = { status: "error", message: t.toValidate.messages.nothing };
  for (const id of ids.slice(0, 100)) {
    last = await validateReplyDraft(supabase, createServiceClient, id);
    if (last.status !== "error") done++;
  }
  refresh();
  return done > 0 ? { status: "ok", message: t.toValidate.messages.approved(done) } : last;
}
