"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env, requireEnv } from "@/env";
import { inngest } from "@/inngest/client";
import { t } from "@/lib/messages";
import { createServiceClient } from "@/lib/supabase/service";
import { requesterIp } from "./guard";
import { captureEmail, startPublicAudit } from "./service";
import { reportCookieName } from "./cookie";

export interface PublicActionState {
  status: "idle" | "error";
  message?: string;
}

const unavailable: PublicActionState = {
  status: "error",
  message: t.publicAudit.errors.file_indisponible,
};

async function guardDeps() {
  const salt = env.ABUSE_HASH_SALT ?? requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return { service: createServiceClient(), salt, ip: requesterIp(await headers()) };
}

/** Formulaire public : domaine (+ requêtes facultatives) -> redirection vers la page du rapport. */
export async function startPublicAuditAction(
  _prev: PublicActionState,
  formData: FormData,
): Promise<PublicActionState> {
  let id: string;
  try {
    const result = await startPublicAudit(
      {
        ...(await guardDeps()),
        sendEvent: (e) => inngest.send(e),
        enabled: env.PUBLIC_AUDIT_ENABLED,
        dailyCapUsd: env.PUBLIC_AUDIT_DAILY_CAP_USD,
      },
      {
        domain: String(formData.get("domain") ?? ""),
        queries: ["q1", "q2", "q3"].map((k) => String(formData.get(k) ?? "")),
        niche: String(formData.get("niche") ?? ""),
        honeypot: String(formData.get("site_web") ?? ""),
      },
    );
    if (result.status === "error") return { status: "error", message: result.message };
    id = result.id;
  } catch {
    // Variable d'environnement absente (clé service) : service indisponible, jamais d'erreur brute.
    return unavailable;
  }
  redirect(`/audit-gratuit/${id}`);
}

/** Email demandé pour le rapport complet : le jeton d'accès va dans un cookie httpOnly. */
export async function unlockReportAction(
  auditId: string,
  _prev: PublicActionState,
  formData: FormData,
): Promise<PublicActionState> {
  try {
    const result = await captureEmail(await guardDeps(), {
      auditId,
      email: String(formData.get("email") ?? ""),
      consent: formData.get("consent") === "on",
    });
    if (result.status === "error") return { status: "error", message: result.message };
    (await cookies()).set(reportCookieName(auditId), result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: `/audit-gratuit/${auditId}`,
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch {
    return unavailable;
  }
  redirect(`/audit-gratuit/${auditId}`);
}
