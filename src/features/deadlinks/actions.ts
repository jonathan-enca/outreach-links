"use server";

import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { startDeadlinks } from "./service";

export async function startDeadlinksAction(auditId: string): Promise<AuditActionState> {
  const result = await startDeadlinks(await createClient(), auditId, createServiceClient, (e) =>
    inngest.send(e),
  );
  revalidatePath(`/app/audit/${auditId}`);
  return result;
}
