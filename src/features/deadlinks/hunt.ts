import type { PageFetcher } from "@/features/sites/verify";
import { extractOutboundLinks } from "./html";
import { robotsFromResponse, type RobotsRules } from "./robots";

/** Nom de produit identifiable dans le user-agent (jeton robots.txt : `OutreachLinksBot`). */
export const BOT_TOKEN = "OutreachLinksBot";
export const BOT_USER_AGENT = `${BOT_TOKEN}/1.0 (verification de liens morts; +https://outreach-links.vercel.app)`;

/** Plafonds du crawl : volume et profondeur (profondeur 1 : jamais de lien suivi au-delà). */
export interface HuntLimits {
  /** Pages ressources lues (profondeur 1, pas de suivi des liens trouvés). */
  maxResourcePages: number;
  maxLinksPerPage: number;
  /** URL de concurrents vérifiées. */
  maxCompetitorTargets: number;
  /** Nombre total de requêtes HTTP (robots.txt, pages et vérifications). */
  maxRequests: number;
  /** Délai minimal entre deux requêtes vers le même hôte. */
  hostDelayMs: number;
  maxSourcesPerDeadUrl: number;
}

export const DEFAULT_LIMITS: HuntLimits = {
  maxResourcePages: 8,
  maxLinksPerPage: 25,
  maxCompetitorTargets: 30,
  maxRequests: 200,
  hostDelayMs: 1000,
  maxSourcesPerDeadUrl: 10,
};

export interface CompetitorLink {
  sourceDomain: string;
  sourceUrl: string;
  targetUrl: string;
  competitorDomain: string | null;
}

export interface ResourcePage {
  domain: string;
  url: string;
}

export type DeadLinkKind = "competitor_page" | "resource_page";

export interface DeadLinkFinding {
  kind: DeadLinkKind;
  /** Site à contacter (celui qui porte le lien cassé). */
  sourceDomain: string;
  sourceUrl: string;
  brokenUrl: string;
  httpStatus: 404 | 410;
  anchor: string | null;
  competitorDomain: string | null;
  checkedAt: string;
}

export interface HuntStats {
  requests: number;
  competitorUrlsChecked: number;
  resourcePagesCrawled: number;
  linksChecked: number;
  blockedByRobots: number;
  dead: number;
  truncated: boolean;
}

export interface HuntDeps {
  fetch: PageFetcher;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  limits?: Partial<HuntLimits>;
}

export const isDead = (status: number): status is 404 | 410 => status === 404 || status === 410;

/**
 * Vérificateur de statut poli (robots.txt par hôte, délai par hôte, plafond global de requêtes) :
 * partagé par le chasseur 404 (M2.2) et la recherche de liens morts sur les pages cibles (MT.5).
 */
export function createStatusChecker(deps: HuntDeps, stats: HuntStats, limits: HuntLimits) {
  const lastHit = new Map<string, number>();
  const robots = new Map<string, RobotsRules>();
  const statusCache = new Map<string, number | null>();

  const budgetLeft = () => stats.requests < limits.maxRequests;

  async function polite(url: string) {
    const host = new URL(url).hostname;
    const last = lastHit.get(host);
    if (last !== undefined) {
      const wait = last + limits.hostDelayMs - deps.now();
      if (wait > 0) await deps.sleep(wait);
    }
    lastHit.set(host, deps.now());
    stats.requests++;
    return deps.fetch(url);
  }

  /** Règles robots de l'hôte, null si le budget de requêtes est épuisé. */
  async function rulesFor(url: string): Promise<RobotsRules | null> {
    const u = new URL(url);
    const key = `${u.protocol}//${u.host}`;
    const cached = robots.get(key);
    if (cached) return cached;
    if (!budgetLeft()) return null;
    const res = await polite(`${key}/robots.txt`);
    const rules = robotsFromResponse(res, BOT_TOKEN);
    robots.set(key, rules);
    return rules;
  }

  /** Statut HTTP d'une URL (null : interdit par robots, injoignable ou budget épuisé). */
  async function statusOf(url: string): Promise<number | null> {
    if (statusCache.has(url)) return statusCache.get(url) ?? null;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return null;
    }
    const rules = await rulesFor(url);
    if (!rules) {
      stats.truncated = true;
      return null;
    }
    if (!rules.allowed(u.pathname + u.search)) {
      stats.blockedByRobots++;
      statusCache.set(url, null);
      return null;
    }
    if (!budgetLeft()) {
      stats.truncated = true;
      return null;
    }
    const res = await polite(url);
    const status = res?.status ?? null;
    statusCache.set(url, status);
    return status;
  }

  return { polite, rulesFor, statusOf, budgetLeft };
}

