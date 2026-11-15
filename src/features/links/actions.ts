"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { declareLink } from "./declare";

export async function declareLinkAction(
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await declareLink(await createClient(), createServiceClient, {
    siteId: formData.get("site_id"),
    sourceUrl: formData.get("source_url"),
    targetUrl: formData.get("target_url"),
    anchor: formData.get("anchor"),
  });
  revalidatePath("/app/liens");
  return r;
}
