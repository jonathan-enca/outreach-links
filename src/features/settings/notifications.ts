import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { resendSender, type SendTransactional } from "@/features/analysis/notify";
import type { AuditActionState } from "@/features/audits/service";
import { logger } from "@/lib/logger";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import {
  NOTIFICATION_KEYS,
  type NotificationKey,
  type NotificationPrefs,
} from "./notification-keys";

type Client = SupabaseClient<Database>;
const N = t.notifications;

const DEFAULTS: NotificationPrefs = {
  reply_waiting: true,
  to_validate: true,
  links: true,
  mailbox: true,
  new_sites: true,
  weekly: true,
};

const isKey = (v: unknown): v is NotificationKey =>
  typeof v === "string" && (NOTIFICATION_KEYS as readonly string[]).includes(v);

/** Réglages de l'espace de la personne (tout activé tant qu'elle n'a rien changé). */
export async function loadPrefs(
  supabase: Client,
): Promise<{ workspaceId: string | null; prefs: NotificationPrefs }> {
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!ws) return { workspaceId: null, prefs: DEFAULTS };
  const { data } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("workspace_id", ws.id)
    .maybeSingle();
  if (!data) return { workspaceId: ws.id, prefs: DEFAULTS };
  const prefs = { ...DEFAULTS };
  for (const k of NOTIFICATION_KEYS) prefs[k] = data[k];
  return { workspaceId: ws.id, prefs };
}

/** Active ou coupe une notification (enregistré tout de suite). */
export async function setPref(
  supabase: Client,
  getServiceClient: () => Client,
  key: unknown,
  on: boolean,
): Promise<AuditActionState> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: N.messages.unauthenticated };
  if (!isKey(key)) return { status: "error", message: N.messages.saveError };
  const { workspaceId } = await loadPrefs(supabase);
  if (!workspaceId) return { status: "error", message: N.messages.saveError };
  const { error } = await getServiceClient()
    .from("notification_prefs")
    .upsert(
      {
        workspace_id: workspaceId,
        [key]: on,
        updated_by: auth.user.id,
        updated_at: new Date().toISOString(),
      } as Database["public"]["Tables"]["notification_prefs"]["Insert"],
      { onConflict: "workspace_id" },
    );
  return error ? { status: "error", message: N.messages.saveError } : { status: "ok" };
}

/** Réponses à signaler, par espace : celles qui n'ont pas encore fait l'objet d'un email (pur, testé). */
export function repliesToNotify(
  drafts: readonly { id: string; workspace_id: string }[],
  alreadyNotified: ReadonlySet<string>,
  disabled: ReadonlySet<string>,
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const d of drafts) {
    if (alreadyNotified.has(d.id) || disabled.has(d.workspace_id)) continue;
    out.set(d.workspace_id, [...(out.get(d.workspace_id) ?? []), d.id]);
  }
  return out;
}

/**
 * « Une réponse vous attend » : un email par espace quand de nouvelles réponses proposées attendent
 * l'accord de la personne. Jamais deux fois pour la même réponse (trace dans `events`, sans adresse).
 * Emails transactionnels seulement (Resend) ; sans service d'email, rien ne part et rien n'est marqué.
 */
export async function notifyRepliesTick(
  db: Client,
  send: SendTransactional | null = resendSender(),
  now: Date = new Date(),
): Promise<{ sent: number; skipped: string | null }> {
  if (!send) return { sent: 0, skipped: "sans_service" };
  const since = new Date(now.getTime() - 48 * 3_600_000).toISOString();
  const [{ data: drafts }, { data: events }, { data: prefs }] = await Promise.all([
    db
      .from("reply_drafts")
      .select("id, workspace_id")
      .eq("status", "brouillon")
      .eq("kind", "reponse")
      .gte("created_at", since)
      .limit(500),
    db
      .from("events")
      .select("payload")
      .eq("type", "notify.reply_waiting")
      .gte("created_at", since)
      .limit(1000),
    db.from("notification_prefs").select("workspace_id").eq("reply_waiting", false),
  ]);
  const notified = new Set(
    (events ?? []).flatMap((e) => {
      const ids = (e.payload as { reply_draft_ids?: unknown } | null)?.reply_draft_ids;
      return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
    }),
  );
  const groups = repliesToNotify(
    drafts ?? [],
    notified,
    new Set((prefs ?? []).map((p) => p.workspace_id)),
  );
  let sent = 0;
  for (const [workspaceId, ids] of groups) {
    try {
      const { data: members } = await db
        .from("memberships")
        .select("user_id, role")
        .eq("workspace_id", workspaceId);
      const owner = (members ?? []).find((m) => m.role === "owner") ?? members?.[0];
      if (!owner) continue;
      const { data: user } = await db.auth.admin.getUserById(owner.user_id);
      const to = user.user?.email;
      if (!to) continue;
      const url = new URL("/app/a-valider", env.NEXT_PUBLIC_APP_URL).toString();
      const body = N.email.body(ids.length);
      const esc = (s: string) =>
        s
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      await send({
        to,
        subject: N.email.subject(ids.length),
        text: `${body}\n\n${N.email.cta} : ${url}\n\n${N.email.footer}`,
        html: `<p>${esc(body)}</p><p><a href="${esc(url)}">${esc(N.email.cta)}</a></p><p style="color:#6b7280;font-size:13px">${esc(N.email.footer)}</p>`,
      });
      await db.from("events").insert({
        workspace_id: workspaceId,
        actor_id: null,
        type: "notify.reply_waiting",
        payload: { reply_draft_ids: ids },
      });
      sent++;
    } catch (e) {
      logger.warn("notification de réponse non envoyée", {
        workspaceId,
        error: (e as Error).message,
      });
    }
  }
  return { sent, skipped: null };
}
