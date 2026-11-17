"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createSite, updateSite, type SiteFormState } from "./service";

export async function createSiteAction(
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  const result = await createSite(await createClient(), formData);
  if (result.status === "saved" && result.siteId) {
    revalidatePath("/app/site");
    redirect(`/app/site/${result.siteId}`);
  }
  return result;
}

export async function updateSiteAction(
  siteId: string,
  _prev: SiteFormState,
  formData: FormData,
): Promise<SiteFormState> {
  const result = await updateSite(await createClient(), siteId, formData);
  if (result.status === "saved") revalidatePath(`/app/site/${siteId}`);
  return result;
}
