"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { queryDeps, startDeps } from "./deps";
import {
  launchJourney,
  saveCorrections,
  startFromUrl,
  type LaunchState,
  type StartState,
} from "./service";

export async function startFromUrlAction(
  _prev: StartState,
  formData: FormData,
): Promise<StartState> {
  const raw = typeof formData.get("url") === "string" ? (formData.get("url") as string) : "";
  const result = await startFromUrl(await createClient(), raw, startDeps);
  if (result.status === "ok" && result.siteId) {
    revalidatePath("/app/site");
    redirect(result.auditId ? `/app/audit/${result.auditId}` : `/app/demarrer/${result.siteId}`);
  }
  return result;
}

export async function launchJourneyAction(
  siteId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const result = await launchJourney(
    await createClient(),
    siteId,
    formData,
    createServiceClient,
    (e) => inngest.send(e),
    queryDeps,
  );
  revalidatePath("/app/audit");
  if (result.status === "ok" && result.auditId) redirect(`/app/audit/${result.auditId}`);
  return result;
}

export async function saveCorrectionsAction(
  siteId: string,
  _prev: LaunchState,
  formData: FormData,
): Promise<LaunchState> {
  const result = await saveCorrections(await createClient(), siteId, formData);
  if (result.status === "ok") revalidatePath(`/app/demarrer/${siteId}`);
  return result;
}
