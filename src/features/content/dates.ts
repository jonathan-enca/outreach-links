/**
 * Dates des contenus : écrites à l'heure de Paris dans l'en-tête (« 2026-11-25 » ou « 2026-11-25T08:00 »),
 * converties ici en instant réel. Sans heure, le contenu sort à minuit, heure de Paris.
 */
const PARIS = "Europe/Paris";
const WALL = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** Décalage de Paris (en ms) à un instant donné : heure affichée à Paris moins heure UTC. */
function parisOffsetMs(instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PARIS,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return wall - Math.floor(instant / 1000) * 1000;
}

/** « 2026-11-25 » ou « 2026-11-25T08:00 » (heure de Paris) -> instant. `null` si le texte n'a pas cette forme. */
export function parseParisDate(text: string): Date | null {
  const m = WALL.exec(text.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1).map((v) => Number(v ?? 0));
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  // La date doit exister (pas de 31 février) : on la relit telle qu'elle a été comprise.
  const check = new Date(wall);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59 || s > 59)
    return null;
  // Deux passes : la seconde corrige le décalage autour d'un changement d'heure.
  let instant = wall - parisOffsetMs(wall);
  instant = wall - parisOffsetMs(instant);
  return new Date(instant);
}

/** « 22 novembre 2026 », à l'heure de Paris. */
export function formatParisDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** « 2026-11-22 », à l'heure de Paris (journal, llms.txt). */
export function parisDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PARIS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
