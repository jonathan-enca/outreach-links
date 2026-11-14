/**
 * Calculs purs de M1.5 (aucun accès réseau ni base) : profil de liens, pages à pousser,
 * écart de domaines référents, besoin en domaines référents, contrôle technique.
 * Tous les seuils sont des HYPOTHÈSES documentées, exportées pour être testées.
 */

// ----- Utilitaires -----------------------------------------------------------

export function median(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid]! : (v[mid - 1]! + v[mid]!) / 2;
}

/** Domaine d'une URL, minuscules, sans `www.` (null si l'URL est invalide). */
export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|ref$)/i;

/** URL de page canonique : sans ancre, sans paramètres de suivi, sans `/` final (sauf racine). */
export function normalizePageUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()])
      if (TRACKING_PARAM.test(k)) u.searchParams.delete(k);
    u.searchParams.sort();
    u.hostname = u.hostname.toLowerCase();
    let path = u.pathname.replace(/\/{2,}/g, "/");
    if (path.length > 1) path = path.replace(/\/$/, "");
    const qs = u.searchParams.toString();
    return `${u.protocol}//${u.hostname}${path}${qs ? `?${qs}` : ""}`;
  } catch {
    return null;
  }
}

// ----- Profil de liens (ancres, dofollow) -----------------------------------

export const ANCHOR_KINDS = ["marque", "url", "generique", "vide", "autre"] as const;
export type AnchorKind = (typeof ANCHOR_KINDS)[number];

const GENERIC_ANCHORS = new Set([
  "ici",
  "cliquez ici",
  "clic ici",
  "lien",
  "site",
  "site web",
  "voir",
  "voir plus",
  "source",
  "en savoir plus",
  "lire la suite",
  "lire plus",
  "plus d'infos",
  "ce site",
  "this",
  "here",
  "click here",
  "website",
  "read more",
  "link",
  "visit",
  "visiter",
]);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Radical de marque : "mega-coloring.com" -> "megacoloring" (et "mega coloring" côté ancre). */
export function brandStem(domain: string): string {
  const label =
    domain
      .toLowerCase()
      .replace(/^www\./, "")
      .split(".")[0] ?? "";
  return label.replace(/[^a-z0-9]/g, "");
}

export function classifyAnchor(anchor: string | null | undefined, domain: string): AnchorKind {
  const raw = (anchor ?? "").trim();
  if (!raw) return "vide";
  if (/^(https?:\/\/|www\.)/i.test(raw) || raw.toLowerCase().includes(domain.toLowerCase())) {
    return "url";
  }
  const n = norm(raw);
  if (!n) return "vide";
  const stem = brandStem(domain);
  if (stem.length >= 3 && n.replace(/ /g, "").includes(stem)) return "marque";
  if (GENERIC_ANCHORS.has(n)) return "generique";
  return "autre";
}

export interface AnchorInput {
  anchor: string | null | undefined;
  dofollow: boolean | null | undefined;
}

export interface AnchorProfile {
  sampleSize: number;
  /** Part de chaque type d'ancre (0 à 1) dans l'échantillon. */
  shares: Record<AnchorKind, number>;
  top: { anchor: string; count: number; kind: AnchorKind }[];
  /** Part de liens dofollow parmi ceux dont l'attribut est connu (null si inconnu). */
  dofollowShare: number | null;
  /** Ancre non-marque trop dominante (risque de sur-optimisation) : seuil et taille minimale. */
  overOptimized: boolean;
}

/** Seuils [HYPOTHÈSE] : une ancre "commerciale" au-delà de 25 % d'un échantillon >= 20 liens. */
export const OVER_OPTIMIZED_SHARE = 0.25;
export const OVER_OPTIMIZED_MIN_SAMPLE = 20;

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

