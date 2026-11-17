import type { SupabaseClient } from "@supabase/supabase-js";
import { env as appEnv } from "@/env";
import { t } from "@/lib/messages";
import type { Database, Json } from "@/lib/supabase/database.types";
import { decryptSecret, encryptSecret, parseKeyRing, type KeyRing } from "./crypto";
import { checkDomainHealth, type HealthReport } from "./health";
import { formatSendTime } from "@/features/sending/queue-note";
import { nextSendStart } from "@/features/sending/schedule";
import { mailboxSchema, scheduleSchema } from "./schema";
import { sendSmtp, verifyImap, verifySmtp, type TransportOptions } from "./transport";

type Client = SupabaseClient<Database>;
const M = t.mailboxes.messages;

export interface MailboxState {
  status: "idle" | "ok" | "error";
  message?: string;
}

export interface MailboxDeps {
  getServiceClient: () => Client;
  /** Anneau de clés ; lève une EnvError claire si la variable manque. */
  keyRing: () => KeyRing;
  /** Vrai seulement si EMAIL_DRY_RUN est faux ET OUTREACH_SENDING_ENABLED est vrai. */
  realSendingAllowed: () => boolean;
  transport: {
    verifySmtp: typeof verifySmtp;
    verifyImap: typeof verifyImap;
    sendSmtp: typeof sendSmtp;
  };
  health: (email: string) => Promise<HealthReport>;
  transportOptions?: TransportOptions;
}

export function defaultMailboxDeps(
  getServiceClient: () => Client,
  env: Pick<
    typeof appEnv,
    "EMAIL_DRY_RUN" | "OUTREACH_SENDING_ENABLED" | "MAILBOX_ENCRYPTION_KEYS"
  > = appEnv,
): MailboxDeps {
  return {
    getServiceClient,
    keyRing: () => parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS),
    realSendingAllowed: () => !env.EMAIL_DRY_RUN && env.OUTREACH_SENDING_ENABLED,
    transport: { verifySmtp, verifyImap, sendSmtp },
    health: (email) => checkDomainHealth(email),
  };
}

