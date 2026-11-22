import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { siteHref } from "@/features/shell/next-step";
import { analysisEmail } from "@/features/notifications/emails";
import { renderNotification } from "@/features/notifications/template";
import { notificationSecret, oneClickPath, unsubscribePath } from "@/features/notifications/secret";
import { unsubscribeToken } from "@/features/notifications/unsubscribe";
import { isEnabled } from "@/features/settings/notifications";

type Client = SupabaseClient<Database>;

export interface ReadyEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

/** Expéditeur affiché « <nom du produit> <noreply@…> » quand le réglage ne donne que l'adresse (pur, testé). */
export function senderWithName(from: string, name: string): string {
  return from.includes("<") ? from : `${name} <${from.trim()}>`;
}

/**
 * L'email « votre analyse est prête » (pur, testé), sur le gabarit commun des notifications.
 * Aucun montant, aucune mention d'IA. `unsubscribeUrl` : lien pour couper ce type d'email.
 */
export function buildReadyEmail(input: {
  to: string;
  domain: string;
  shortlist: number;
  /** Sites étudiés pendant l'analyse ; absent ou inférieur à la liste courte : non affiché. */
  studied?: number;
  url: string;
  appUrl?: string;
  unsubscribeUrl?: string | null;
  oneClickUrl?: string | null;
}): ReadyEmail {
  const rendered = renderNotification(
    analysisEmail(
      { domain: input.domain, kept: input.shortlist, studied: input.studied ?? 0 },
      input.url,
    ),
    {
      appUrl: input.appUrl ?? input.url,
      unsubscribeUrl: input.unsubscribeUrl ?? null,
      oneClickUrl: input.oneClickUrl ?? null,
    },
  );
  return { to: input.to, ...rendered };
}

export type SendTransactional = (email: ReadyEmail) => Promise<void>;

/**
 * Nom de l'erreur renvoyé par Resend (« missing_api_key », « restricted_api_key », « validation_error »...),
 * pour savoir quoi corriger sans deviner (essai du 17/11 : « Resend 401 » seul ne disait pas si la clé
 * était absente, révoquée ou restreinte). Jamais le message complet : il peut contenir une adresse.
 */
export async function resendErrorName(res: { text: () => Promise<string> }): Promise<string> {
  try {
    const body = JSON.parse(await res.text()) as { name?: unknown };
    return typeof body.name === "string" && /^[a-z_]{3,60}$/.test(body.name) ? ` ${body.name}` : "";
  } catch {
    return "";
  }
}

/** Resend (emails transactionnels uniquement, jamais d'outreach). Sans clé : null, rien n'est envoyé. */
export function resendSender(): SendTransactional | null {
  const key = env.RESEND_API_KEY;
  if (!key) return null;
  return async (email) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: senderWithName(env.TRANSACTIONAL_FROM, t.app.name),
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        ...(email.headers ? { headers: email.headers } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}${await resendErrorName(res)}`);
  };
}

export type NotifyResult = "envoye" | "sans_service" | "sans_adresse" | "echec" | "deja" | "coupe";

/**
 * D7 : prévient la personne que ses cibles sont prêtes. Jamais bloquant : sans service d'email,
 * sans adresse ou en cas d'échec, l'analyse reste terminée et l'écran suffit. Une seule fois par
 * analyse (événement `analysis.email_sent`).
 */
export async function notifyAnalysisReady(
  service: Client,
  run: { auditId: string; workspaceId: string; siteId: string; domain: string; actorId: string },
  shortlist: number,
  send: SendTransactional | null = resendSender(),
  studied = 0,
): Promise<NotifyResult> {
  try {
    if (!send) return "sans_service";
    const { data: prior } = await service
      .from("events")
      .select("id")
      .eq("workspace_id", run.workspaceId)
      .eq("type", "analysis.email_sent")
      .contains("payload", { audit_id: run.auditId })
      .limit(1);
    if (prior?.length) return "deja";
    if (!(await isEnabled(service, run.workspaceId, "analysis_ready"))) return "coupe";
    const { data: user } = await service.auth.admin.getUserById(run.actorId);
    const to = user.user?.email;
    if (!to) return "sans_adresse";
    const secret = notificationSecret();
    const token = secret ? unsubscribeToken(run.workspaceId, "analysis_ready", secret) : null;
    await send(
      buildReadyEmail({
        to,
        domain: run.domain,
        shortlist,
        studied,
        url: new URL(siteHref.cibles(run.siteId), env.NEXT_PUBLIC_APP_URL).toString(),
        appUrl: env.NEXT_PUBLIC_APP_URL,
        unsubscribeUrl: token
          ? new URL(unsubscribePath(token), env.NEXT_PUBLIC_APP_URL).toString()
          : null,
        oneClickUrl: token
          ? new URL(oneClickPath(token), env.NEXT_PUBLIC_APP_URL).toString()
          : null,
      }),
    );
    // L'adresse n'est pas écrite dans le journal : seul l'audit est lié à l'événement.
    await service.from("events").insert({
      workspace_id: run.workspaceId,
      actor_id: null,
      type: "analysis.email_sent",
      payload: { audit_id: run.auditId, shortlist },
    });
    return "envoye";
  } catch (e) {
    const message = (e as Error).message;
    logger.warn("email de fin d'analyse non envoyé", { auditId: run.auditId, error: message });
    // Trace durable de la cause (sans adresse) : essai du 17/11, « echec » sans aucun indice.
    try {
      await service.from("events").insert({
        workspace_id: run.workspaceId,
        actor_id: null,
        type: "analysis.email_error",
        payload: { audit_id: run.auditId, error: message.slice(0, 200) },
      });
    } catch {
      // jamais bloquant
    }
    return "echec";
  }
}
