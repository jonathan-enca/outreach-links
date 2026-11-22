import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/env";
import { resendSender, type SendTransactional } from "@/features/analysis/notify";
import { betaEnabled } from "@/features/audits/beta";
import { campaignBlocked, campaignsEver, loadEntitlements } from "@/features/billing/entitlements";
import {
  checkSendAllowance,
  effectivePlan,
  monthStart,
  paymentPauseAt,
} from "@/features/billing/plans";
import { formatSendTime } from "@/features/sending/queue-note";
import { isInSendWindow, nextSendStart } from "@/features/sending/schedule";
import {
  isLocked,
  type NotificationKey,
  type NotificationRow,
} from "@/features/settings/notification-keys";
import { repliesToNotify } from "@/features/settings/notifications";
import { siteHref } from "@/features/shell/next-step";
import { logger } from "@/lib/logger";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  idleEmail,
  isLinkAlert,
  linkLiveEmail,
  linkLostEmail,
  mailboxEmail,
  monthHasNews,
  monthlyEmail,
  paymentEmail,
  quotaEmail,
  quotaLevel,
  reminderEmail,
  replyEmail,
  toValidateEmail,
  weekHasNews,
  weeklyEmail,
  type ChangedLink,
  type WeekSite,
} from "./emails";
import { notificationSecret, unsubscribePath } from "./secret";
import { renderNotification, type NotificationEmail } from "./template";
import { unsubscribeToken } from "./unsubscribe";

/**
 * Notifications par email : qui prévenir, de quoi, et une seule fois. Chaque envoi laisse une trace
 * dans `events` (`notify.*`, sans adresse) qui sert de mémoire : c'est elle qui empêche un doublon.
 * Emails transactionnels seulement (Resend) ; sans service d'email, rien ne part et rien n'est marqué.
 */
type Client = SupabaseClient<Database>;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const REAL = ["en_cours", "envoye", "a_reessayer", "echec"];
/** Délai du rappel unique « messages non validés ». */
export const REMINDER_AFTER_DAYS = 3;

export interface NotifyCtx {
  db: Client;
  send: SendTransactional;
  now: Date;
  appUrl: string;
  secret: string | null;
}

export function notifyCtx(db: Client, now: Date = new Date()): NotifyCtx | null {
  const send = resendSender();
  if (!send) return null;
  return {
    db,
    send,
    now,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    secret: notificationSecret(),
  };
}

/** Les emails qui peuvent attendre partent du lundi au vendredi, de 8 h à 19 h (heure de Paris). */
export function isQuietTime(now: Date): boolean {
  return !isInSendWindow(now, { timezone: "Europe/Paris", startHour: 8, endHour: 19 });
}

const url = (ctx: NotifyCtx, path: string) => new URL(path, ctx.appUrl).toString();
const iso = (ctx: NotifyCtx, msAgo: number) => new Date(ctx.now.getTime() - msAgo).toISOString();
const uniq = <T>(xs: readonly T[]) => [...new Set(xs)];
function groupBy<T>(xs: readonly T[], key: (x: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const x of xs) out.set(key(x), [...(out.get(key(x)) ?? []), x]);
  return out;
}

/** Espaces qui ont coupé cette notification. */
async function disabled(db: Client, key: NotificationKey): Promise<Set<string>> {
  const { data } = await db.from("notification_prefs").select("workspace_id").eq(key, false);
  return new Set((data ?? []).map((p) => p.workspace_id));
}

interface Trace {
  workspace_id: string;
  created_at: string;
  payload: Record<string, unknown>;
}
/** Traces d'envoi d'un type depuis une date (mémoire anti-doublon). */
async function traces(db: Client, type: string, sinceIso: string): Promise<Trace[]> {
  const { data } = await db
    .from("events")
    .select("workspace_id, created_at, payload")
    .eq("type", type)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000);
  return (data ?? []).map((e) => ({
    workspace_id: e.workspace_id,
    created_at: e.created_at,
    payload: (e.payload ?? {}) as Record<string, unknown>,
  }));
}

async function ownerEmail(db: Client, workspaceId: string): Promise<string | null> {
  const { data: members } = await db
    .from("memberships")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);
  const owner = (members ?? []).find((m) => m.role === "owner") ?? members?.[0];
  if (!owner) return null;
  const { data: user } = await db.auth.admin.getUserById(owner.user_id);
  return user.user?.email ?? null;
}

