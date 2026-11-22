import { t } from "@/lib/messages";
import type { Block, ChipTone, NotificationEmail } from "./template";

/**
 * Les emails de notification, un constructeur pur par email (testés). Ils ne lisent rien : les
 * chiffres viennent de `run.ts`. Aucun texte d'un site tiers n'est recopié, seulement son nom de
 * domaine et le type de sa réponse (un email entrant n'est jamais une source fiable).
 */
const E = t.notifications.emails;

const noScheme = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

const FR_DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});
/** « le 3 octobre », « le 1er décembre ». */
export function frDay(d: Date): string {
  const s = FR_DAY.format(d);
  return `le ${s.startsWith("1 ") ? `1er ${s.slice(2)}` : s}`;
}
export const frMonth = (d: Date): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(d);

/* ---------- 1. Une réponse vous attend ---------- */

export type ReplyKind = keyof typeof E.reply.chips;
const REPLY_TONE: Record<ReplyKind, ChipTone> = {
  accord: "ok",
  conditions: "info",
  question: "info",
  autre: "info",
  paiement: "warn",
  echange: "warn",
};
/** Catégorie de classification → pastille de l'email. */
export function replyKind(category: string | null): ReplyKind {
  switch (category) {
    case "accepte_lien_pose":
      return "accord";
    case "interesse_conditions":
      return "conditions";
    case "demande_paiement":
      return "paiement";
    case "demande_echange":
      return "echange";
    case "question":
      return "question";
    default:
      return "autre";
  }
}

export function replyEmail(
  replies: readonly { domain: string | null; category: string | null }[],
  url: string,
): NotificationEmail {
  const R = E.reply;
  const rows = replies.map((r) => {
    const kind = replyKind(r.category);
    return { label: r.domain ?? R.unknownSite, chip: R.chips[kind], tone: REPLY_TONE[kind] };
  });
  const one = rows.length === 1 ? rows[0]! : null;
  const kinds = [...new Set(rows.map((r) => r.chip))];
  return {
    key: "reply_waiting",
    subject: one ? R.subjectOne(one.label) : R.subjectMany(rows.length),
    preheader: one ? `${R.kind} : ${one.chip}.` : `${kinds.join(", ")}.`,
    title: one ? R.titleOne(one.label) : R.titleMany(rows.length),
    blocks: [{ p: one ? R.bodyOne : R.bodyMany }, { chips: rows }],
    cta: { label: one ? R.ctaOne : R.ctaMany, url },
  };
}

/* ---------- 2 et 3. Des messages sont à valider, et leur rappel ---------- */

export interface PendingCounts {
  messages: number;
  forms: number;
  /** Nom du site quand tous les messages sont pour le même ; sinon `null`. */
  domain: string | null;
  /** Premier départ possible : « lundi 24 novembre à 9 h », `null` si la boîte envoie déjà ou est inconnue. */
  firstStart: string | null;
  /** Vrai si une boîte est connectée et envoie en ce moment. */
  sendingNow: boolean;
}

export function toValidateEmail(c: PendingCounts, url: string): NotificationEmail {
  const V = E.toValidate;
  const onlyForms = c.messages === 0;
  const lines: [string, string][] = [];
  if (c.messages > 0) lines.push([V.lineMessages, String(c.messages)]);
  if (c.forms > 0) lines.push([V.lineForms, String(c.forms)]);
  if (c.messages > 0 && (c.firstStart || c.sendingNow)) {
    lines.push([V.lineStart, c.firstStart ?? V.startNow]);
  }
  return {
    key: "to_validate",
    subject: onlyForms ? V.subjectForms(c.forms) : V.subject(c.messages, c.domain),
    preheader: onlyForms ? V.bodyForms : V.pre(c.firstStart),
    title: onlyForms ? V.subjectForms(c.forms) : V.title(c.messages),
    blocks: [{ p: onlyForms ? V.bodyForms : V.body }, { lines }],
    cta: { label: V.cta, url },
  };
}

export function reminderEmail(
  c: { messages: number; days: number; domain: string | null },
  url: string,
): NotificationEmail {
  const R = E.reminder;
  return {
    key: "to_validate",
    subject: R.subject(c.messages),
    preheader: R.pre(c.days),
    title: R.subject(c.messages),
    blocks: [{ p: R.body(c.days, c.domain) }, { p: R.only, muted: true }],
    cta: { label: R.cta, url },
  };
}

