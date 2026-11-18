import type { SupabaseClient } from "@supabase/supabase-js";
import { betaEnabled } from "@/features/audits/beta";
import { checkSendAllowance } from "@/features/billing/plans";
import { decryptSecret } from "@/features/mailboxes/crypto";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { SEND_LIMITS } from "@/features/sending/limits";
import {
  buildOutgoing,
  makeMessageId,
  makeUnsubscribeToken,
  unsubscribeSecrets,
} from "@/features/sending/message";
import { addDays, effectiveDailyCap, isInSendWindow } from "@/features/sending/schedule";
import type { SendDeps } from "@/features/sending/service";
import { applySignature, loadSignature, type Signature } from "@/features/signature/signature";

type Client = SupabaseClient<Database>;
type MailboxRow = Database["public"]["Tables"]["mailboxes"]["Row"] & {
  password_enc: string;
  key_version: string;
};

export type ReplyOutcome =
  | {
      mailboxId: string;
      result: "hors_fenetre" | "plafond" | "rien_a_envoyer" | "abonnement_requis" | "quota_mensuel";
    }
  | {
      mailboxId: string;
      result: "simule" | "envoye" | "echec" | "a_reessayer" | "ignore";
      replyDraftId: string;
    };

const COUNTED = ["en_cours", "envoye", "simule", "a_reessayer", "echec"];
/** Catégories à qui on n'écrit jamais, même si un brouillon validé existe (catégorie corrigée). */
const NO_REPLY = new Set(["desinscription", "plainte_hostile", "rebond"]);

/**
 * Envoi des réponses VALIDÉES (M5.2b). Un passage = au plus UNE réponse par boîte. Sans
 * `realSendingAllowed()` (EMAIL_DRY_RUN faux ET OUTREACH_SENDING_ENABLED vrai), rien ne sort du
 * serveur : l'envoi est simulé. Seuls les brouillons `validee` de `reply_drafts` partent, et
 * seulement vers l'expéditeur de la réponse, dans son fil (In-Reply-To).
 */
export async function runReplySendTick(deps: SendDeps): Promise<ReplyOutcome[]> {
  const db = deps.getServiceClient();
  const { data: boxes, error } = await db.from("mailboxes").select("*").eq("status", "verifiee");
  if (error) throw new Error(error.message);
  const out: ReplyOutcome[] = [];
  for (const box of (boxes ?? []) as unknown as MailboxRow[]) {
    try {
      out.push(await sendNextReply(db, box, deps));
    } catch (e) {
      logger.error("réponse : échec inattendu", {
        mailboxId: box.id,
        error: String(e).slice(0, 200),
      });
    }
  }
  return out;
}

async function sendNextReply(db: Client, box: MailboxRow, deps: SendDeps): Promise<ReplyOutcome> {
  const now = deps.now();
  const dry = !deps.realSendingAllowed();
  const base = { mailboxId: box.id };

  // M6.1 : même contrôle de plan que l'envoi initial (envoi réel seulement).
  if (!dry) {
    const allowance = await checkSendAllowance(db, box.workspace_id, now, betaEnabled());
    if (!allowance.allowed) return { ...base, result: allowance.reason };
  }

  // Candidats : brouillons validés des messages entrants reçus par cette boîte.
  const { data: inbounds } = await db
    .from("inbound_messages")
    .select("id, sent_message_id, message_id, from_email, subject, kind")
    .eq("mailbox_id", box.id);
  const inboundById = new Map((inbounds ?? []).map((i) => [i.id, i]));
  if (inboundById.size === 0) return { ...base, result: "rien_a_envoyer" };
  const { data: drafts } = await db
    .from("reply_drafts")
    .select("id, workspace_id, inbound_message_id, sent_message_id, subject, body, validated_at")
    .in("inbound_message_id", [...inboundById.keys()])
    .eq("status", "validee")
    .order("validated_at", { ascending: true });
  if (!drafts || drafts.length === 0) return { ...base, result: "rien_a_envoyer" };
  const { data: existing } = await db
    .from("reply_sends")
    .select("id, reply_draft_id, status, attempts, next_attempt_at")
    .in(
      "reply_draft_id",
      drafts.map((d) => d.id),
    )
    .eq("dry_run", dry);
  const byDraft = new Map((existing ?? []).map((e) => [e.reply_draft_id, e]));
  const todo = drafts.filter((d) => {
    const prev = byDraft.get(d.id);
    return !prev || (prev.status === "a_reessayer" && new Date(prev.next_attempt_at ?? 0) <= now);
  });
  if (todo.length === 0) return { ...base, result: "rien_a_envoyer" };

  if (
    !isInSendWindow(now, {
      timezone: box.timezone,
      startHour: box.send_window_start,
      endHour: box.send_window_end,
      days: box.send_days,
    })
  ) {
    return { ...base, result: "hors_fenetre" };
  }

  // Capacité commune aux envois et aux réponses de la boîte (plafond horaire et journalier).
  const since = addDays(now, -1).toISOString();
  const [sentRes, replyRes, firstRes] = await Promise.all([
    db
      .from("sent_messages")
      .select("claimed_at")
      .eq("from_email", box.email)
      .eq("dry_run", dry)
      .in("status", COUNTED)
      .gte("claimed_at", since),
    db
      .from("reply_sends")
      .select("claimed_at")
      .eq("from_email", box.email)
      .eq("dry_run", dry)
      .in("status", COUNTED)
      .gte("claimed_at", since),
    db
      .from("sent_messages")
      .select("claimed_at")
      .eq("from_email", box.email)
      .eq("dry_run", dry)
      .in("status", COUNTED)
      .order("claimed_at", { ascending: true })
      .limit(1),
  ]);
  const rows = [...(sentRes.data ?? []), ...(replyRes.data ?? [])];
  const hourAgo = now.getTime() - 3_600_000;
  const inHour = rows.filter((r) => new Date(r.claimed_at).getTime() > hourAgo).length;
  const firstAt = firstRes.data?.[0] ? new Date(firstRes.data[0].claimed_at) : null;
  const hourly = Math.min(box.hourly_cap, SEND_LIMITS.hourlyMax);
  const daily = effectiveDailyCap(box.daily_cap, firstAt, now);
  if (inHour >= hourly || rows.length >= daily) return { ...base, result: "plafond" };

  for (const draft of todo) {
    const inbound = inboundById.get(draft.inbound_message_id)!;
    const outcome = await attempt(db, box, draft, inbound, byDraft.get(draft.id) ?? null, {
      dry,
      now,
      deps,
    });
    if (outcome) return { ...base, ...outcome };
  }
  return { ...base, result: "rien_a_envoyer" };
}