/** Envoie l'email au propriétaire de l'espace puis écrit la trace. Jamais bloquant. */
async function deliver(
  ctx: NotifyCtx,
  workspaceId: string,
  email: NotificationEmail,
  trace: { type: string; payload: Record<string, unknown> },
): Promise<boolean> {
  try {
    const to = await ownerEmail(ctx.db, workspaceId);
    if (!to) return false;
    const key: NotificationRow = email.key;
    const unsubscribeUrl =
      isLocked(key) || !ctx.secret
        ? null
        : url(ctx, unsubscribePath(unsubscribeToken(workspaceId, key, ctx.secret)));
    await ctx.send({ to, ...renderNotification(email, { appUrl: ctx.appUrl, unsubscribeUrl }) });
    await ctx.db.from("events").insert({
      workspace_id: workspaceId,
      actor_id: null,
      type: trace.type,
      payload: trace.payload as Json,
    });
    return true;
  } catch (e) {
    logger.warn("notification non envoyée", {
      workspaceId,
      type: trace.type,
      error: (e as Error).message.slice(0, 200),
    });
    return false;
  }
}

/** Domaine de chaque site, et site de chaque plan, pour une liste d'espaces. */
async function sitesAndPlans(db: Client, workspaceIds: readonly string[]) {
  if (workspaceIds.length === 0) {
    return { siteDomain: new Map<string, string>(), planSite: new Map<string, string>() };
  }
  const [{ data: sites }, { data: plans }] = await Promise.all([
    db.from("sites").select("id, domain").in("workspace_id", workspaceIds),
    db.from("link_plans").select("id, site_id").in("workspace_id", workspaceIds),
  ]);
  return {
    siteDomain: new Map((sites ?? []).map((s) => [s.id, s.domain])),
    planSite: new Map((plans ?? []).map((p) => [p.id, p.site_id])),
  };
}

/* ---------- 1. Une réponse vous attend ---------- */

export async function notifyReplies(ctx: NotifyCtx): Promise<number> {
  const since = iso(ctx, 48 * HOUR);
  const [{ data: drafts }, sentTraces, off] = await Promise.all([
    ctx.db
      .from("reply_drafts")
      .select("id, workspace_id, inbound_message_id, sent_message_id")
      .eq("status", "brouillon")
      .eq("kind", "reponse")
      .gte("created_at", since)
      .limit(500),
    traces(ctx.db, "notify.reply_waiting", since),
    disabled(ctx.db, "reply_waiting"),
  ]);
  const notified = new Set(
    sentTraces.flatMap((e) => {
      const ids = e.payload.reply_draft_ids;
      return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string") : [];
    }),
  );
  const groups = repliesToNotify(drafts ?? [], notified, off);
  if (groups.size === 0) return 0;
  const wanted = (drafts ?? []).filter((d) => groups.get(d.workspace_id)?.includes(d.id));
  // Nom du site et type de réponse : jamais le texte du message reçu.
  const [{ data: classes }, { data: sent }] = await Promise.all([
    ctx.db
      .from("reply_classifications")
      .select("inbound_message_id, category, validated_category")
      .in("inbound_message_id", uniq(wanted.map((d) => d.inbound_message_id))),
    ctx.db
      .from("sent_messages")
      .select("id, draft_id")
      .in("id", uniq(wanted.map((d) => d.sent_message_id))),
  ]);
  const { data: targetDrafts } = await ctx.db
    .from("target_drafts")
    .select("id, plan_item_id")
    .in("id", uniq((sent ?? []).map((s) => s.draft_id)));
  const { data: items } = await ctx.db
    .from("link_plan_items")
    .select("id, source_domain")
    .in("id", uniq((targetDrafts ?? []).map((d) => d.plan_item_id)));
  const category = new Map(
    (classes ?? []).map((c) => [c.inbound_message_id, c.validated_category ?? c.category]),
  );
  const draftOfSent = new Map((sent ?? []).map((s) => [s.id, s.draft_id]));
  const itemOfDraft = new Map((targetDrafts ?? []).map((d) => [d.id, d.plan_item_id]));
  const domainOfItem = new Map((items ?? []).map((i) => [i.id, i.source_domain]));
  let count = 0;
  for (const [workspaceId, ids] of groups) {
    const rows = wanted
      .filter((d) => ids.includes(d.id))
      .map((d) => ({
        domain:
          domainOfItem.get(itemOfDraft.get(draftOfSent.get(d.sent_message_id) ?? "") ?? "") ?? null,
        category: category.get(d.inbound_message_id) ?? null,
      }));
    const ok = await deliver(ctx, workspaceId, replyEmail(rows, url(ctx, "/app/a-valider")), {
      type: "notify.reply_waiting",
      payload: { reply_draft_ids: ids },
    });
    if (ok) count++;
  }
  return count;
}

/* ---------- 2 et 3. Des messages sont à valider, et le rappel unique ---------- */

/**
 * Formulaires à remplir à la main (pur, testé). Un brouillon « formulaire » a déjà sa tâche dès sa
 * rédaction : on compte les tâches à faire, plus les seuls brouillons qui n'en ont pas, pour ne
 * jamais annoncer deux fois le même formulaire (constaté en production le 22/11 : 84 au lieu de 45).
 */
