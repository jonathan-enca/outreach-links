import { parseSitemap, rankChildSitemaps } from "@/features/brand/sitemap";
import type { PageFetcher } from "@/features/sites/verify";
import { createPageReader } from "@/features/triage/page-reader";
import { DRAFT_LIMITS } from "./limits";
import { readableHtml } from "./readable";

/**
 * Catalogue des pages du site à promouvoir : toutes ses pages précises (articles, guides, outils), avec
 * titre, description et texte. Le rédacteur y choisit LA page qui répond au point relevé chez la cible,
 * au lieu de proposer « le blog » à tout le monde (79 messages du 17/11 : 68 vers deux pages générales).
 */
export interface CataloguePage {
  url: string;
  title: string;
  description: string;
  text: string;
}

export interface CatalogueDeps {
  fetch: PageFetcher;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|xml|json|css|js|mp4|mp3|txt|rss)$/i;
/** Pages qu'on ne propose jamais à un éditeur : légal, compte, panier, tarifs, pagination. */
const SKIP_PATH =
  /(^|\/)(wp-admin|wp-login|wp-json|cart|panier|checkout|commande|login|connexion|inscription|register|signup|compte|account|mon-compte|feed|tag|tags|author|search|recherche|mentions-legales|legal|cgu|cgv|conditions|terms|privacy|confidentialite|cookies?|politique[^/]*|tarifs?|pricing|prix|page\/\d+)(\/|$)/i;
const LOCALE = /^[a-z]{2}(-[a-z]{2})?$/i;

const bareHost = (h: string) => h.replace(/^www\./, "").toLowerCase();
const key = (u: URL) => `${bareHost(u.hostname)}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();

/**
 * Pages à lire, parmi les adresses connues du site (pur, testé) : même site, pas de page légale ou
 * de compte, une seule langue sur un site à plusieurs versions, les pages précises d'abord.
 */
export function pickCatalogueUrls(
  domain: string,
  candidates: readonly string[],
  language: string | null,
  max: number,
): string[] {
  const own = bareHost(domain);
  const seen = new Set<string>();
  const urls: URL[] = [];
  for (const raw of candidates) {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || bareHost(u.hostname) !== own) continue;
    u.hash = "";
    u.search = "";
    if (SKIP_EXT.test(u.pathname) || SKIP_PATH.test(u.pathname)) continue;
    const k = key(u);
    if (seen.has(k)) continue;
    seen.add(k);
    urls.push(u);
  }
  // Site à plusieurs langues (/fr/, /en/...) : seule la version de la campagne est proposée.
  const first = (u: URL) => u.pathname.split("/").filter(Boolean)[0] ?? "";
  const localized = urls.filter((u) => LOCALE.test(first(u)));
  const lang = (language ?? "").slice(0, 2).toLowerCase();
  const kept =
    lang && localized.length >= Math.max(3, urls.length * 0.3)
      ? urls.filter((u) => first(u).slice(0, 2).toLowerCase() === lang)
      : urls;
  // Les pages précises (profondes) d'abord : ce sont elles qu'un éditeur a une raison de citer.
  const depth = (u: URL) => u.pathname.split("/").filter(Boolean).length;
  return kept
    .map((u, i) => ({ u, i, d: Math.min(depth(u), 4) }))
    .sort((a, b) => b.d - a.d || a.i - b.i)
    .slice(0, max)
    .map((x) => x.u.toString());
}

/** Adresses connues du site : sitemaps déclarés, puis /sitemap.xml ; à défaut, les liens de l'accueil. */
export async function listSiteUrls(domain: string, deps: CatalogueDeps): Promise<string[]> {
  const reader = createPageReader({ ...deps, maxRequests: 12, hostDelayMs: 300 });
  const origin = `https://${domain}`;
  const sameSite = (u: string) => {
    try {
      return bareHost(new URL(u).hostname) === bareHost(domain);
    } catch {
      return false;
    }
  };
  const declared = (await reader.sitemaps(origin).catch(() => [])).filter(sameSite).slice(0, 2);
  const found: string[] = [];
  for (const sm of [...new Set([...declared, `${origin}/sitemap.xml`])]) {
    const res = await reader.fetchText(sm).catch(() => null);
    if (!res || res.status !== 200) continue;
    const parsed = parseSitemap(res.text);
    if (parsed.urls.length === 0) continue;
    if (!parsed.isIndex) found.push(...parsed.urls);
    else {
      for (const child of rankChildSitemaps(parsed.urls.filter(sameSite)).slice(0, 4)) {
        const c = await reader.fetchText(child).catch(() => null);
        if (c && c.status === 200) found.push(...parseSitemap(c.text).urls);
      }
    }
    if (found.length > 0) break;
  }
  if (found.length > 0) return found;
  const home = await reader.read(`${origin}/`).catch(() => null);
  return home && home.status === 200 ? [`${origin}/`, ...home.links.map((l) => l.href)] : [];
}

/** Lit des pages du site (texte éditorial complet). Une page illisible ou vide est ignorée. */
export async function readCataloguePages(
  urls: readonly string[],
  deps: CatalogueDeps,
): Promise<CataloguePage[]> {
  const reader = createPageReader({
    ...deps,
    maxRequests: urls.length + 2,
    hostDelayMs: DRAFT_LIMITS.catalogueHostDelayMs,
  });
  const out: CataloguePage[] = [];
  for (const url of urls) {
    const res = await reader.fetchText(url).catch(() => null);
    if (!res || res.status !== 200) continue;
    const page = readableHtml(res.text, url, DRAFT_LIMITS.cataloguePageChars);
    if (page.text.length < 200 && page.title.length === 0) continue;
    out.push({ url, title: page.title, description: page.description, text: page.text });
  }
  return out;
}

const same = (a: string, b: string) => {
  try {
    return key(new URL(a)) === key(new URL(b));
  } catch {
    return a === b;
  }
};

/** Retrouve une page du catalogue à partir de l'adresse rendue par le modèle (www, barre finale). */
export function findCataloguePage<T extends { url: string }>(
  catalogue: readonly T[],
  url: string,
): T | null {
  return catalogue.find((p) => same(p.url, url)) ?? null;
}
