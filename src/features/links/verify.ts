import * as cheerio from "cheerio";

export type LinkRel = "dofollow" | "nofollow" | "sponsored" | "ugc";

export interface LinkVerdict {
  found: boolean;
  rel: LinkRel | null;
  /** Lien placé dans le corps d'un texte (pas dans un menu, un pied de page ou une colonne). */
  contextual: boolean | null;
  /** Page indexable : pas de `noindex`, pas de canonique vers une autre page. */
  indexable: boolean | null;
  /** Le lien vise bien la page déclarée (et pas seulement le même site). */
  exactPage: boolean | null;
  anchor: string | null;
}

const NOT_FOUND: LinkVerdict = {
  found: false,
  rel: null,
  contextual: null,
  indexable: null,
  exactPage: null,
  anchor: null,
};

const hostOf = (u: URL) => u.hostname.toLowerCase().replace(/^www\./, "");
const pathOf = (u: URL) => (u.pathname.replace(/\/+$/, "") || "/") + u.search;

function parse(url: string): URL | null {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

function relOf(rel: string | undefined, pageNofollow: boolean): LinkRel {
  const tokens = (rel ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.includes("sponsored")) return "sponsored";
  if (tokens.includes("ugc")) return "ugc";
  if (tokens.includes("nofollow") || pageNofollow) return "nofollow";
  return "dofollow";
}

const REL_RANK: Record<LinkRel, number> = { dofollow: 3, ugc: 2, sponsored: 1, nofollow: 0 };
const BOILERPLATE =
  "nav, footer, header, aside, [role=navigation], [role=contentinfo], [role=banner]";
const TEXT_BLOCKS = "p, li, td, blockquote, dd, figcaption";

/** Meta robots / googlebot : directives en minuscules. */
function metaDirectives($: cheerio.CheerioAPI): string[] {
  const out: string[] = [];
  $("meta[name]").each((_, el) => {
    const name = ($(el).attr("name") ?? "").toLowerCase();
    if (name === "robots" || name === "googlebot") {
      out.push(
        ...($(el).attr("content") ?? "")
          .toLowerCase()
          .split(/[\s,]+/)
          .filter(Boolean),
      );
    }
  });
  return out;
}

/**
 * Cherche, dans le HTML d'une page, un lien vers `targetUrl` (même domaine, `www` ignoré) et en
 * déduit : rel (dofollow / nofollow / sponsored / ugc), caractère contextuel, indexabilité. Si
 * plusieurs liens existent, garde le meilleur (page exacte d'abord, puis dofollow, puis contextuel).
 * Limites assumées : pas d'exécution de JavaScript, pas d'en-tête `X-Robots-Tag` (le récupérateur
 * ne renvoie que le corps), « indexé par Google » n'est pas vérifié (aucune API gratuite).
 */
export function verifyLinkInHtml(html: string, sourceUrl: string, targetUrl: string): LinkVerdict {
  const target = parse(targetUrl);
  const source = parse(sourceUrl);
  if (!target || !source) return NOT_FOUND;
  const $ = cheerio.load(html);
  const directives = metaDirectives($);
  const pageNofollow = directives.includes("nofollow") || directives.includes("none");
  const noindex = directives.includes("noindex") || directives.includes("none");
  let canonicalElsewhere = false;
  const canon = $("link[rel~=canonical]").first().attr("href");
  if (canon) {
    const c = parse(new URL(canon, source).toString());
    if (c && (hostOf(c) !== hostOf(source) || pathOf(c) !== pathOf(source))) {
      canonicalElsewhere = true;
    }
  }
  const indexable = !noindex && !canonicalElsewhere;

  const wantHost = hostOf(target);
  const wantPath = pathOf(target);
  type Cand = { rel: LinkRel; contextual: boolean; exact: boolean; anchor: string };
  const cands: Cand[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    const u = parse(new URL(href, source).toString());
    if (!u || hostOf(u) !== wantHost) return;
    const exact = pathOf(u) === wantPath || (wantPath === "/" && pathOf(u) === "/");
    const text = $(el).text().replace(/\s+/g, " ").trim();
    const anchor = (text || $(el).find("img[alt]").first().attr("alt") || "").trim().slice(0, 200);
    const inBoilerplate = $(el).closest(BOILERPLATE).length > 0;
    const block = $(el).closest(TEXT_BLOCKS).first();
    const blockText = block.text().replace(/\s+/g, " ").trim();
    // Contextuel : dans un bloc de texte, hors menus et pieds de page, avec du texte autour.
    const contextual = !inBoilerplate && block.length > 0 && blockText.length >= anchor.length + 40;
    cands.push({ rel: relOf($(el).attr("rel"), pageNofollow), contextual, exact, anchor });
  });
  if (cands.length === 0) return { ...NOT_FOUND, indexable };
  const score = (c: Cand) => (c.exact ? 100 : 0) + REL_RANK[c.rel] * 10 + (c.contextual ? 1 : 0);
  const best = cands.reduce((a, b) => (score(b) > score(a) ? b : a));
  return {
    found: true,
    rel: best.rel,
    contextual: best.contextual,
    indexable,
    exactPage: best.exact,
    anchor: best.anchor || null,
  };
}

export type CheckOutcome = "live" | "disparu" | "injoignable";

export interface PageCheck {
  outcome: CheckOutcome;
  httpStatus: number | null;
  verdict: LinkVerdict;
  error: string | null;
}

/**
 * Interprète la réponse HTTP : 200 + lien = live ; 200 sans lien, 404 ou 410 = disparu ;
 * tout le reste (réseau, 403, 429, 5xx, robots.txt) = injoignable, donc à réessayer sans conclure.
 */
export function judgeResponse(
  res: { status: number; text: string } | null,
  sourceUrl: string,
  targetUrl: string,
): PageCheck {
  if (!res) {
    return { outcome: "injoignable", httpStatus: null, verdict: NOT_FOUND, error: "reseau" };
  }
  if (res.status === 404 || res.status === 410) {
    return { outcome: "disparu", httpStatus: res.status, verdict: NOT_FOUND, error: null };
  }
  if (res.status !== 200) {
    return {
      outcome: "injoignable",
      httpStatus: res.status,
      verdict: NOT_FOUND,
      error: `http_${res.status}`,
    };
  }
  const verdict = verifyLinkInHtml(res.text, sourceUrl, targetUrl);
  return {
    outcome: verdict.found ? "live" : "disparu",
    httpStatus: 200,
    verdict,
    error: null,
  };
}