export function countForms(
  formDrafts: readonly { plan_item_id: string }[],
  openTasks: readonly { plan_item_id: string }[],
): number {
  const withTask = new Set(openTasks.map((x) => x.plan_item_id));
  return openTasks.length + formDrafts.filter((d) => !withTask.has(d.plan_item_id)).length;
}

/**
 * Décision pour un espace (pur, testé). `last` : dernier email « à valider » (30 jours au plus).
 * Un nouvel email quand des messages sont apparus depuis, un par jour au plus ; sinon un seul rappel
 * quand les messages annoncés attendent toujours après 3 jours.
 */
export function pendingDecision(input: {
  generatedAt: readonly string[];
  last: string | null;
  reminded: boolean;
  now: Date;
}): { kind: "new" } | { kind: "reminder"; days: number } | null {
  const { generatedAt, last, reminded, now } = input;
  if (generatedAt.length === 0) return null;
  if (!last) return { kind: "new" };
  const lastMs = Date.parse(last);
  const age = now.getTime() - lastMs;
  const fresh = generatedAt.some((g) => Date.parse(g) > lastMs);
  if (fresh) return age >= DAY ? { kind: "new" } : null;
  if (!reminded && age >= REMINDER_AFTER_DAYS * DAY) {
    return { kind: "reminder", days: Math.floor(age / DAY) };
  }
  return null;
}

export async function notifyToValidate(ctx: NotifyCtx): Promise<number> {
  if (isQuietTime(ctx.now)) return 0;
  const since = iso(ctx, 30 * DAY);
  const [{ data: drafts }, { data: tasks }, sentTraces, reminders, off] = await Promise.all([
    ctx.db
      .from("target_drafts")
      .select("id, workspace_id, plan_id, plan_item_id, channel, generated_at, snoozed_until")
      .eq("status", "brouillon")
      .eq("ready", true)
      .limit(5000),
    ctx.db
      .from("manual_tasks")
      .select("id, workspace_id, plan_item_id, status")
      .not("status", "in", "(fait,ignoree)")
      .limit(5000),
    traces(ctx.db, "notify.to_validate", since),
    traces(ctx.db, "notify.to_validate_reminder", since),
    disabled(ctx.db, "to_validate"),
  ]);
  const pending = (drafts ?? []).filter(
    (d) =>
      !off.has(d.workspace_id) &&
      !(d.snoozed_until && Date.parse(d.snoozed_until) > ctx.now.getTime()),
  );
  const byWorkspace = groupBy(pending, (d) => d.workspace_id);
  if (byWorkspace.size === 0) return 0;
  const workspaceIds = [...byWorkspace.keys()];
  const [{ siteDomain, planSite }, { data: boxes }] = await Promise.all([
    sitesAndPlans(ctx.db, workspaceIds),
    ctx.db
      .from("mailboxes")
      .select(
        "workspace_id, timezone, send_window_start, send_window_end, send_days, sending_paused",
      )
      .in("workspace_id", workspaceIds)
      .eq("status", "verifiee"),
  ]);
  let count = 0;
  for (const [workspaceId, rows] of byWorkspace) {
    const last = sentTraces.find((e) => e.workspace_id === workspaceId)?.created_at ?? null;
    const reminded =
      last !== null && reminders.some((e) => e.workspace_id === workspaceId && e.created_at > last);
    const decision = pendingDecision({
      generatedAt: rows.map((r) => r.generated_at),
      last,
      reminded,
      now: ctx.now,
    });
    if (!decision) continue;
    const domains = uniq(rows.map((r) => siteDomain.get(planSite.get(r.plan_id) ?? "") ?? ""));
    const domain = domains.length === 1 && domains[0] ? domains[0] : null;
    const messages = rows.filter((r) => r.channel !== "formulaire").length;
    const here = "/app/a-valider";
    if (decision.kind === "reminder") {
      const announced = rows.filter((r) => Date.parse(r.generated_at) <= Date.parse(last!)).length;
      const ok = await deliver(
        ctx,
        workspaceId,
        reminderEmail({ messages: announced, days: decision.days, domain }, url(ctx, here)),
        { type: "notify.to_validate_reminder", payload: { count: announced } },
      );
      if (ok) count++;
      continue;
    }
    const forms = countForms(
      rows.filter((r) => r.channel === "formulaire"),
      (tasks ?? []).filter((x) => x.workspace_id === workspaceId),
    );
    const windows = (boxes ?? [])
      .filter((b) => b.workspace_id === workspaceId && !b.sending_paused)
      .map((b) => ({
        timezone: b.timezone,
        startHour: b.send_window_start,
        endHour: b.send_window_end,
        days: b.send_days,
      }));
    const sendingNow = windows.some((w) => isInSendWindow(ctx.now, w));
    const starts = sendingNow
      ? []
      : windows
          .map((w) => ({ at: nextSendStart(ctx.now, w), timezone: w.timezone }))
          .filter((s): s is { at: Date; timezone: string } => s.at !== null)
          .sort((a, b) => a.at.getTime() - b.at.getTime());
    const firstStart = starts[0] ? formatSendTime(starts[0].at, starts[0].timezone, true) : null;
    const ok = await deliver(
      ctx,
      workspaceId,
      toValidateEmail({ messages, forms, domain, firstStart, sendingNow }, url(ctx, here)),
      { type: "notify.to_validate", payload: { messages, forms } },
    );
    if (ok) count++;
  }
  return count;
}

