import type { InboundMail } from "./parse";

/** Un envoi INITIAL de campagne, avec les Message-ID de ses messages (initial et relance). */
export interface SentRef {
  /** Identifiant de l'envoi initial (rattachement des signaux). */
  id: string;
  toEmail: string;
  messageIds: string[];
  sentAt: Date;
}

export type InboundKind = "reponse" | "rebond" | "reponse_automatique";
export type MatchMethod = "en_tete" | "dsn" | "adresse";

export interface Classified {
  sentMessageId: string;
  kind: InboundKind;
  method: MatchMethod;
}

/** Fenêtre de rattachement par adresse seule (sans en-têtes de fil). */
export const ADDRESS_MATCH_DAYS = 45;

function byId(refs: readonly SentRef[], ids: readonly string[]): SentRef | undefined {
  const wanted = new Set(ids.map((i) => i.toLowerCase()));
  return refs.find((r) => r.messageIds.some((m) => wanted.has(m.toLowerCase())));
}

function latestTo(refs: readonly SentRef[], email: string, before: Date): SentRef | undefined {
  const cutoff = before.getTime() - ADDRESS_MATCH_DAYS * 86_400_000;
  return refs
    .filter(
      (r) =>
        r.toEmail.toLowerCase() === email.toLowerCase() &&
        r.sentAt.getTime() <= before.getTime() &&
        r.sentAt.getTime() >= cutoff,
    )
    .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0];
}

/**
 * Rattache un message entrant à un envoi de campagne, ou renvoie null (message étranger à la
 * campagne : ignoré, jamais stocké). Ordre : rapport de livraison (DSN), en-têtes de fil
 * (In-Reply-To / References), puis adresse de l'expéditeur.
 */
export function classifyInbound(
  mail: InboundMail,
  refs: readonly SentRef[],
  ownAddress: string,
  now: Date = new Date(),
): Classified | null {
  if (mail.fromEmail && mail.fromEmail === ownAddress.toLowerCase()) return null;

  if (mail.isDsn) {
    const ref =
      byId(refs, mail.citedIds) ??
      (mail.dsnRecipient ? latestTo(refs, mail.dsnRecipient, now) : undefined);
    if (!ref) return null;
    // 4.x.x : échec temporaire (boîte pleine…) : ni signal ni suppression. 5.x.x ou inconnu : rebond.
    const temporary = mail.dsnStatus?.startsWith("4.") ?? false;
    return {
      sentMessageId: ref.id,
      kind: temporary ? "reponse_automatique" : "rebond",
      method: "dsn",
    };
  }

  const thread = [mail.inReplyTo, ...mail.references].filter((x): x is string => Boolean(x));
  const viaHeaders = thread.length > 0 ? byId(refs, thread) : undefined;
  if (viaHeaders) {
    return {
      sentMessageId: viaHeaders.id,
      kind: mail.isAutoReply ? "reponse_automatique" : "reponse",
      method: "en_tete",
    };
  }
  if (mail.fromEmail) {
    const viaAddress = latestTo(refs, mail.fromEmail, now);
    if (viaAddress) {
      return {
        sentMessageId: viaAddress.id,
        kind: mail.isAutoReply ? "reponse_automatique" : "reponse",
        method: "adresse",
      };
    }
  }
  return null;
}
