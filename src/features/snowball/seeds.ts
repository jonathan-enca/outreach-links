import { hostOf } from "@/features/audits/excluded-domains";
import { acceptDomain } from "@/features/collection/normalize";
import type { ResourceCandidate } from "@/features/collection/resource-judge";
import type { CollectionContext } from "@/features/collection/types";
import type { LlmJudgement, PageCites } from "@/features/qualification/types";
import { TARGET_SITUATIONS } from "@/features/qualification/types";
import { SNOWBALL_LIMITS } from "./limits";

/** Ce que la boule de neige lit d'une page déjà qualifiée (compact, sans le texte de la page). */
export interface SeedSource {
  domain: string;
  /** Verdict du premier passage : situation jugée (absente = page non jugée). */
  situation: NonNullable<LlmJudgement["situation"]> | null;
  /** Motif d'exclusion éventuel (page légale, ferme à liens...). */
  reason: string | null;
  /** Ce que la page cite (relevé gratuit à la lecture). */
  cites: PageCites | null;
}

const sameSite = (a: string, b: string) => a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);

/** Motifs qui disent que la page n'est pas une vraie citation : ses liens ne sont pas des graines. */
const BAD_PAGE_REASONS: ReadonlySet<string> = new Set([
  "page_legale",
  "ferme_a_liens",
  "page_commerciale",
  "vend_des_liens",
  "pirate",
  "parque",
]);

/** Une page est une cible du premier passage si son jugement montre une des trois situations. */
export const isTargetPage = (s: Pick<SeedSource, "situation">): boolean =>
  s.situation !== null && TARGET_SITUATIONS.has(s.situation);

/**
 * Sites cités par un ensemble de pages (pur) : un par domaine, avec le nombre de pages qui le citent.
 * Jamais le site lui-même, un concurrent, une plateforme, un site géant ou une ressource déjà interrogée,
 * ni le site de la page qui cite (un site ne se cite pas lui-même). Ordre : le plus cité d'abord, puis domaine.
 */
export function citedSites(
  pages: readonly SeedSource[],
  ctx: CollectionContext,
  used: readonly string[],
  minCitedBy: number = 1,
): { domain: string; citedBy: number }[] {
  const count = new Map<string, Set<string>>();
  for (const p of pages) {
    for (const link of p.cites?.links ?? []) {
      const domain = acceptDomain(link.domain, ctx);
      if (!domain || sameSite(hostOf(domain), hostOf(p.domain))) continue;
      if (used.some((u) => sameSite(hostOf(u), domain))) continue;
      const set = count.get(domain) ?? new Set<string>();
      set.add(p.domain);
      count.set(domain, set);
    }
  }
  return [...count.entries()]
    .map(([domain, set]) => ({ domain, citedBy: set.size }))
    .filter((x) => x.citedBy >= minCitedBy)
    .sort((a, b) => b.citedBy - a.citedBy || a.domain.localeCompare(b.domain));
}

const asCandidates = (xs: { domain: string; citedBy: number }[]): ResourceCandidate[] =>
  xs.slice(0, SNOWBALL_LIMITS.maxSeedCandidates).map((x) => ({
    domain: x.domain,
    title: null,
    url: null,
    queries: 0,
    origin: "citee" as const,
    citedBy: x.citedBy,
    referringDomains: null,
  }));

/** Graines : sites cités par les pages que le premier passage a retenues comme cibles. */
export function seedCandidates(
  pages: readonly SeedSource[],
  ctx: CollectionContext,
  used: readonly string[],
): ResourceCandidate[] {
  return asCandidates(citedSites(pages.filter(isTargetPage), ctx, used));
}

/**
 * Repli : sites cités par TOUTES les pages lues qui ne sont ni légales ni fermes à liens (même quand aucune
 * n'est une cible). Les plus cités d'abord ; le modèle ne garde que les services publics et gratuits.
 */
export function publicCandidates(
  pages: readonly SeedSource[],
  ctx: CollectionContext,
  used: readonly string[],
): ResourceCandidate[] {
  const readable = pages.filter((p) => !(p.reason && BAD_PAGE_REASONS.has(p.reason)));
  return asCandidates(citedSites(readable, ctx, used, SNOWBALL_LIMITS.minCitedByFallback));
}
