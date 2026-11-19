/**
 * Choix des 5 à 8 pages à lire en plus de l'accueil : celles qui disent le mieux ce qu'est le site
 * (guides, ressources, outils, à propos, rubriques), peu profondes, variées (pas dix pages de la même
 * rubrique). Aucune requête ici : fonction pure, testée.
 */

export const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|xml|json|css|js|mp4|mp3|txt|rss)$/i;
export const SKIP_PATH =
  /(^|\/)(wp-admin|wp-login|wp-json|cart|panier|checkout|commande|login|connexion|inscription|register|compte|account|mon-compte|feed|tag|tags|author|search|recherche|mentions-legales|legal|cgu|cgv|conditions|privacy|confidentialite|cookies?|politique|page\/\d+)(\/|$)/i;

const BOOST: [RegExp, number][] = [
  [/(^|\/)(a-propos|about|qui-sommes-nous|notre-histoire|our-story|equipe|team)(\/|$)/i, 6],
  [/(^|\/)(ressources?|resources?|guides?|outils?|tools?|kits?|telecharger|download)(\/|$)/i, 6],
  [/(^|\/)(blog|actualites?|articles?|news|conseils|tutoriels?)(\/|$)/i, 4],
  [/(^|\/)(categor|rubriques?|themes?|collections?|catalogue)/i, 3],
  [/(^|\/)(enseignants?|teachers?|parents?|ecoles?|schools?|classe|education|educat)/i, 3],
  [/(^|\/)(faq|contact|presse|press)(\/|$)/i, 1],
];

export interface PickInput {
  /** URL de l'accueil (exclue du résultat : déjà lue). */
  home: string;
  /** Liens internes de l'accueil et URL du sitemap, dans cet ordre. */
  candidates: readonly string[];
  /** Langue déclarée de l'accueil (« en », « fr-FR »...) : départage les versions d'un site multilingue. */
  lang?: string | null;
  max: number;
}

/** Première rubrique qui ressemble à un code de langue (« fr », « en-us ») : version linguistique du site. */
export const LOCALE = /^[a-z]{2}(-[a-z]{2})?$/i;

function normalize(url: string, host: string): URL | null {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (u.hostname.replace(/^www\./, "") !== host) return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}

export function pickPages({ home, candidates, lang, max }: PickInput): string[] {
  let host: string;
  try {
    host = new URL(home).hostname.replace(/^www\./, "");
  } catch {
    return [];
  }
  const homeKey = (() => {
    const u = normalize(home, host);
    return u ? u.origin + u.pathname.replace(/\/$/, "") : "";
  })();

  // Site multilingue (/fr/, /en/, /de/) : une seule version est lue, celle de la langue déclarée de
  // l'accueil, sinon la plus représentée ; la racine d'une langue (/fr/) est un doublon de l'accueil.
  const localeCount = new Map<string, number>();
  for (const raw of candidates) {
    const seg = normalize(raw, host)?.pathname.split("/").filter(Boolean)[0];
    if (seg && LOCALE.test(seg))
      localeCount.set(seg.toLowerCase(), (localeCount.get(seg.toLowerCase()) ?? 0) + 1);
  }
  const declared = (lang ?? "").toLowerCase();
  const keepLocale =
    [...localeCount.keys()].find((l) => l === declared) ??
    [...localeCount.keys()].find((l) => declared && l.startsWith(`${declared.slice(0, 2)}`)) ??
    [...localeCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];

  const seen = new Set<string>();
  const scored: { url: string; score: number; seg: string; order: number }[] = [];
  candidates.forEach((raw, order) => {
    const u = normalize(raw, host);
    if (!u) return;
    const path = u.pathname.replace(/\/+$/, "");
    const key = u.origin + path;
    if (key === homeKey || path === "" || seen.has(key)) return;
    if (u.search && !/^\?(p|page_id)=\d+$/.test(u.search)) return;
    if (SKIP_EXT.test(path) || SKIP_PATH.test(path)) return;
    seen.add(key);
    let segments = path.split("/").filter(Boolean);
    if (segments[0] && LOCALE.test(segments[0])) {
      if (segments.length === 1) return; // racine d'une langue = doublon de l'accueil
      if (segments[0].toLowerCase() !== keepLocale) return; // autre version linguistique
      segments = segments.slice(1); // profondeur et rubrique comptées sans le préfixe de langue
    }
    let score = 10 - Math.min(segments.length, 5) * 2; // les pages peu profondes d'abord
    for (const [re, boost] of BOOST) if (re.test(path)) score += boost;
    if (order < 40) score += 1; // les liens du menu de l'accueil sont mis en avant
    scored.push({ url: u.toString(), score, seg: segments[0] ?? "", order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order || a.url.localeCompare(b.url));

  // Variété : au plus 2 pages par première rubrique, puis on complète si besoin.
  const perSeg = new Map<string, number>();
  const picked: string[] = [];
  for (const c of scored) {
    if (picked.length >= max) break;
    const n = perSeg.get(c.seg) ?? 0;
    if (n >= 2) continue;
    perSeg.set(c.seg, n + 1);
    picked.push(c.url);
  }
  for (const c of scored) {
    if (picked.length >= max) break;
    if (!picked.includes(c.url)) picked.push(c.url);
  }
  return picked;
}
