import {
  createPageReader,
  languageVersionHref,
  type PageRead,
  type PageReader,
} from "@/features/triage/page-reader";
import type { PageFetcher } from "@/features/sites/verify";
import { BRAND_LIMITS } from "./limits";
import { pickPages } from "./pick-pages";
import { parseSitemap, rankChildSitemaps } from "./sitemap";

export interface SiteRead {
  domain: string;
  home: PageRead;
  /** Pages lues avec succès (HTTP 200, texte présent), accueil exclu. */
  pages: PageRead[];
  /** Toutes les URL connues du site (liens de l'accueil et sitemap) : sert à valider les ressources citées. */
  knownUrls: string[];
  sitemapUsed: boolean;
  requests: number;
}

export interface ReadSiteDeps {
  fetch: PageFetcher;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  /** Accueil déjà lu (évite de le relire) : ne compte pas dans les requêtes. */
  home?: PageRead | null;
  /**
   * Langue de la campagne (« fr », « en ») : un site à plusieurs langues est lu dans cette version
   * (accueil, pages choisies, profil), jamais traduit.
   */
  language?: string | null;
}

const usable = (p: PageRead) => p.status === 200 && (p.text.length > 0 || p.title.length > 0);

/**
 * Lit l'accueil, le sitemap et 5 à 8 pages choisies avec le lecteur sûr de M3.1 (robots.txt, SSRF,
 * un délai par hôte, plafond de requêtes). Ne lève jamais : un site illisible donne un accueil non
 * exploitable, que l'appelant traite. Les pages ne sont lues que sur le domaine du site.
 */
export async function readSite(domain: string, deps: ReadSiteDeps): Promise<SiteRead> {
  const reader: PageReader = createPageReader({
    fetch: deps.fetch,
    sleep: deps.sleep,
    now: deps.now,
    maxRequests: BRAND_LIMITS.maxRequests,
    hostDelayMs: BRAND_LIMITS.hostDelayMs,
  });
  const started = deps.now();
  const expired = () => deps.now() - started > BRAND_LIMITS.readDeadlineMs;
  const origin = `https://${domain}`;

  let home = deps.home && usable(deps.home) ? deps.home : await reader.read(`${origin}/`);
  if (usable(home) && deps.language) {
    const href = languageVersionHref(home, deps.language);
    if (href) {
      const alt = await reader.read(href).catch(() => null);
      if (alt && usable(alt)) home = alt;
    }
  }
  const empty: SiteRead = {
    domain,
    home,
    pages: [],
    knownUrls: [],
    sitemapUsed: false,
    requests: reader.requestCount(),
  };
  if (!usable(home)) return empty;

  // Sitemap : ceux déclarés dans robots.txt d'abord, puis /sitemap.xml et /sitemap_index.xml.
  // Un index mène à 1 ou 2 sitemaps enfants. Seules les adresses du site sont suivies.
  const sameSite = (u: string) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "") === domain.replace(/^www\./, "");
    } catch {
      return false;
    }
  };
  const declared = (await reader.sitemaps(origin).catch(() => [])).filter(sameSite).slice(0, 2);
  const toTry = [...new Set([...declared, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`])];
  const sitemapUrls: string[] = [];
  let sitemapUsed = false;
  for (const sm of toTry) {
    if (expired()) break;
    const res = await reader.fetchText(sm).catch(() => null);
    if (!res || res.status !== 200) continue;
    const parsed = parseSitemap(res.text);
    if (parsed.urls.length === 0) continue;
    sitemapUsed = true;
    if (!parsed.isIndex) {
      sitemapUrls.push(...parsed.urls);
    } else {
      const children = rankChildSitemaps(parsed.urls.filter(sameSite));
      for (const child of children.slice(0, BRAND_LIMITS.maxChildSitemaps)) {
        if (expired()) break;
        const c = await reader.fetchText(child).catch(() => null);
        if (c && c.status === 200) sitemapUrls.push(...parseSitemap(c.text).urls);
      }
    }
    break;
  }

  const homeLinks = home.links.map((l) => l.href);
  const knownUrls = [...new Set([...homeLinks, ...sitemapUrls])];
  const chosen = pickPages({
    home: home.url,
    candidates: [...homeLinks, ...sitemapUrls],
    lang: deps.language ?? home.lang,
    max: BRAND_LIMITS.maxExtraPages,
  });

  const pages: PageRead[] = [];
  for (const url of chosen) {
    if (expired()) break;
    const page = await reader.read(url).catch(() => null);
    if (page && usable(page)) pages.push(page);
  }
  return { domain, home, pages, knownUrls, sitemapUsed, requests: reader.requestCount() };
}
