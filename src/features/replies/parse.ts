import { simpleParser, type ParsedMail } from "mailparser";

/**
 * Analyse d'un message ENTRANT. Tout ce qui en sort est une donnée non fiable : aucune instruction
 * du message n'est exécutée, aucun lien suivi, aucune pièce jointe ouverte, et le texte n'est
 * jamais transmis à un prompt ici (M5.1 devra l'isoler).
 */
export interface InboundMail {
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
  fromEmail: string | null;
  subject: string;
  /** Texte brut tronqué, sans caractères de contrôle. */
  excerpt: string;
  receivedAt: Date;
  isDsn: boolean;
  /** Code d'état DSN (ex. « 5.1.1 ») quand c'est un rapport de livraison. */
  dsnStatus: string | null;
  dsnRecipient: string | null;
  /** Tous les Message-ID `<...>` cités dans le message (en-têtes et message retourné). */
  citedIds: string[];
  isAutoReply: boolean;
}

export const EXCERPT_MAX = 2000;

const ID_RE = /<[^<>\s@]+@[^<>\s]+>/g;

export function extractIds(text: string | null | undefined): string[] {
  return [...new Set((text ?? "").match(ID_RE) ?? [])];
}

/** Retire les caractères de contrôle et tronque. */
export function sanitizeExcerpt(text: string, max = EXCERPT_MAX): string {
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  return clean.replace(/\r\n/g, "\n").trim().slice(0, max);
}

const AUTO_SUBJECT =
  /^\s*(r[ée]ponse automatique|automatic reply|auto[- ]?reply|out of office|absence|absent du bureau|autoreply)/i;

function header(mail: ParsedMail, name: string): string {
  const v = mail.headers.get(name);
  if (v == null) return "";
  return typeof v === "string" ? v : JSON.stringify(v);
}

export function isDeliveryReport(mail: ParsedMail): boolean {
  const ct = mail.headers.get("content-type") as {
    value?: string;
    params?: Record<string, string>;
  };
  if (ct?.value?.toLowerCase() === "multipart/report") {
    return (ct.params?.["report-type"] ?? "").toLowerCase() === "delivery-status";
  }
  const from = mail.from?.value?.[0]?.address?.toLowerCase() ?? "";
  return (
    /^(mailer-daemon|postmaster)@/.test(from) &&
    /undeliver|delivery|failure|returned|non remis|échec/i.test(mail.subject ?? "")
  );
}

export async function parseInbound(
  source: Buffer,
  fallbackDate: Date = new Date(),
): Promise<InboundMail> {
  const mail = await simpleParser(source, { skipHtmlToText: false, skipImageLinks: true });
  const raw = source.toString("utf8");
  const isDsn = isDeliveryReport(mail);

  // Le rapport peut ne citer le message d'origine qu'en pièce jointe (message/rfc822 ou en-têtes).
  const attachedText = (mail.attachments ?? [])
    .filter((a) => /rfc822|delivery-status|text\/plain/i.test(a.contentType))
    .map((a) => a.content.toString("utf8"))
    .join("\n");
  const dsnText = `${attachedText}\n${mail.text ?? ""}`;
  const status = /^\s*Status:\s*([245]\.\d{1,3}\.\d{1,3})/im.exec(dsnText)?.[1] ?? null;
  const recipientRaw =
    /^\s*(?:Final|Original)-Recipient:\s*(?:rfc822;)?\s*<?([^\s<>;]+@[^\s<>;]+)>?/im.exec(
      dsnText,
    )?.[1];

  const references = Array.isArray(mail.references)
    ? mail.references
    : mail.references
      ? [mail.references]
      : [];
  const autoSubmitted = header(mail, "auto-submitted").toLowerCase();
  const precedence = header(mail, "precedence").toLowerCase();
  const isAutoReply =
    !isDsn &&
    ((autoSubmitted !== "" && autoSubmitted !== "no") ||
      /auto_reply|auto-reply|bulk|junk/.test(precedence) ||
      header(mail, "x-autoreply") !== "" ||
      header(mail, "x-autorespond") !== "" ||
      AUTO_SUBJECT.test(mail.subject ?? ""));

  return {
    messageId: mail.messageId ?? null,
    inReplyTo: mail.inReplyTo ?? null,
    references,
    fromEmail: mail.from?.value?.[0]?.address?.toLowerCase() ?? null,
    subject: sanitizeExcerpt(mail.subject ?? "", 500),
    excerpt: sanitizeExcerpt(mail.text ?? ""),
    receivedAt: mail.date && !Number.isNaN(mail.date.getTime()) ? mail.date : fallbackDate,
    isDsn,
    dsnStatus: isDsn ? status : null,
    dsnRecipient: isDsn ? (recipientRaw?.toLowerCase() ?? null) : null,
    citedIds: extractIds(raw),
    isAutoReply,
  };
}
