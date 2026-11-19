/**
 * Search Console (MQ.2) : lecture seule. Deux appels seulement : la liste des propriétés du compte,
 * puis les requêtes ou les pages les plus vues sur 90 jours. Aucune écriture, aucun envoi.
 */
const SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
const SEARCH_ANALYTICS = (property: string) =>
  `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`;

/** Nombre de lignes gardées par dimension (les plus vues d'abord). */
export const SEARCH_CONSOLE_ROWS = 100;
/** Fenêtre d'analyse. Les données récentes de Google ont 2 à 3 jours de retard. */
export const SEARCH_CONSOLE_DAYS = 90;
const LAG_DAYS = 3;

type Fetch = typeof fetch;

export interface SearchProperty {
  siteUrl: string;
  permissionLevel: string;
}

export interface SearchRow {
  key: string;
  clicks: number;
  impressions: number;
  position: number;
}

/** Normalise un domaine saisi (avec ou sans https, www, barre finale) : `exemple.fr`. */
export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

/**
 * Propriété Search Console correspondant au site : d'abord le domaine entier (`sc-domain:`), puis
 * l'adresse https ou http, avec ou sans www. Une propriété seulement « non vérifiée » ne compte pas.
 */
export function pickProperty(domain: string, properties: SearchProperty[]): string | null {
  const d = normalizeDomain(domain);
  if (!d) return null;
  const usable = properties.filter((p) => p.permissionLevel !== "siteUnverifiedUser");
  const candidates = [
    `sc-domain:${d}`,
    `https://${d}/`,
    `https://www.${d}/`,
    `http://${d}/`,
    `http://www.${d}/`,
  ];
  for (const c of candidates) {
    if (usable.some((p) => p.siteUrl === c)) return c;
  }
  return null;
}

/** Propriétés du compte. Null en cas de refus ou de panne (le site reste sans Search Console). */
export async function listProperties(
  accessToken: string,
  fetchFn: Fetch = fetch,
): Promise<SearchProperty[] | null> {
  const res = await fetchFn(SITES_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    siteEntry?: { siteUrl?: string; permissionLevel?: string }[];
  };
  return (j.siteEntry ?? []).flatMap((e) =>
    e.siteUrl ? [{ siteUrl: e.siteUrl, permissionLevel: e.permissionLevel ?? "" }] : [],
  );
}

/** Dates de la fenêtre (UTC), en AAAA-MM-JJ, sans les derniers jours non publiés. */
export function analyticsWindow(now: Date = new Date()): { startDate: string; endDate: string } {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const end = new Date(now.getTime() - LAG_DAYS * 86_400_000);
  const start = new Date(end.getTime() - (SEARCH_CONSOLE_DAYS - 1) * 86_400_000);
  return { startDate: iso(start), endDate: iso(end) };
}

/** Lignes d'une dimension (`query` ou `page`), les plus vues d'abord. Null si Google échoue. */
export async function queryRows(
  accessToken: string,
  property: string,
  dimension: "query" | "page",
  now: Date = new Date(),
  fetchFn: Fetch = fetch,
): Promise<SearchRow[] | null> {
  const res = await fetchFn(SEARCH_ANALYTICS(property), {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...analyticsWindow(now),
      dimensions: [dimension],
      rowLimit: SEARCH_CONSOLE_ROWS,
      type: "web",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as {
    rows?: { keys?: string[]; clicks?: number; impressions?: number; position?: number }[];
  };
  return (j.rows ?? []).flatMap((r) =>
    r.keys?.[0]
      ? [
          {
            key: r.keys[0],
            clicks: r.clicks ?? 0,
            impressions: r.impressions ?? 0,
            position: Math.round((r.position ?? 0) * 10) / 10,
          },
        ]
      : [],
  );
}