/* ---------- 6. Un lien est en ligne (le premier de chaque site) ---------- */

export async function notifyLinkLive(ctx: NotifyCtx): Promise<number> {
  const { data: fresh } = await ctx.db
    .from("links")
    .select(
      "id, workspace_id, site_id, source_domain, source_url, target_url, anchor_found, rel, first_live_at",
    )
    .gte("first_live_at", iso(ctx, 48 * HOUR))
    .order("first_live_at", { ascending: true })
    .limit(500);
  if (!fresh?.length) return 0;
  const siteIds = uniq(fresh.map((l) => l.site_id));
  const [{ data: earlier }, { data: told }, { data: sites }, off] = await Promise.all([
    ctx.db
      .from("links")
      .select("site_id")
      .in("site_id", siteIds)
      .lt("first_live_at", iso(ctx, 48 * HOUR))
      .limit(5000),
    ctx.db
      .from("events")
      .select("payload")
      .eq("type", "notify.link_live")
      .in("workspace_id", uniq(fresh.map((l) => l.workspace_id)))
      .limit(5000),
    ctx.db.from("sites").select("id, domain").in("id", siteIds),
    disabled(ctx.db, "link_live"),
  ]);
  const done = new Set([
    ...(earlier ?? []).map((l) => l.site_id),
    ...(told ?? []).map((e) => String((e.payload as { site_id?: unknown } | null)?.site_id ?? "")),
  ]);
  const siteDomain = new Map((sites ?? []).map((s) => [s.id, s.domain]));
  let count = 0;
  for (const l of fresh) {
    if (done.has(l.site_id)) continue;
    done.add(l.site_id);
    // Coupé : rien ne part, et le « premier lien » n'est pas rejoué plus tard.
    if (off.has(l.workspace_id)) continue;
    const ok = await deliver(
      ctx,
      l.workspace_id,
      linkLiveEmail(
        {
          sourceDomain: l.source_domain,
          sourceUrl: l.source_url,
          targetUrl: l.target_url,
          anchor: l.anchor_found,
          rel: l.rel,
          siteDomain: siteDomain.get(l.site_id) ?? "votre site",
        },
        url(ctx, "/app/liens"),
      ),
      { type: "notify.link_live", payload: { site_id: l.site_id, link_id: l.id } },
    );
    if (ok) count++;
  }
  return count;
}

/* ---------- 7. Un lien a disparu ou changé ---------- */

export async function notifyLinkLost(ctx: NotifyCtx): Promise<number> {
  if (isQuietTime(ctx.now)) return 0;
  const since = iso(ctx, 4 * DAY);
  const [{ data: alerts }, sentTraces, off] = await Promise.all([
    ctx.db
      .from("links")
      .select(
        "id, workspace_id, site_id, source_domain, source_url, alert, alert_at, first_live_at",
      )
      .not("alert", "is", null)
      .gte("alert_at", since)
      .limit(500),
    traces(ctx.db, "notify.link_lost", since),
    disabled(ctx.db, "link_lost"),
  ]);
  const told = new Set(
    sentTraces.flatMap((e) =>
      Array.isArray(e.payload.alerts) ? e.payload.alerts.map(String) : [],
    ),
  );
  const mark = (l: { id: string; alert: string | null }) => `${l.id}:${l.alert}`;
  const todo = (alerts ?? []).filter(
    (l) => isLinkAlert(l.alert) && l.alert_at && !told.has(mark(l)) && !off.has(l.workspace_id),
  );
  if (todo.length === 0) return 0;
  const { data: sites } = await ctx.db
    .from("sites")
    .select("id, domain")
    .in("id", uniq(todo.map((l) => l.site_id)));
  const siteDomain = new Map((sites ?? []).map((s) => [s.id, s.domain]));
  let count = 0;
  for (const [workspaceId, rows] of groupBy(todo, (l) => l.workspace_id)) {
    const changed: ChangedLink[] = rows.flatMap((l) =>
      isLinkAlert(l.alert) && l.alert_at
        ? [
            {
              sourceDomain: l.source_domain,
              sourceUrl: l.source_url,
              alert: l.alert,
              firstLiveAt: l.first_live_at ? new Date(l.first_live_at) : null,
              alertAt: new Date(l.alert_at),
              siteDomain: siteDomain.get(l.site_id) ?? "votre site",
            },
          ]
        : [],
    );
    const ok = await deliver(ctx, workspaceId, linkLostEmail(changed, url(ctx, "/app/liens")), {
      type: "notify.link_lost",
      payload: { alerts: rows.map(mark) },
    });
    if (ok) count++;
  }
  return count;
}

