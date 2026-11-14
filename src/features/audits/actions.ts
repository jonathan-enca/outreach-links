"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { confirmAudit, createAudit, type AuditActionState } from "./service";

export async function createAuditAction(siteId: string): Promise<AuditActionState> {
  const result = await createAudit(await createClient(), siteId, createServiceClient);
  if (result.status === "ok" && result.auditId) {
    revalidatePath("/app/audit");
    redirect(`/app/audit/${result.auditId}`);
  }
  return result;
}

export async function confirmAuditAction(auditId: string): Promise<AuditActionState> {
  const result = await confirmAudit(await createClient(), auditId, createServiceClient, (e) =>
    inngest.send(e),
  );
  revalidatePath(`/app/audit/${auditId}`);
  revalidatePath("/app/audit");
  return result;
}