type DraftRow = {
  id: string;
  workspace_id: string;
  inbound_message_id: string;
  sent_message_id: string;
  subject: string | null;
  body: string;
};
type InboundRow = {
  id: string;
  sent_message_id: string;
  message_id: string;
  from_email: string | null;
  subject: string | null;
  kind: string;
};
type Prev = { id: string; attempts: number } | null;
type Ctx = { dry: boolean; now: Date; deps: SendDeps };

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

function replySubject(draft: DraftRow, inbound: InboundRow, ours: string | null): string {
  const raw = (draft.subject ?? inbound.subject ?? ours ?? "").trim();
  if (!raw) return "Re:";
  return /^re\s*:/i.test(raw) ? raw : `Re: ${raw}`;
}

async function attempt(
  db: Client,
  box: MailboxRow,
  rawDraft: DraftRow,
  inbound: InboundRow,
  prev: Prev,
  ctx: Ctx,
): Promise<{
  result: "simule" | "envoye" | "echec" | "a_reessayer" | "ignore";
  replyDraftId: string;
} | null> {
  const { dry, now } = ctx;
  // Signature du site, posée au moment de partir (réglages « Vos messages »).
  // Une boîte peut servir plusieurs sites : la signature est celle du site du message d'origine.
  const { data: ours } = await db
    .from("sent_messages")
    .select("subject, plan_id")
    .eq("id", inbound.sent_message_id)
    .maybeSingle();
  const { data: plan } = ours
    ? await db.from("link_plans").select("site_id").eq("id", ours.plan_id).maybeSingle()
    : { data: null };
  const signature = plan ? await loadSignature(db, plan.site_id, ctx.deps.appUrl) : null;
  const draft = { ...rawDraft, body: applySignature(rawDraft.body, signature) };
  const to = inbound.from_email?.toLowerCase() ?? null;
  const subject = replySubject(draft, inbound, ours?.subject ?? null);
  const base = {
    workspace_id: draft.workspace_id,
    reply_draft_id: draft.id,
    inbound_message_id: inbound.id,
    sent_message_id: inbound.sent_message_id,
    mailbox_id: box.id,
    from_email: box.email,
    dry_run: dry,
    claimed_at: now.toISOString(),
    subject,
    body: draft.body,
    in_reply_to: inbound.message_id,
  };
  const skip = async (reason: string) => {
    const row = {
      ...base,
      to_email: to ?? "inconnu@invalide.invalid",
      message_id: makeMessageId(box.email),
      status: "ignore",
      skip_reason: reason,
    };
    if (prev) {
      await db
        .from("reply_sends")
        .update({ status: "ignore", skip_reason: reason })
        .eq("id", prev.id);
    } else {
      await db.from("reply_sends").insert(row);
    }
    await db.from("events").insert({
      workspace_id: draft.workspace_id,
      type: "reply.send_skipped",
      payload: { reply_draft_id: draft.id, reason, dry_run: dry } as never,
    });
    return { result: "ignore" as const, replyDraftId: draft.id };
  };

  if (!to || inbound.kind !== "reponse") return skip("destinataire_inconnu");
  const { data: cls } = await db
    .from("reply_classifications")
    .select("category, validated_category")
    .eq("inbound_message_id", inbound.id)
    .maybeSingle();
  const category = cls?.validated_category ?? cls?.category;
  if (!category) return skip("non_classe");
  if (NO_REPLY.has(category)) return skip("categorie_a_risque");
  if (await isSuppressed(db, draft.workspace_id, to)) return skip("supprime");

  let rowId: string;
  let messageId: string;
  let attempts: number;
  if (prev) {
    const { data } = await db
      .from("reply_sends")
      .update({
        status: "en_cours",
        attempts: prev.attempts + 1,
        claimed_at: now.toISOString(),
        error: null,
        body: draft.body,
      })
      .eq("id", prev.id)
      .eq("status", "a_reessayer")
      .select("id, message_id")
      .maybeSingle();
    if (!data) return null;
    rowId = data.id;
    messageId = data.message_id;
    attempts = prev.attempts + 1;
  } else {
    messageId = makeMessageId(box.email);
    const { data, error } = await db
      .from("reply_sends")
      .insert({ ...base, to_email: to, message_id: messageId, status: "en_cours", attempts: 1 })
      .select("id")
      .single();
    if (error || !data) {
      // 23505 : déjà pris ; 23514 : refus d'un garde-fou de la base.
      if (error?.code !== "23505") {
        logger.warn("réponse refusée par la base", { code: error?.code, message: error?.message });
      }
      return null;
    }
    rowId = data.id;
    attempts = 1;
  }
  return finish(db, box, draft, to, subject, messageId, rowId, attempts, inbound, ctx, signature);
}

