import type { SupabaseClient } from "@supabase/supabase-js";
import { betaEnabled } from "@/features/audits/beta";
import { loadEntitlements } from "@/features/billing/entitlements";
import { loadQueued, type ConversationsOptions } from "@/features/conversations/service";
import { COUNTED } from "@/features/sending/queue-note";
import { planIdsOfSite } from "@/features/shell/site-scope";
import { effectiveDailyCap } from "@/features/sending/schedule";
import type { Database } from "@/lib/supabase/database.types";
import { t } from "@/lib/messages";
import { dayKey } from "./format";

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
  /** Campagne (le site pour lequel le lien est demandé) ; vide ou absente si inconnue. */
  campaignId?: string;
}

export interface SentEnvoi {
  id: string;
  /** Site contacté ; vide s'il n'est plus retrouvable. */
  domain: string;
  email: string;
  subject: string;
  body: string;
  sentAt: string | null;
  /** Campagne (le site pour lequel le lien est demandé) ; vide ou absente si inconnue. */
  campaignId?: string;
}

/** Une campagne présente dans les listes, pour filtrer. */
export interface EnvoiCampaign {
  id: string;
  label: string;
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
  /** Campagnes des emails programmés ou partis, pour le filtre de l'écran. */
  campaigns: EnvoiCampaign[];
  /** Horaires d'envoi de la première boîte vérifiée ; `null` sans boîte. */
  window: { days: number[]; startHour: number; endHour: number } | null;
  /** Adresse de la boîte d'envoi, et son fournisseur (« google » pour Gmail). */
  fromEmail: string | null;
  provider: string | null;
  /** Fuseau de la boîte : toutes les heures de l'écran sont dites dans ce fuseau. */
  timezone: string;
  /** Prochain départ prévu (ISO) ; `null` si rien n'attend ou si rien ne peut partir. */
  nextAt: string | null;
  /** Envois du jour (jour civil de la boîte) et limite actuelle ; `null` sans boîte vérifiée. */
  day: Quota | null;
  /**
   * La limite journalière retient-elle le prochain départ ? Le moteur compte sur 24 heures glissantes :
   * elle peut retenir un email alors que le compteur du jour civil n'est pas plein.
   */
  dayLimited: boolean;
  /** La limite journalière est-elle encore celle du démarrage (elle augmentera seule) ? */
  warmingUp: boolean;
  /** Emails partis depuis lundi (semaine civile de la boîte). */
  week: number;
  /** Envois du mois civil et plafond du forfait ; `null` si le forfait n'envoie pas. */
  month: Quota | null;
}

/**
 * Écran « Emails » : ce qui est programmé (heure prévue, annulation possible), ce qui est parti, l'état
 * des envois et les quotas (jour, semaine, mois). Lecture avec les droits de la personne (RLS).
 */
