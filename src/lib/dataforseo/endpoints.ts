import { z } from "zod";
import * as s from "./schemas";

/**
 * Registre des endpoints DataForSEO utilisés. Chaque entrée porte son schéma de
 * paramètres, son schéma de résultat, sa construction de requête et son estimation
 * de coût. Les tarifs sont ceux de la grille publique (USD) au moment de l'écriture
 * [HYPOTHÈSE] : le coût RÉEL renvoyé par l'API fait foi dans cost_ledger, l'écart
 * estimé / réel sert à les recaler.
 */

export type EndpointSpec<P extends z.ZodType, R extends z.ZodType> = {
  /** Identifiant stable (cache, cost_ledger.operation). */
  name: string;
  method: "POST" | "GET";
  path: (p: z.output<P>) => string;
  params: P;
  result: R;
  /** Corps JSON (sans l'enveloppe tableau). Absent pour un GET. */
  body?: (p: z.output<P>) => Record<string, unknown>;
  /** Code de statut de tâche accepté en succès (20000 en live, 20100 pour task_post). */
  okStatus: number;
  cacheable: boolean;
  /** Coût estimé en USD pour ces paramètres. */
  estimate: (p: z.output<P>) => number;
};

/** Arrondi à 6 décimales (colonne numeric(12,6)). */
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

export const PRICING = {
  /** SERP live advanced : par page de 10 résultats. */
  serpLivePerPage: 0.002,
  /** SERP file standard (différé) : par page de 10 résultats. */
  serpQueuePerPage: 0.0006,
  /** Labs : forfait par requête + par ligne renvoyée. */
  labsPerRequest: 0.01,
  labsPerItem: 0.0001,
  /** Backlinks : forfait par requête + par ligne renvoyée. */
  backlinksPerRequest: 0.02,
  backlinksPerRow: 0.00003,
  /** OnPage instant pages : par page analysée. */
  onpagePerPage: 0.000125,
} as const;

const pages = (depth: number) => Math.ceil(depth / 10);

const defineSpec = <P extends z.ZodType, R extends z.ZodType>(spec: EndpointSpec<P, R>) => spec;

export const endpoints = {
  serpOrganicLive: defineSpec({
    name: "serp.organic.live",
    method: "POST",
    path: () => "/v3/serp/google/organic/live/advanced",
    params: s.serpOrganicParams,
    result: s.serpResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(pages(p.depth) * PRICING.serpLivePerPage),
  }),
  serpOrganicTaskPost: defineSpec({
    name: "serp.organic.task_post",
    method: "POST",
    path: () => "/v3/serp/google/organic/task_post",
    params: s.serpOrganicParams,
    result: s.taskPostResult,
    body: (p) => ({ ...p }),
    okStatus: 20100,
    cacheable: false,
    estimate: (p) => r6(pages(p.depth) * PRICING.serpQueuePerPage),
  }),
  serpOrganicTaskGet: defineSpec({
    name: "serp.organic.task_get",
    method: "GET",
    path: (p) => `/v3/serp/google/organic/task_get/advanced/${encodeURIComponent(p.id)}`,
    params: s.taskGetParams,
    result: s.serpResult,
    okStatus: 20000,
    cacheable: false,
    // La tâche est déjà facturée au task_post.
    estimate: () => 0,
  }),
  labsRankedKeywords: defineSpec({
    name: "labs.ranked_keywords",
    method: "POST",
    path: () => "/v3/dataforseo_labs/google/ranked_keywords/live",
    params: s.rankedKeywordsParams,
    result: s.rankedKeywordsResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(PRICING.labsPerRequest + p.limit * PRICING.labsPerItem),
  }),
  labsCompetitorsDomain: defineSpec({
    name: "labs.competitors_domain",
    method: "POST",
    path: () => "/v3/dataforseo_labs/google/competitors_domain/live",
    params: s.competitorsDomainParams,
    result: s.competitorsDomainResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(PRICING.labsPerRequest + p.limit * PRICING.labsPerItem),
  }),
  backlinksSummary: defineSpec({
    name: "backlinks.summary",
    method: "POST",
    path: () => "/v3/backlinks/summary/live",
    params: s.backlinksSummaryParams,
    result: s.backlinksSummaryResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: () => PRICING.backlinksPerRequest,
  }),
  /** Taille (domaines référents) de plusieurs cibles en UN appel (MA.2). */
  backlinksBulkReferringDomains: defineSpec({
    name: "backlinks.bulk_referring_domains",
    method: "POST",
    path: () => "/v3/backlinks/bulk_referring_domains/live",
    params: s.bulkReferringDomainsParams,
    result: s.bulkReferringDomainsResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(PRICING.backlinksPerRequest + p.targets.length * PRICING.backlinksPerRow),
  }),
  backlinksReferringDomains: defineSpec({
    name: "backlinks.referring_domains",
    method: "POST",
    path: () => "/v3/backlinks/referring_domains/live",
    params: s.referringDomainsParams,
    result: s.referringDomainsResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(PRICING.backlinksPerRequest + p.limit * PRICING.backlinksPerRow),
  }),
  backlinksBacklinks: defineSpec({
    name: "backlinks.backlinks",
    method: "POST",
    path: () => "/v3/backlinks/backlinks/live",
    params: s.backlinksListParams,
    result: s.backlinksListResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(PRICING.backlinksPerRequest + p.limit * PRICING.backlinksPerRow),
  }),
  backlinksDomainIntersection: defineSpec({
    name: "backlinks.domain_intersection",
    method: "POST",
    path: () => "/v3/backlinks/domain_intersection/live",
    params: s.domainIntersectionParams,
    result: s.domainIntersectionResult,
    body: ({ targets, exclude_targets, ...rest }) => ({
      ...rest,
      // L'API attend un objet { "1": "a.fr", "2": "b.fr" }.
      targets: Object.fromEntries(targets.map((t, i) => [String(i + 1), t])),
      ...(exclude_targets.length ? { exclude_targets } : {}),
    }),
    okStatus: 20000,
    cacheable: true,
    estimate: (p) => r6(PRICING.backlinksPerRequest + p.limit * PRICING.backlinksPerRow),
  }),
  onpageInstantPages: defineSpec({
    name: "onpage.instant_pages",
    method: "POST",
    path: () => "/v3/on_page/instant_pages",
    params: s.instantPagesParams,
    result: s.instantPagesResult,
    body: (p) => ({ ...p }),
    okStatus: 20000,
    cacheable: true,
    estimate: () => PRICING.onpagePerPage,
  }),
} as const;

export type EndpointKey = keyof typeof endpoints;
export type EndpointInput<K extends EndpointKey> = z.input<(typeof endpoints)[K]["params"]>;
export type EndpointResult<K extends EndpointKey> = z.output<(typeof endpoints)[K]["result"]>;

/**
 * Estimation du coût AVANT lancement (USD), à afficher dans l'écran « coût estimé
 * + confirmer » et à comparer ensuite au coût réel du cost_ledger.
 */
export function estimateCost<K extends EndpointKey>(key: K, input: EndpointInput<K>): number {
  const spec = endpoints[key] as EndpointSpec<z.ZodType, z.ZodType>;
  return spec.estimate(spec.params.parse(input));
}

/** Somme des estimations d'un plan d'appels (ex. un audit complet). */
export function estimateBatch(
  calls: { [K in EndpointKey]: { key: K; params: EndpointInput<K> } }[EndpointKey][],
): number {
  return r6(calls.reduce((sum, c) => sum + estimateCost(c.key, c.params as never), 0));
}
