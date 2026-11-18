import { hostOf } from "@/features/audits/excluded-domains";
import { COLLECTION_LIMITS } from "./limits";
import type { ResourceCandidate } from "./resource-judge";
import type { RawCandidate } from "./types";
import { deadPagesSkipReason, type CompetitorFacts } from "./worth";

/**
 * Ressources comparables d'un site (MC.6a) : les sites que les autres citent pour le même besoin, c'est-à-dire
 * ce que propose le site lui-même. Deux origines, sans règle propre à un thème :
 *
 * 1. Les concurrents RETENUS par l'audit (ils sortent sur les recherches par sujet du site, M1.3), du plus au
 *    moins pertinent. Écartés d'avance, gratuitement : un site géant (ses citations sont des pages de gros
 *    médias) et un site d'une autre langue (même règle que les pages disparues, `worth.ts`).
 * 2. Les sites qui sortent sur AU MOINS N recherches par sujet de la collecte et qui ne sont pas des
 *    concurrents déjà connus (ils complètent les places restantes ; le coût annoncé est celui de TOUTES les places).
 *
 * Tout vient de la campagne (concurrents, recherches construites sur le profil et les pages du site, langue) :
 * aucun domaine, mot ou seuil propre à un thème.
 */

export interface PlannedResources {
  /** Concurrents de l'audit proposés au choix (au plus 12), avec ce qu'on en sait. */
  pool: { domain: string; referringDomains: number | null; sampleUrl: string | null }[];
  /** Repli sans jugement : les premiers concurrents du lot (au plus `max`), du plus au moins pertinent. */
  resources: string[];
  /** Nombre maximal de ressources interrogées (places réservées dans le coût annoncé). */
  max: number;
  /** Concurrents non retenus comme ressource, avec la raison lisible. */
  skipped: { domain: string; reason: string }[];
}

/** Ressources issues des concurrents de l'audit, à figer dans le plan de collecte. */
export function planResources(input: {
  competitorDomains: readonly string[];
  competitors?: readonly CompetitorFacts[];
  /**
   * Concurrents que l'audit n'a PAS retenus (MC.6b), du plus au moins pertinent. Ils sont proposés au
   * choix du modèle après les retenus : l'audit retient ceux qui se classent le mieux sur les recherches
   * du site, pas ceux qui proposent la même chose. Jamais utilisés par le repli sans jugement.
   */
  otherCompetitors?: readonly CompetitorFacts[];
  language?: string;
  max?: number;
}): PlannedResources {
  const max = input.max ?? COLLECTION_LIMITS.citations.maxResources;
  const facts = new Map(
    [...(input.otherCompetitors ?? []), ...(input.competitors ?? [])].map((c) => [c.domain, c]),
  );
  const pool: PlannedResources["pool"] = [];
  const skipped: { domain: string; reason: string }[] = [];
  const retained = [...input.competitorDomains];
  const others = (input.otherCompetitors ?? [])
    .map((c) => c.domain)
    .filter((d) => !retained.includes(d));
  for (const domain of [...retained, ...others]) {
    if (pool.length >= COLLECTION_LIMITS.citations.poolSize) break;
    const f = facts.get(domain);
    const reason = f && input.language ? deadPagesSkipReason(f, input.language) : null;
    if (reason) skipped.push({ domain, reason });
    else
      pool.push({
        domain,
        referringDomains: f?.referringDomains ?? null,
        sampleUrl: f?.sampleUrl ?? null,
      });
  }
  // Repli sans jugement : seulement des concurrents retenus par l'audit, comme avant.
  const fallback = pool.filter((p) => retained.includes(p.domain)).slice(0, max);
  return { pool, resources: fallback.map((p) => p.domain), max, skipped };
}

const sameSite = (a: string, b: string) => a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);

/**
 * Complète les ressources avec les sites qui sortent sur plusieurs recherches par sujet (origine 2). Les bruts
 * viennent de la phase SERP de la collecte (déjà filtrés : ni le site, ni un concurrent, ni une plateforme,
 * ni un géant). Ordre : nombre de recherches distinctes, puis meilleur rang, puis domaine (déterministe).
 */
export function resourcesFromSearches(
  raws: readonly RawCandidate[],
  taken: readonly string[],
  slots: number,
  language: string,
  minQueries: number = COLLECTION_LIMITS.citations.minTopicQueries,
): string[] {
  if (slots <= 0) return [];
  const byDomain = new Map<string, { queries: Set<string>; best: number; url: string | null }>();
  for (const r of raws) {
    if (r.source !== "serp" || r.rank === null) continue;
    const cur = byDomain.get(r.domain) ?? { queries: new Set<string>(), best: r.rank, url: r.url };
    cur.queries.add(r.query ?? "");
    if (r.rank < cur.best) cur.best = r.rank;
    byDomain.set(r.domain, cur);
  }
  return [...byDomain.entries()]
    .filter(([domain, v]) => {
      if (v.queries.size < minQueries) return false;
      if (taken.some((t) => sameSite(hostOf(t), domain))) return false;
      return !deadPagesSkipReason({ domain, referringDomains: null, sampleUrl: v.url }, language);
    })
    .sort(
      (a, b) =>
        b[1].queries.size - a[1].queries.size || a[1].best - b[1].best || a[0].localeCompare(b[0]),
    )
    .slice(0, slots)
    .map(([domain]) => domain);
}

/**
 * Sites vus sur les recherches par sujet de la collecte, proposés au choix du modèle : ceux qui sortent sur au
 * moins N recherches, ou très haut (rang 5 ou mieux). Même filtre de langue et de taille que le repli.
 */
export function searchCandidates(
  raws: readonly RawCandidate[],
  taken: readonly string[],
  language: string,
  limit: number,
): ResourceCandidate[] {
  const byDomain = new Map<
    string,
    { queries: Set<string>; best: number; url: string | null; title: string | null }
  >();
  for (const r of raws) {
    if (r.source !== "serp" || r.rank === null) continue;
    const cur = byDomain.get(r.domain) ?? {
      queries: new Set<string>(),
      best: r.rank,
      url: r.url,
      title: r.title,
    };
    cur.queries.add(r.query ?? "");
    if (r.rank < cur.best) {
      cur.best = r.rank;
      cur.url = r.url;
      cur.title = r.title;
    }
    byDomain.set(r.domain, cur);
  }
  return [...byDomain.entries()]
    .filter(([domain, v]) => {
      if (v.queries.size < COLLECTION_LIMITS.citations.minTopicQueries && v.best > 5) return false;
      if (taken.some((t) => sameSite(hostOf(t), domain))) return false;
      return !deadPagesSkipReason({ domain, referringDomains: null, sampleUrl: v.url }, language);
    })
    .sort(
      (a, b) =>
        b[1].queries.size - a[1].queries.size || a[1].best - b[1].best || a[0].localeCompare(b[0]),
    )
    .slice(0, limit)
    .map(([domain, v]) => ({
      domain,
      title: v.title,
      url: v.url,
      queries: v.queries.size,
      origin: "recherche" as const,
      referringDomains: null,
    }));
}
