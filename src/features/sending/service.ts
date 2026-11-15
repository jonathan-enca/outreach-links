import type { SupabaseClient } from "@supabase/supabase-js";
import { env as appEnv } from "@/env";
import { decryptSecret, parseKeyRing, type KeyRing } from "@/features/mailboxes/crypto";
import { sendOutreachMail, type TransportOptions } from "@/features/mailboxes/transport";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { SEND_LIMITS } from "./limits";
import { buildOutgoing, makeMessageId, makeUnsubscribeToken, unsubscribeSecrets } from "./message";
import { addDays, effectiveDailyCap, isInSendWindow } from "./schedule";

type Client = SupabaseClient<Database>;
type MailboxRow = Database["public"]["Tables"]["mailboxes"]["Row"] & {
  password_enc: string;
  key_version: string;
};

export interface SendDeps {
  getServiceClient: () => Client;
  now: () => Date;
  /** Vrai seulement si EMAIL_DRY_RUN est faux ET OUTREACH_SENDING_ENABLED est vrai. */
  realSendingAllowed: () => boolean;
  keyRing: () => KeyRing;
  send: typeof sendOutreachMail;
  appUrl: string;
  transportOptions?: TransportOptions;
}

export function defaultSendDeps(
  getServiceClient: () => Client,
  env: Pick<
    typeof appEnv,
    "EMAIL_DRY_RUN" | "OUTREACH_SENDING_ENABLED" | "MAILBOX_ENCRYPTION_KEYS" | "NEXT_PUBLIC_APP_URL"
  > = appEnv,
): SendDeps {
  return {
    getServiceClient,
    now: () => new Date(),
    realSendingAllowed: () => !env.EMAIL_DRY_RUN && env.OUTREACH_SENDING_ENABLED,
    keyRing: () => parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS),
    send: sendOutreachMail,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };
}

export type MailboxOutcome =
  | { mailboxId: string; result: "hors_fenetre" | "plafond" | "rien_a_envoyer" }
  | {
      mailboxId: string;
      result: "simule" | "envoye" | "echec" | "a_reessayer" | "ignore";
      draftId: string;
    };

const COUNTED = ["en_cours", "envoye", "simule", "a_reessayer", "echec"];

/** Un passage du moteur : au plus UN message par boîte (le cron espace les passages). */
export async function runSendTick(deps: SendDeps): Promise<MailboxOutcome[]> {
  const db = deps.getServiceClient();
  const { data: boxes, error } = await db.from("mailboxes").select("*").eq("status", "verifiee");
  if (error) throw new Error(error.message);
  const out: MailboxOutcome[] = [];
  for (const box of (boxes ?? []) as unknown as MailboxRow[]) {
    try {
      out.push(await sendNext(db, box, deps));
    } catch (e) {
      logger.error("envoi : échec inattendu", {
        mailboxId: box.id,
        error: String(e).slice(0, 200),
      });
    }
  }
  return out;
}