async function user(supabase: Client) {
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

export async function connectMailbox(
  supabase: Client,
  siteId: string,
  formData: FormData,
  deps: MailboxDeps,
): Promise<MailboxState> {
  const u = await user(supabase);
  if (!u) return { status: "error", message: M.unauthenticated };
  const parsed = mailboxSchema.safeParse({
    email: formData.get("email"),
    fromName: formData.get("fromName"),
    username: formData.get("username"),
    password: formData.get("password"),
    smtpHost: formData.get("smtpHost"),
    smtpPort: formData.get("smtpPort"),
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort"),
  });
  if (!parsed.success) return { status: "error", message: M.invalid };
  const input = parsed.data;

  // RLS : l'utilisateur doit voir le site.
  const { data: site } = await supabase
    .from("sites")
    .select("id, workspace_id")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return { status: "error", message: M.siteNotFound };

  let enc: { value: string; version: string };
  try {
    enc = encryptSecret(input.password, deps.keyRing());
  } catch {
    return { status: "error", message: M.noKey };
  }
  const { error } = await deps.getServiceClient().from("mailboxes").insert({
    workspace_id: site.workspace_id,
    site_id: site.id,
    email: input.email,
    from_name: input.fromName,
    username: input.username,
    password_enc: enc.value,
    key_version: enc.version,
    smtp_host: input.smtpHost,
    smtp_port: input.smtpPort,
    imap_host: input.imapHost,
    imap_port: input.imapPort,
    created_by: u.id,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? M.duplicate : M.saveError,
    };
  }
  await supabase.from("events").insert({
    workspace_id: site.workspace_id,
    actor_id: u.id,
    type: "mailbox.connected",
    payload: { site_id: site.id, email: input.email },
  });
  return { status: "ok", message: M.saved };
}

/**
 * Teste la boîte : SMTP (connexion + authentification), IMAP (connexion + authentification),
 * santé DNS du domaine. N'envoie un message qu'à l'adresse de l'utilisateur connecté, et
 * seulement si l'envoi réel est autorisé (jamais en simulation).
 */
export async function testMailbox(
  supabase: Client,
  mailboxId: string,
  deps: MailboxDeps,
): Promise<MailboxState> {
  const u = await user(supabase);
  if (!u) return { status: "error", message: M.unauthenticated };
  // RLS : seul un membre voit la boîte.
  const { data: visible } = await supabase
    .from("mailboxes")
    .select("id, workspace_id")
    .eq("id", mailboxId)
    .maybeSingle();
  if (!visible) return { status: "error", message: M.notFound };

  const service = deps.getServiceClient();
  const { data: box } = await service.from("mailboxes").select("*").eq("id", mailboxId).single();
  if (!box) return { status: "error", message: M.notFound };

  let password: string;
  try {
    password = decryptSecret(box.password_enc, deps.keyRing());
  } catch {
    return { status: "error", message: M.unreadable };
  }
  const cred = { username: box.username, password };
  const opts = deps.transportOptions;
  const [smtp, imap, health] = await Promise.all([
    deps.transport.verifySmtp({ host: box.smtp_host, port: box.smtp_port }, cred, opts),
    deps.transport.verifyImap({ host: box.imap_host, port: box.imap_port }, cred, opts),
    deps.health(box.email).catch(() => null),
  ]);

  let sent = false;
  let detail = [smtp, imap].flatMap((r) => (r.ok ? [] : [r.error])).join(" · ");
  if (smtp.ok && imap.ok && deps.realSendingAllowed() && u.email) {
    const r = await deps.transport.sendSmtp(
      { host: box.smtp_host, port: box.smtp_port },
      cred,
      {
        from: { name: box.from_name, address: box.email },
        to: u.email, // jamais un tiers
        subject: "Test de votre boîte d'envoi",
        text: "Ce message confirme que votre boîte est bien connectée. Vous pouvez l'ignorer.",
      },
      opts,
    );
    if (r.ok) sent = true;
    else detail = r.error;
  }
  const ok = smtp.ok && imap.ok && (!deps.realSendingAllowed() || !u.email || sent);
  await service
    .from("mailboxes")
    .update({
      status: ok ? "verifiee" : "erreur",
      smtp_ok: smtp.ok,
      imap_ok: imap.ok,
      last_test_at: new Date().toISOString(),
      last_error: ok ? null : detail.slice(0, 300) || "échec",
      health: (health as unknown as Json) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mailboxId);
  await supabase.from("events").insert({
    workspace_id: visible.workspace_id,
    actor_id: u.id,
    type: "mailbox.tested",
    payload: { mailbox_id: mailboxId, ok, smtp: smtp.ok, imap: imap.ok, sent },
  });
  if (!ok) return { status: "error", message: M.testFail.replace("{detail}", detail || "échec") };
  return {
    status: "ok",
    message: sent ? M.testOkSent : deps.realSendingAllowed() ? M.testOk : M.testOkDryRun,
  };
}

/**
 * Enregistre les jours et heures d'envoi d'une boîte. La personne doit voir la boîte (RLS) ; l'écriture
 * passe par le serveur, comme tout le reste de la table.
 */
export async function updateSendSchedule(
  supabase: Client,
  mailboxId: string,
  formData: FormData,
  deps: Pick<MailboxDeps, "getServiceClient">,
  now: Date = new Date(),
): Promise<MailboxState> {
  const u = await user(supabase);
  if (!u) return { status: "error", message: M.unauthenticated };
  // « 24 h sur 24 » : un seul geste pour couvrir toute la journée (de 0 h à 24 h).
  const allDay = formData.get("allDay") !== null;
  const parsed = scheduleSchema.safeParse({
    days: formData.getAll("days"),
    startHour: allDay ? 0 : formData.get("startHour"),
    endHour: allDay ? 24 : formData.get("endHour"),
  });
  if (!parsed.success) return { status: "error", message: M.scheduleInvalid };
  const { data: visible } = await supabase
    .from("mailboxes")
    .select("id, workspace_id, timezone")
    .eq("id", mailboxId)
    .maybeSingle();
  if (!visible) return { status: "error", message: M.notFound };
  const { error } = await deps
    .getServiceClient()
    .from("mailboxes")
    .update({
      send_days: parsed.data.days,
      send_window_start: parsed.data.startHour,
      send_window_end: parsed.data.endHour,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mailboxId);
  if (error) return { status: "error", message: M.saveError };
  await supabase.from("events").insert({
    workspace_id: visible.workspace_id,
    actor_id: u.id,
    type: "mailbox.schedule_updated",
    payload: { mailbox_id: mailboxId, ...parsed.data },
  });
  // On dit tout de suite ce que ces horaires changent : ouverts maintenant, ou prochaine ouverture.
  const window = {
    timezone: visible.timezone,
    startHour: parsed.data.startHour,
    endHour: parsed.data.endHour,
    days: parsed.data.days,
  };
  const next = nextSendStart(now, window);
  return {
    status: "ok",
    message: `${M.scheduleSaved} ${next ? M.scheduleNext(formatSendTime(next, window.timezone, true)) : M.scheduleOpenNow}`,
  };
}

export async function removeMailbox(
  supabase: Client,
  mailboxId: string,
  deps: Pick<MailboxDeps, "getServiceClient">,
): Promise<MailboxState> {
  const u = await user(supabase);
  if (!u) return { status: "error", message: M.unauthenticated };
  const { data: visible } = await supabase
    .from("mailboxes")
    .select("id, workspace_id")
    .eq("id", mailboxId)
    .maybeSingle();
  if (!visible) return { status: "error", message: M.notFound };
  const { error } = await deps.getServiceClient().from("mailboxes").delete().eq("id", mailboxId);
  if (error) return { status: "error", message: M.saveError };
  await supabase.from("events").insert({
    workspace_id: visible.workspace_id,
    actor_id: u.id,
    type: "mailbox.removed",
    payload: { mailbox_id: mailboxId },
  });
  return { status: "ok", message: M.removed };
}
