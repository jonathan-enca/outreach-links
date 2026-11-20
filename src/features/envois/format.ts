import { formatSendTime } from "@/features/sending/queue-note";
import { describeWindow } from "@/features/sending/schedule";
import { t } from "@/lib/messages";
import type { ScheduledEnvoi, SentEnvoi } from "./service";

const M = t.envois;

/** Une ligne de la liste, déjà mise en mots par le serveur (mêmes textes au premier affichage). */
export interface EnvoiRow {
  id: string;
  /** Programmés seulement : identifiant du brouillon, pour l'annulation. */
  draftId?: string;
  /** Titre du jour sous lequel la ligne est rangée, par exemple « Lundi 23 novembre ». */
  day: string;
  /** Heure, par exemple « 9 h 06 » ; « — » si elle n'est pas connue. */
  time: string;
  domain: string;
  email: string;
  subject: string;
  body: string;
  /** Phrase de date complète, affichée dans le message ouvert. */
  meta: string;
}

/** Jour civil d'un instant dans un fuseau, sous une forme qui se compare (« 2026-11-23 »). */
export function dayKey(at: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** « Lundi 23 novembre », précédé de « Aujourd'hui », « Demain » ou « Hier » quand c'est le cas. */
export function dayLabel(at: Date, timezone: string, now: Date): string {
  const day = at.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  });
  const key = dayKey(at, timezone);
  if (key === dayKey(now, timezone)) return M.days.today(day);
  if (key === dayKey(new Date(now.getTime() + 86_400_000), timezone)) return M.days.tomorrow(day);
  if (key === dayKey(new Date(now.getTime() - 86_400_000), timezone)) return M.days.yesterday(day);
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
}

/** « 9 h 06 » : l'heure sans zéro devant, les minutes toujours sur deux chiffres. */
export function timeLabel(at: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour} h ${minute}`;
}

export function scheduledRows(
  items: readonly ScheduledEnvoi[],
  timezone: string,
  now: Date,
): EnvoiRow[] {
  return items.map((s) => {
    const at = s.at ? new Date(s.at) : null;
    return {
      id: s.draftId,
      draftId: s.draftId,
      day: at ? dayLabel(at, timezone, now) : M.days.unknown,
      time: at ? timeLabel(at, timezone) : "—",
      domain: s.domain,
      email: s.email,
      subject: s.subject,
      body: s.body,
      // L'heure de départ est une estimation : la phrase dit « vers ».
      meta: at ? M.meta.scheduled(formatSendTime(at, timezone, false)) : M.meta.unknown,
    };
  });
}

export function sentRows(items: readonly SentEnvoi[], timezone: string, now: Date): EnvoiRow[] {
  return items.map((s) => {
    const at = s.sentAt ? new Date(s.sentAt) : null;
    return {
      id: s.id,
      day: at ? dayLabel(at, timezone, now) : "",
      time: at ? timeLabel(at, timezone) : "—",
      domain: s.domain || s.email.split("@")[1] || s.email,
      email: s.email,
      subject: s.subject,
      body: s.body,
      meta: at ? M.meta.sent(formatSendTime(at, timezone, true)) : "",
    };
  });
}

/** Regroupe des lignes déjà triées sous leur titre de jour, sans changer l'ordre. */
export function groupByDay(rows: readonly EnvoiRow[]): { day: string; rows: EnvoiRow[] }[] {
  const out: { day: string; rows: EnvoiRow[] }[] = [];
  for (const r of rows) {
    const last = out.at(-1);
    if (last && last.day === r.day) last.rows.push(r);
    else out.push({ day: r.day, rows: [r] });
  }
  return out;
}

/** « Lundi 23 novembre, 9 h » : le repère « Prochain départ » (l'heure ne se coupe pas en fin de ligne). */
export function nextLabel(iso: string, timezone: string): string {
  const [day = "", time = ""] = formatSendTime(new Date(iso), timezone, true).split(" à ");
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}, ${time.replaceAll(" ", "\u00a0")}`;
}

/** « du lundi au vendredi, entre 9 h et 18 h » : les horaires d'envoi tels que l'écran les dit. */
export function hoursLabel(w: { days: number[]; startHour: number; endHour: number }): string {
  return describeWindow(w).replace(/, de (\d+) h à (\d+) h$/, ", entre $1 h et $2 h");
}

/** D'où partent les emails : « votre boîte Gmail », sinon l'adresse de la boîte. */
export function fromLabel(provider: string | null, email: string | null): string | null {
  return provider === "google" ? M.states.actif.gmail : email;
}