async function sendNext(db: Client, box: MailboxRow, deps: SendDeps): Promise<MailboxOutcome> {
  const now = deps.now();
  const dry = !deps.realSendingAllowed();
  const base = { mailboxId: box.id };

  if (
    !isInSendWindow(now, {
      timezone: box.timezone,
      startHour: box.send_window_start,
      endHour: box.send_window_end,
    })
  ) {
    return { ...base, result: "hors_fenetre" };
  }

  // Capacité restante : plafond horaire, plafond journalier avec échauffement.
  const { data: recent } = await db
    .from("sent_messages")
    .select("claimed_at, sent_at")
    .eq("mailbox_id", box.id)
    .eq("dry_run", dry)
    .in("status", COUNTED)
    .gte("claimed_at", addDays(now, -1).toISOString());
  const rows = recent ?? [];
  const hourAgo = now.getTime() - 3_600_000;
  const inHour = rows.filter((r) => new Date(r.claimed_at).getTime() > hourAgo).length;
  const { data: first } = await db
    .from("sent_messages")
    .select("claimed_at")
    .eq("mailbox_id", box.id)
    .eq("dry_run", dry)
    .in("status", COUNTED)
    .order("claimed_at", { ascending: true })
    .limit(1);
  const firstAt = first?.[0] ? new Date(first[0].claimed_at) : null;
  const hourly = Math.min(box.hourly_cap, SEND_LIMITS.hourlyMax);
  const daily = effectiveDailyCap(box.daily_cap, firstAt, now);
  if (inHour >= hourly || rows.length >= daily) return { ...base, result: "plafond" };

  // Candidats : brouillons email des lots VALIDÉS des plans de ce site, dans l'ordre.
  const { data: plans } = await db.from("link_plans").select("id").eq("site_id", box.site_id);
  const planIds = (plans ?? []).map((p) => p.id);
  if (planIds.length === 0) return { ...base, result: "rien_a_envoyer" };
  const { data: batches } = await db
    .from("batches")
    .select("id, number")
    .in("plan_id", planIds)
    .eq("status", "valide")
    .order("validated_at", { ascending: true });
  const batchOrder = new Map((batches ?? []).map((b, i) => [b.id, i]));
  if (batchOrder.size === 0) return { ...base, result: "rien_a_envoyer" };
  const { data: items } = await db
    .from("batch_items")
    .select("batch_id, draft_id, position")
    .in("batch_id", [...batchOrder.keys()]);
  const ordered = (items ?? []).sort(
    (a, b) => batchOrder.get(a.batch_id)! - batchOrder.get(b.batch_id)! || a.position - b.position,
  );
  if (ordered.length === 0) return { ...base, result: "rien_a_envoyer" };
  const { data: existing } = await db
    .from("sent_messages")
    .select("id, draft_id, status, attempts, next_attempt_at")
    .in(
      "draft_id",
      ordered.map((i) => i.draft_id),
    )
    .eq("step", "initial")
    .eq("dry_run", dry);
  const byDraft = new Map((existing ?? []).map((e) => [e.draft_id, e]));

  for (const item of ordered) {
    const prev = byDraft.get(item.draft_id);
    if (prev && !(prev.status === "a_reessayer" && new Date(prev.next_attempt_at ?? 0) <= now)) {
      continue;
    }
    const outcome = await attempt(db, box, item, prev ?? null, dry, now, deps);
    if (outcome) return { ...base, ...outcome };
  }
  return { ...base, result: "rien_a_envoyer" };
}

type Prev = { id: string; attempts: number } | null;

/** Tente l'envoi d'un brouillon ; null = candidat passé (déjà pris, ou refus de la base). */
async function attempt(
  db: Client,
  box: MailboxRow,
  item: { batch_id: string; draft_id: string },
  prev: Prev,
  dry: boolean,
  now: Date,
  deps: SendDeps,
): Promise<{
  result: "simule" | "envoye" | "echec" | "a_reessayer" | "ignore";
  draftId: string;
} | null> {
  const draftId = item.draft_id;
  const { data: draft } = await db
    .from("target_drafts")
    .select("id, plan_id, plan_item_id, channel, subject, body, status, workspace_id")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || draft.channel !== "email" || draft.status !== "valide" || !draft.subject) {
    return null;
  }
  const { data: contact } = await db
    .from("target_contacts")
    .select("email, sendable")
    .eq("plan_item_id", draft.plan_item_id)
    .maybeSingle();
  const to = contact?.email?.toLowerCase() ?? null;

  const base = {
    workspace_id: draft.workspace_id,
    plan_id: draft.plan_id,
    batch_id: item.batch_id,
    draft_id: draftId,
    mailbox_id: box.id,
    step: "initial",
    dry_run: dry,
    claimed_at: now.toISOString(),
    subject: draft.subject,
    body: draft.body,
  };
  const skip = async (reason: string) => {
    await db.from("sent_messages").insert({
      ...base,
      to_email: to ?? "inconnu@invalide.invalid",
      message_id: makeMessageId(box.email),
      status: "ignore",
      skip_reason: reason,
    });
    return { result: "ignore" as const, draftId };
  };
  if (!contact || !contact.sendable || !to) return skip("contact_non_envoyable");
  if (await isSuppressed(db, draft.workspace_id, to)) return skip("supprime");

  // Réservation (idempotente) : l'insertion échoue si un autre passage a déjà pris ce brouillon.
  const messageId = prev ? null : makeMessageId(box.email);
  let rowId: string;
  let attempts: number;
  if (prev) {
    const { data, error } = await db
      .from("sent_messages")
      .update({
        status: "en_cours",
        attempts: prev.attempts + 1,
        claimed_at: now.toISOString(),
        error: null,
      })
      .eq("id", prev.id)
      .eq("status", "a_reessayer")
      .select("id, message_id")
      .maybeSingle();
    if (error || !data) return null;
    rowId = data.id;
    attempts = prev.attempts + 1;
    return finish(db, box, draft, to, data.message_id, rowId, attempts, dry, now, deps);
  }
  const { data, error } = await db
    .from("sent_messages")
    .insert({ ...base, to_email: to, message_id: messageId!, status: "en_cours", attempts: 1 })
    .select("id")
    .single();
  if (error || !data) {
    // 23505 : déjà pris ; 23514 : refus d'un garde-fou de la base (plafond, suppression…).
    if (error?.code !== "23505") {
      logger.warn("envoi refusé par la base", { code: error?.code, message: error?.message });
    }
    return null;
  }
  rowId = data.id;
  return finish(db, box, draft, to, messageId!, rowId, 1, dry, now, deps);
}

