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

/**
 * Mise en page HTML de l'email « vos cibles sont prêtes » : même design que les emails d'authentification
 * (scripts/email-templates/build.mjs). Styles en ligne, tableaux, texte échappé.
 */
function readyHtml(p: { body: string; url: string; cta: string; footer: string }): string {
  const font = "Inter, Helvetica, Arial, sans-serif";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="margin:0;padding:0;background:#f1f5f9"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e8ef;border-radius:16px"><tr><td style="padding:28px 32px 0 32px;font:700 22px/1 ${font};letter-spacing:-0.02em;color:#0b1f44">${esc(t.app.name)}<span style="color:#0b3a78">.</span></td></tr><tr><td style="padding:24px 32px 0 32px;font:400 16px/1.6 ${font};color:#0e1a2b">${esc(p.body)}</td></tr><tr><td style="padding:24px 32px 0 32px"><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td align="center" style="border-radius:10px;background:#0f766e"><a href="${esc(p.url)}" style="display:inline-block;padding:14px 26px;font:600 16px/1 ${font};color:#ffffff;text-decoration:none;border-radius:10px">${esc(p.cta)}</a></td></tr></table></td></tr><tr><td style="padding:28px 32px 28px 32px;font:400 13px/1.6 ${font};color:#5b6678"><hr style="border:0;border-top:1px solid #e3e8ef;margin:0 0 16px 0" />${esc(p.footer)}</td></tr></table></td></tr></table></body></html>`;
}

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
    html: readyHtml({ body, url: input.url, cta: E.cta, footer: E.footer }),
  };
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
        from: env.TRANSACTIONAL_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}${await resendErrorName(res)}`);
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