/* ---------- 5. Votre analyse est prête ---------- */

export function analysisEmail(
  a: { domain: string; kept: number; studied: number },
  url: string,
): NotificationEmail {
  const A = E.analysis;
  const tiles = [
    ...(a.studied > a.kept ? [{ value: a.studied, label: A.studied }] : []),
    { value: a.kept, label: A.kept(a.kept), good: true },
  ];
  return {
    key: "analysis_ready",
    subject: A.subject(a.domain),
    preheader: A.pre(a.kept, a.studied),
    title: A.subject(a.domain),
    blocks: [{ p: A.body }, { tiles }],
    cta: { label: A.cta, url },
  };
}

/* ---------- 6. Un lien est en ligne ---------- */

export interface LiveLink {
  sourceDomain: string;
  sourceUrl: string;
  targetUrl: string;
  anchor: string | null;
  rel: string | null;
  siteDomain: string;
}

export function linkLiveEmail(l: LiveLink, url: string): NotificationEmail {
  const L = E.linkLive;
  const lines: [string, string][] = [
    [L.lineSource, noScheme(l.sourceUrl)],
    [L.lineTarget, noScheme(l.targetUrl)],
  ];
  if (l.anchor?.trim()) lines.push([L.lineAnchor, `« ${l.anchor.trim().slice(0, 80)} »`]);
  if (l.rel) lines.push([L.lineFollowed, l.rel === "dofollow" ? L.yes : L.no]);
  return {
    key: "link_live",
    subject: L.subject,
    preheader: L.pre(l.sourceDomain, l.siteDomain),
    title: L.subject,
    blocks: [{ p: L.body(l.sourceDomain) }, { lines }, { p: L.after, muted: true }],
    cta: { label: L.cta, url },
  };
}

/* ---------- 7. Un lien a disparu ou changé ---------- */

export type LinkAlert = keyof typeof E.linkLost.state;
export const isLinkAlert = (v: unknown): v is LinkAlert =>
  typeof v === "string" && v in E.linkLost.state;

export interface ChangedLink {
  sourceDomain: string;
  sourceUrl: string;
  alert: LinkAlert;
  firstLiveAt: Date | null;
  alertAt: Date;
  siteDomain: string;
}

export function linkLostEmail(links: readonly ChangedLink[], url: string): NotificationEmail {
  const L = E.linkLost;
  if (links.length === 1) {
    const l = links[0]!;
    const gone = l.alert === "disparu";
    const lines: [string, string][] = [[L.linePage, noScheme(l.sourceUrl)]];
    if (l.firstLiveAt) lines.push([L.lineSince, frDay(l.firstLiveAt)]);
    lines.push([gone ? L.lineGone : L.lineChanged, frDay(l.alertAt)]);
    const body =
      l.alert === "disparu"
        ? L.bodyGone(l.sourceDomain)
        : l.alert === "devenu_nofollow"
          ? L.bodyNofollow(l.sourceDomain)
          : L.bodyNoindex(l.sourceDomain);
    return {
      key: "link_lost",
      subject: gone ? L.subjectGone(l.siteDomain) : L.subjectChanged(l.siteDomain),
      preheader: L.pre(l.sourceDomain, L.state[l.alert]),
      title: gone ? L.titleGone : L.titleChanged,
      blocks: [{ p: body }, { lines }, { p: L.advice }],
      cta: { label: L.ctaOne, url },
    };
  }
  return {
    key: "link_lost",
    subject: L.subjectMany(links.length),
    preheader: links.map((l) => l.sourceDomain).join(", "),
    title: L.subjectMany(links.length),
    blocks: [
      { p: L.bodyMany },
      { lines: links.map((l) => [l.sourceDomain, L.short[l.alert]] as const), plain: true },
      { p: L.advice },
    ],
    cta: { label: L.ctaMany, url },
  };
}

/* ---------- 8. Votre boîte d'envoi a un problème ---------- */

export function mailboxEmail(
  m: { email: string; pending: number },
  url: string,
): NotificationEmail {
  const M = E.mailbox;
  const blocks: Block[] = [{ p: M.body(m.email) }];
  if (m.pending > 0) blocks.push({ lines: [[M.linePending, String(m.pending)]] });
  blocks.push({ p: M.after });
  return {
    key: "mailbox",
    subject: M.subject,
    preheader: M.pre(m.pending),
    title: M.title,
    blocks,
    cta: { label: M.cta, url },
  };
}

