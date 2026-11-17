"use server";

import { revalidatePath } from "next/cache";
import type { AuditActionState } from "@/features/audits/service";
import { saveMessageSettings } from "@/features/targets/service";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { setPref } from "./notifications";
import { saveOfferedAsset } from "./messages";

export async function setPrefAction(key: string, on: boolean): Promise<AuditActionState> {
  const r = await setPref(await createClient(), createServiceClient, key, on);
  revalidatePath("/app/reglages/notifications");
  return r;
}

/** « Vos messages » : prénom de signature, rôle et ce que vous offrez, pour un site. */
export async function saveMessagesAction(
  siteId: string,
  _prev: AuditActionState,
  formData: FormData,
): Promise<AuditActionState> {
  const supabase = await createClient();
  const { data: audit } = await supabase
    .from("audits")
    .select("id")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const offer = await saveOfferedAsset(supabase, siteId, formData.get("offer"));
  if (offer.status === "error") return offer;
  if (!audit) return offer;
  const r = await saveMessageSettings(
    supabase,
    audit.id,
    formData.get("role"),
    formData.get("firstName"),
  );
  revalidatePath("/app", "layout");
  return r;
}
