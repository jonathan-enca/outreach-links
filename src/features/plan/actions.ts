"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { moveSelection, setSelection, validatePlan } from "./service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad: AuditActionState = { status: "error", message: "Requête invalide." };

export async function selectOpportunityAction(
  auditId: string,
  _prev: AuditActionState,
  form: FormData,
): Promise<AuditActionState> {
  const id = String(form.get("opportunityId") ?? "");
  if (!UUID.test(auditId) || !UUID.test(id)) return bad;
  const r = await setSelection(
    await createClient(),
    auditId,
    id,
    form.get("selected") === "1",
    createServiceClient,
  );
  revalidatePath(`/app/audit/${auditId}/plan`);
  return r;
}

export async function moveOpportunityAction(
  auditId: string,
  _prev: AuditActionState,
  form: FormData,
): Promise<AuditActionState> {
  const id = String(form.get("opportunityId") ?? "");
  const dir = form.get("dir") === "up" ? "up" : "down";
  if (!UUID.test(auditId) || !UUID.test(id)) return bad;
  const r = await moveSelection(await createClient(), auditId, id, dir, createServiceClient);
  revalidatePath(`/app/audit/${auditId}/plan`);
  return r;
}

export async function validatePlanAction(auditId: string): Promise<AuditActionState> {
  if (!UUID.test(auditId)) return bad;
  const r = await validatePlan(await createClient(), auditId, createServiceClient);
  revalidatePath(`/app/audit/${auditId}/plan`);
  return r;
}
