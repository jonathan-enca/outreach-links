"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createLlmClientFromEnv } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { REPLY_LLM_LIMITS } from "./reply-writer";
import {
  choosePaymentOption,
  correctCategory,
  editReplyDraft,
  generateDraft,
  rejectReplyDraft,
  setAutonomy,
  setThreadState,
  validateReplyDraft,
} from "./service";

const refresh = (id?: string) => {
  revalidatePath("/app/inbox");
  if (id) revalidatePath(`/app/inbox/${id}`);
};

export async function generateDraftAction(classificationId: string): Promise<AuditActionState> {
  const r = await generateDraft(
    await createClient(),
    createServiceClient,
    {
      llm: () =>
        createLlmClientFromEnv({
          budgetUsd: REPLY_LLM_LIMITS.budgetUsd,
          maxCostPerCallUsd: REPLY_LLM_LIMITS.maxCostPerCallUsd,
        }),
    },
    classificationId,
  );
  refresh(classificationId);
  return r;
}

export async function choosePaymentAction(
  classificationId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await choosePaymentOption(
    await createClient(),
    createServiceClient,
    classificationId,
    formData.get("option"),
    formData.get("budget"),
  );
  refresh(classificationId);
  return r;
}

export async function editDraftAction(
  classificationId: string,
  draftId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await editReplyDraft(await createClient(), createServiceClient, draftId, {
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  refresh(classificationId);
  return r;
}

export async function validateDraftAction(
  classificationId: string,
  draftId: string,
): Promise<AuditActionState> {
  const r = await validateReplyDraft(await createClient(), createServiceClient, draftId);
  refresh(classificationId);
  return r;
}

export async function rejectDraftAction(
  classificationId: string,
  draftId: string,
): Promise<AuditActionState> {
  const r = await rejectReplyDraft(await createClient(), createServiceClient, draftId);
  refresh(classificationId);
  return r;
}

export async function setStateAction(
  classificationId: string,
  state: string,
): Promise<AuditActionState> {
  const r = await setThreadState(
    await createClient(),
    createServiceClient,
    classificationId,
    state,
  );
  refresh(classificationId);
  return r;
}

export async function correctCategoryAction(
  classificationId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await correctCategory(
    await createClient(),
    createServiceClient,
    classificationId,
    formData.get("category"),
  );
  refresh(classificationId);
  return r;
}

export async function setAutonomyAction(
  workspaceId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await setAutonomy(
    await createClient(),
    createServiceClient,
    workspaceId,
    formData.get("level"),
  );
  refresh();
  return r;
}
