import { PAGE_RANK } from "./limits";
import { LOCALE, SKIP_EXT, SKIP_PATH } from "./pick-pages";
import type { RankedPage } from "./schema";

/**
 * MC.7 : pages à pousser choisies par volume et par position. Fonctions pures, sans requête : elles
 * partent des mots-clés positionnés du site (DataForSEO `ranked_keywords`) et ne connaissent aucun
 * thème. La formule est fixe (décision de Jonathan, 18/11/2026) ; ses constantes sont dans `limits.ts`.
 */

/** Un mot-clé sur lequel une page du site est positionnée. */
export interface RankedKeyword {
  keyword: string;
  /** Position de la page dans Google (1 = premier résultat). */
  position: number;
  /** Recherches par mois. */
  volume: number;
  url: string;
}

/** Facteur de position : faible en haut de page 1, maximal de 4 à 20, jamais nul ensuite. */
export function positionFactor(position: number): number {
  for (const [last, factor] of PAGE_RANK.positionFactors) if (position <= last) return factor;
  return PAGE_RANK.beyondFactor;
}

/** `log10(1 + volume total de la page) × facteur de sa meilleure position`. */
export function pageScore(volume: number, bestPosition: number): number {
  if (!(volume > 0) || !(bestPosition >= 1)) return 0;
  return Math.round(Math.log10(1 + volume) * positionFactor(bestPosition) * 1e4) / 1e4;
}

const bare = (host: string) => host.replace(/^www\./, "").toLowerCase();

/** Clé d'une page : hôte sans « www », chemin sans barre finale (deux écritures de la même adresse). */
export function pageKey(url: string): string {
  try {
    const u = new URL(url);
    return `${bare(u.hostname)}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return url;
  }
}

/**
 * Regroupe les mots-clés par page du site et classe les pages par score décroissant. Sont écartés :
 * les autres domaines, l'accueil (proposé à part), les fichiers et les pages qu'on ne propose jamais
 * (panier, compte, mentions légales : les mêmes que l'ancien tri par adresse), et, sur un site à
 * plusieurs langues, les versions d'une autre langue que celle de la campagne.
 */
export function rankPages(
  keywords: readonly RankedKeyword[],
  site: { domain: string; language?: string | null },
): RankedPage[] {
  const own = bare(site.domain);
  const lang = (site.language ?? "").slice(0, 2).toLowerCase();
  const pages = new Map<
    string,
    { url: string; volume: number; position: number; words: Map<string, number> }
  >();
  for (const k of keywords) {
    if (!Number.isFinite(k.position) || k.position < 1) continue;
    let u: URL;
    try {
      u = new URL(k.url);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || bare(u.hostname) !== own || u.search) continue;
    const path = u.pathname.replace(/\/+$/, "");
    if (SKIP_EXT.test(path) || SKIP_PATH.test(path)) continue;
    let segments = path.split("/").filter(Boolean);
    if (segments[0] && LOCALE.test(segments[0])) {
      if (lang && segments[0].slice(0, 2).toLowerCase() !== lang) continue;
      segments = segments.slice(1);
    }
    if (segments.length === 0) continue; // accueil, ou racine d'une version linguistique
    const key = `${own}${path}`;
    const volume = Number.isFinite(k.volume) && k.volume > 0 ? Math.round(k.volume) : 0;
    const position = Math.round(k.position);
    const page = pages.get(key) ?? {
      url: `${u.origin}${u.pathname}`,
      volume: 0,
      position,
      words: new Map<string, number>(),
    };
    const word = k.keyword.trim();
    // Un même mot-clé cité deux fois ne compte qu'une fois (son plus grand volume).
    const before = page.words.get(word) ?? 0;
    if (volume > before || !page.words.has(word)) {
      page.volume += volume - before;
      page.words.set(word, volume);
    }
    page.position = Math.min(page.position, position);
    pages.set(key, page);
  }
  return [...pages.values()]
    .map((p) => ({
      url: p.url,
      volume: p.volume,
      position: p.position,
      count: p.words.size,
      keywords: [...p.words.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, PAGE_RANK.keptKeywordsPerPage)
        .map(([w]) => w.slice(0, 80)),
    }))
    .filter((p) => p.volume > 0)
    .sort(
      (a, b) =>
        pageScore(b.volume, b.position) - pageScore(a.volume, a.position) ||
        b.volume - a.volume ||
        a.position - b.position ||
        a.url.localeCompare(b.url),
    );
}

/**
 * Score d'une adresse d'après le classement gardé dans le profil : 0 pour une page sans mot-clé
 * positionné. Sert à départager deux pages aussi proches l'une que l'autre d'une cible (rédacteur).
 */
export function trafficScorer(
  ranked: readonly RankedPage[] | null | undefined,
): (url: string) => number {
  const scores = new Map<string, number>();
  for (const p of ranked ?? []) scores.set(pageKey(p.url), pageScore(p.volume, p.position));
  return (url) => scores.get(pageKey(url)) ?? 0;
}