/* ---------- 8. Votre boîte d'envoi a un problème (toujours envoyé) ---------- */

/** Messages validés d'un espace qui ne sont pas encore partis. */
async function pendingValidated(db: Client, workspaceId: string): Promise<number> {
  const { data: batches } = await db
    .from("batches")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "valide");
  const batchIds = (batches ?? []).map((b) => b.id);
  if (batchIds.length === 0) return 0;
  const { data: items } = await db.from("batch_items").select("draft_id").in("batch_id", batchIds);
  const draftIds = (items ?? []).map((i) => i.draft_id);
  if (draftIds.length === 0) return 0;
  const { data: sent } = await db
    .from("sent_messages")
    .select("draft_id")
    .in("draft_id", draftIds)
    .eq("step", "initial")
    .eq("dry_run", false);
  const gone = new Set((sent ?? []).map((s) => s.draft_id));
  return draftIds.filter((d) => !gone.has(d)).length;
}

export async function notifyMailbox(ctx: NotifyCtx): Promise<number> {
  const [{ data: boxes }, sentTraces] = await Promise.all([
    ctx.db.from("mailboxes").select("id, workspace_id, email").eq("status", "erreur").limit(500),
    traces(ctx.db, "notify.mailbox", iso(ctx, 7 * DAY)),
  ]);
  const told = new Set(sentTraces.map((e) => String(e.payload.mailbox_id ?? "")));
  let count = 0;
  for (const box of boxes ?? []) {
    if (told.has(box.id)) continue;
    const pending = await pendingValidated(ctx.db, box.workspace_id);
    const ok = await deliver(
      ctx,
      box.workspace_id,
      mailboxEmail({ email: box.email, pending }, url(ctx, "/app/reglages/boite")),
      { type: "notify.mailbox", payload: { mailbox_id: box.id } },
    );
    if (ok) count++;
  }
  return count;
}

/* ---------- 9. Vos envois du mois sont presque épuisés ---------- */

const PLAN_ORDER = ["starter", "pro", "business"] as const;
const planName = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

export async function notifyQuota(ctx: NotifyCtx): Promise<number> {
  if (isQuietTime(ctx.now)) return 0;
  const start = monthStart(ctx.now).toISOString();
  const month = start.slice(0, 7);
  const [{ data: sent }, sentTraces, { data: plans }, off] = await Promise.all([
    ctx.db
      .from("sent_messages")
      .select("workspace_id")
      .eq("dry_run", false)
      .eq("step", "initial")
      .in("status", REAL)
      .gte("claimed_at", start)
      .limit(20000),
    traces(ctx.db, "notify.quota", start),
    ctx.db.from("plans").select("key, monthly_send_cap"),
    disabled(ctx.db, "quota"),
  ]);
  const capOf = new Map((plans ?? []).map((p) => [p.key, p.monthly_send_cap]));
  let count = 0;
  for (const workspaceId of uniq((sent ?? []).map((s) => s.workspace_id))) {
    if (off.has(workspaceId)) continue;
    const allowance = await checkSendAllowance(ctx.db, workspaceId, ctx.now, betaEnabled(), false);
    if (!allowance.allowed) continue;
    const level = quotaLevel(allowance.used, allowance.cap);
    if (!level) continue;
    const reached = sentTraces
      .filter((e) => e.workspace_id === workspaceId && e.payload.month === month)
      .map((e) => Number(e.payload.level));
    if (reached.some((l) => l >= level)) continue;
    const subscribed = (await effectivePlan(ctx.db, workspaceId, ctx.now)) !== "gratuit";
    const nextKey =
      PLAN_ORDER[PLAN_ORDER.indexOf(allowance.plan as (typeof PLAN_ORDER)[number]) + 1];
    const nextCap = nextKey ? capOf.get(nextKey) : undefined;
    const ok = await deliver(
      ctx,
      workspaceId,
      quotaEmail(
        {
          used: allowance.used,
          cap: allowance.cap,
          level,
          plan: subscribed ? planName(allowance.plan) : null,
          next:
            nextKey && nextCap && nextCap > allowance.cap
              ? { plan: planName(nextKey), cap: nextCap }
              : null,
          now: ctx.now,
        },
        url(ctx, "/app/facturation"),
      ),
      { type: "notify.quota", payload: { month, level } },
    );
    if (ok) count++;
  }
  return count;
}

/* ---------- 10. Une campagne n'a plus rien à envoyer ---------- */