export function buildAnchorProfile(links: AnchorInput[], domain: string): AnchorProfile {
  const counts = new Map<string, { count: number; kind: AnchorKind; label: string }>();
  const kindCount: Record<AnchorKind, number> = {
    marque: 0,
    url: 0,
    generique: 0,
    vide: 0,
    autre: 0,
  };
  let follow = 0;
  let known = 0;
  for (const l of links) {
    const kind = classifyAnchor(l.anchor, domain);
    kindCount[kind]++;
    if (kind !== "vide") {
      const key = norm(l.anchor ?? "") || (l.anchor ?? "");
      const cur = counts.get(key) ?? {
        count: 0,
        kind,
        label: (l.anchor ?? "").trim().slice(0, 80),
      };
      cur.count++;
      counts.set(key, cur);
    }
    if (typeof l.dofollow === "boolean") {
      known++;
      if (l.dofollow) follow++;
    }
  }
  const n = links.length;
  const shares = Object.fromEntries(
    ANCHOR_KINDS.map((k) => [k, n ? r4(kindCount[k] / n) : 0]),
  ) as Record<AnchorKind, number>;
  const top = [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 10)
    .map((c) => ({ anchor: c.label, count: c.count, kind: c.kind }));
  const topCommercial = top.find((a) => a.kind === "autre");
  return {
    sampleSize: n,
    shares,
    top,
    dofollowShare: known ? r4(follow / known) : null,
    overOptimized:
      n >= OVER_OPTIMIZED_MIN_SAMPLE &&
      !!topCommercial &&
      topCommercial.count / n >= OVER_OPTIMIZED_SHARE,
  };
}

// ----- Pages : regroupement des mots-clés, priorité --------------------------

export interface RankedKeyword {
  keyword: string;
  url: string;
  position: number;
  volume: number;
}

export interface KeywordInPage {
  keyword: string;
  position: number;
  volume: number;
}

export interface PageAgg {
  url: string;
  keywords: KeywordInPage[];
  keywordsCount: number;
  totalVolume: number;
  avgPosition: number;
  bestPosition: number;
  isPriority: boolean;
  priorityScore: number;
  priorityRank: number | null;
}

/** Positions "à pousser" (4 à 20) et volume minimal par mot-clé [HYPOTHÈSES]. */
export const PUSH_MIN_POSITION = 4;
export const PUSH_MAX_POSITION = 20;
export const HIGH_VOLUME_MIN = 50;
/** Mots-clés conservés par page dans keywords_json. */
export const KEYWORDS_PER_PAGE = 15;

/** Poids de proximité : 1 en position 4, 0 en position 21. */
export function proximityWeight(position: number): number {
  return Math.max(
    0,
    (PUSH_MAX_POSITION + 1 - position) / (PUSH_MAX_POSITION + 1 - PUSH_MIN_POSITION),
  );
}

export function groupKeywordsByPage(items: RankedKeyword[], ownDomain: string): PageAgg[] {
  const own = ownDomain.toLowerCase().replace(/^www\./, "");
  const byUrl = new Map<string, Map<string, KeywordInPage>>();
  for (const it of items) {
    const url = normalizePageUrl(it.url);
    const host = url ? hostOf(url) : null;
    if (!url || !host || (host !== own && !host.endsWith(`.${own}`))) continue;
    if (!Number.isFinite(it.position) || it.position < 1) continue;
    const kws = byUrl.get(url) ?? new Map<string, KeywordInPage>();
    const key = it.keyword.trim().toLowerCase();
    const prev = kws.get(key);
    if (!prev || it.position < prev.position) {
      kws.set(key, { keyword: key, position: it.position, volume: Math.max(0, it.volume || 0) });
    }
    byUrl.set(url, kws);
  }
  const pages: PageAgg[] = [];
  for (const [url, kws] of byUrl) {
    const all = [...kws.values()];
    const pushable = all.filter(
      (k) =>
        k.position >= PUSH_MIN_POSITION &&
        k.position <= PUSH_MAX_POSITION &&
        k.volume >= HIGH_VOLUME_MIN,
    );
    const score = pushable.reduce((s, k) => s + k.volume * proximityWeight(k.position), 0);
    const keywords = [...all]
      .sort((a, b) => b.volume - a.volume || a.position - b.position)
      .slice(0, KEYWORDS_PER_PAGE);
    pages.push({
      url,
      keywords,
      keywordsCount: all.length,
      totalVolume: all.reduce((s, k) => s + k.volume, 0),
      avgPosition: Math.round((all.reduce((s, k) => s + k.position, 0) / all.length) * 100) / 100,
      bestPosition: Math.min(...all.map((k) => k.position)),
      isPriority: pushable.length > 0,
      priorityScore: Math.round(score * 100) / 100,
      priorityRank: null,
    });
  }
  const ranked = pages
    .filter((p) => p.isPriority)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.url.localeCompare(b.url));
  ranked.forEach((p, i) => (p.priorityRank = i + 1));
  return pages.sort(
    (a, b) =>
      (a.priorityRank ?? 1e9) - (b.priorityRank ?? 1e9) ||
      b.totalVolume - a.totalVolume ||
      a.url.localeCompare(b.url),
  );
}

