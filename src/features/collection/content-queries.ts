import type { PlannedQuery } from "@/features/queries/schema";
import { cleanQuery, normalizeKey } from "@/features/queries/plan";
import type { SearchRow } from "@/features/search-console/api";

/**
 * MQ.4 : requêtes de contenu sans lien, cherchées dans la SERP. Elles visent des pages qui citent
 * déjà des ressources comme la nôtre (listes, liens utiles, sites de référence). Deux sources :
 * - le thème (gabarits fixes, sans LLM, 0 USD d'élaboration) ;
 * - les requêtes réelles de la Search Console (`audits.links_state.searchConsole.queries`), si le site
 *   l'a connectée et si l'état des lieux était déjà écrit au moment de la prévisualisation.
 * Pur : aucun appel. Les requêtes passent par la collecte SERP habituelle (coût dans `cost_ledger`).
 */
export const CONTENT_QUERY_LIMITS = {
  /** Requêtes Search Console retenues (les plus de clics d'abord). */
  maxSearchConsoleQueries: 20,
  /** Impressions minimales pour qu'une requête Search Console serve de base à une recherche. */
  minImpressions: 10,
  /** Publics (audience du profil) retenus au plus : une requête par public, pas plus (coût plafonné). */
  maxPublics: 3,
} as const;

const THEME_TEMPLATES: Record<string, ((t: string) => string)[]> = {
  fr: [(t) => `liste de ressources ${t}`, (t) => `sites de référence ${t}`],
  en: [(t) => `${t} resource list`, (t) => `reference sites ${t}`],
};

/** « sites de référence {public} {thème} » : une requête par public du profil. */
const PUBLIC_TEMPLATES: Record<string, (p: string, t: string) => string> = {
  fr: (p, t) => `sites de référence ${p} ${t}`,
  en: (p, t) => `reference sites ${p} ${t}`,
};

const SEARCH_CONSOLE_TEMPLATE: Record<string, (q: string) => string> = {
  fr: (q) => `liste de ressources ${q}`,
  en: (q) => `${q} resource list`,
};

export interface ContentQueryInput {
  theme: string;
  language: string;
  domain: string;
  nameVariants: readonly string[];
  /** Publics du profil (audience) : une requête de contenu par public, dans la limite de `maxPublics`. */
  publics?: readonly string[];
  /** Requêtes Search Console du site (lignes brutes de la lecture), vide si non connectée. */
  searchConsoleQueries?: readonly SearchRow[];
  /** Requêtes déjà présentes dans l'univers : jamais dupliquées. */
  existing?: readonly string[];
  /** Coût SERP unitaire annoncé (par requête). */
  perQueryUsd: number;
}

/**
 * Lignes de requêtes Search Console lues dans `audits.links_state` (JSON). Tout ce qui n'a pas la
 * bonne forme est ignoré : une ligne abîmée ne doit jamais faire échouer la prévisualisation.
 */
export function searchConsoleRowsOf(linksState: unknown): SearchRow[] {
  const sc = (linksState as { searchConsole?: { queries?: unknown } } | null)?.searchConsole;
  const list = Array.isArray(sc?.queries) ? sc.queries : [];
  return list.flatMap((r): SearchRow[] => {
    if (!r || typeof r !== "object") return [];
    const row = r as Partial<SearchRow>;
    if (typeof row.key !== "string") return [];
    return [
      {
        key: row.key,
        clicks: Number(row.clicks) || 0,
        impressions: Number(row.impressions) || 0,
        position: Number(row.position) || 0,
      },
    ];
  });
}

/** Variantes compactes du nom : une requête qui les contient est une requête de marque, écartée. */
function brandKeysOf(domain: string, nameVariants: readonly string[]): string[] {
  return [...nameVariants, domain.replace(/^www\./, "").split(".")[0] ?? ""]
    .map((v) => normalizeKey(v).replace(/ /g, ""))
    .filter((v) => v.length >= 3);
}

/** Requêtes Search Console utilisables : pas de marque, assez d'impressions, dédoublonnées. */
export function searchConsoleSeeds(
  rows: readonly SearchRow[],
  domain: string,
  nameVariants: readonly string[],
): string[] {
  const brands = brandKeysOf(domain, nameVariants);
  const sorted = [...rows].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of sorted) {
    if (row.impressions < CONTENT_QUERY_LIMITS.minImpressions) continue;
    const q = row.key.trim();
    const squashed = normalizeKey(q).replace(/ /g, "");
    if (brands.some((b) => squashed.includes(b))) continue;
    const k = normalizeKey(q);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(q);
    if (out.length >= CONTENT_QUERY_LIMITS.maxSearchConsoleQueries) break;
  }
  return out;
}

/** Publics non vides et dédoublonnés, dans l'ordre du profil. */
function uniquePublics(publics: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of publics) {
    const p = raw.trim();
    const k = normalizeKey(p);
    if (!p || !k || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/**
 * Requêtes de contenu sans lien à ajouter à la collecte SERP (MQ.4). Chaque requête garde son
 * origine (`contenu_theme`, `contenu_public`, `contenu_search_console`) ; le candidat trouvé garde la
 * source `requete_contenu`, donc la piste propre que MQ.1 mesure. Rangs provisoires : `buildCollectionPlan` les place après l'univers.
 */
export function contentQueries(input: ContentQueryInput): PlannedQuery[] {
  const lang = input.language === "en" ? "en" : "fr";
  const brands = brandKeysOf(input.domain, input.nameVariants);
  const taken = new Set((input.existing ?? []).map((q) => normalizeKey(q)));
  const out: PlannedQuery[] = [];

  type Origin = "contenu_theme" | "contenu_public" | "contenu_search_console";
  const add = (raw: string, origin: Origin, index: number) => {
    const q = cleanQuery(raw, brands);
    if (!q) return;
    const k = normalizeKey(q);
    if (taken.has(k)) return;
    taken.add(k);
    out.push({
      q,
      // Pages qui citent des ressources : c'est la tactique « ressources » (piste propre en MQ.1).
      tactic: "ressources",
      persona: null,
      target: "home",
      keyword: null,
      score: origin === "contenu_search_console" ? 0.75 - 0.05 * index : 0.5,
      rank: 1,
      estUsd: input.perQueryUsd,
      origin,
    });
  };

  const theme = input.theme.trim();
  if (theme) {
    (THEME_TEMPLATES[lang] ?? THEME_TEMPLATES.fr!).forEach((make) =>
      add(make(theme), "contenu_theme", 0),
    );
    const publicMake = PUBLIC_TEMPLATES[lang] ?? PUBLIC_TEMPLATES.fr!;
    const publics = uniquePublics(input.publics ?? []).slice(0, CONTENT_QUERY_LIMITS.maxPublics);
    publics.forEach((p, i) => add(publicMake(p, theme), "contenu_public", i));
  }

  const seeds = searchConsoleSeeds(
    input.searchConsoleQueries ?? [],
    input.domain,
    input.nameVariants,
  );
  const make = SEARCH_CONSOLE_TEMPLATE[lang] ?? SEARCH_CONSOLE_TEMPLATE.fr!;
  seeds.forEach((q, i) => add(make(q), "contenu_search_console", i));

  return out;
}