/**
 * Campagne à l'arrêt (pur, testé) : au moins un message réel parti, tous les messages validés ont
 * été traités, plus aucun en cours ou à réessayer, et le dernier départ date d'un jour au moins
 * (pour ne pas écrire entre deux lots validés le même jour).
 */
export function isIdle(input: {
  validatedDraftIds: readonly string[];
  sent: readonly { draft_id: string; status: string; claimed_at: string }[];
  now: Date;
}): { lastAt: string } | null {
  const real = input.sent.filter((s) => s.status === "envoye");
  if (real.length === 0) return null;
  if (input.sent.some((s) => s.status === "en_cours" || s.status === "a_reessayer")) return null;
  const handled = new Set(input.sent.map((s) => s.draft_id));
  if (input.validatedDraftIds.some((d) => !handled.has(d))) return null;
  const lastAt = real
    .map((s) => s.claimed_at)
    .sort()
    .at(-1)!;
  const age = input.now.getTime() - Date.parse(lastAt);
  return age >= DAY && age <= 14 * DAY ? { lastAt } : null;
}

export async function notifyIdle(ctx: NotifyCtx): Promise<number> {
  if (isQuietTime(ctx.now)) return 0;
  const since = iso(ctx, 14 * DAY);
  const { data: recent } = await ctx.db
    .from("sent_messages")
    .select("plan_id, workspace_id")
    .eq("dry_run", false)
    .eq("step", "initial")
    .eq("status", "envoye")
    .gte("claimed_at", since)
    .limit(20000);
  const planWorkspace = new Map((recent ?? []).map((s) => [s.plan_id, s.workspace_id]));
  if (planWorkspace.size === 0) return 0;
  const planIds = [...planWorkspace.keys()];
  const [sentTraces, off, { siteDomain, planSite }, { data: waiting }] = await Promise.all([
    traces(ctx.db, "notify.campaign_idle", since),
    disabled(ctx.db, "campaign_idle"),
    sitesAndPlans(ctx.db, uniq([...planWorkspace.values()])),
    ctx.db
      .from("target_drafts")
      .select("plan_id")
      .in("plan_id", planIds)
      .eq("status", "brouillon")
      .eq("ready", true)
      .limit(5000),
  ]);
  const hasWaiting = new Set((waiting ?? []).map((d) => d.plan_id));
  let count = 0;
  for (const planId of planIds) {
    const workspaceId = planWorkspace.get(planId)!;
    // Des messages attendent une validation : c'est l'email « à valider » qui le dit, pas celui-ci.
    if (off.has(workspaceId) || hasWaiting.has(planId)) continue;
    const [{ data: batches }, { data: sent }] = await Promise.all([
      ctx.db.from("batches").select("id").eq("plan_id", planId).eq("status", "valide"),
      ctx.db
        .from("sent_messages")
        .select("id, draft_id, status, claimed_at")
        .eq("plan_id", planId)
        .eq("dry_run", false)
        .eq("step", "initial")
        .limit(5000),
    ]);
    const batchIds = (batches ?? []).map((b) => b.id);
    const { data: batchItems } = batchIds.length
      ? await ctx.db.from("batch_items").select("draft_id").in("batch_id", batchIds)
      : { data: [] as { draft_id: string }[] };
    const idle = isIdle({
      validatedDraftIds: (batchItems ?? []).map((i) => i.draft_id),
      sent: sent ?? [],
      now: ctx.now,
    });
    if (!idle) continue;
    const told = sentTraces.some((e) => e.payload.plan_id === planId && e.created_at > idle.lastAt);
    if (told) continue;
    const siteId = planSite.get(planId);
    const domain = siteId ? siteDomain.get(siteId) : undefined;
    if (!siteId || !domain) continue;
    const sentOk = (sent ?? []).filter((s) => s.status === "envoye");
    const [{ data: items }, { data: drafts }, { data: inbound }, { data: links }] =
      await Promise.all([
        ctx.db.from("link_plan_items").select("id").eq("plan_id", planId).limit(5000),
        ctx.db.from("target_drafts").select("id, plan_item_id").eq("plan_id", planId).limit(5000),
        sentOk.length
          ? ctx.db
              .from("inbound_messages")
              .select("sent_message_id")
              .eq("kind", "reponse")
              .in(
                "sent_message_id",
                sentOk.map((s) => s.id),
              )
          : Promise.resolve({ data: [] as { sent_message_id: string }[] }),
        ctx.db.from("links").select("id").eq("site_id", siteId).not("first_live_at", "is", null),
      ]);
    const itemOfDraft = new Map((drafts ?? []).map((d) => [d.id, d.plan_item_id]));
    const contacted = new Set((sent ?? []).map((s) => itemOfDraft.get(s.draft_id)));
    const left = (items ?? []).filter((i) => !contacted.has(i.id)).length;
    const ok = await deliver(
      ctx,
      workspaceId,
      idleEmail(
        {
          domain,
          sent: sentOk.length,
          replies: uniq((inbound ?? []).map((m) => m.sent_message_id)).length,
          links: links?.length ?? 0,
          left,
        },
        { targets: url(ctx, siteHref.cibles(siteId)), campaigns: url(ctx, "/app/campagnes") },
      ),
      { type: "notify.campaign_idle", payload: { plan_id: planId, left } },
    );
    if (ok) count++;
  }
  return count;
}

