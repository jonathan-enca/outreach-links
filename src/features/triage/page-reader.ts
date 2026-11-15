import * as cheerio from "cheerio";
import { BOT_TOKEN } from "@/features/deadlinks/hunt";
import { robotsFromResponse, type RobotsRules } from "@/features/deadlinks/robots";
import type { PageFetcher } from "@/features/sites/verify";

/** Plafond du texte conservé par page (le LLM n'en reçoit qu'un extrait). */
export const MAX_TEXT_CHARS = 12_000;
const MAX_LINKS = 120;

export interface PageLink {
  href: string;
  text: string;
}

export interface PageRead {
  url: string;
  /** Statut HTTP ; 0 si injoignable ou lecture interdite. */
  status: number;
  /** Interdit par robots.txt : la page n'a pas été lue. */
  blockedByRobots: boolean;
  unreachable: boolean;
  title: string;
  description: string;
  headings: string[];
  text: string;
  lang: string | null;
  /** Liens internes (même hôte), pour retrouver une page à partir d'une URL partielle. */
  links: PageLink[];
  /** Adresses des liens `mailto:` de la page (M3.2). */
  mailtos: string[];
  /** La page contient un vrai formulaire de contact (zone de message, hors recherche et commentaires). */
  hasContactForm: boolean;
  /** Lu via le lecteur de secours (Jina, Firecrawl) après un blocage. */
  viaFallback: boolean;
}

/** Lecteur de secours (page bloquée pour les robots simples) ; absent sans configuration. */
export type FallbackReader = (url: string) => Promise<string | null>;