// ----- Besoin en domaines référents (ordre de grandeur) -----------------------

/**
 * Hypothèses du calcul (jamais une promesse) :
 * - le repère est la médiane des domaines référents des concurrents retenus ;
 * - une page porte en moyenne PAGE_SHARE du profil de liens d'un domaine ;
 * - une page déjà proche du haut (positions 4 à 10) a besoin de moins de liens que
 *   les positions 11 à 20 ;
 * - le résultat est une fourchette (±40 %) et une valeur centrale arrondie.
 */
export const PAGE_SHARE = 0.2;
export const POSITION_FACTOR = { near: 0.7, far: 1 } as const;
export const RANGE_SPREAD = 0.4;

export interface RequiredDomains {
  estimated: number;
  low: number;
  high: number;
}

/** Arrondi d'ordre de grandeur : entier sous 10, multiple de 5 jusqu'à 100, de 10 au-delà. */
export function roundOrder(n: number): number {
  if (n < 10) return Math.round(n);
  if (n < 100) return Math.round(n / 5) * 5;
  return Math.round(n / 10) * 10;
}

export function estimateRequiredDomains(input: {
  pageReferringDomains: number;
  /** Médiane des domaines référents des concurrents (niveau domaine). Null : pas de repère. */
  benchmarkDomains: number | null;
  avgPosition: number;
}): RequiredDomains | null {
  if (input.benchmarkDomains === null || input.benchmarkDomains <= 0) return null;
  const factor = input.avgPosition <= 10 ? POSITION_FACTOR.near : POSITION_FACTOR.far;
  const target = input.benchmarkDomains * PAGE_SHARE * factor;
  const missing = Math.max(0, target - Math.max(0, input.pageReferringDomains));
  return {
    estimated: roundOrder(missing),
    low: roundOrder(missing * (1 - RANGE_SPREAD)),
    high: roundOrder(missing * (1 + RANGE_SPREAD)),
  };
}

// ----- Écart de domaines référents -------------------------------------------

export interface CompetitorLinkRow {
  competitorDomain: string;
  sourceDomain: string;
  sourceUrl: string;
  anchor: string | null;
  dofollow: boolean | null;
  spamScore: number | null;
  sourceRank: number | null;
}

export interface GapDomain {
  domain: string;
  competitorsCount: number;
  competitors: string[];
  bestRank: number | null;
  minSpamScore: number | null;
  dofollow: boolean | null;
  sampleUrl: string;
  sampleAnchor: string | null;
}

/**
 * Domaines qui citent au moins un concurrent mais pas le site. Classés par nombre de
 * concurrents cités (un domaine qui cite plusieurs concurrents est une meilleure cible),
 * puis par rang. Le site lui-même et ses sous-domaines sont écartés.
 */
