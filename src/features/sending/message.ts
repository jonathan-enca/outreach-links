import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export interface OutgoingInput {
  fromName: string;
  fromAddress: string;
  to: string;
  subject: string;
  body: string;
  messageId: string;
  inReplyTo?: string | null;
  unsubscribeUrl: string;
}

export interface OutgoingMail {
  from: { name: string; address: string };
  to: string;
  subject: string;
  text: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  headers: Record<string, string>;
}

/** Identifiant de message propre, sur le domaine de la boîte (jamais un domaine tiers). */
export function makeMessageId(mailboxEmail: string): string {
  const domain = mailboxEmail.split("@")[1] ?? "localhost";
  return `<${randomUUID()}@${domain}>`;
}

const FOOTER = "\n\n--\nSi vous ne souhaitez plus recevoir de message de ma part, répondez « stop ».";

export function buildOutgoing(i: OutgoingInput): OutgoingMail {
  return {
    from: { name: i.fromName, address: i.fromAddress },
    to: i.to,
    subject: i.subject,
    text: `${i.body.trimEnd()}${FOOTER}`,
    messageId: i.messageId,
    ...(i.inReplyTo ? { inReplyTo: i.inReplyTo, references: i.inReplyTo } : {}),
    headers: {
      "List-Unsubscribe": `<mailto:${i.fromAddress}?subject=stop>, <${i.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      // Message individuel, pas un envoi de masse : évite les réponses automatiques en boucle.
      "Auto-Submitted": "no",
    },
  };
}

/** Jeton de désinscription signé (HMAC), lié à l'enregistrement d'envoi. */
function sign(id: string, secret: string): string {
  return createHmac("sha256", `unsubscribe-v1:${secret}`).update(id).digest("base64url");
}
export function makeUnsubscribeToken(sentMessageId: string, secret: string): string {
  return `${sentMessageId}.${sign(sentMessageId, secret)}`;
}
export function verifyUnsubscribeToken(token: string, secret: string): string | null {
  const [id, sig] = token.split(".");
  if (!id || !sig) return null;
  const expected = Buffer.from(sign(id, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}