async function isSuppressed(db: Client, workspaceId: string, email: string): Promise<boolean> {
  const domain = email.split("@")[1] ?? "";
  const [global, mine] = await Promise.all([
    db.from("suppressions").select("email, domain").is("workspace_id", null),
    db.from("suppressions").select("email, domain").eq("workspace_id", workspaceId),
  ]);
  return [...(global.data ?? []), ...(mine.data ?? [])].some(
    (s) =>
      (s.email && s.email.toLowerCase() === email) ||
      (s.domain &&
        (domain === s.domain.toLowerCase() || domain.endsWith(`.${s.domain.toLowerCase()}`))),
  );
}

async function finish(
  db: Client,
  box: MailboxRow,
  draft: { workspace_id: string; plan_id: string; subject: string | null; body: string },
  to: string,
  messageId: string,
  rowId: string,
  attempts: number,
  dry: boolean,
  now: Date,
  deps: SendDeps,
) {
  const draftId = (await db.from("sent_messages").select("draft_id").eq("id", rowId).single()).data!
    .draft_id;
  const log = async (type: string, extra: Record<string, unknown> = {}) => {
    await db.from("events").insert({
      workspace_id: draft.workspace_id,
      type,
      payload: { sent_message_id: rowId, mailbox_id: box.id, dry_run: dry, ...extra } as never,
    });
  };

  if (dry) {
    await db
      .from("sent_messages")
      .update({
        status: "simule",
        sent_at: now.toISOString(),
        follow_up_due_at: addDays(now, SEND_LIMITS.followUpDays).toISOString(),
      })
      .eq("id", rowId);
    await log("send.simulated", { to_domain: to.split("@")[1] });
    return { result: "simule" as const, draftId };
  }

  let secret: string;
  let password: string;
  try {
    const ring = deps.keyRing();
    password = decryptSecret(box.password_enc, ring);
    secret = unsubscribeSecrets(ring)[0]!;
  } catch {
    await db
      .from("sent_messages")
      .update({
        status: "a_reessayer",
        error: "clé de chiffrement",
        next_attempt_at: addDays(now, 1).toISOString(),
      })
      .eq("id", rowId);
    return { result: "a_reessayer" as const, draftId };
  }
  const mail = buildOutgoing({
    fromName: box.from_name,
    fromAddress: box.email,
    to,
    subject: draft.subject ?? "",
    body: draft.body,
    messageId,
    unsubscribeUrl: `${deps.appUrl}/api/unsubscribe?t=${makeUnsubscribeToken(rowId, secret)}`,
  });
  const res = await deps.send(
    { host: box.smtp_host, port: box.smtp_port },
    { username: box.username, password },
    mail,
    deps.transportOptions,
  );
  if (res.ok) {
    await db
      .from("sent_messages")
      .update({
        status: "envoye",
        sent_at: now.toISOString(),
        follow_up_due_at: addDays(now, SEND_LIMITS.followUpDays).toISOString(),
      })
      .eq("id", rowId);
    await log("send.sent", { to_domain: to.split("@")[1] });
    return { result: "envoye" as const, draftId };
  }
  if (res.kind === "auth") {
    await db.from("mailboxes").update({ status: "erreur", last_error: res.error }).eq("id", box.id);
  }
  const retry = res.kind === "temporary" && attempts < SEND_LIMITS.maxAttempts;
  await db
    .from("sent_messages")
    .update(
      retry
        ? {
            status: "a_reessayer",
            error: res.error,
            next_attempt_at: new Date(
              now.getTime() + SEND_LIMITS.retryDelayMinutes * 60_000,
            ).toISOString(),
          }
        : { status: "echec", error: res.error },
    )
    .eq("id", rowId);
  await log("send.failed", { kind: res.kind, retry });
  return { result: retry ? ("a_reessayer" as const) : ("echec" as const), draftId };
}
