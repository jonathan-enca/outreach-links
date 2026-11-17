"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { setPref } from "./notifications";
import { saveSignatureSettings } from "./messages";

export async function setPrefAction(key: string, on: boolean): Promise<AuditActionState> {
  const r = await setPref(await createClient(), createServiceClient, key, on);
  revalidatePath("/app/reglages/notifications");
  return r;
}

/** « Vos messages » : qui écrit, la signature et les contreparties acceptées, pour un site. */
export async function saveMessagesAction(
  siteId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const r = await saveSignatureSettings(
    await createClient(),
    createServiceClient,
    siteId,
    formData,
  );
  revalidatePath("/app", "layout");
  return r;
}
