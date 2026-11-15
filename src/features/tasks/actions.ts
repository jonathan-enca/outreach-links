"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cancelFollowUp, completeFollowUp, completeTask, skipTask } from "./service";

const refresh = () => revalidatePath("/app/taches");

export async function completeTaskAction(
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await completeTask(await createClient(), createServiceClient, formData.get("task_id"));
  refresh();
  return r;
}

export async function completeFollowUpAction(
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await completeFollowUp(
    await createClient(),
    createServiceClient,
    formData.get("task_id"),
  );
  refresh();
  return r;
}

export async function cancelFollowUpAction(
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await cancelFollowUp(
    await createClient(),
    createServiceClient,
    formData.get("task_id"),
    formData.get("reason"),
  );
  refresh();
  return r;
}

export async function skipTaskAction(
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await skipTask(await createClient(), createServiceClient, formData.get("task_id"));
  refresh();
  return r;
}