/**
 * Chasseur 404. Deux sources, aucune requête payante :
 * 1. pages de concurrents ayant des backlinks et qui répondent aujourd'hui 404/410 : les sites
 *    qui les citent sont des cibles de remplacement ;
 * 2. liens sortants cassés (404/410) sur des pages ressources de la niche.
 * Chaque requête respecte robots.txt (jeton `OutreachLinksBot`), le délai par hôte et le
 * plafond global. Un lien n'est « mort » que sur un 404/410 constaté (une erreur DNS ou un
 * délai dépassé ne prouvent rien).
 */
export async function huntDeadLinks(
  input: { competitorLinks: CompetitorLink[]; resourcePages: ResourcePage[] },
  deps: HuntDeps,
): Promise<{ findings: DeadLinkFinding[]; stats: HuntStats }> {
  const limits: HuntLimits = { ...DEFAULT_LIMITS, ...deps.limits };
  const stats: HuntStats = {
    requests: 0,
    competitorUrlsChecked: 0,
    resourcePagesCrawled: 0,
    linksChecked: 0,
    blockedByRobots: 0,
    dead: 0,
    truncated: false,
  };
  const { polite, rulesFor, statusOf, budgetLeft } = createStatusChecker(deps, stats, limits);

  const findings: DeadLinkFinding[] = [];
  const stamp = () => new Date(deps.now()).toISOString();

  // 1. Pages de concurrents devenues 404/410, classées par nombre de domaines qui les citent.
  const byTarget = new Map<string, CompetitorLink[]>();
  for (const l of input.competitorLinks) {
    const list = byTarget.get(l.targetUrl) ?? [];
    list.push(l);
    byTarget.set(l.targetUrl, list);
  }
  const targets = [...byTarget.entries()]
    .map(([url, links]) => ({
      url,
      links,
      domains: new Set(links.map((l) => l.sourceDomain)).size,
    }))
    .sort((a, b) => b.domains - a.domains || a.url.localeCompare(b.url))
    .slice(0, limits.maxCompetitorTargets);
  for (const target of targets) {
    if (!budgetLeft()) {
      stats.truncated = true;
      break;
    }
    const status = await statusOf(target.url);
    if (status === null) continue;
    stats.competitorUrlsChecked++;
    if (!isDead(status)) continue;
    const seen = new Set<string>();
    for (const l of target.links) {
      if (seen.has(l.sourceDomain) || seen.size >= limits.maxSourcesPerDeadUrl) continue;
      seen.add(l.sourceDomain);
      findings.push({
        kind: "competitor_page",
        sourceDomain: l.sourceDomain,
        sourceUrl: l.sourceUrl,
        brokenUrl: target.url,
        httpStatus: status,
        anchor: null,
        competitorDomain: l.competitorDomain,
        checkedAt: stamp(),
      });
    }
  }

  // 2. Liens sortants cassés sur des pages ressources (profondeur 1).
  for (const page of input.resourcePages.slice(0, limits.maxResourcePages)) {
    if (!budgetLeft()) {
      stats.truncated = true;
      break;
    }
    const rules = await rulesFor(page.url);
    if (!rules) break;
    const pu = new URL(page.url);
    if (!rules.allowed(pu.pathname + pu.search)) {
      stats.blockedByRobots++;
      continue;
    }
    if (!budgetLeft()) {
      stats.truncated = true;
      break;
    }
    const res = await polite(page.url);
    if (!res || res.status !== 200) continue;
    stats.resourcePagesCrawled++;
    const links = extractOutboundLinks(res.text, page.url, limits.maxLinksPerPage);
    for (const link of links) {
      if (!budgetLeft()) {
        stats.truncated = true;
        break;
      }
      const status = await statusOf(link.url);
      if (status === null) continue;
      stats.linksChecked++;
      if (!isDead(status)) continue;
      findings.push({
        kind: "resource_page",
        sourceDomain: page.domain,
        sourceUrl: page.url,
        brokenUrl: link.url,
        httpStatus: status,
        anchor: link.anchor || null,
        competitorDomain: null,
        checkedAt: stamp(),
      });
    }
  }

  stats.dead = findings.length;
  return { findings, stats };
}

export const EMPTY_STATS: HuntStats = {
  requests: 0,
  competitorUrlsChecked: 0,
  resourcePagesCrawled: 0,
  linksChecked: 0,
  blockedByRobots: 0,
  dead: 0,
  truncated: false,
};

export function mergeStats(a: HuntStats, b: HuntStats): HuntStats {
  return {
    requests: a.requests + b.requests,
    competitorUrlsChecked: a.competitorUrlsChecked + b.competitorUrlsChecked,
    resourcePagesCrawled: a.resourcePagesCrawled + b.resourcePagesCrawled,
    linksChecked: a.linksChecked + b.linksChecked,
    blockedByRobots: a.blockedByRobots + b.blockedByRobots,
    dead: a.dead + b.dead,
    truncated: a.truncated || b.truncated,
  };
}
