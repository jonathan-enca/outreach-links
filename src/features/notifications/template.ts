import { t } from "@/lib/messages";
import type { NotificationRow } from "@/features/settings/notification-keys";

/**
 * Gabarit commun des emails de notification (maquette validée : docs/mockups/notifications.html).
 * Même coque que les emails de connexion : fond gris, carte blanche de 520 px, styles en ligne,
 * tableaux. Tout texte est échappé ; `**…**` met en gras.
 */
export type ChipTone = "ok" | "info" | "warn";

export type Block =
  | { p: string; muted?: boolean }
  | { heading: string }
  /** Lignes « libellé → valeur ». `plain` : le libellé est le sujet (un site), pas une étiquette. */
  | { lines: readonly (readonly [string, string])[]; plain?: boolean }
  | { chips: readonly { label: string; chip: string; tone: ChipTone }[] }
  | { tiles: readonly { value: number; label: string; good?: boolean }[] }
  /** Barre de progression, de 0 à 100. */
  | { bar: number }
  | { highlight: { title: string; body: string } };

export interface NotificationEmail {
  /** Notification à l'origine de l'email : décide du pied (désinscription ou « toujours envoyé »). */
  key: NotificationRow;
  subject: string;
  preheader: string;
  title: string;
  blocks: readonly Block[];
  cta: { label: string; url: string };
}