async function finish(
  db: Client,
  box: MailboxRow,
  draft: DraftRow,
  to: string,
  subject: string,
  messageId: string,
  rowId: string,
  attempts: number,
  inbound: InboundRow,
  { dry, now, deps }: Ctx,
  signature: Signature | null,
) {
  const log = async (type: string, extra: Record<string, unknown> = {}) => {
    await db.from("events").insert({
      workspace_id: draft.workspace_id,
      type,
      payload: {
        reply_send_id: rowId,
        reply_draft_id: draft.id,
        mailbox_id: box.id,
        dry_run: dry,
        ...extra,
      } as never,
    });
  };
  const replyDraftId = draft.id;

  if (dry) {
    await db
      .from("reply_sends")
      .update({ status: "simule", sent_at: now.toISOString() })
      .eq("id", rowId);
    await log("reply.simulated", { to_domain: to.split("@")[1] });
    return { result: "simule" as const, replyDraftId };
  }

  let password: string;
  let secret: string;
  try {
    const ring = deps.keyRing();
    password = decryptSecret(box.password_enc, ring);
    secret = unsubscribeSecrets(ring)[0]!;
  } catch {
    await db
      .from("reply_sends")
      .update({
        status: "a_reessayer",
        error: "clé de chiffrement",
        next_attempt_at: addDays(now, 1).toISOString(),
      })
      .eq("id", rowId);
    return { result: "a_reessayer" as const, replyDraftId };
  }
  // Le jeton de désinscription est lié à l'envoi initial du fil (même destinataire).
  const mail = buildOutgoing({
    fromName: box.from_name,
    fromAddress: box.email,
    to,
    subject,
    body: draft.body,
    signature,
    messageId,
    inReplyTo: inbound.message_id,
    unsubscribeUrl: `${deps.appUrl}/api/unsubscribe?t=${makeUnsubscribeToken(inbound.sent_message_id, secret)}`,
  });
  const res = await deps.send(
    { host: box.smtp_host, port: box.smtp_port },
    { username: box.username, password },
    mail,
    deps.transportOptions,
  );
  if (res.ok) {
    await db
      .from("reply_sends")
      .update({ status: "envoye", sent_at: now.toISOString() })
      .eq("id", rowId);
    await log("reply.sent", { to_domain: to.split("@")[1] });
    return { result: "envoye" as const, replyDraftId };
  }
  if (res.kind === "auth") {
    await db.from("mailboxes").update({ status: "erreur", last_error: res.error }).eq("id", box.id);
  }
  const retry = res.kind === "temporary" && attempts < SEND_LIMITS.maxAttempts;
  await db
    .from("reply_sends")
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
  await log("reply.failed", { kind: res.kind, retry });
  return { result: retry ? ("a_reessayer" as const) : ("echec" as const), replyDraftId };
}