export function computeGap(
  ownReferringDomains: Iterable<string>,
  rows: CompetitorLinkRow[],
  ownDomain: string,
  limit = 500,
): GapDomain[] {
  const own = new Set([...ownReferringDomains].map((d) => d.toLowerCase().replace(/^www\./, "")));
  const self = ownDomain.toLowerCase().replace(/^www\./, "");
  const byDomain = new Map<string, GapDomain>();
  for (const r of rows) {
    const d = r.sourceDomain.toLowerCase().replace(/^www\./, "");
    if (!d || own.has(d) || d === self || d.endsWith(`.${self}`)) continue;
    const g = byDomain.get(d);
    if (!g) {
      byDomain.set(d, {
        domain: d,
        competitorsCount: 1,
        competitors: [r.competitorDomain],
        bestRank: r.sourceRank ?? null,
        minSpamScore: r.spamScore ?? null,
        dofollow: r.dofollow ?? null,
        sampleUrl: r.sourceUrl,
        sampleAnchor: r.anchor,
      });
      continue;
    }
    if (!g.competitors.includes(r.competitorDomain)) {
      g.competitors.push(r.competitorDomain);
      g.competitorsCount = g.competitors.length;
    }
    if (r.sourceRank !== null && (g.bestRank === null || r.sourceRank > g.bestRank)) {
      g.bestRank = r.sourceRank;
    }
    if (r.spamScore !== null && (g.minSpamScore === null || r.spamScore < g.minSpamScore)) {
      g.minSpamScore = r.spamScore;
    }
    if (r.dofollow === true) g.dofollow = true;
  }
  return [...byDomain.values()]
    .sort(
      (a, b) =>
        b.competitorsCount - a.competitorsCount ||
        (b.bestRank ?? -1) - (a.bestRank ?? -1) ||
        a.domain.localeCompare(b.domain),
    )
    .slice(0, limit);
}

// ----- Contrôle technique minimal --------------------------------------------

export const TECH_ISSUES = [
  "http_erreur",
  "redirection",
  "non_indexable",
  "sans_titre",
  "sans_description",
  "sans_h1",
  "score_faible",
] as const;
export type TechIssue = (typeof TECH_ISSUES)[number];

export interface TechResult {
  status: "ok" | "attention" | "probleme";
  issues: TechIssue[];
  httpStatus: number | null;
  onpageScore: number | null;
}

export const LOW_ONPAGE_SCORE = 60;

export interface OnPageItemLike {
  status_code?: number | null;
  onpage_score?: number | null;
  meta?: { title?: string | null } | null;
  checks?: Record<string, unknown> | null;
}

/**
 * Contrôle technique minimal d'après la réponse OnPage. Les noms de contrôles sont ceux
 * de la documentation [HYPOTHÈSE : à recaler sur une vraie réponse] ; un contrôle absent
 * est ignoré, jamais interprété comme un défaut.
 */
export function assessTechnical(item: OnPageItemLike): TechResult {
  const issues: TechIssue[] = [];
  const checks = item.checks ?? {};
  const flag = (...keys: string[]) => keys.some((k) => checks[k] === true);
  const code = item.status_code ?? null;
  if ((code !== null && code >= 400) || flag("is_broken", "is_4xx_code", "is_5xx_code")) {
    issues.push("http_erreur");
  } else if ((code !== null && code >= 300) || flag("is_redirect")) {
    issues.push("redirection");
  }
  if (flag("is_noindex", "noindex", "robots_noindex", "meta_noindex")) issues.push("non_indexable");
  if (flag("no_title") || (item.meta && item.meta.title === "")) issues.push("sans_titre");
  if (flag("no_description")) issues.push("sans_description");
  if (flag("no_h1_tag")) issues.push("sans_h1");
  const score = item.onpage_score ?? null;
  if (score !== null && score < LOW_ONPAGE_SCORE) issues.push("score_faible");
  const blocking = issues.some((i) => i === "http_erreur" || i === "non_indexable");
  return {
    status: blocking ? "probleme" : issues.length ? "attention" : "ok",
    issues,
    httpStatus: code,
    onpageScore: score,
  };
}
