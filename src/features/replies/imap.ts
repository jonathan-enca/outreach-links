import { ImapFlow } from "imapflow";
import { resolveSafeHost } from "@/features/mailboxes/network";
import { isImplicitTls } from "@/features/mailboxes/schema";
import type { Credentials, Endpoint, TransportOptions } from "@/features/mailboxes/transport";

export interface RawInbound {
  uid: number;
  source: Buffer;
  internalDate: Date | null;
}
export interface FetchResult {
  ok: true;
  uidValidity: number;
  messages: RawInbound[];
  /** Plus grand UID examiné (curseur), même si le message a été ignoré (trop gros…). */
  maxUid: number;
  /** Il reste des messages au-delà du plafond de ce passage. */
  more: boolean;
}
export type FetchOutcome = FetchResult | { ok: false; error: string; kind: "auth" | "temporary" };

export const IMAP_LIMITS = {
  /** Messages lus par boîte et par passage. */
  perTick: 100,
  /** Taille lue au maximum par message (un rapport de rebond est petit). */
  maxBytes: 256 * 1024,
} as const;

export interface FetchQuery {
  /** Curseur : on ne lit que les UID strictement supérieurs. */
  afterUid: number;
  /** Premier passage (aucun curseur) : on ne remonte pas avant cette date. */
  since: Date;
  /** UIDVALIDITY connu ; s'il change, le curseur est caduc. */
  knownUidValidity: number | null;
}

function safeError(e: unknown, secret: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  return (secret.length >= 4 ? raw.split(secret).join("***") : raw).slice(0, 300);
}

/**
 * Lit les nouveaux messages de la boîte de réception, EN LECTURE SEULE (EXAMINE, BODY.PEEK) :
 * aucun drapeau modifié, aucun message déplacé ni supprimé, aucun envoi. Le filtrage « fils de
 * campagne » se fait ensuite (classifyInbound) : un message étranger n'est jamais stocké.
 */
export async function fetchNewMessages(
  ep: Endpoint,
  cred: Credentials,
  q: FetchQuery,
  opts: TransportOptions = {},
): Promise<FetchOutcome> {
  let client: ImapFlow | undefined;
  try {
    const ip = await resolveSafeHost(ep.host, opts.allowPrivate);
    client = new ImapFlow({
      host: ip,
      port: ep.port,
      secure: isImplicitTls(ep.port),
      doSTARTTLS: isImplicitTls(ep.port) || opts.plaintextForTests ? false : true,
      auth: { user: cred.username, pass: cred.password },
      tls: { servername: ep.host, rejectUnauthorized: !opts.insecureTlsForTests },
      logger: false,
      connectionTimeout: opts.timeoutMs ?? 10000,
    });
    client.on("error", () => undefined);
    await client.connect();
    const lock = await client.getMailboxLock("INBOX", { readOnly: true });
    try {
      const box = client.mailbox;
      const uidValidity = box && typeof box === "object" ? Number(box.uidValidity) : 0;
      const afterUid = q.knownUidValidity === uidValidity ? q.afterUid : 0;
      const found = (await client.search(
        afterUid > 0 ? { uid: `${afterUid + 1}:*` } : { since: q.since },
        { uid: true },
      )) as number[] | false;
      const uids = (found || []).filter((u) => u > afterUid).sort((a, b) => a - b);
      const batch = uids.slice(0, IMAP_LIMITS.perTick);
      const messages: RawInbound[] = [];
      if (batch.length > 0) {
        for await (const m of client.fetch(
          batch.join(","),
          { uid: true, internalDate: true, source: { maxLength: IMAP_LIMITS.maxBytes } },
          { uid: true },
        )) {
          if (!m.source) continue;
          messages.push({
            uid: m.uid,
            source: m.source,
            internalDate: m.internalDate ? new Date(m.internalDate) : null,
          });
        }
      }
      return {
        ok: true,
        uidValidity,
        messages,
        maxUid: batch.length > 0 ? batch[batch.length - 1]! : afterUid,
        more: uids.length > batch.length,
      };
    } finally {
      lock.release();
      await client.logout().catch(() => undefined);
    }
  } catch (e) {
    try {
      client?.close();
    } catch {
      /* déjà fermé */
    }
    const err = e as { authenticationFailed?: boolean };
    return {
      ok: false,
      error: safeError(e, cred.password),
      kind: err.authenticationFailed ? "auth" : "temporary",
    };
  }
}
