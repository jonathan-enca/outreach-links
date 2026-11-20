import type { SupabaseClient } from "@supabase/supabase-js";
import { betaEnabled } from "@/features/audits/beta";
import { loadEntitlements } from "@/features/billing/entitlements";
import { loadQueued, type ConversationsOptions } from "@/features/conversations/service";
import { COUNTED } from "@/features/sending/queue-note";
import { describeWindow, effectiveDailyCap } from "@/features/sending/schedule";
import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

const DAY_MS = 86_400_000;
const DEFAULT_TIMEZONE = "Europe/Paris";
/** Emails partis chargés pour l'écran (les plus récents). */
export const SENT_LIMIT = 100;

/** Un email programmé, pas encore parti. */
export interface ScheduledEnvoi {
  /** Identifiant du brouillon (sert à l'annulation). */
  draftId: string;
  domain: string;
  email: string;
  subject: string;
  body: string;
  /** Heure de départ probable (ISO) ; `null` si elle ne peut pas être estimée. */
  at: string | null;
}

export interface SentEnvoi {
  id: string;
  /** Site contacté ; vide s'il n'est plus retrouvable. */
  domain: string;
  email: string;
  subject: string;
  body: string;
  sentAt: string | null;
}

/** Une jauge « utilisé sur limite ». */
export interface Quota {
  used: number;
  cap: number;
}

/**
 * - `actif` : les emails partent seuls aux horaires de la boîte ;
 * - `pause` : la personne a suspendu les envois ;
 * - `sans_boite` : aucune boîte d'envoi connectée et vérifiée ;
 * - `simulation` : ce serveur n'envoie pas d'email réel.
 */
export type EnvoisState = "actif" | "pause" | "sans_boite" | "simulation";

export interface EnvoisView {
  state: EnvoisState;
  scheduled: ScheduledEnvoi[];
  sent: SentEnvoi[];
  /** Nombre total d'emails partis (la liste n'en charge que `SENT_LIMIT`). */
  sentTotal: number;
  /** Horaires d'envoi de la boîte, par exemple « du lundi au vendredi, de 9 h à 18 h ». */
  hours: string | null;
  /** Adresse de la boîte d'envoi. */
  fromEmail: string | null;
  /** Fuseau de la boîte : toutes les heures de l'écran sont dites dans ce fuseau. */
  timezone: string;
  /** Prochain départ prévu (ISO) ; `null` si rien n'attend ou si rien ne peut partir. */
  nextAt: string | null;
  /** Envois comptés sur les dernières 24 heures et limite actuelle ; `null` sans boîte vérifiée. */
  day: Quota | null;
  /** La limite des 24 heures est-elle encore celle du démarrage (elle augmentera seule) ? */
  warmingUp: boolean;
  /** Emails partis sur les 7 derniers jours. */
  week: number;
  /** Envois du mois civil et plafond du forfait ; `null` si le forfait n'envoie pas. */
  month: Quota | null;
}

/**
 * Écran « Emails » : ce qui est programmé (heure prévue, annulation possible), ce qui est parti, l'état
 * des envois et les quotas (24 heures, 7 jours, mois). Lecture avec les droits de la personne (RLS).
 */
