"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { siteHref } from "@/features/shell/next-step";
import { queryDeps, startDeps } from "./deps";
import {
  launchJourney,
  readMarket,
  saveCorrections,
  startFromUrl,
  understandSite,
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
    revalidatePath("/app", "layout");
    redirect(result.auditId ? siteHref.analyse(result.siteId) : siteHref.relecture(result.siteId));
  }
  return result;
}

/**
 * Étape 1, phase 1 (chantier B) : crée la campagne (site × pays) et lit l'accueil dans la langue
 * choisie. Ne redirige pas : l'écran coche « page d'accueil lue », puis lance la phase 2.
 */
export async function startSiteAction(formData: FormData): Promise<StartState> {
  const raw = typeof formData.get("url") === "string" ? (formData.get("url") as string) : "";
  const result = await startFromUrl(await createClient(), raw, startDeps, readMarket(formData), {
    profile: false,
  });
  if (result.status === "ok") revalidatePath("/app", "layout");
  return result;
}

/** Étape 1, phase 2 : plan du site, pages et profil de marque dans la langue de la campagne. */
export async function understandSiteAction(siteId: string): Promise<StartState> {
  const result = await understandSite(await createClient(), siteId, startDeps);
  if (result.status === "ok") revalidatePath("/app", "layout");
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
  revalidatePath("/app", "layout");
  if (result.status === "ok" && result.auditId) redirect(siteHref.analyse(siteId));
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
