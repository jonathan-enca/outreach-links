import {
  hostOf,
  isExcludedDomain,
  isOwnDomain,
  isValidHost,
} from "@/features/audits/excluded-domains";
import type { SerpEntry } from "@/features/audits/discover";
import type { PlannedQuery, Tactic } from "@/features/queries/schema";
import type { ContentSearchResult, DomainIntersectionResult } from "@/lib/dataforseo";
import { COLLECTION_LIMITS } from "./limits";
import type { CollectionContext, MergedCandidate, RawCandidate } from "./types";

/**
 * Filtre GRATUIT commun à toutes les sources : vrai nom de domaine, ni le site lui-même, ni un
 * concurrent, ni une plateforme ou un géant (liste de M1.3). Retourne le domaine normalisé ou null.
 * Les exclusions plus fines (faux domaines, domaines déjà contactés) relèvent de MT.4.
 */
export function acceptDomain(
  input: string | null | undefined,
  ctx: CollectionContext,
): string | null {
  if (!input) return null;
  const host = hostOf(input);
  if (!isValidHost(host)) return null;
  if (isOwnDomain(host, ctx.ownDomain)) return null;
  if (isExcludedDomain(host)) return null;
  if (FREE_HOSTING_FARMS.some((f) => host === f || host.endsWith(`.${f}`))) return null;
  if (ctx.competitorDomains.some((c) => host === c || host.endsWith(`.${c}`))) return null;
  return host;
}

/**
 * Hébergements gratuits où prolifèrent des réseaux de pages-liens (constaté au run réel du 16/11/2026 :
 * coloriage*.web.app, *.firebaseapp.com). Écartés dès la collecte. Les plateformes de blogs (blogspot...)
 * sont déjà exclues par la liste de M1.3 : à rouvrir en MT.4, ce sont parfois de vraies petites cibles.
 */
const FREE_HOSTING_FARMS = ["web.app", "firebaseapp.com", "pages.dev"];

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const nb = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Candidats d'une SERP : un par résultat organique accepté. */
export function fromSerp(
  query: PlannedQuery,
  entries: readonly SerpEntry[],
  ctx: CollectionContext,
): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const e of entries) {
    const domain = acceptDomain(e.domain, ctx);
    if (!domain) continue;
    out.push({
      domain,
      url: e.url,
      title: e.title,
      source: query.tactic === "mentions" ? "mention" : "serp",
      tactic: query.tactic,
      query: query.q,
      persona: query.persona,
      rank: e.rank,
      pageType: null,
      competitorsCount: 0,
      domainRank: null,
      spamScore: null,
    });
  }
  return out;
}

/** Un domaine vu dans le recoupement : les clés « 1 », « 2 »... sont les concurrents qui le lient. */
export interface IntersectionDomain {
  domain: string;
  keys: string[];
  url: string | null;
  anchor: string | null;
  rank: number | null;
  /** Pire score de spam des liens vers ce domaine (backlinks_spam_score, 0-100). */
  spam: number | null;
}

/**
 * Lit une page de Domain Intersection (mode partiel) et agrège les lignes par domaine. Format
 * tolérant : le domaine source est lu dans `domain_from` (sinon `domain`, sinon `target`).
 */
export function readIntersection(
  result: DomainIntersectionResult | null,
  ctx: CollectionContext,
): IntersectionDomain[] {
  const byDomain = new Map<string, IntersectionDomain & { set: Set<string> }>();
  for (const item of result?.items ?? []) {
    for (const [key, raw] of Object.entries(item.domain_intersection ?? {})) {
      const row = (raw ?? {}) as Record<string, unknown>;
      const domain = acceptDomain(str(row.domain_from) ?? str(row.domain) ?? str(row.target), ctx);
      if (!domain) continue;
      const cur = byDomain.get(domain) ?? {
        domain,
        keys: [],
        set: new Set<string>(),
        url: null,
        anchor: null,
        rank: null,
        spam: null,
      };
      cur.set.add(key);
      cur.url ??= str(row.url_from);
      cur.anchor ??= str(row.anchor);
      const rank = nb(row.domain_from_rank) ?? nb(row.rank);
      if (rank !== null && (cur.rank === null || rank > cur.rank)) cur.rank = rank;
      const spam = nb(row.backlinks_spam_score);
      if (spam !== null && (cur.spam === null || spam > cur.spam)) cur.spam = spam;
      byDomain.set(domain, cur);
    }
  }
  return [...byDomain.values()].map(({ set, ...d }) => ({ ...d, keys: [...set] }));
}

/** Réunit les domaines de plusieurs pages : un domaine vu sur deux pages cumule ses concurrents. */
export function mergeIntersection(
  pages: readonly (readonly IntersectionDomain[])[],
): IntersectionDomain[] {
  const map = new Map<string, IntersectionDomain & { set: Set<string> }>();
  for (const page of pages) {
    for (const d of page) {
      const cur = map.get(d.domain) ?? { ...d, keys: [], set: new Set<string>() };
      for (const k of d.keys) cur.set.add(k);
      cur.url ??= d.url;
      cur.anchor ??= d.anchor;
      if (d.rank !== null && (cur.rank === null || d.rank > cur.rank)) cur.rank = d.rank;
      if (d.spam !== null && (cur.spam === null || d.spam > cur.spam)) cur.spam = d.spam;
      map.set(d.domain, cur);
    }
  }
  return [...map.values()].map(({ set, ...d }) => ({ ...d, keys: [...set] }));
}