export async function loadEnvois(
  supabase: Client,
  opts: ConversationsOptions,
): Promise<EnvoisView> {
  const now = opts.now;
  const [sentDrafts, sent, sentCount, boxes, recent, ws] = await Promise.all([
    supabase.from("sent_messages").select("draft_id").eq("step", "initial"),
    supabase
      .from("sent_messages")
      .select("id, draft_id, to_email, subject, body, sent_at")
      .eq("step", "initial")
      .eq("status", "envoye")
      .eq("dry_run", false)
      .order("sent_at", { ascending: false })
      .limit(SENT_LIMIT),
    supabase
      .from("sent_messages")
      .select("id", { count: "exact", head: true })
      .eq("step", "initial")
      .eq("status", "envoye")
      .eq("dry_run", false),
    supabase
      .from("mailboxes")
      .select(
        "id, email, status, sending_paused, daily_cap, timezone, send_window_start, send_window_end, send_days",
      )
      .order("created_at"),
    supabase
      .from("sent_messages")
      .select("from_email, claimed_at, status")
      .eq("dry_run", false)
      .in("status", COUNTED)
      .gte("claimed_at", new Date(now.getTime() - 7 * DAY_MS).toISOString()),
    supabase.from("workspaces").select("id").limit(1).maybeSingle(),
  ]);

  const sentRows = sent.data ?? [];
  const domains = await domainsOfDrafts(supabase, [...new Set(sentRows.map((s) => s.draft_id))]);

  const verified = (boxes.data ?? []).filter((b) => b.status === "verifiee");
  const first = verified[0] ?? null;
  const firstSends = await firstSendByBox(
    supabase,
    verified.map((b) => b.email),
  );
  const recentRows = recent.data ?? [];
  const boxEmails = new Set(verified.map((b) => b.email));
  const dayStart = now.getTime() - DAY_MS;
  const caps = verified.map((b) => ({
    cap: effectiveDailyCap(b.daily_cap, firstSends.get(b.email) ?? null, now),
    full: b.daily_cap,
  }));
  const ent = ws.data ? await loadEntitlements(supabase, ws.data.id, now, betaEnabled()) : null;

  const paused = verified.some((b) => b.sending_paused);
  const state: EnvoisState = !opts.realSending
    ? "simulation"
    : verified.length === 0
      ? "sans_boite"
      : paused
        ? "pause"
        : "actif";

  const sentIds = new Set((sentDrafts.data ?? []).map((r) => r.draft_id));
  const queued = await loadQueued(supabase, sentIds, opts);
  const scheduled: ScheduledEnvoi[] = queued.threads
    .map((th) => {
      const draftId = th.id.replace(/^attente-/, "");
      return {
        draftId,
        domain: th.domain,
        email: th.email,
        subject: th.messages[0]?.subject ?? "",
        body: th.messages[0]?.text ?? "",
        // En pause, aucune heure n'est annoncée : elle ne serait pas tenue.
        at: state === "actif" ? (queued.eta.get(draftId)?.at.toISOString() ?? null) : null,
      };
    })
    // Dans l'ordre de départ ; ceux dont l'heure n'est pas connue à la fin.
    .sort((a, b) => (a.at ?? "9").localeCompare(b.at ?? "9"));

  return {
    state,
    scheduled,
    sent: sentRows.map((s) => ({
      id: s.id,
      domain: domains.get(s.draft_id) ?? "",
      email: s.to_email,
      subject: s.subject ?? "",
      body: s.body ?? "",
      sentAt: s.sent_at,
    })),
    sentTotal: sentCount.count ?? sentRows.length,
    hours: first
      ? describeWindow({
          days: first.send_days,
          startHour: first.send_window_start,
          endHour: first.send_window_end,
        })
      : null,
    fromEmail: first?.email ?? null,
    timezone: first?.timezone ?? DEFAULT_TIMEZONE,
    nextAt: scheduled[0]?.at ?? null,
    day:
      verified.length > 0
        ? {
            used: recentRows.filter(
              (r) =>
                r.from_email !== null &&
                boxEmails.has(r.from_email) &&
                new Date(r.claimed_at).getTime() >= dayStart,
            ).length,
            cap: caps.reduce((n, c) => n + c.cap, 0),
          }
        : null,
    warmingUp: caps.some((c) => c.cap < c.full),
    week: recentRows.filter((r) => r.status === "envoye").length,
    month: ent && ent.sendCap > 0 ? { used: ent.sendUsed, cap: ent.sendCap } : null,
  };
}

/** Site contacté par chaque brouillon (brouillon → ligne du plan → domaine). */
async function domainsOfDrafts(supabase: Client, draftIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (draftIds.length === 0) return out;
  const { data: drafts } = await supabase
    .from("target_drafts")
    .select("id, plan_item_id")
    .in("id", draftIds);
  const itemIds = [...new Set((drafts ?? []).map((d) => d.plan_item_id))];
  if (itemIds.length === 0) return out;
  const { data: items } = await supabase
    .from("link_plan_items")
    .select("id, source_domain")
    .in("id", itemIds);
  const byItem = new Map((items ?? []).map((i) => [i.id, i.source_domain]));
  for (const d of drafts ?? []) {
    const domain = byItem.get(d.plan_item_id);
    if (domain) out.set(d.id, domain);
  }
  return out;
}

/** Premier envoi réel de chaque boîte : point de départ du rythme de démarrage. */
async function firstSendByBox(supabase: Client, emails: string[]): Promise<Map<string, Date>> {
  const rows = await Promise.all(
    emails.map((email) =>
      supabase
        .from("sent_messages")
        .select("claimed_at")
        .eq("dry_run", false)
        .in("status", COUNTED)
        .eq("from_email", email)
        .order("claimed_at")
        .limit(1)
        .maybeSingle(),
    ),
  );
  const out = new Map<string, Date>();
  rows.forEach((r, i) => {
    if (r.data) out.set(emails[i]!, new Date(r.data.claimed_at));
  });
  return out;
}
