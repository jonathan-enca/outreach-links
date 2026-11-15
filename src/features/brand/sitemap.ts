/** Lecture tolérante d'un sitemap XML (index ou liste d'URL), même tronqué. */

const MAX_URLS = 3_000;

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

export interface ParsedSitemap {
  /** `sitemapindex` : les adresses sont d'autres sitemaps. */
  isIndex: boolean;
  urls: string[];
}

export function parseSitemap(xml: string): ParsedSitemap {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const urls: string[] = [];
  const re = /<loc>\s*([\s\S]*?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && urls.length < MAX_URLS) {
    const u = decode(m[1] ?? "");
    if (/^https?:\/\//i.test(u)) urls.push(u);
  }
  return { isIndex, urls };
}

/** Sitemaps enfants à lire en priorité : pages et articles avant images, vidéos et catégories. */
export function rankChildSitemaps(urls: readonly string[]): string[] {
  const score = (u: string) => {
    const s = u.toLowerCase();
    if (/image|video|media|attachment/.test(s)) return 9;
    if (/page|post|article|blog|guide|ressource|resource/.test(s)) return 0;
    if (/categor|tag|taxonom|term/.test(s)) return 5;
    return 2;
  };
  return [...urls].sort((a, b) => score(a) - score(b) || a.localeCompare(b));
}