/** Un domaine n'est candidat que s'il lie au moins `min` concurrents distincts (le recoupement). */
export function intersectionCandidates(
  domains: readonly IntersectionDomain[],
  min: number = COLLECTION_LIMITS.intersection.minCompetitors,
): RawCandidate[] {
  return domains
    .filter((d) => d.keys.length >= min)
    .filter((d) => d.spam === null || d.spam < COLLECTION_LIMITS.intersection.spamMax)
    .map((d) => ({
      domain: d.domain,
      url: d.url,
      title: d.anchor,
      source: "intersection" as const,
      tactic: "inconnus" as const,
      query: null,
      persona: null,
      rank: null,
      pageType: null,
      competitorsCount: d.keys.length,
      domainRank: d.rank,
      spamScore: d.spam,
    }));
}

/**
 * Candidats de Content Analysis : filtre de langue (une langue connue et différente est écartée,
 * une langue absente est gardée), de spam et de domaine. `mention` = recherche d'une variante du nom.
 */
export function fromContent(
  result: ContentSearchResult | null,
  ctx: CollectionContext,
  opts: { keyword: string; pageType: string | null; mention: boolean },
): RawCandidate[] {
  const out: RawCandidate[] = [];
  for (const item of result?.items ?? []) {
    const domain = acceptDomain(item.main_domain ?? item.domain, ctx);
    if (!domain) continue;
    const language = str(item.language ?? item.content_info?.language)?.toLowerCase() ?? null;
    if (language && language !== ctx.language.toLowerCase()) continue;
    const spam = nb(item.spam_score);
    if (spam !== null && spam >= COLLECTION_LIMITS.content.spamMax) continue;
    out.push({
      domain,
      url: str(item.url),
      title: str(item.content_info?.title) ?? str(item.content_info?.main_title),
      source: opts.mention ? "mention" : "content",
      tactic: opts.mention ? "mentions" : "inconnus",
      query: opts.keyword,
      persona: null,
      rank: null,
      pageType: opts.pageType ?? str(item.page_types?.[0]),
      competitorsCount: 0,
      domainRank: nb(item.domain_rank),
      spamScore: spam,
    });
  }
  return out;
}

/** Domaines nouveaux (jamais vus) parmi des candidats bruts : la mesure du rendement d'un appel. */
export function newDomains(raws: readonly RawCandidate[], seen: ReadonlySet<string>): string[] {
  const fresh = new Set<string>();
  for (const r of raws) if (!seen.has(r.domain)) fresh.add(r.domain);
  return [...fresh];
}

/**
 * Arrêt par rendement décroissant (docs/audit-v2.md section 6, mécanisme 2) : `newCounts` = nombre
 * de nouveaux domaines de chaque requête exécutée, dans l'ordre. Faux tant que `minQueries` ne sont
 * pas passées ; ensuite vrai si la moyenne de la fenêtre récente tombe sous `minNewPerQuery`.
 */
export function shouldStopForYield(
  newCounts: readonly number[],
  opts: {
    minQueries: number;
    window: number;
    minNewPerQuery: number;
  } = COLLECTION_LIMITS.yieldStop,
): boolean {
  if (newCounts.length < Math.max(opts.minQueries, opts.window)) return false;
  const recent = newCounts.slice(-opts.window);
  const avg = recent.reduce((s, n) => s + n, 0) / recent.length;
  return avg < opts.minNewPerQuery;
}

const TACTIC_ORDER: Record<Tactic, number> = { inconnus: 0, ressources: 1, mentions: 2 };

/** Fusionne les candidats bruts par domaine (une ligne par domaine, sources et tactiques cumulées). */
export function mergeCandidates(raws: readonly RawCandidate[], maxSources = 6): MergedCandidate[] {
  const map = new Map<string, MergedCandidate>();
  for (const r of raws) {
    const cur = map.get(r.domain);
    const ref = {
      source: r.source,
      query: r.query,
      persona: r.persona,
      rank: r.rank,
      pageType: r.pageType,
    };
    if (!cur) {
      map.set(r.domain, {
        domain: r.domain,
        url: r.url,
        title: r.title,
        tactics: [r.tactic],
        sources: [ref],
        competitorsCount: r.competitorsCount,
        domainRank: r.domainRank,
        spamScore: r.spamScore,
        pageType: r.pageType,
        signalCount: 1,
      });
      continue;
    }
    if (!cur.tactics.includes(r.tactic)) cur.tactics.push(r.tactic);
    cur.signalCount++;
    if (cur.sources.length < maxSources) cur.sources.push(ref);
    // La page d'une mention ou d'une SERP est plus parlante que l'ancre d'un recoupement.
    if (!cur.url && r.url) cur.url = r.url;
    if (!cur.title && r.title) cur.title = r.title;
    cur.competitorsCount = Math.max(cur.competitorsCount, r.competitorsCount);
    if (r.domainRank !== null) cur.domainRank = Math.max(cur.domainRank ?? 0, r.domainRank);
    if (r.spamScore !== null) cur.spamScore = Math.min(cur.spamScore ?? 100, r.spamScore);
    cur.pageType ??= r.pageType;
  }
  const out = [...map.values()];
  for (const c of out) c.tactics.sort((a, b) => TACTIC_ORDER[a] - TACTIC_ORDER[b]);
  // Ordre indicatif pour MT.4 : recoupement, puis nombre de sources, puis domaine (stable).
  return out.sort(
    (a, b) =>
      b.competitorsCount - a.competitorsCount ||
      b.signalCount - a.signalCount ||
      a.domain.localeCompare(b.domain),
  );
}