export async function loadEnvois(
  supabase: Client,
  opts: ConversationsOptions,
): Promise<EnvoisView> {
  const now = opts.now;
  // Site choisi dans le menu : « Partis » et son total ne montrent que ses envois. Les quotas restent
  // ceux de la boîte (partagée par tous les sites), donc sans filtre.
  const sitePlans = opts.siteId ? [...(await planIdsOfSite(supabase, opts.siteId))] : null;
  const ofSite = <Q extends { in: (column: "plan_id", values: string[]) => Q }>(q: Q): Q =>
    sitePlans ? q.in("plan_id", sitePlans) : q;
  const [sentDrafts, sent, sentCount, boxRows, recent, ws] = await Promise.all([
    supabase.from("sent_messages").select("draft_id").eq("step", "initial"),
    ofSite(
      supabase
        .from("sent_messages")
        .select("id, plan_id, draft_id, to_email, subject, body, sent_at")
        .eq("step", "initial")
        .eq("status", "envoye")
        .eq("dry_run", false),
    )
      .order("sent_at", { ascending: false })
      .limit(SENT_LIMIT),
    ofSite(
      supabase
        .from("sent_messages")
        .select("id", { count: "exact", head: true })
        .eq("step", "initial")
        .eq("status", "envoye")
        .eq("dry_run", false),
    ),
    loadBoxes(supabase),
    supabase
      .from("sent_messages")
      .select("from_email, claimed_at, status")
      .eq("dry_run", false)
      .in("status", COUNTED)
      .gte("claimed_at", new Date(now.getTime() - 8 * DAY_MS).toISOString()),
    supabase.from("workspaces").select("id").limit(1).maybeSingle(),
  ]);

  const sentRows = sent.data ?? [];
  const [domains, sentPlans] = await Promise.all([
    domainsOfDrafts(supabase, [...new Set(sentRows.map((s) => s.draft_id))]),
    campaignsOfPlans(supabase, [...new Set(sentRows.map((s) => s.plan_id))]),
  ]);

  const verified = boxRows.filter((b) => b.status === "verifiee");
  const first = verified[0] ?? null;
  const firstSends = await firstSendByBox(
    supabase,
    verified.map((b) => b.email),
  );
  const recentRows = recent.data ?? [];
  const boxEmails = new Set(verified.map((b) => b.email));
  const timezone = first?.timezone ?? DEFAULT_TIMEZONE;
  const today = dayKey(now, timezone);
  const monday = mondayKey(now, timezone);
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
        campaignId: th.campaignId,
      };
    })
    // Dans l'ordre de départ ; ceux dont l'heure n'est pas connue à la fin.
    .sort((a, b) => (a.at ?? "9").localeCompare(b.at ?? "9"));

  // Campagnes, dans l'ordre où elles apparaissent (programmés d'abord), sans doublon.
  const campaigns = new Map<string, string>();
  for (const th of queued.threads) if (th.campaignId) campaigns.set(th.campaignId, th.campaign);
  for (const c of sentPlans.values()) if (!campaigns.has(c.id)) campaigns.set(c.id, c.label);

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
      campaignId: sentPlans.get(s.plan_id)?.id ?? "",
    })),
    campaigns: [...campaigns].map(([id, label]) => ({ id, label })),
    sentTotal: sentCount.count ?? sentRows.length,
    window: first
      ? {
          days: first.send_days,
          startHour: first.send_window_start,
          endHour: first.send_window_end,
        }
      : null,
    fromEmail: first?.email ?? null,
    provider: first?.provider ?? null,
    timezone,
    nextAt: scheduled[0]?.at ?? null,
    day:
      verified.length > 0
        ? {
            used: recentRows.filter(
              (r) =>
                r.from_email !== null &&
                boxEmails.has(r.from_email) &&
                dayKey(new Date(r.claimed_at), timezone) === today,
            ).length,
            cap: caps.reduce((n, c) => n + c.cap, 0),
          }
        : null,
    dayLimited: scheduled[0]
      ? queued.eta.get(scheduled[0].draftId)?.reason?.kind === "jour"
      : false,
    warmingUp: caps.some((c) => c.cap < c.full),
    week: recentRows.filter(
      (r) => r.status === "envoye" && dayKey(new Date(r.claimed_at), timezone) >= monday,
    ).length,
    month: ent && ent.sendCap > 0 ? { used: ent.sendUsed, cap: ent.sendCap } : null,
  };
}

const BOX_COLUMNS =
  "id, email, provider, status, daily_cap, timezone, send_window_start, send_window_end, send_days";

/**
 * Boîtes d'envoi de la personne. Les droits de lecture de `mailboxes` sont donnés colonne par colonne :
 * si la colonne de suspension n'est pas lisible, on relit sans elle plutôt que de conclure qu'aucune
 * boîte n'existe (c'est ce qui affichait « connectez une boîte » à tort, corrigé le 20/11).
 */
async function loadBoxes(supabase: Client) {
  const full = await supabase
    .from("mailboxes")
    .select(`${BOX_COLUMNS}, sending_paused`)
    .order("created_at");
  if (!full.error) return full.data ?? [];
  const basic = await supabase.from("mailboxes").select(BOX_COLUMNS).order("created_at");
  return (basic.data ?? []).map((b) => ({ ...b, sending_paused: false }));
}

const ISO_DAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Jour civil du lundi de la semaine en cours, dans le fuseau de la boîte (« 2026-11-16 »). */
export function mondayKey(now: Date, timezone: string): string {
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short" }).format(
    now,
  );
  return dayKey(new Date(now.getTime() - ((ISO_DAY[weekday] ?? 1) - 1) * DAY_MS), timezone);
}

/** Site contacté par chaque brouillon (brouillon → ligne du plan → domaine). */
async function domainsOfDrafts(supabase: Client, draftIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (draftIds.length === 0) return out;
  const { data: drafts } = await supabase
    .from("target_drafts_v")
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

/** Campagne (site) de chaque plan, avec le même libellé que « À approuver » (« site.fr · France »). */
async function campaignsOfPlans(
  supabase: Client,
  planIds: string[],
): Promise<Map<string, EnvoiCampaign>> {
  const out = new Map<string, EnvoiCampaign>();
  if (planIds.length === 0) return out;
  const { data } = await supabase
    .from("link_plans")
    .select("id, site_id, sites(domain, country)")
    .in("id", planIds);
  const countries = t.sites.countries as Record<string, string>;
  for (const p of data ?? []) {
    const s = p.sites as unknown as { domain: string; country: string | null } | null;
    if (!s) continue;
    const label = `${s.domain}${s.country ? ` · ${countries[s.country] ?? s.country}` : ""}`;
    out.set(p.id, { id: p.site_id, label });
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