/* ---------- 9. Vos envois du mois sont presque épuisés ---------- */

export const QUOTA_LEVELS = [80, 100] as const;
export type QuotaLevel = (typeof QUOTA_LEVELS)[number];

/** Palier atteint (le plus haut), ou `null` sous 80 %. */
export function quotaLevel(used: number, cap: number): QuotaLevel | null {
  if (cap <= 0) return null;
  if (used >= cap) return 100;
  return used * 100 >= cap * 80 ? 80 : null;
}

export interface QuotaState {
  used: number;
  cap: number;
  level: QuotaLevel;
  /** Nom de l'offre (« Starter ») ; `null` pendant la bêta sans abonnement. */
  plan: string | null;
  /** Offre au-dessus, si elle existe. */
  next: { plan: string; cap: number } | null;
  now: Date;
}

export function quotaEmail(q: QuotaState, url: string): NotificationEmail {
  const Q = E.quota;
  const month = frMonth(q.now);
  const y = q.now.getUTCFullYear();
  const m = q.now.getUTCMonth();
  const reset = frDay(new Date(Date.UTC(y, m + 1, 1, 12))).replace(/^le /, "");
  const lastDay = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
  const left = Math.max(0, q.cap - q.used);
  const used = Math.min(q.used, q.cap);
  const full = q.level === 100;
  const blocks: Block[] = [
    { bar: (used / q.cap) * 100 },
    { p: q.plan ? Q.usedPlan(used, q.cap, q.plan) : Q.usedBeta(used, q.cap), muted: true },
    { p: full ? Q.body100(reset) : Q.body80(reset) },
  ];
  if (q.next) blocks.push({ p: Q.upsell(q.next.plan, q.next.cap), muted: true });
  return {
    key: "quota",
    subject: full ? Q.subject100(q.cap, month) : Q.subject80(used, q.cap, month),
    preheader: full ? Q.pre100(reset) : Q.pre80(left, `${lastDay} ${month}`),
    title: full ? Q.title100(q.cap, month) : Q.title80(left),
    blocks,
    cta: { label: Q.cta, url },
  };
}

/* ---------- 10. Une campagne n'a plus rien à envoyer ---------- */

export interface IdleCampaign {
  domain: string;
  sent: number;
  replies: number;
  links: number;
  /** Sites du plan pas encore contactés. */
  left: number;
}

export function idleEmail(
  c: IdleCampaign,
  urls: { targets: string; campaigns: string },
): NotificationEmail {
  const I = E.idle;
  const T = E.tiles;
  return {
    key: "campaign_idle",
    subject: I.subject(c.domain),
    preheader: I.pre(c.sent, c.replies, c.links, c.left),
    title: I.title,
    blocks: [
      { p: I.body(c.domain) },
      {
        tiles: [
          { value: c.sent, label: T.sent(c.sent) },
          { value: c.replies, label: T.replies(c.replies) },
          { value: c.links, label: T.links(c.links), good: true },
        ],
      },
      { p: c.left > 0 ? I.left(c.left) : I.none },
    ],
    cta:
      c.left > 0 ? { label: I.cta, url: urls.targets } : { label: I.ctaNone, url: urls.campaigns },
  };
}

/* ---------- 13. Résumé de la semaine ---------- */

export interface WeekSite {
  domain: string;
  sent: number;
  replies: number;
  links: number;
}
export interface WeekSummary {
  sites: readonly WeekSite[];
  /** Domaines des sites qui ont posé un lien cette semaine. */
  newLinks: readonly string[];
  todo: { replies: number; messages: number; forms: number };
}

/** Une semaine sans envoi, sans réponse, sans lien et sans rien à faire ne mérite pas d'email. */
export function weekHasNews(w: WeekSummary): boolean {
  const activity = w.sites.some((s) => s.sent + s.replies + s.links > 0);
  return activity || w.todo.replies + w.todo.messages + w.todo.forms > 0;
}

