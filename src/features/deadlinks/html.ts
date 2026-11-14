import * as cheerio from "cheerio";

export interface OutboundLink {
  url: string;
  anchor: string;
}

/**
 * Liens sortants (autres domaines, http/https) d'une page, dédoublonnés par URL, dans l'ordre
 * du document, plafonnés. Les liens `nofollow` / `sponsored` / `ugc` sont gardés (un lien mort
 * reste un lien mort), les ancres vides sont tolérées.
 */
export function extractOutboundLinks(html: string, pageUrl: string, max: number): OutboundLink[] {
  const $ = cheerio.load(html);
  let pageHost: string;
  try {
    pageHost = new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: OutboundLink[] = [];
  $("a[href]").each((_, el) => {
    if (out.length >= max) return false;
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    let u: URL;
    try {
      u = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    if (u.hostname.replace(/^www\./, "") === pageHost) return;
    u.hash = "";
    const key = u.toString();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ url: key, anchor: $(el).text().replace(/\s+/g, " ").trim().slice(0, 120) });
  });
  return out;
}
