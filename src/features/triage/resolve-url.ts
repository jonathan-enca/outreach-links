import type { PageReader, PageRead } from "./page-reader";
import type { TriageItem, UrlOrigin } from "./types";

const STOP = new Set([
  "www",
  "http",
  "https",
  "html",
  "htm",
  "php",
  "index",
  "page",
  "pages",
  "accueil",
  "home",
  "blog",
  "article",
  "articles",
  "category",
  "categorie",
  "tag",
  "les",
  "des",
  "une",
  "pour",
  "avec",
  "dans",
  "the",
  "and",
  "for",
]);

/** Mots utiles d'une URL partielle (fil d'Ariane tronqué) : segments de chemin décodés. */
export function wordsOfUrl(url: string | null): string[] {
  if (!url) return [];
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    /* fil d'Ariane : « site › dossier › page » */
  }
  const words = decodeSafe(path)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOP.has(w));
  return [...new Set(words)];
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export interface ResolvedPage {
  read: PageRead;
  origin: UrlOrigin;
}

/**
 * Page à lire pour une cible. URL exacte : on la lit telle quelle. URL partielle (redirection
 * Google tronquée, MA.5) : on lit l'accueil du domaine puis on cherche, parmi ses liens
 * internes, celui qui partage le plus de mots avec l'URL partielle ; sinon l'accueil sert de
 * page (origine « accueil »). On ne cite jamais l'URL partielle : seule une page lue en
 * HTTP 200 sert de référence.
 */
export async function resolvePage(item: TriageItem, reader: PageReader): Promise<ResolvedPage> {
  if (item.urlExact && item.sourceUrl) {
    return { read: await reader.read(item.sourceUrl), origin: "plan" };
  }
  const home = await reader.read(`https://${item.domain}/`);
  if (home.status !== 200) return { read: home, origin: "accueil" };
  const words = wordsOfUrl(item.sourceUrl);
  if (words.length > 0) {
    let best: { href: string; score: number } | null = null;
    for (const link of home.links) {
      const hay = `${decodeSafe(link.href).toLowerCase()} ${link.text.toLowerCase()}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      const score = words.filter((w) => hay.includes(w)).length;
      if (score > 0 && (!best || score > best.score)) best = { href: link.href, score };
    }
    if (best) {
      const page = await reader.read(best.href);
      if (page.status === 200) return { read: page, origin: "recherche" };
    }
  }
  return { read: home, origin: "accueil" };
}
