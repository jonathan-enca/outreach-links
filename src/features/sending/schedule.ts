import { SEND_LIMITS } from "./limits";

/** Jours conseillés : du lundi au vendredi (numérotation ISO, 1 = lundi … 7 = dimanche). */
export const DEFAULT_SEND_DAYS: readonly number[] = [1, 2, 3, 4, 5];

export interface SendWindow {
  timezone: string;
  startHour: number;
  endHour: number;
  /** Jours d'envoi (ISO). Absent : les jours conseillés. */
  days?: readonly number[] | null;
}

const ISO_DAY: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** Horaires d'envoi : les jours choisis, de `startHour` (inclus) à `endHour` (exclu), fuseau de la boîte. */
export function isInSendWindow(now: Date, w: SendWindow): boolean {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: w.timezone,
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return false; // fuseau inconnu : on n'envoie pas
  }
  const day = ISO_DAY[parts.find((p) => p.type === "weekday")?.value ?? ""];
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (!day || Number.isNaN(hour)) return false;
  if (!(w.days ?? DEFAULT_SEND_DAYS).includes(day)) return false;
  return hour >= w.startHour && hour < w.endHour;
}

/**
 * Prochaine ouverture de la fenêtre d'envoi, ou `null` si elle est ouverte maintenant (ou si le fuseau
 * est inconnu). Cherche d'heure en heure, sur huit jours : de quoi couvrir une semaine à un seul jour d'envoi.
 */
export function nextSendStart(now: Date, w: SendWindow): Date | null {
  if (isInSendWindow(now, w)) return null;
  const hour = 3_600_000;
  const first = Math.floor(now.getTime() / hour) * hour + hour;
  for (let i = 0; i < 24 * 8; i++) {
    const at = new Date(first + i * hour);
    if (isInSendWindow(at, w)) return at;
  }
  return null;
}

/**
 * Plafond journalier effectif : échauffement progressif (5, 10, 15 par jour pendant les trois
 * premières semaines d'envois réels) puis le plafond de la boîte. Jamais au-dessus de `dailyCap`.
 */
export function effectiveDailyCap(dailyCap: number, firstSendAt: Date | null, now: Date): number {
  if (!firstSendAt) return Math.min(dailyCap, SEND_LIMITS.warmupDaily[0]!);
  const days = Math.max(0, Math.floor((now.getTime() - firstSendAt.getTime()) / 86_400_000));
  const week = Math.floor(days / 7);
  const step = SEND_LIMITS.warmupDaily[week];
  return Math.min(dailyCap, step ?? dailyCap);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** Le moteur passe toutes les six minutes et envoie au plus un message par boîte (voir `send-tick`). */
export const SEND_TICK_MINUTES = 6;

export interface SendPlanInput {
  window: SendWindow;
  /** Envois déjà comptés pour cette boîte (les dernières 24 heures suffisent). */
  recent: readonly Date[];
  /** Premier envoi de la boîte : point de départ de l'échauffement. */
  firstSendAt: Date | null;
  dailyCap: number;
  hourlyCap: number;
}

/** Pourquoi un message ne part pas au prochain passage : horaires fermés, ou limite d'envoi atteinte. */
export type DelayReason =
  { kind: "horaires" } | { kind: "jour"; cap: number } | { kind: "heure"; cap: number } | null;

export interface SendSlot {
  /** Heure de départ probable ; `null` si elle ne peut pas être estimée. */
  at: Date | null;
  reason: DelayReason;
}

/**
 * Créneaux de départ probables des `count` prochains messages d'une boîte, dans l'ordre de la file.
 * Rejoue les règles du moteur : un message par passage, horaires d'envoi, plafond par heure, plafond
 * par 24 heures avec échauffement. C'est une estimation (une relance ou une réponse peut prendre un
 * passage) : l'écran dit « vers ». `reason` dit ce qui retarde le message (la limite d'envoi passe avant
 * les horaires). Au-delà de trois semaines, `at` vaut `null`.
 */
export function planSendTimes(now: Date, count: number, p: SendPlanInput): SendSlot[] {
  const tick = SEND_TICK_MINUTES * 60_000;
  const horizon = now.getTime() + 21 * 86_400_000;
  const sent = p.recent.map((d) => d.getTime());
  let first = p.firstSendAt;
  const out: SendSlot[] = [];
  let closed = false;
  let dayHit: number | null = null;
  let hourHit: number | null = null;
  let at = Math.floor(now.getTime() / tick) * tick + tick;
  while (out.length < count && at <= horizon) {
    const when = new Date(at);
    if (!isInSendWindow(when, p.window)) {
      const next = nextSendStart(when, p.window);
      if (!next) break;
      closed = true;
      at = next.getTime();
      continue;
    }
    const inHour = sent.filter((x) => x > at - 3_600_000).length;
    // Mêmes bornes que le moteur : l'heure glissante est stricte, les 24 heures sont incluses.
    const inDay = sent.filter((x) => x >= at - 86_400_000).length;
    const dayCap = effectiveDailyCap(p.dailyCap, first, when);
    if (inHour < p.hourlyCap && inDay < dayCap) {
      out.push({
        at: when,
        reason:
          dayHit !== null
            ? { kind: "jour", cap: dayHit }
            : hourHit !== null
              ? { kind: "heure", cap: hourHit }
              : closed
                ? { kind: "horaires" }
                : null,
      });
      sent.push(at);
      first ??= when;
      closed = false;
      dayHit = null;
      hourHit = null;
    } else if (inDay >= dayCap) {
      dayHit = dayCap;
    } else {
      hourHit = p.hourlyCap;
    }
    at += tick;
  }
  while (out.length < count) out.push({ at: null, reason: null });
  return out;
}

const DAY_NAMES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Horaires en clair : « du lundi au vendredi, de 9 h à 18 h ». */
export function describeWindow(w: Pick<SendWindow, "days" | "startHour" | "endHour">): string {
  const days = [...new Set(w.days ?? DEFAULT_SEND_DAYS)].sort((a, b) => a - b);
  const names = days.map((d) => DAY_NAMES[d - 1]!);
  const run = days.every((d, i) => i === 0 || d === days[i - 1]! + 1);
  const label =
    days.length === 7
      ? "tous les jours"
      : days.length >= 3 && run
        ? `du ${names[0]} au ${names.at(-1)}`
        : `le ${names.length > 1 ? `${names.slice(0, -1).join(", ")} et ${names.at(-1)}` : names[0]}`;
  return w.startHour === 0 && w.endHour === 24
    ? `${label}, 24 h sur 24`
    : `${label}, de ${w.startHour} h à ${w.endHour} h`;
}
