import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { siteHref } from "@/features/shell/next-step";

type Client = SupabaseClient<Database>;
const E = t.analysis.email;

export interface ReadyEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Le texte de l'email « vos cibles sont prêtes » (pur, testé). Aucun montant, aucune mention d'IA. */
export function buildReadyEmail(input: {
  to: string;
  domain: string;
  shortlist: number;
  url: string;
}): ReadyEmail {
  const body = E.body(input.domain, input.shortlist);
  return {
    to: input.to,
    subject: E.subject(input.domain, input.shortlist),
    text: `${body}\n\n${E.cta} : ${input.url}\n\n${E.footer}`,
    html: `<p>${esc(body)}</p><p><a href="${esc(input.url)}">${esc(E.cta)}</a></p><p style="color:#6b7280;font-size:13px">${esc(E.footer)}</p>`,
  };
}

export type SendTransactional = (email: ReadyEmail) => Promise<void>;

/** Resend (emails transactionnels uniquement, jamais d'outreach). Sans clé : null, rien n'est envoyé. */
export function resendSender(): SendTransactional | null {
  const key = env.RESEND_API_KEY;
  if (!key) return null;
  return async (email) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.TRANSACTIONAL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  };
}

export type NotifyResult = "envoye" | "sans_service" | "sans_adresse" | "echec" | "deja";

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
    const { data: user } = await service.auth.admin.getUserById(run.actorId);
    const to = user.user?.email;
    if (!to) return "sans_adresse";
    await send(
      buildReadyEmail({
        to,
        domain: run.domain,
        shortlist,
        url: new URL(siteHref.cibles(run.siteId), env.NEXT_PUBLIC_APP_URL).toString(),
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
    logger.warn("email de fin d'analyse non envoyé", {
      auditId: run.auditId,
      error: (e as Error).message,
    });
    return "echec";
  }
}
