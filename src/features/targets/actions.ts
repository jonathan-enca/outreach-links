"use server";

import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import type { AuditActionState } from "@/features/audits/service";
import { startCollection } from "@/features/collection/service";
import { startFindings } from "@/features/findings/service";
import { startQualification } from "@/features/qualification/service";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { setFounderRole, validateRequests } from "./service";

const M = t.targets.messages;
const refresh = (auditId: string) => revalidatePath(`/app/audit/${auditId}/cibles`);

/** L'utilisateur voit-il cet audit ? (RLS) : à vérifier AVANT d'utiliser le client de service. */
async function authorize(auditId: string) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: M.unauthenticated } as const;
  const { data } = await supabase.from("audits").select("id").eq("id", auditId).maybeSingle();
  if (!data) return { error: M.notFound } as const;
  return { supabase, userId: auth.user.id } as const;
}

export async function startCollectionAction(auditId: string): Promise<AuditActionState> {
  const a = await authorize(auditId);
  if ("error" in a) return { status: "error", message: a.error };
  const r = await startCollection(createServiceClient(), auditId, (e) => inngest.send(e), a.userId);
  refresh(auditId);
  return r;
}

export async function startQualificationAction(auditId: string): Promise<AuditActionState> {
  const a = await authorize(auditId);
  if ("error" in a) return { status: "error", message: a.error };
  const r = await startQualification(
    createServiceClient(),
    auditId,
    (e) => inngest.send(e),
    a.userId,
  );
  refresh(auditId);
  return r;
}

export async function startFindingsAction(auditId: string): Promise<AuditActionState> {
  const a = await authorize(auditId);
  if ("error" in a) return { status: "error", message: a.error };
  const r = await startFindings(createServiceClient(), auditId, (e) => inngest.send(e), a.userId);
  refresh(auditId);
  return r;
}

export async function setFounderRoleAction(
  auditId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await setFounderRole(await createClient(), auditId, formData.get("role"));
  refresh(auditId);
  return r;
}

export async function validateRequestsAction(
  auditId: string,
  ids: string[],
): Promise<AuditActionState> {
  const r = await validateRequests(await createClient(), auditId, ids, createServiceClient, (e) =>
    inngest.send(e),
  );
  refresh(auditId);
  revalidatePath(`/app/audit/${auditId}/plan`);
  return r;
}