/* ---------- 13. Résumé de la semaine ---------- */

export async function notifyWeekly(ctx: NotifyCtx): Promise<number> {
  const since = iso(ctx, 7 * DAY);
  const [
    { data: sites },
    { data: plans },
    { data: sent },
    { data: inbound },
    { data: links },
    { data: replyDrafts },
    { data: drafts },
    { data: tasks },
    sentTraces,
    off,
  ] = await Promise.all([
    ctx.db.from("sites").select("id, workspace_id, domain").limit(5000),
    ctx.db.from("link_plans").select("id, site_id").limit(10000),
    ctx.db
      .from("sent_messages")
      .select("plan_id")
      .eq("dry_run", false)
      .eq("status", "envoye")
      .gte("sent_at", since)
      .limit(20000),
    ctx.db
      .from("inbound_messages")
      .select("sent_message_id")
      .eq("kind", "reponse")
      .gte("received_at", since)
      .limit(5000),
    ctx.db.from("links").select("site_id, source_domain").gte("first_live_at", since).limit(5000),
    ctx.db
      .from("reply_drafts")
      .select("workspace_id")
      .eq("status", "brouillon")
      .eq("kind", "reponse")
      .limit(5000),
    ctx.db
      .from("target_drafts")
      .select("workspace_id, plan_item_id, channel")
      .eq("status", "brouillon")
      .eq("ready", true)
      .limit(5000),
    ctx.db
      .from("manual_tasks")
      .select("workspace_id, plan_item_id")
      .not("status", "in", "(fait,ignoree)")
      .limit(5000),
    traces(ctx.db, "notify.weekly", iso(ctx, 6 * DAY)),
    disabled(ctx.db, "weekly"),
  ]);
  const repliedIds = uniq((inbound ?? []).map((m) => m.sent_message_id));
  const { data: repliedSent } = repliedIds.length
    ? await ctx.db.from("sent_messages").select("id, plan_id").in("id", repliedIds)
    : { data: [] as { id: string; plan_id: string }[] };
  const planSite = new Map((plans ?? []).map((p) => [p.id, p.site_id]));
  const bump = (m: Map<string, number>, k: string | undefined) => {
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  };
  const sentBySite = new Map<string, number>();
  for (const s of sent ?? []) bump(sentBySite, planSite.get(s.plan_id));
  const repliesBySite = new Map<string, number>();
  for (const s of repliedSent ?? []) bump(repliesBySite, planSite.get(s.plan_id));
  const linksBySite = groupBy(links ?? [], (l) => l.site_id);
  const count = <T extends { workspace_id: string }>(rows: readonly T[] | null, w: string) =>
    (rows ?? []).filter((r) => r.workspace_id === w).length;
  const told = new Set(sentTraces.map((e) => e.workspace_id));
  let sentCount = 0;
  for (const [workspaceId, wsSites] of groupBy(sites ?? [], (s) => s.workspace_id)) {
    if (off.has(workspaceId) || told.has(workspaceId)) continue;
    const perSite: WeekSite[] = wsSites.map((s) => ({
      domain: s.domain,
      sent: sentBySite.get(s.id) ?? 0,
      replies: repliesBySite.get(s.id) ?? 0,
      links: linksBySite.get(s.id)?.length ?? 0,
    }));
    const wsDrafts = (drafts ?? []).filter((d) => d.workspace_id === workspaceId);
    const formDrafts = wsDrafts.filter((d) => d.channel === "formulaire");
    const summary = {
      sites: perSite,
      newLinks: wsSites.flatMap((s) => (linksBySite.get(s.id) ?? []).map((l) => l.source_domain)),
      todo: {
        replies: count(replyDrafts, workspaceId),
        messages: wsDrafts.length - formDrafts.length,
        forms: countForms(
          formDrafts,
          (tasks ?? []).filter((x) => x.workspace_id === workspaceId),
        ),
      },
    };
    if (!weekHasNews(summary)) continue;
    const ok = await deliver(ctx, workspaceId, weeklyEmail(summary, url(ctx, "/app")), {
      type: "notify.weekly",
      payload: {
        sent: perSite.reduce((n, s) => n + s.sent, 0),
        replies: perSite.reduce((n, s) => n + s.replies, 0),
        links: perSite.reduce((n, s) => n + s.links, 0),
      },
    });
    if (ok) sentCount++;
  }
  return sentCount;
}

