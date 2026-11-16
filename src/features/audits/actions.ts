"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inngest } from "@/inngest/client";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { siteHref } from "@/features/shell/next-step";
import { relaunchStalled, restartFromStep } from "@/features/analysis/restart";
import { confirmAudit, createAudit, type AuditActionState } from "./service";

export async function createAuditAction(siteId: string): Promise<AuditActionState> {
  const result = await createAudit(await createClient(), siteId, createServiceClient);
  if (result.status === "ok" && result.auditId) {
    revalidatePath("/app", "layout");
    redirect(siteHref.analyse(siteId));
  }
  return result;
}

export async function confirmAuditAction(auditId: string): Promise<AuditActionState> {
  const result = await confirmAudit(await createClient(), auditId, createServiceClient, (e) =>
    inngest.send(e),
  );
  revalidatePath("/app", "layout");
  return result;
}

/** La personne connectée peut-elle agir sur cet audit ? (RLS : seuls les membres de l'espace le voient.) */
async function authorizedActor(auditId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from("audits").select("id").eq("id", auditId).maybeSingle();
  return data ? auth.user.id : null;
}

/** « Reprendre à partir d'ici » : remet l'étape et les suivantes à zéro, puis relance l'analyse. */
export async function restartFromStepAction(
  auditId: string,
  stepKey: string,
): Promise<AuditActionState> {
  const actor = await authorizedActor(auditId);
  const result = await restartFromStep(
    createServiceClient(),
    auditId,
    stepKey,
    (e) => inngest.send(e),
    actor,
  );
  revalidatePath("/app", "layout");
  return result;
}

/** Démarrage bloqué : relance l'événement de l'analyse avec un nouveau jeton. */
export async function relaunchStalledAction(auditId: string): Promise<AuditActionState> {
  const actor = await authorizedActor(auditId);
  const result = await relaunchStalled(
    createServiceClient(),
    auditId,
    (e) => inngest.send(e),
    actor,
  );
  revalidatePath("/app", "layout");
  return result;
}
