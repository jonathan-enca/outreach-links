"use server";

import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import type { AuditActionState } from "@/features/audits/service";
import { startCollection } from "@/features/collection/service";
import { startFindings } from "@/features/findings/service";
import { requestMore } from "@/features/qualification/more";
import { startQualification } from "@/features/qualification/service";
import { t } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { saveMessageSettings, validateRequests } from "./service";

const M = t.targets.messages;
const refresh = () => revalidatePath("/app", "layout");

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
  refresh();
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
  refresh();
  return r;
}

export async function startFindingsAction(auditId: string): Promise<AuditActionState> {
  const a = await authorize(auditId);
  if ("error" in a) return { status: "error", message: a.error };
  const r = await startFindings(createServiceClient(), auditId, (e) => inngest.send(e), a.userId);
  refresh();
  return r;
}

/** « Lire d'autres sites » : lit et juge un lot de plus parmi les sites trouvés mais pas encore lus. */
export async function readMoreAction(auditId: string): Promise<AuditActionState> {
  const a = await authorize(auditId);
  if ("error" in a) return { status: "error", message: a.error };
  const r = await requestMore(a.supabase, createServiceClient, auditId, (e) => inngest.send(e));
  refresh();
  return r;
}

/** Rôle et prénom de signature, enregistrés ensemble (appelé juste avant la validation des cibles). */
export async function saveMessageSettingsAction(
  auditId: string,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await saveMessageSettings(
    await createClient(),
    auditId,
    formData.get("role"),
    formData.get("firstName"),
  );
  refresh();
  return r;
}

export async function validateRequestsAction(
  auditId: string,
  ids: string[],
): Promise<AuditActionState> {
  const r = await validateRequests(await createClient(), auditId, ids, createServiceClient, (e) =>
    inngest.send(e),
  );
  refresh();
  revalidatePath(`/app/audit/${auditId}/plan`);
  return r;
}