/* ---------- 14. Bilan du mois ---------- */

/** Le 1er du mois : bilan du mois civil écoulé (UTC), et la campagne du mois qui commence. */
export async function notifyMonthly(ctx: NotifyCtx): Promise<number> {
  const thisMonth = monthStart(ctx.now);
  const lastMonth = monthStart(new Date(thisMonth.getTime() - DAY));
  const from = lastMonth.toISOString();
  const to = thisMonth.toISOString();
  const period = from.slice(0, 7);
  const [{ data: sites }, { data: sent }, { data: inbound }, { data: links }, sentTraces, off] =
    await Promise.all([
      ctx.db.from("sites").select("id, workspace_id").limit(5000),
      ctx.db
        .from("sent_messages")
        .select("workspace_id")
        .eq("dry_run", false)
        .eq("step", "initial")
        .eq("status", "envoye")
        .gte("sent_at", from)
        .lt("sent_at", to)
        .limit(50000),
      ctx.db
        .from("inbound_messages")
        .select("workspace_id, sent_message_id")
        .eq("kind", "reponse")
        .gte("received_at", from)
        .lt("received_at", to)
        .limit(20000),
      ctx.db
        .from("links")
        .select("workspace_id, first_live_at, lost_at")
        .not("first_live_at", "is", null)
        .limit(20000),
      traces(ctx.db, "notify.monthly", iso(ctx, 45 * DAY)),
      disabled(ctx.db, "monthly"),
    ]);
  const told = new Set(
    sentTraces.filter((e) => e.payload.period === period).map((e) => e.workspace_id),
  );
  const within = (d: string | null) => d !== null && d >= from && d < to;
  let count = 0;
  for (const workspaceId of uniq((sites ?? []).map((s) => s.workspace_id))) {
    if (off.has(workspaceId) || told.has(workspaceId)) continue;
    const mine = <T extends { workspace_id: string }>(rows: readonly T[] | null) =>
      (rows ?? []).filter((r) => r.workspace_id === workspaceId);
    const wsLinks = mine(links);
    const [entitlements, ever] = await Promise.all([
      loadEntitlements(ctx.db, workspaceId, ctx.now, betaEnabled()),
      campaignsEver(ctx.db, workspaceId),
    ]);
    // Début de mois : aucune campagne encore lancée ce mois-ci ; seul le plafond à vie peut bloquer.
    const canStart = entitlements.monthlyCampaigns > 0 && !campaignBlocked(entitlements, 0, ever);
    const summary = {
      month: lastMonth,
      next: thisMonth,
      sent: mine(sent).length,
      replies: uniq(mine(inbound).map((m) => m.sent_message_id)).length,
      links: wsLinks.filter((l) => within(l.first_live_at)).length,
      liveEver: wsLinks.filter((l) => !l.lost_at).length,
      lost: wsLinks.filter((l) => within(l.lost_at)).length,
      campaigns: canStart ? entitlements.monthlyCampaigns : null,
    };
    if (!monthHasNews(summary)) continue;
    const ok = await deliver(
      ctx,
      workspaceId,
      monthlyEmail(summary, { campaigns: url(ctx, "/app/campagnes"), home: url(ctx, "/app") }),
      {
        type: "notify.monthly",
        payload: { period, sent: summary.sent, replies: summary.replies, links: summary.links },
      },
    );
    if (ok) count++;
  }
  return count;
}

/* ---------- 11. Un paiement n'est pas passé (toujours envoyé) ---------- */

/** Une fois par refus : la trace porte la date du refus, un nouveau refus plus tard repart. */
export async function notifyPayment(ctx: NotifyCtx): Promise<number> {
  const [{ data: subs }, sentTraces] = await Promise.all([
    ctx.db
      .from("subscriptions")
      .select("workspace_id, plan, payment_failed_at, payment_failed_amount_cents")
      .eq("status", "past_due")
      .not("payment_failed_at", "is", null)
      .limit(500),
    traces(ctx.db, "notify.payment", iso(ctx, 60 * DAY)),
  ]);
  const told = new Set(sentTraces.map((e) => `${e.workspace_id}:${String(e.payload.failed_at)}`));
  let count = 0;
  for (const sub of subs ?? []) {
    const failedAt = sub.payment_failed_at;
    if (!failedAt || told.has(`${sub.workspace_id}:${failedAt}`)) continue;
    const ok = await deliver(
      ctx,
      sub.workspace_id,
      paymentEmail(
        {
          amountCents: sub.payment_failed_amount_cents,
          plan: planName(sub.plan),
          failedAt: new Date(failedAt),
          pauseAt: paymentPauseAt(failedAt),
        },
        url(ctx, "/app/facturation"),
      ),
      { type: "notify.payment", payload: { failed_at: failedAt } },
    );
    if (ok) count++;
  }
  return count;
}