export interface PageReaderDeps {
  fetch: PageFetcher;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  fallback?: FallbackReader | null;
  /** Délai minimal entre deux requêtes vers le même hôte. */
  hostDelayMs?: number;
  /** Nombre maximal de requêtes HTTP (robots.txt compris). */
  maxRequests?: number;
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

/** Extrait titre, description, titres, texte visible et liens internes d'une page HTML. */
export function parseHtml(html: string, url: string): Omit<PageRead, "status" | "viaFallback"> {
  const $ = cheerio.load(html);
  const base = (() => {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  })();
  const links: PageLink[] = [];
  const seen = new Set<string>();
  if (base) {
    $("a[href]").each((_, el) => {
      if (links.length >= MAX_LINKS) return;
      const raw = $(el).attr("href") ?? "";
      if (/^(mailto:|tel:|javascript:|#)/i.test(raw)) return;
      try {
        const u = new URL(raw, base);
        if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) return;
        u.hash = "";
        const href = u.toString();
        if (seen.has(href)) return;
        seen.add(href);
        links.push({ href, text: collapse($(el).text()).slice(0, 120) });
      } catch {
        /* lien invalide ignoré */
      }
    });
  }
  const mailtos = $('a[href^="mailto:" i]')
    .map((_, el) => {
      const raw = ($(el).attr("href") ?? "").slice(7).split("?")[0] ?? "";
      try {
        return decodeURIComponent(raw).trim().toLowerCase();
      } catch {
        return raw.trim().toLowerCase();
      }
    })
    .get()
    .filter((m) => m.includes("@"))
    .slice(0, 10);
  const hasContactForm = $("form")
    .toArray()
    .some((f) => {
      const form = $(f);
      const action = (form.attr("action") ?? "").toLowerCase();
      const marker = `${form.attr("id") ?? ""} ${form.attr("class") ?? ""} ${action}`.toLowerCase();
      if (/search|recherche|comment|newsletter|login|connexion|subscribe/.test(marker))
        return false;
      if (form.find('input[type="password"], input[type="search"]').length > 0) return false;
      return form.find("textarea").length > 0;
    });
  const title = collapse($("title").first().text()).slice(0, 200);
  const description = collapse($('meta[name="description"]').attr("content") ?? "").slice(0, 300);
  const headings = $("h1, h2, h3")
    .map((_, el) => collapse($(el).text()))
    .get()
    .filter((h) => h.length > 0)
    .slice(0, 12)
    .map((h) => h.slice(0, 160));
  const lang = ($("html").attr("lang") ?? "").trim().toLowerCase().slice(0, 12) || null;
  $("script, style, noscript, template, svg, iframe").remove();
  const text = collapse($("body").text() || $.root().text()).slice(0, MAX_TEXT_CHARS);
  return {
    url,
    blockedByRobots: false,
    unreachable: false,
    title,
    description,
    headings,
    text,
    lang,
    links,
    mailtos,
    hasContactForm,
  };
}

const EMPTY = (url: string): PageRead => ({
  url,
  status: 0,
  blockedByRobots: false,
  unreachable: false,
  title: "",
  description: "",
  headings: [],
  text: "",
  lang: null,
  links: [],
  mailtos: [],
  hasContactForm: false,
  viaFallback: false,
});

/**
 * Lecteur de pages avec cache mémoire : respecte robots.txt (jeton `OutreachLinksBot`), un
 * délai par hôte et un plafond de requêtes. Bascule sur le lecteur de secours (s'il est
 * configuré) quand la page répond 403/429/503 ou ne contient aucun texte.
 */
export function createPageReader(deps: PageReaderDeps) {
  const delay = deps.hostDelayMs ?? 1000;
  const maxRequests = deps.maxRequests ?? 60;
  const cache = new Map<string, PageRead>();
  const robots = new Map<string, RobotsRules>();
  const lastHit = new Map<string, number>();
  let requests = 0;

  async function polite(url: string) {
    const host = new URL(url).hostname;
    const last = lastHit.get(host);
    if (last !== undefined) {
      const wait = last + delay - deps.now();
      if (wait > 0) await deps.sleep(wait);
    }
    lastHit.set(host, deps.now());
    requests++;
    return deps.fetch(url);
  }

  async function rulesFor(u: URL): Promise<RobotsRules | null> {
    const key = `${u.protocol}//${u.host}`;
    const cached = robots.get(key);
    if (cached) return cached;
    if (requests >= maxRequests) return null;
    const rules = robotsFromResponse(await polite(`${key}/robots.txt`), BOT_TOKEN);
    robots.set(key, rules);
    return rules;
  }

  async function read(url: string): Promise<PageRead> {
    const cached = cache.get(url);
    if (cached) return cached;
    const out = await readUncached(url);
    cache.set(url, out);
    return out;
  }

  async function readUncached(url: string): Promise<PageRead> {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return { ...EMPTY(url), unreachable: true };
    }
    const rules = await rulesFor(u);
    if (!rules || requests >= maxRequests) return { ...EMPTY(url), unreachable: true };
    if (!rules.allowed(u.pathname + u.search)) return { ...EMPTY(url), blockedByRobots: true };
    const res = await polite(url);
    if (!res) return { ...EMPTY(url), unreachable: true };
    const parsed = res.status >= 200 && res.status < 300 ? parseHtml(res.text, url) : null;
    const blocked = [403, 429, 503].includes(res.status);
    if (deps.fallback && (blocked || (parsed && parsed.text.length === 0))) {
      const alt = await deps.fallback(url).catch(() => null);
      if (alt && alt.trim().length > 0) {
        const fromAlt = parseHtml(`<body>${escapeText(alt)}</body>`, url);
        return { ...fromAlt, title: fromAlt.title, status: 200, viaFallback: true };
      }
    }
    if (!parsed) return { ...EMPTY(url), status: res.status };
    return { ...parsed, status: res.status, viaFallback: false };
  }

  return { read, requestCount: () => requests };
}

export type PageReader = ReturnType<typeof createPageReader>;

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Lecteur de secours Jina Reader (`r.jina.ai`), activé seulement si `PAGE_READER_FALLBACK=jina` :
 * l'hôte doit aussi être autorisé par le réseau de l'environnement. Renvoie le texte brut.
 */
export function createJinaFallback(fetchImpl: typeof fetch = fetch): FallbackReader {
  return async (url) => {
    const res = await fetchImpl(`https://r.jina.ai/${url}`, {
      headers: { accept: "text/plain" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, MAX_TEXT_CHARS);
  };
}
