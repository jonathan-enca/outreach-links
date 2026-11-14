import { z } from "zod";

/**
 * Schémas zod des paramètres (noms de champs = ceux de l'API DataForSEO) et des
 * résultats. Les résultats sont "lâches" (champs inconnus conservés) et presque
 * tout est nullable : l'API renvoie souvent des null, on ne casse pas pour ça.
 */

/** Localisation par défaut : France (code DataForSEO 2250), langue française. */
export const DEFAULT_LOCATION_CODE = 2250;
export const DEFAULT_LANGUAGE_CODE = "fr";

const num = z.number().nullish();
const str = z.string().nullish();

/** "https://www.Exemple.fr/page" -> "exemple.fr" (domaine seul, minuscules, sans www). */
export function normalizeDomain(input: string): string {
  const raw = input.trim().toLowerCase();
  const noProto = raw.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const host = noProto.split(/[/?#]/)[0] ?? "";
  return host.replace(/^www\./, "").replace(/:\d+$/, "");
}

const domain = z
  .string()
  .min(3)
  .transform(normalizeDomain)
  .refine((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d), "domaine invalide");

const location = {
  location_code: z.number().int().positive().default(DEFAULT_LOCATION_CODE),
  language_code: z.string().min(2).max(10).default(DEFAULT_LANGUAGE_CODE),
};

/** Filtres DataForSEO : tableau imbriqué libre (ex. ["rank_group", "<=", 10]). */
const filters = z.array(z.unknown()).max(8).optional();
const orderBy = z.array(z.string()).max(3).optional();

// ----- Paramètres -----------------------------------------------------------

export const serpOrganicParams = z.object({
  keyword: z
    .string()
    .min(1)
    .max(700)
    .transform((k) => k.trim().toLowerCase().replace(/\s+/g, " ")),
  ...location,
  /** Nombre de résultats (multiple de 10 facturé par page de 10). */
  depth: z.number().int().min(10).max(100).default(30),
  device: z.enum(["desktop", "mobile"]).default("desktop"),
});

export const rankedKeywordsParams = z.object({
  target: domain,
  ...location,
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  filters,
  order_by: orderBy,
});

export const competitorsDomainParams = z.object({
  target: domain,
  ...location,
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  exclude_top_domains: z.boolean().default(true),
  filters,
  order_by: orderBy,
});

const backlinksBase = {
  target: domain,
  include_subdomains: z.boolean().default(true),
};

export const backlinksSummaryParams = z.object({
  ...backlinksBase,
  exclude_internal_backlinks: z.boolean().default(true),
});

export const bulkReferringDomainsParams = z.object({
  targets: z.array(domain).min(1).max(100),
});

export const referringDomainsParams = z.object({
  ...backlinksBase,
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  exclude_internal_backlinks: z.boolean().default(true),
  backlinks_status_type: z.enum(["all", "live", "lost"]).default("live"),
  filters,
  order_by: orderBy,
});

export const backlinksListParams = z.object({
  ...backlinksBase,
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  mode: z.enum(["as_is", "one_per_domain", "one_per_anchor"]).default("one_per_domain"),
  exclude_internal_backlinks: z.boolean().default(true),
  backlinks_status_type: z.enum(["all", "live", "lost"]).default("live"),
  filters,
  order_by: orderBy,
});

export const domainIntersectionParams = z.object({
  /** Domaines à croiser, au moins 2 (clés "1", "2", ... construites par le client). */
  targets: z.array(domain).min(2).max(20),
  exclude_targets: z.array(domain).max(20).default([]),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  include_subdomains: z.boolean().default(true),
  filters,
  order_by: orderBy,
});

export const instantPagesParams = z.object({
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u.trim()), "URL http(s) uniquement")
    .transform((u) => u.trim()),
  enable_javascript: z.boolean().default(false),
});

export const taskGetParams = z.object({ id: z.string().min(8) });

// ----- Résultats ------------------------------------------------------------

const serpItem = z.looseObject({
  type: z.string(),
  rank_group: num,
  rank_absolute: num,
  domain: str,
  title: str,
  description: str,
  url: str,
  breadcrumb: str,
});

export const serpResult = z.looseObject({
  keyword: z.string(),
  type: str,
  se_domain: str,
  location_code: num,
  language_code: str,
  check_url: str,
  datetime: str,
  se_results_count: num,
  items_count: num,
  items: z.array(serpItem).nullish(),
});

