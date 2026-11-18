import * as cheerio from "cheerio";
import { wellFormed } from "@/lib/well-formed";

/**
 * Lecture d'une page « comme un humain » pour chercher un angle : le contenu éditorial en entier
 * (menus, pieds de page et colonnes retirés), avec ses titres, ses paragraphes et ses liens sortants
 * notés `[texte](adresse)`. Le tri M3.1 ne garde qu'une citation de 280 caractères : trop peu pour
 * savoir où un lien rendrait service.
 */
export interface ReadablePage {
  url: string;
  /** Adresse canonique déclarée par la page (une redirection vers l'accueil s'y voit). */
  canonicalUrl: string | null;
  title: string;
  description: string;
  /** Titre principal (premier h1) de la page. */
  heading: string;
  text: string;
  /** Le texte a été coupé à `maxChars`. */
  truncated: boolean;
}

const CHROME =
  "nav, header, footer, aside, form, [role='navigation'], [role='banner'], [role='contentinfo'], [role='search'], .menu, .widget, .sidebar, #sidebar, .footer, .header, .breadcrumb, .cookie, .cookies, #cookie-banner";
const BLOCKS = new Set([
  "p",
  "div",
  "li",
  "tr",
  "br",
  "section",
  "article",
  "ul",
  "ol",
  "table",
  "blockquote",
  "main",
  "dd",
  "dt",
  "figcaption",
  "h4",
  "h5",
  "h6",
]);
type AnyNode = ReturnType<cheerio.CheerioAPI>[number];

const HEADINGS: Record<string, string> = { h1: "# ", h2: "## ", h3: "### " };

const clean = (s: string) =>
  s
    .replace(/[ \t\r\f\v ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

function absolute(href: string, base: string): string | null {
  if (/^(#|javascript:|mailto:|tel:)/i.test(href.trim())) return null;
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** Vrai si la page lue n'est plus celle demandée (redirigée vers l'accueil ou une autre page). */
export function movedAway(requestedUrl: string, canonicalUrl: string | null): boolean {
  if (!canonicalUrl) return false;
  try {
    const a = new URL(requestedUrl);
    const b = new URL(canonicalUrl);
    const path = (u: URL) => decodeURI(u.pathname).replace(/\/+$/, "").toLowerCase();
    if (host(requestedUrl) !== host(canonicalUrl)) return false;
    // Seul le cas sûr est signalé : une page profonde dont l'adresse canonique est l'accueil.
    return path(a) !== "" && path(b) === "";
  } catch {
    return false;
  }
}

export function readableHtml(html: string, url: string, maxChars: number): ReadablePage {
  const $ = cheerio.load(html);
  const title = clean($("title").first().text()).slice(0, 200);
  const description = clean(
    $('meta[name="description"]').attr("content") ??
      $('meta[property="og:description"]').attr("content") ??
      "",
  ).slice(0, 300);
  const heading = clean($("h1").first().text()).slice(0, 200);
  const canonicalRaw =
    $('link[rel="canonical"]').attr("href") ?? $('meta[property="og:url"]').attr("content") ?? "";
  const canonicalUrl = canonicalRaw ? absolute(canonicalRaw, url) : null;

  $("script, style, noscript, template, svg, iframe, select, button").remove();
  // Le contenu principal quand la page le déclare et qu'il porte du texte ; sinon tout le corps.
  const main = $("main, article, [role='main']")
    .toArray()
    .map((el) => $(el))
    .sort((a, b) => b.text().length - a.text().length)[0];
  const root = main && clean(main.text()).length >= 400 ? main : $("body");
  root.find(CHROME).remove();
  const own = host(url);

  const out: string[] = [];
  const walk = (node: AnyNode) => {
    if (node.type === "text") {
      out.push(node.data);
      return;
    }
    if (node.type !== "tag") return;
    const tag = node.name.toLowerCase();
    const heading = HEADINGS[tag];
    if (heading) out.push(`\n\n${heading}`);
    else if (BLOCKS.has(tag)) out.push("\n");
    const href = tag === "a" ? absolute(node.attribs.href ?? "", url) : null;
    // Seuls les liens sortants sont notés : ce sont eux qui disent ce que la page cite déjà.
    const outbound = href && host(href) !== own ? href : null;
    if (outbound) out.push("[");
    for (const child of node.children) walk(child);
    if (outbound) out.push(`](${outbound})`);
    if (heading || BLOCKS.has(tag)) out.push("\n");
  };
  for (const node of root.toArray()) walk(node);

  const full = clean(out.join("").replace(/\[\s*\]\([^)]*\)/g, ""));
  const truncated = full.length > maxChars;
  return {
    url,
    canonicalUrl,
    title,
    description,
    heading,
    text: wellFormed(truncated ? `${full.slice(0, maxChars).trimEnd()} […]` : full),
    truncated,
  };
}