export interface Rendered {
  subject: string;
  text: string;
  html: string;
  /** En-têtes d'email : désinscription en un clic pour les emails qu'on peut couper. */
  headers?: Record<string, string>;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texte échappé, `**gras**` rendu en <b>. */
const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
const bare = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

const FONT = "Inter, Helvetica, Arial, sans-serif";
const INK = "#0f172a";
const MUTED = "#526074";
const NAVY = "#003070";
const CHIP: Record<ChipTone, { bg: string; fg: string }> = {
  ok: { bg: "#d1fae5", fg: "#065f46" },
  info: { bg: "#e0f2fe", fg: "#075985" },
  warn: { bg: "#fef3c7", fg: "#92400e" },
};

const row = (inner: string, pad = "0 32px") =>
  `<tr><td style="padding:${pad};font:400 15px/1.55 ${FONT};color:${INK}">${inner}</td></tr>`;

function box(rows: string[]): string {
  const body = rows
    .map(
      (r, i) =>
        `<tr><td style="padding:10px 0;${i < rows.length - 1 ? "border-bottom:1px solid #eef2f6;" : ""}font:400 14.5px/1.5 ${FONT}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${r}</tr></table></td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e8ef;border-radius:12px;margin:2px 0 12px 0"><tr><td style="padding:4px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr></table>`;
}

function blockHtml(b: Block): string {
  if ("p" in b) {
    return `<p style="margin:0 0 12px 0;${b.muted ? `font-size:13.5px;color:${MUTED}` : ""}">${rich(b.p)}</p>`;
  }
  if ("heading" in b) {
    return `<p style="margin:6px 0 8px 0;font-weight:600">${esc(b.heading)}</p>`;
  }
  if ("lines" in b) {
    return box(
      b.lines.map(
        ([label, value]) =>
          `<td style="color:${b.plain ? INK : MUTED};${b.plain ? "font-weight:500;" : ""}padding-right:12px">${esc(label)}</td><td align="right" style="font-weight:500;color:${INK};word-break:break-word">${esc(value)}</td>`,
      ),
    );
  }
  if ("chips" in b) {
    return box(
      b.chips.map(
        (c) =>
          `<td style="font-weight:500;color:${INK};padding-right:12px;word-break:break-word">${esc(c.label)}</td><td align="right"><span style="display:inline-block;font:600 12.5px/1.5 ${FONT};border-radius:99px;padding:2px 9px;white-space:nowrap;background:${CHIP[c.tone].bg};color:${CHIP[c.tone].fg}">${esc(c.chip)}</span></td>`,
      ),
    );
  }
  if ("tiles" in b) {
    const width = Math.floor(100 / b.tiles.length);
    const cells = b.tiles
      .map(
        (x, i) =>
          `<td width="${width}%" align="center" style="background:#f1f5f9;border-radius:12px;padding:12px 6px;${i ? "border-left:8px solid #ffffff;" : ""}"><div style="font:700 24px/1.2 ${FONT};color:${x.good ? "#047857" : INK}">${x.value}</div><div style="font:400 13px/1.4 ${FONT};color:${MUTED}">${esc(x.label)}</div></td>`,
      )
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:2px 0 14px 0"><tr>${cells}</tr></table>`;
  }
  if ("bar" in b) {
    const pct = Math.max(0, Math.min(100, Math.round(b.bar)));
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 8px 0;background:#e2e8f0;border-radius:99px"><tr><td style="height:10px;line-height:10px;font-size:0"><table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0"><tr><td style="height:10px;line-height:10px;font-size:0;background:${NAVY};border-radius:99px">&nbsp;</td></tr></table></td></tr></table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 12px 0"><tr><td style="background:#f0f6fd;border-radius:12px;padding:14px 16px;font:400 15px/1.55 ${FONT};color:${INK}"><p style="margin:0 0 6px 0;font-weight:600">${esc(b.highlight.title)}</p><p style="margin:0">${esc(b.highlight.body)}</p></td></tr></table>`;
}

function blockText(b: Block): string {
  if ("p" in b) return bare(b.p);
  if ("heading" in b) return b.heading;
  if ("lines" in b) return b.lines.map(([l, v]) => `- ${l} : ${v}`).join("\n");
  if ("chips" in b) return b.chips.map((c) => `- ${c.label} : ${c.chip}`).join("\n");
  if ("tiles" in b) return b.tiles.map((x) => `${x.value} ${x.label}`).join(" · ");
  if ("bar" in b) return "";
  return `${b.highlight.title}\n${b.highlight.body}`;
}

/** Nom affiché d'une notification (celui de l'écran de réglages). */
export const notificationName = (key: NotificationRow): string => t.notifications.items[key].title;

/**
 * Compose l'email. `appUrl` : adresse du produit (logo, réglages). `unsubscribeUrl` : lien signé pour
 * couper ce type d'email ; absent pour un email toujours envoyé (boîte d'envoi, paiement).
 */
export function renderNotification(
  email: NotificationEmail,
  links: { appUrl: string; unsubscribeUrl: string | null; oneClickUrl?: string | null },
): Rendered {
  const F = t.notifications.email;
  const manageUrl = new URL("/app/reglages/notifications", links.appUrl).toString();
  const logo = new URL("/brand/logo-email.png", links.appUrl).toString();
  const why = links.unsubscribeUrl ? F.footerOn(notificationName(email.key)) : F.footerLocked;
  const footLinks = [
    ...(links.unsubscribeUrl ? [[F.unsubscribe, links.unsubscribeUrl] as const] : []),
    [F.manage, manageUrl] as const,
  ];
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>${esc(email.subject)}</title></head><body style="margin:0;padding:0;background:#f1f5f9"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(email.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e8ef;border-radius:16px">${row(
    `<img src="${esc(logo)}" width="140" alt="${esc(t.app.name)}" style="display:block;border:0;outline:none;text-decoration:none;height:auto;width:140px;max-width:140px" />`,
    "28px 32px 0 32px",
  )}${row(
    `<h1 style="margin:0;font:700 22px/1.3 ${FONT};color:${INK}">${esc(email.title)}</h1>`,
    "22px 32px 10px 32px",
  )}${row(email.blocks.map(blockHtml).join(""))}${row(
    `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="border-radius:10px;background:${NAVY}"><a href="${esc(email.cta.url)}" style="display:inline-block;padding:12px 22px;font:600 15px/1.2 ${FONT};color:#ffffff;text-decoration:none;border-radius:10px">${esc(email.cta.label)}</a></td></tr></table>`,
    "6px 32px 26px 32px",
  )}<tr><td style="border-top:1px solid #eef2f6;padding:16px 32px 22px 32px;font:400 12.5px/1.6 ${FONT};color:#6b7280"><p style="margin:0 0 4px 0">${esc(why)}</p><p style="margin:0">${footLinks
    .map(([label, url]) => `<a href="${esc(url)}" style="color:${MUTED}">${esc(label)}</a>`)
    .join(" · ")}</p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    email.title,
    ...email.blocks.map(blockText).filter(Boolean),
    `${email.cta.label} : ${email.cta.url}`,
    why,
    ...footLinks.map(([label, url]) => `${label} : ${url}`),
  ].join("\n\n");
  const headers =
    links.unsubscribeUrl && links.oneClickUrl
      ? {
          "List-Unsubscribe": `<${links.oneClickUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined;
  return { subject: email.subject, text, html, ...(headers ? { headers } : {}) };
}
