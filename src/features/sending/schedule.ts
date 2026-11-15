import { SEND_LIMITS } from "./limits";

export interface SendWindow {
  timezone: string;
  startHour: number;
  endHour: number;
}

/** Heures ouvrées : du lundi au vendredi, de `startHour` (inclus) à `endHour` (exclu), fuseau de la boîte. */
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
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  if (!weekday || Number.isNaN(hour)) return false;
  if (weekday === "Sat" || weekday === "Sun") return false;
  return hour >= w.startHour && hour < w.endHour;
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
