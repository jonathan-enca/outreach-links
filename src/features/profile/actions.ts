"use server";

import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { startProfile } from "./service";

export async function startProfileAction(auditId: string): Promise<AuditActionState> {
  const result = await startProfile(await createClient(), auditId, createServiceClient, (e) =>
    inngest.send(e),
  );
  revalidatePath(`/app/audit/${auditId}`);
  return result;
}
