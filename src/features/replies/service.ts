import type { SupabaseClient } from "@supabase/supabase-js";
import { env as appEnv } from "@/env";
import { decryptSecret, parseKeyRing, type KeyRing } from "@/features/mailboxes/crypto";
import type { TransportOptions } from "@/features/mailboxes/transport";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import { fetchNewMessages } from "./imap";
import { classifyInbound, type SentRef } from "./match";
import { parseInbound } from "./parse";

type Client = SupabaseClient<Database>;

export interface ReplyDeps {
  getServiceClient: () => Client;
  now: () => Date;
  keyRing: () => KeyRing;
  fetch: typeof fetchNewMessages;
  transportOptions?: TransportOptions;
}

export function defaultReplyDeps(
  getServiceClient: () => Client,
  env: Pick<typeof appEnv, "MAILBOX_ENCRYPTION_KEYS"> = appEnv,
): ReplyDeps {
  return {
    getServiceClient,
    now: () => new Date(),
    keyRing: () => parseKeyRing(env.MAILBOX_ENCRYPTION_KEYS),
    fetch: fetchNewMessages,
  };
}

export type ReplyOutcome =
  | { mailboxId: string; result: "aucun_envoi_reel" | "erreur_cle" }
  | { mailboxId: string; result: "echec_connexion" | "echec_auth"; error: string }
  | {
      mailboxId: string;
      result: "lu";
      examines: number;
      reponses: number;
      rebonds: number;
      automatiques: number;
      ignores: number;
      more: boolean;
    };

/**
 * Un passage de lecture : pour chaque boîte vérifiée qui a au moins un envoi RÉEL, lit les
 * nouveaux messages (lecture seule), ne garde que ceux rattachés à un fil de campagne et écrit
 * `inbound_messages` et `reply_signals` (réponse, rebond). Un rebond met l'adresse en suppression
 * (trigger en base). Une boîte sans envoi réel n'est même pas contactée.
 */
export async function runReplyTick(deps: ReplyDeps): Promise<ReplyOutcome[]> {
  const db = deps.getServiceClient();
  const { data: boxes, error } = await db.from("mailboxes").select("*").eq("status", "verifiee");
  if (error) throw new Error(error.message);
  const out: ReplyOutcome[] = [];
  for (const box of (boxes ??
    []) as unknown as (Database["public"]["Tables"]["mailboxes"]["Row"] & {
    password_enc: string;
  })[]) {
    try {
      out.push(await readMailbox(db, box, deps));
    } catch (e) {
      logger.error("réponses : échec inattendu", {
        mailboxId: box.id,
        error: String(e).slice(0, 200),
      });
    }
  }
  return out;
}

/** Les envois réels d'une adresse d'envoi, y compris ceux d'une boîte supprimée puis reconnectée. */
async function loadRefs(db: Client, fromEmail: string): Promise<SentRef[]> {
  const { data } = await db
    .from("sent_messages")
    .select("id, draft_id, step, to_email, message_id, sent_at")
    .eq("from_email", fromEmail)
    .eq("dry_run", false)
    .eq("status", "envoye");
  const byDraft = new Map<string, SentRef>();
  for (const r of data ?? []) {
    if (r.step !== "initial") continue;
    byDraft.set(r.draft_id, {
      id: r.id,
      toEmail: r.to_email,
      messageIds: [r.message_id],
      sentAt: new Date(r.sent_at ?? 0),
    });
  }
  for (const r of data ?? []) {
    if (r.step === "relance") byDraft.get(r.draft_id)?.messageIds.push(r.message_id);
  }
  return [...byDraft.values()];
}

async function readMailbox(
  db: Client,
  box: Database["public"]["Tables"]["mailboxes"]["Row"] & { password_enc: string },
  deps: ReplyDeps,
): Promise<ReplyOutcome> {
  const base = { mailboxId: box.id };
  const refs = await loadRefs(db, box.email);
  if (refs.length === 0) return { ...base, result: "aucun_envoi_reel" };

  let password: string;
  try {
    password = decryptSecret(box.password_enc, deps.keyRing());
  } catch {
    return { ...base, result: "erreur_cle" };
  }
  const now = deps.now();
  const since = new Date(Math.min(...refs.map((r) => r.sentAt.getTime())));
  const res = await deps.fetch(
    { host: box.imap_host, port: box.imap_port },
    { username: box.username, password },
    { afterUid: box.imap_last_uid, since, knownUidValidity: box.imap_uid_validity },
    deps.transportOptions,
  );
  if (!res.ok) {
    await db
      .from("mailboxes")
      .update({
        last_error: res.error,
        ...(res.kind === "auth" ? { status: "erreur" } : {}),
      })
      .eq("id", box.id);
    return {
      ...base,
      result: res.kind === "auth" ? "echec_auth" : "echec_connexion",
      error: res.error,
    };
  }

  const stats = { reponses: 0, rebonds: 0, automatiques: 0, ignores: 0 };
  for (const raw of res.messages) {
    let mail;
    try {
      mail = await parseInbound(raw.source, raw.internalDate ?? now);
    } catch {
      stats.ignores++;
      continue;
    }
    const hit = classifyInbound(mail, refs, box.email, now);
    if (!hit) {
      stats.ignores++;
      continue;
    }
    const messageId = mail.messageId ?? `<uid-${raw.uid}@${box.id}.local>`;
    const ins = await db.from("inbound_messages").insert({
      workspace_id: box.workspace_id,
      mailbox_id: box.id,
      sent_message_id: hit.sentMessageId,
      message_id: messageId,
      in_reply_to: mail.inReplyTo,
      from_email: mail.fromEmail,
      subject: mail.subject,
      body_excerpt: mail.excerpt,
      kind: hit.kind,
      match_method: hit.method,
      received_at: (raw.internalDate ?? mail.receivedAt).toISOString(),
    });
    // 23505 : déjà lu lors d'un passage précédent (idempotent).
    if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
    // Même déjà lu, on rejoue le signal (idempotent) : un passage interrompu entre les deux écritures
    // ne perd jamais un rebond ni une réponse.
    const fresh = !ins.error;

    if (hit.kind === "reponse_automatique") {
      if (fresh) stats.automatiques++;
    } else {
      const sig = await db.from("reply_signals").insert({
        workspace_id: box.workspace_id,
        sent_message_id: hit.sentMessageId,
        kind: hit.kind === "rebond" ? "rebond" : "reponse",
        received_at: (raw.internalDate ?? mail.receivedAt).toISOString(),
      });
      if (sig.error && sig.error.code !== "23505") throw new Error(sig.error.message);
      if (fresh && hit.kind === "rebond") stats.rebonds++;
      else if (fresh) stats.reponses++;
    }
    if (fresh)
      await db.from("events").insert({
        workspace_id: box.workspace_id,
        type: `reply.${hit.kind}`,
        payload: {
          sent_message_id: hit.sentMessageId,
          mailbox_id: box.id,
          method: hit.method,
        } as never,
      });
  }

  await db
    .from("mailboxes")
    .update({
      imap_uid_validity: res.uidValidity,
      imap_last_uid: res.maxUid,
      imap_last_read_at: now.toISOString(),
      last_error: null,
    })
    .eq("id", box.id);
  return {
    ...base,
    result: "lu",
    examines: res.messages.length,
    ...stats,
    more: res.more,
  };
}
