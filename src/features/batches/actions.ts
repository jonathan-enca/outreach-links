"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createBatch, editDraft, removeFromBatch, validateBatch } from "./service";

const refresh = (auditId: string) => revalidatePath(`/app/audit/${auditId}/plan`);

export async function createBatchAction(
  auditId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await createBatch(
    await createClient(),
    auditId,
    formData.get("size"),
    createServiceClient,
  );
  refresh(auditId);
  return r;
}

export async function editDraftAction(
  auditId: string,
  batchId: string,
  draftId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await editDraft(
    await createClient(),
    auditId,
    batchId,
    draftId,
    { subject: String(formData.get("subject") ?? ""), body: String(formData.get("body") ?? "") },
    createServiceClient,
  );
  refresh(auditId);
  return r;
}

export async function removeFromBatchAction(
  auditId: string,
  batchId: string,
  draftId: string,
): Promise<AuditActionState> {
  const r = await removeFromBatch(
    await createClient(),
    auditId,
    batchId,
    draftId,
    createServiceClient,
  );
  refresh(auditId);
  return r;
}

export async function validateBatchAction(
  auditId: string,
  batchId: string,
): Promise<AuditActionState> {
  const r = await validateBatch(await createClient(), auditId, batchId, createServiceClient);
  refresh(auditId);
  return r;
}