export const rankedKeywordsResult = z.looseObject({
  target: str,
  total_count: num,
  items_count: num,
  items: z
    .array(
      z.looseObject({
        keyword_data: z.looseObject({
          keyword: z.string(),
          keyword_info: z.looseObject({ search_volume: num }).nullish(),
        }),
        ranked_serp_element: z
          .looseObject({
            serp_item: z
              .looseObject({
                rank_group: num,
                rank_absolute: num,
                url: str,
                etv: num,
              })
              .nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
});

export const competitorsDomainResult = z.looseObject({
  target: str,
  total_count: num,
  items_count: num,
  items: z
    .array(
      z.looseObject({
        domain: z.string(),
        avg_position: num,
        sum_position: num,
        intersections: num,
        metrics: z.looseObject({}).nullish(),
        full_domain_metrics: z.looseObject({}).nullish(),
      }),
    )
    .nullish(),
});

export const backlinksSummaryResult = z.looseObject({
  target: str,
  rank: num,
  backlinks: num,
  backlinks_spam_score: num,
  referring_domains: num,
  referring_main_domains: num,
  referring_pages: num,
  broken_backlinks: num,
  broken_pages: num,
  first_seen: str,
});

export const bulkReferringDomainsResult = z.looseObject({
  items_count: num,
  items: z.array(z.looseObject({ target: str, referring_domains: num.nullish() })).nullish(),
});

export const referringDomainsResult = z.looseObject({
  target: str,
  total_count: num,
  items_count: num,
  items: z
    .array(
      z.looseObject({
        domain: z.string(),
        rank: num,
        backlinks: num,
        backlinks_spam_score: num,
        first_seen: str,
        referring_pages: num,
      }),
    )
    .nullish(),
});

export const backlinksListResult = z.looseObject({
  target: str,
  total_count: num,
  items_count: num,
  items: z
    .array(
      z.looseObject({
        type: str,
        domain_from: z.string(),
        url_from: z.string(),
        domain_to: str,
        url_to: str,
        anchor: str,
        dofollow: z.boolean().nullish(),
        is_broken: z.boolean().nullish(),
        rank: num,
        page_from_rank: num,
        backlink_spam_score: num,
        first_seen: str,
        last_seen: str,
      }),
    )
    .nullish(),
});

export const domainIntersectionResult = z.looseObject({
  total_count: num,
  items_count: num,
  items: z
    .array(
      z.looseObject({
        /** Clés "1", "2"... = position de la cible dans la requête. */
        domain_intersection: z.record(z.string(), z.looseObject({}).nullish()),
        summary: z.record(z.string(), z.looseObject({}).nullish()).nullish(),
      }),
    )
    .nullish(),
});

export const instantPagesResult = z.looseObject({
  crawl_progress: str,
  items_count: num,
  items: z
    .array(
      z.looseObject({
        url: str,
        status_code: num,
        resource_type: str,
        onpage_score: num,
        meta: z.looseObject({ title: str }).nullish(),
        checks: z.record(z.string(), z.unknown()).nullish(),
      }),
    )
    .nullish(),
});

export const taskPostResult = z.looseObject({}).nullish();

// ----- Enveloppe ------------------------------------------------------------

export const taskEnvelope = z.looseObject({
  id: z.string().nullish(),
  status_code: z.number(),
  status_message: z.string().nullish(),
  cost: z.number().nullish(),
  result_count: num,
  result: z.array(z.unknown()).nullish(),
});

export const responseEnvelope = z.looseObject({
  version: str,
  status_code: z.number(),
  status_message: z.string().nullish(),
  cost: z.number().nullish(),
  tasks_count: num,
  tasks_error: num,
  tasks: z.array(taskEnvelope).nullish(),
});

export type ResponseEnvelope = z.infer<typeof responseEnvelope>;
export type SerpResult = z.infer<typeof serpResult>;
export type RankedKeywordsResult = z.infer<typeof rankedKeywordsResult>;
export type CompetitorsDomainResult = z.infer<typeof competitorsDomainResult>;
export type BacklinksSummaryResult = z.infer<typeof backlinksSummaryResult>;
export type ReferringDomainsResult = z.infer<typeof referringDomainsResult>;
export type BacklinksListResult = z.infer<typeof backlinksListResult>;
export type DomainIntersectionResult = z.infer<typeof domainIntersectionResult>;
export type InstantPagesResult = z.infer<typeof instantPagesResult>;
