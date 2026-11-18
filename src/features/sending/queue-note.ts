import type { SupabaseClient } from "@supabase/supabase-js";
import { t } from "@/lib/messages";
import type { Database } from "@/lib/supabase/database.types";
import { SEND_LIMITS } from "./limits";
import {
  describeWindow,
  isInSendWindow,
  nextSendStart,
  planSendTimes,
  type DelayReason,
} from "./schedule";

type Client = SupabaseClient<Database>;

/** Messages arrêtés par la limite d'envoi (et non par les horaires) : combien, jusqu'à quand, quelle limite. */
export interface CapInfo {
  count: number;
  kind: "jour" | "heure";
  cap: number;
  firstAt: Date;
  timezone: string;
}

/** Pourquoi des emails approuvés ne sont pas encore partis, et quand ils partiront. */
export type QueueNote =
  | { state: "simulation" | "sans_boite"; waiting: number }
  | { state: "ouvert"; waiting: number; hours: string; capped: CapInfo | null }
  | { state: "ferme"; waiting: number; hours: string; nextAt: Date; timezone: string };

export interface QueueEta {
  at: Date;
  timezone: string;
  reason: DelayReason;
}

export interface SendQueue {
  note: QueueNote | null;
  /** Heure de départ probable par brouillon ; absent si elle ne peut pas être estimée. */
  eta: Map<string, QueueEta>;
}

const COUNTED = ["en_cours", "envoye", "simule", "a_reessayer", "echec"];

/**
 * File d'envoi de la personne connectée (RLS) : pour chaque email approuvé pas encore parti, l'heure
 * de départ probable et ce qui le retarde, plus une phrase d'explication. `real` : l'envoi réel est-il
 * activé sur ce serveur. L'ordre rejoue celui du moteur : lots validés du plus ancien au plus récent,
 * puis position dans le lot.
 */
export async function loadSendQueue(
  supabase: Client,
  waiting: readonly { id: string; siteId: string }[],
  now: Date,
  real: boolean,
): Promise<SendQueue> {
  const eta: SendQueue["eta"] = new Map();
  if (waiting.length === 0) return { note: null, eta };
  if (!real) return { note: { state: "simulation", waiting: waiting.length }, eta };
  const { data: boxes } = await supabase
    .from("mailboxes")
    .select(
      "id, site_id, email, hourly_cap, daily_cap, timezone, send_window_start, send_window_end, send_days",
    )
    .eq("status", "verifiee")
    .order("created_at");
  const bySite = new Map((boxes ?? []).map((b) => [b.site_id, b]));
  const first = (boxes ?? []).find((b) => waiting.some((w) => w.siteId === b.site_id));
  if (!first) return { note: { state: "sans_boite", waiting: waiting.length }, eta };

  const draftIds = waiting.map((w) => w.id);
  const [{ data: items }, { data: sent }] = await Promise.all([
    supabase
      .from("batch_items")
      .select("draft_id, position, batches(validated_at, status)")
      .in("draft_id", draftIds),
    supabase
      .from("sent_messages")
      .select("from_email, claimed_at")
      .eq("dry_run", false)
      .in("status", COUNTED)
      .in(
        "from_email",
        (boxes ?? []).map((b) => b.email),
      )
      .order("claimed_at")
      .limit(2000),
  ]);
  const rank = new Map<string, [string, number]>();
  for (const it of items ?? []) {
    const batch = it.batches as unknown as { validated_at: string | null; status: string } | null;
    if (batch?.status === "valide") rank.set(it.draft_id, [batch.validated_at ?? "", it.position]);
  }

  for (const [siteId, box] of bySite) {
    const queue = waiting
      .filter((w) => w.siteId === siteId && rank.has(w.id))
      .sort((a, b) => {
        const [va, pa] = rank.get(a.id)!;
        const [vb, pb] = rank.get(b.id)!;
        return va.localeCompare(vb) || pa - pb;
      });
    const mine = (sent ?? [])
      .filter((s) => s.from_email === box.email)
      .map((s) => new Date(s.claimed_at));
    const slots = planSendTimes(now, queue.length, {
      window: windowOf(box),
      recent: mine.filter((d) => d.getTime() > now.getTime() - 86_400_000),
      firstSendAt: mine[0] ?? null,
      dailyCap: box.daily_cap,
      hourlyCap: Math.min(box.hourly_cap, SEND_LIMITS.hourlyMax),
    });
    queue.forEach((w, i) => {
      const slot = slots[i];
      if (slot?.at) eta.set(w.id, { at: slot.at, timezone: box.timezone, reason: slot.reason });
    });
  }

  const w = windowOf(first);
  const hours = describeWindow(w);
  const nextAt = isInSendWindow(now, w) ? null : nextSendStart(now, w);
  if (nextAt) {
    return {
      note: { state: "ferme", waiting: waiting.length, hours, nextAt, timezone: first.timezone },
      eta,
    };
  }
  const capped = [...eta.values()]
    .filter((e) => e.reason?.kind === "jour" || e.reason?.kind === "heure")
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const head = capped[0];
  const cap: CapInfo | null =
    head && (head.reason?.kind === "jour" || head.reason?.kind === "heure")
      ? {
          count: capped.length,
          kind: head.reason.kind,
          cap: head.reason.cap,
          firstAt: head.at,
          timezone: head.timezone,
        }
      : null;
  return { note: { state: "ouvert", waiting: waiting.length, hours, capped: cap }, eta };
}

function windowOf(box: {
  timezone: string;
  send_window_start: number;
  send_window_end: number;
  send_days: number[];
}) {
  return {
    timezone: box.timezone,
    startHour: box.send_window_start,
    endHour: box.send_window_end,
    days: box.send_days,
  };
}

/** « mercredi 18 novembre à 9 h » ou « mercredi 18 novembre vers 9 h 06 ». */
export function formatSendTime(at: Date, timezone: string, exact: boolean): string {
  const day = at.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  });
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${day} ${exact ? "à" : "vers"} ${hour} h${minute === "00" ? "" : ` ${minute}`}`;
}

/** Phrase du message d'un email en attente : l'heure prévue et ce qui la retarde. */
export function queuedMessageText(eta: QueueEta): string {
  const q = t.conversations.messages;
  const when = formatSendTime(eta.at, eta.timezone, false);
  if (eta.reason?.kind === "jour") return q.queuedDayCap(when, eta.reason.cap);
  if (eta.reason?.kind === "heure") return q.queuedHourCap(when, eta.reason.cap);
  if (eta.reason?.kind === "horaires") return q.queuedClosed(when);
  return q.queuedAt(when);
}

/** Phrase affichée au-dessus des conversations. */
export function queueNoteText(note: QueueNote): string {
  const q = t.conversations.queue;
  if (note.state === "ferme")
    return q.ferme(note.waiting, formatSendTime(note.nextAt, note.timezone, true));
  if (note.state === "ouvert" && note.capped) {
    const c = note.capped;
    const when = formatSendTime(c.firstAt, c.timezone, false);
    return `${q.ouvert(note.waiting)} ${c.kind === "jour" ? q.plafondJour(c.count, c.cap, when) : q.plafondHeure(c.count, c.cap, when)}`;
  }
  return q[note.state](note.waiting);
}
