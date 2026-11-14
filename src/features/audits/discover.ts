import type { SerpResult } from "@/lib/dataforseo";
import { hostOf, isExcludedDomain, isOwnDomain } from "./excluded-domains";
import type { PlanLimits } from "./plans";

/** Une ligne organique d'une SERP, normalisée. */
export interface SerpEntry {
  rank: number;
  domain: string;
  url: string;
  title: string | null;
}

export interface QueryEntries {
  query: string;
  entries: SerpEntry[];
}

export interface CompetitorCandidate {
  domain: string;
  /** Nombre de requêtes prioritaires où le domaine apparaît. */
  queriesCount: number;
  /** Nombre total d'apparitions (un domaine peut avoir plusieurs pages). */
  appearances: number;
  bestRank: number;
  avgRank: number;
  score: number;
  sampleUrl: string | null;
}

const ORGANIC_TYPES = new Set(["organic", "featured_snippet"]);

const REDIRECT_HOSTS = new Set(["google.com", "google.fr"]);

/**
 * Constaté en production (14/11/2026) : la SERP live renvoie parfois des liens de redirection
 * Google (`google.com/goto?url=...`, `domain` = google.com). Le vrai site n'est alors lisible que
 * dans `breadcrumb` (« https://www.site.fr › dossier › page... »). On le reconstruit ;
 * l'URL obtenue est partielle (segments tronqués ignorés) mais le domaine est fiable.
 */
export function resolveRedirect(item: {
  url?: string | null;
  domain?: string | null;
  breadcrumb?: string | null;
}): { domain: string; url: string } | null {
  const url = item.url?.trim() ?? "";
  const host = hostOf(item.domain || url);
  if (url && host && !REDIRECT_HOSTS.has(host)) return { domain: host, url };
  if (!url) return null;
  const [origin, ...segments] = (item.breadcrumb ?? "").split("›").map((s) => s.trim());
  if (!origin) return null;
  const real = hostOf(origin);
  if (!real || REDIRECT_HOSTS.has(real)) return null;
  const kept = segments.filter((s) => s && !s.endsWith("..."));
  const base = origin.startsWith("http") ? origin : `https://${origin}`;
  return { domain: real, url: [base.replace(/\/$/, ""), ...kept].join("/") };
}

/** Extrait les résultats organiques (hors PAA, vidéos, etc.) du top `depth`. */
export function serpEntries(result: SerpResult | null, depth = 30): SerpEntry[] {
  const out: SerpEntry[] = [];
  const seenRanks = new Set<number>();
  for (const item of result?.items ?? []) {
    if (!ORGANIC_TYPES.has(item.type)) continue;
    const resolved = resolveRedirect(item);
    if (!resolved) continue;
    const { domain, url } = resolved;
    const rank = item.rank_group ?? item.rank_absolute;
    if (!domain || !rank || rank < 1 || rank > depth) continue;
    // Un extrait mis en avant reprend souvent le résultat organique du même rang.
    if (seenRanks.has(rank)) continue;
    seenRanks.add(rank);
    out.push({ rank, domain, url, title: item.title ?? null });
  }
  return out;
}

/** Poids d'une apparition : 1 en position 1, ~0,03 en position 30. */
export function rankWeight(rank: number, depth = 30): number {
  return Math.max(0, (depth + 1 - rank) / depth);
}

export interface AggregateOptions {
  ownDomain: string;
  extraExcluded?: readonly string[];
  depth?: number;
}

/**
 * Agrège les domaines sur toutes les requêtes. Tri : couverture de requêtes, puis
 * score (somme des poids de position), puis ordre alphabétique (déterministe).
 */
export function aggregateCompetitors(
  perQuery: QueryEntries[],
  opts: AggregateOptions,
): CompetitorCandidate[] {
  const depth = opts.depth ?? 30;
  const acc = new Map<
    string,
    { queries: Set<string>; ranks: number[]; score: number; best: SerpEntry }
  >();
  for (const { query, entries } of perQuery) {
    for (const e of entries) {
      if (isOwnDomain(e.domain, opts.ownDomain)) continue;
      if (isExcludedDomain(e.domain, opts.extraExcluded)) continue;
      const cur = acc.get(e.domain) ?? {
        queries: new Set<string>(),
        ranks: [],
        score: 0,
        best: e,
      };
      cur.queries.add(query);
      cur.ranks.push(e.rank);
      cur.score += rankWeight(e.rank, depth);
      if (e.rank < cur.best.rank) cur.best = e;
      acc.set(e.domain, cur);
    }
  }
  const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
  return [...acc.entries()]
    .map(([domain, v]) => ({
      domain,
      queriesCount: v.queries.size,
      appearances: v.ranks.length,
      bestRank: Math.min(...v.ranks),
      avgRank: round(v.ranks.reduce((a, b) => a + b, 0) / v.ranks.length, 2),
      score: round(v.score, 3),
      sampleUrl: v.best.url,
    }))
    .sort(
      (a, b) =>
        b.queriesCount - a.queriesCount || b.score - a.score || a.domain.localeCompare(b.domain),
    );
}

/**
 * Sélection selon le plan : plafond `maxCompetitors`. Pour un plan qui vise 10 à 20,
 * on garde d'abord les domaines présents sur au moins 2 requêtes, puis on complète
 * avec les meilleurs restants jusqu'au minimum visé.
 */
export function selectCompetitors(
  candidates: CompetitorCandidate[],
  limits: Pick<PlanLimits, "maxCompetitors" | "minCompetitors">,
): CompetitorCandidate[] {
  if (limits.maxCompetitors <= limits.minCompetitors) {
    return candidates.slice(0, limits.maxCompetitors);
  }
  const multi = candidates.filter((c) => c.queriesCount >= 2);
  const picked = multi.slice(0, limits.maxCompetitors);
  if (picked.length >= limits.minCompetitors) return picked;
  const rest = candidates.filter((c) => !picked.includes(c));
  return [...picked, ...rest.slice(0, limits.minCompetitors - picked.length)];
}
