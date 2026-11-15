import type { SupabaseClient } from "@supabase/supabase-js";
import { env as appEnv } from "@/env";
import { decryptSecret, parseKeyRing, type KeyRing } from "@/features/mailboxes/crypto";
import { sendOutreachMail, type TransportOptions } from "@/features/mailboxes/transport";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { SEND_LIMITS } from "./limits";
import { buildOutgoing, makeMessageId, makeUnsubscribeToken, unsubscribeSecrets } from "./message";
import { buildFollowUp, skipReasonForSignals, type SignalKind } from "./followup";
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

  // Relances dues d'abord : une relance en retard passe avant un nouvel envoi.
  const followUp = await sendNextFollowUp(db, box, dry, now, deps);
  if (followUp) return { ...base, ...followUp };

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
  opts: { step: "initial" | "relance"; inReplyTo?: string | null } = { step: "initial" },
) {
  const draftId = (await db.from("sent_messages").select("draft_id").eq("id", rowId).single()).data!
    .draft_id;
  const log = async (type: string, extra: Record<string, unknown> = {}) => {
    await db.from("events").insert({
      workspace_id: draft.workspace_id,
      type,
      payload: {
        sent_message_id: rowId,
        mailbox_id: box.id,
        dry_run: dry,
        step: opts.step,
        ...extra,
      } as never,
    });
  };

  if (dry) {
    await db
      .from("sent_messages")
      .update({
        status: "simule",
        sent_at: now.toISOString(),
        ...(opts.step === "initial"
          ? { follow_up_due_at: addDays(now, SEND_LIMITS.followUpDays).toISOString() }
          : {}),
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
    inReplyTo: opts.inReplyTo ?? null,
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
        ...(opts.step === "initial"
          ? { follow_up_due_at: addDays(now, SEND_LIMITS.followUpDays).toISOString() }
          : {}),
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

type Outcome = {
  result: "simule" | "envoye" | "echec" | "a_reessayer" | "ignore";
  draftId: string;
} | null;

/**
 * Relance unique (M4.3) : pour un envoi initial de cette boîte dont `follow_up_due_at` est passé.
 * Une réponse, une désinscription ou un rebond (table `reply_signals`) l'annule : elle est alors
 * enregistrée « ignore » (jamais envoyée, jamais retentée). Même fil (In-Reply-To), même adresse.
 * La base refuse en plus toute relance trop tôt, sans signal absent, ou hors du fil (trigger).
 */
async function sendNextFollowUp(
  db: Client,
  box: MailboxRow,
  dry: boolean,
  now: Date,
  deps: SendDeps,
): Promise<Outcome> {
  const { data: initials } = await db
    .from("sent_messages")
    .select("*")
    .eq("mailbox_id", box.id)
    .eq("step", "initial")
    .eq("dry_run", dry)
    .in("status", ["envoye", "simule"]);
  const dueAll = (initials ?? [])
    .filter((m) => m.follow_up_due_at && new Date(m.follow_up_due_at) <= now)
    .sort((a, b) => a.follow_up_due_at!.localeCompare(b.follow_up_due_at!));
  if (dueAll.length === 0) return null;
  // M5.1 : relance repoussée (réponse automatique d'absence), ou réponse automatique pas encore
  // classée (on attend la classification plutôt que de relancer quelqu'un en congé).
  const dueIds = dueAll.map((m) => m.id);
  const { data: postponed } = await db
    .from("reply_classifications")
    .select("sent_message_id, follow_up_not_before")
    .in("sent_message_id", dueIds);
  const { data: pendingAuto } = await db
    .from("inbound_messages")
    .select("sent_message_id")
    .in("sent_message_id", dueIds)
    .eq("kind", "reponse_automatique")
    .is("classified_at", null);
  const held = new Set<string>([
    ...(postponed ?? [])
      .filter((c) => c.follow_up_not_before && new Date(c.follow_up_not_before) > now)
      .map((c) => c.sent_message_id),
    ...(pendingAuto ?? []).map((m) => m.sent_message_id),
  ]);
  const due = dueAll.filter((m) => !held.has(m.id));
  if (due.length === 0) return null;
  const ids = due.map((m) => m.id);
  const { data: relances } = await db
    .from("sent_messages")
    .select("*")
    .in(
      "draft_id",
      due.map((m) => m.draft_id),
    )
    .eq("step", "relance")
    .eq("dry_run", dry);
  const { data: sigs } = await db
    .from("reply_signals")
    .select("sent_message_id, kind")
    .in("sent_message_id", ids);
  const byDraft = new Map((relances ?? []).map((r) => [r.draft_id, r]));
  const signalsOf = (id: string) =>
    (sigs ?? []).filter((s) => s.sent_message_id === id).map((s) => s.kind as SignalKind);

  for (const initial of due) {
    const prev = byDraft.get(initial.draft_id);
    const retry = prev?.status === "a_reessayer" && new Date(prev.next_attempt_at ?? 0) <= now;
    if (prev && !retry) continue;
    const base = {
      workspace_id: initial.workspace_id,
      plan_id: initial.plan_id,
      batch_id: initial.batch_id,
      draft_id: initial.draft_id,
      mailbox_id: box.id,
      step: "relance",
      dry_run: dry,
      claimed_at: now.toISOString(),
      to_email: initial.to_email,
      in_reply_to: initial.message_id,
    };
    const reason = skipReasonForSignals(signalsOf(initial.id));
    const mail = buildFollowUp({
      fromName: box.from_name,
      subject: initial.subject,
      body: initial.body,
      sentAt: new Date(initial.sent_at ?? now),
    });
    const skip = async (why: string): Promise<Outcome> => {
      if (prev) {
        await db
          .from("sent_messages")
          .update({ status: "ignore", skip_reason: why })
          .eq("id", prev.id);
      } else {
        await db.from("sent_messages").insert({
          ...base,
          subject: mail.subject,
          body: mail.body,
          message_id: makeMessageId(box.email),
          status: "ignore",
          skip_reason: why,
        });
      }
      await db.from("events").insert({
        workspace_id: initial.workspace_id,
        type: "send.followup_cancelled",
        payload: { sent_message_id: initial.id, reason: why, dry_run: dry } as never,
      });
      return { result: "ignore", draftId: initial.draft_id };
    };
    if (reason) {
      await skip(reason);
      continue;
    }
    if (await isSuppressed(db, initial.workspace_id, initial.to_email)) {
      await skip("supprime");
      continue;
    }

    let rowId: string;
    let messageId: string;
    let attempts: number;
    if (prev) {
      const { data } = await db
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
      if (!data) continue;
      rowId = data.id;
      messageId = data.message_id;
      attempts = prev.attempts + 1;
    } else {
      messageId = makeMessageId(box.email);
      const { data, error } = await db
        .from("sent_messages")
        .insert({
          ...base,
          subject: mail.subject,
          body: mail.body,
          message_id: messageId,
          status: "en_cours",
          attempts: 1,
        })
        .select("id")
        .single();
      if (error || !data) {
        if (error?.code !== "23505") {
          logger.warn("relance refusée par la base", {
            code: error?.code,
            message: error?.message,
          });
        }
        continue;
      }
      rowId = data.id;
      attempts = 1;
    }
    return finish(
      db,
      box,
      {
        workspace_id: initial.workspace_id,
        plan_id: initial.plan_id,
        subject: mail.subject,
        body: mail.body,
      },
      initial.to_email,
      messageId,
      rowId,
      attempts,
      dry,
      now,
      deps,
      { step: "relance", inReplyTo: initial.message_id },
    );
  }
  return null;
}