export function weeklyEmail(w: WeekSummary, url: string): NotificationEmail {
  const W = E.weekly;
  const T = E.tiles;
  const sum = (k: "sent" | "replies" | "links") => w.sites.reduce((n, s) => n + s[k], 0);
  const sent = sum("sent");
  const replies = sum("replies");
  const links = sum("links");
  const todoCount = w.todo.replies + w.todo.messages + w.todo.forms;
  const parts = [
    ...(links ? [W.partLinks(links)] : []),
    ...(replies ? [W.partReplies(replies)] : []),
    ...(!links && !replies && sent ? [W.partSent(sent)] : []),
  ];
  const blocks: Block[] = [
    {
      tiles: [
        { value: sent, label: T.sent(sent) },
        { value: replies, label: T.replies(replies) },
        { value: links, label: T.links(links), good: true },
      ],
    },
  ];
  const active = w.sites.filter((s) => s.sent + s.replies + s.links > 0);
  if (w.sites.length > 1 && active.length > 0) {
    blocks.push(
      { heading: W.sitesTitle },
      {
        lines: active.map((s) => [s.domain, W.siteLine(s.sent, s.replies, s.links)] as const),
        plain: true,
      },
    );
  }
  if (w.newLinks.length > 0) {
    blocks.push(
      { heading: W.linksTitle },
      { lines: w.newLinks.slice(0, 10).map((d) => [d, W.live] as const), plain: true },
    );
  }
  const todo: [string, string][] = [];
  if (w.todo.replies) todo.push([W.todoReplies, String(w.todo.replies)]);
  if (w.todo.messages) todo.push([W.todoMessages, String(w.todo.messages)]);
  if (w.todo.forms) todo.push([W.todoForms, String(w.todo.forms)]);
  if (todo.length) blocks.push({ heading: W.todoTitle }, { lines: todo });
  return {
    key: "weekly",
    subject: W.subject(parts),
    preheader: W.pre(sent, todoCount),
    title: w.sites.length === 1 ? W.titleOne(w.sites[0]!.domain) : W.titleMany,
    blocks,
    cta: { label: W.cta, url },
  };
}

/* ---------- 14. Bilan du mois ---------- */

/** « de novembre », « d'avril », « d'octobre ». */
export function ofMonth(d: Date): string {
  const m = frMonth(d);
  return /^[aeiouyéèê]/i.test(m) ? `d'${m}` : `de ${m}`;
}

export interface MonthSummary {
  /** Un jour du mois écoulé, et un jour du mois qui commence. */
  month: Date;
  next: Date;
  sent: number;
  replies: number;
  links: number;
  liveEver: number;
  lost: number;
  /** Campagnes par mois comprises dans l'offre ; `null` si aucune nouvelle campagne n'est possible. */
  campaigns: number | null;
}

/** Sans activité dans le mois et sans campagne à proposer, il n'y a rien à dire. */
export function monthHasNews(m: MonthSummary): boolean {
  return m.sent + m.replies + m.links + m.lost > 0 || m.campaigns !== null;
}

export function monthlyEmail(
  m: MonthSummary,
  urls: { campaigns: string; home: string },
): NotificationEmail {
  const M = E.monthly;
  const T = E.tiles;
  const month = ofMonth(m.month);
  const next = ofMonth(m.next);
  const active = m.sent + m.replies + m.links + m.lost > 0;
  const blocks: Block[] = [];
  if (active) {
    blocks.push(
      {
        tiles: [
          { value: m.sent, label: T.sent(m.sent) },
          { value: m.replies, label: T.replies(m.replies) },
          { value: m.links, label: T.links(m.links), good: true },
        ],
      },
      {
        lines: [
          [M.lineLive, String(m.liveEver)],
          ...(m.sent > 0 ? [[M.lineReplied, M.replied(m.replies, m.sent)] as const] : []),
          [M.lineLost, String(m.lost)],
        ],
      },
    );
  }
  if (m.campaigns !== null) {
    blocks.push({
      highlight: { title: M.campaignTitle(next), body: M.campaignBody(m.campaigns) },
    });
  }
  return {
    key: "monthly",
    subject: active ? M.subject(month, m.links) : M.subjectQuiet(next),
    preheader: active
      ? M.pre(m.sent, m.replies, m.campaigns !== null ? next : null)
      : M.campaignBody(m.campaigns ?? 1),
    title: active ? M.title(month) : M.campaignTitle(next),
    blocks,
    cta:
      m.campaigns !== null
        ? { label: M.cta(next), url: urls.campaigns }
        : { label: M.ctaNone, url: urls.home },
  };
}
