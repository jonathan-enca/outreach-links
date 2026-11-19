import nodemailer from "nodemailer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, type KeyRing } from "@/features/mailboxes/crypto";
import type { OutreachMail, OutreachResult } from "@/features/mailboxes/transport";
import { IMAP_LIMITS, type FetchOutcome, type FetchQuery } from "@/features/replies/imap";
import type { Database } from "@/lib/supabase/database.types";
import { googleConfig } from "./config";
import type { OAuthConfig } from "./oauth";

type Client = SupabaseClient<Database>;
type Fetch = typeof fetch;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GoogleOpts {
  config?: OAuthConfig | null;
  fetchFn?: Fetch;
}

type Access =
  { ok: true; accessToken: string } | { ok: false; error: string; kind: "auth" | "temporary" };

/** Jeton d'accès (1 h) à partir du jeton de renouvellement chiffré. « Accès retiré » = kind auth : la boîte passe en erreur. */
export async function getAccessToken(
  db: Client,
  mailboxId: string,
  ring: KeyRing,
  opts: GoogleOpts = {},
): Promise<Access> {
  const cfg = opts.config === undefined ? googleConfig() : opts.config;
  if (!cfg) return { ok: false, error: "connexion Google désactivée", kind: "temporary" };
  const { data } = await db
    .from("mailbox_google_tokens")
    .select("refresh_token_enc")
    .eq("mailbox_id", mailboxId)
    .maybeSingle();
  if (!data)
    return { ok: false, error: "accès Google introuvable : reconnectez la boîte", kind: "auth" };
  let refresh: string;
  try {
    refresh = decryptSecret(data.refresh_token_enc, ring);
  } catch {
    return { ok: false, error: "clé de chiffrement", kind: "temporary" };
  }
  try {
    const res = await (opts.fetchFn ?? fetch)(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        refresh_token: refresh,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const j = (await res.json()) as { access_token?: string };
      if (j.access_token) return { ok: true, accessToken: j.access_token };
      return { ok: false, error: "réponse Google invalide", kind: "temporary" };
    }
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    // invalid_grant : accès retiré par la personne, mot de passe changé, jeton expiré.
    if (res.status === 400 || res.status === 401) {
      return { ok: false, error: `accès Google refusé (${j.error ?? res.status})`, kind: "auth" };
    }
    return { ok: false, error: `Google ${res.status}`, kind: "temporary" };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200), kind: "temporary" };
  }
}

/** Message MIME complet (mêmes en-têtes que l'envoi SMTP : Message-ID, fil, désinscription). */
async function buildRaw(mail: OutreachMail): Promise<Buffer> {
  const t = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" });
  const info = await t.sendMail({
    from: mail.from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    ...(mail.html ? { html: mail.html } : {}),
    messageId: mail.messageId,
    inReplyTo: mail.inReplyTo,
    references: mail.references,
    headers: mail.headers,
  });
  return info.message as Buffer;
}

/** Envoi par l'API Gmail (`users.messages.send`). Même classement des échecs que l'envoi SMTP. */
export async function sendViaGoogle(
  db: Client,
  box: { id: string },
  mail: OutreachMail,
  ring: KeyRing,
  opts: GoogleOpts = {},
): Promise<OutreachResult> {
  const tok = await getAccessToken(db, box.id, ring, opts);
  if (!tok.ok) return tok;
  try {
    const raw = (await buildRaw(mail)).toString("base64url");
    const res = await (opts.fetchFn ?? fetch)(`${API}/messages/send`, {
      method: "POST",
      headers: { authorization: `Bearer ${tok.accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ raw }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) return { ok: true };
    const j = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    };
    const reason = j.error?.errors?.[0]?.reason ?? "";
    const error = `Gmail ${res.status} ${j.error?.message ?? ""}`.trim().slice(0, 300);
    if (/rateLimit|dailyLimit|quota/i.test(reason) || res.status === 429 || res.status >= 500) {
      return { ok: false, error, kind: "temporary" };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, error, kind: "auth" };
    return { ok: false, error, kind: "permanent" };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200), kind: "temporary" };
  }
}

/**
 * Lecture des nouveaux messages par l'API Gmail, EN LECTURE SEULE (`messages.list` et `messages.get`) :
 * rien n'est modifié, déplacé ni supprimé. Le curseur est l'heure de réception en secondes ; le filtrage
 * « fils de campagne » se fait ensuite (classifyInbound), comme pour IMAP.
 */
export async function fetchViaGoogle(
  db: Client,
  box: { id: string },
  q: FetchQuery,
  ring: KeyRing,
  opts: GoogleOpts = {},
): Promise<FetchOutcome> {
  const tok = await getAccessToken(db, box.id, ring, opts);
  if (!tok.ok) return tok;
  const f = opts.fetchFn ?? fetch;
  const headers = { authorization: `Bearer ${tok.accessToken}` };
  const sinceSec = Math.floor(q.since.getTime() / 1000);
  const afterSec = Math.max(q.afterUid, sinceSec);
  const fail = (status: number): FetchOutcome => ({
    ok: false,
    error: `Gmail ${status}`,
    kind: status === 401 || status === 403 ? "auth" : "temporary",
  });
  try {
    const ids: string[] = [];
    let pageToken: string | undefined;
    do {
      const u = new URL(`${API}/messages`);
      u.searchParams.set("q", `in:inbox after:${Math.max(afterSec - 1, 0)}`);
      u.searchParams.set("maxResults", "100");
      if (pageToken) u.searchParams.set("pageToken", pageToken);
      const res = await f(u, { headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return fail(res.status);
      const j = (await res.json()) as { messages?: { id: string }[]; nextPageToken?: string };
      ids.push(...(j.messages ?? []).map((m) => m.id));
      pageToken = j.nextPageToken;
    } while (pageToken && ids.length < 300);

    const got: { uid: number; source: Buffer; internalDate: Date }[] = [];
    for (const id of ids) {
      const res = await f(`${API}/messages/${id}?format=raw`, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        if (res.status === 404) continue; // supprimé entre-temps
        return fail(res.status);
      }
      const m = (await res.json()) as { raw?: string; internalDate?: string };
      if (!m.raw || !m.internalDate) continue;
      const ms = Number(m.internalDate);
      const uid = Math.floor(ms / 1000);
      if (q.afterUid > 0 && uid < q.afterUid) continue;
      got.push({
        uid,
        source: Buffer.from(m.raw, "base64url").subarray(0, IMAP_LIMITS.maxBytes),
        internalDate: new Date(ms),
      });
    }
    got.sort((a, b) => a.uid - b.uid);
    const taken = got.slice(0, IMAP_LIMITS.perTick);
    return {
      ok: true,
      uidValidity: 1,
      messages: taken,
      maxUid: taken.length ? taken[taken.length - 1]!.uid : q.afterUid,
      more: got.length > taken.length || (pageToken !== undefined && ids.length >= 300),
    };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 200), kind: "temporary" };
  }
}
