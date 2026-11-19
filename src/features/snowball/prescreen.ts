import type { ResourceCandidate } from "@/features/collection/resource-judge";

/**
 * Pré-tri des graines (jalon MR.1, spec `docs/jalon-recherche-cibles.md`, E2 et E3). Pur : aucun appel.
 *
 * - `withReferringDomains` range dans chaque candidat le nombre de domaines citants, lu sur l'endpoint
 *   `backlinks/bulk_referring_domains` (un appel pour plusieurs sites, coût annoncé par l'appelant).
 * - `prescreenSeeds` ne garde que les sites dont la taille connue atteint le seuil. Un site sans taille
 *   connue est écarté : on ne paie pas une recherche sur un site dont on ne sait rien.
 * - `rankSeeds` classe les graines SANS ordre alphabétique : nombre de pages qui citent le site, puis nombre
 *   de domaines citants, puis nom de domaine seulement pour départager des ex æquo à l'identique.
 *
 * Le seuil (10) est un point à valider, pas une règle métier : il est ici, pas dans la logique.
 */
export const PRESCREEN_LIMITS = {
  /** Domaines citants minimum pour qu'un site soit interrogé (proposition, à valider). */
  minReferringDomains: 10,
} as const;

/** Ligne de `bulk_referring_domains` utile au pré-tri (le reste de la réponse est ignoré). */
export interface BulkReferringRow {
  target: string;
  referring_domains: number | null;
}

/** Forme d'un domaine pour la comparaison : minuscules, sans `www.` ni point final. */
export function normalizeDomain(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** Renseigne `referringDomains` de chaque candidat à partir des lignes de l'endpoint (sans écraser une valeur déjà connue). */
export function withReferringDomains(
  candidates: readonly ResourceCandidate[],
  rows: readonly BulkReferringRow[],
): ResourceCandidate[] {
  const byDomain = new Map<string, number | null>();
  for (const row of rows) {
    byDomain.set(normalizeDomain(row.target), row.referring_domains);
  }
  return candidates.map((c) => {
    if (c.referringDomains !== null) return c;
    const known = byDomain.get(normalizeDomain(c.domain));
    return known === undefined ? c : { ...c, referringDomains: known };
  });
}

/** Sites interrogeables : taille connue et au moins le seuil de domaines citants. */
export function prescreenSeeds(
  candidates: readonly ResourceCandidate[],
  minReferringDomains: number = PRESCREEN_LIMITS.minReferringDomains,
): ResourceCandidate[] {
  return candidates.filter(
    (c) => c.referringDomains !== null && c.referringDomains >= minReferringDomains,
  );
}

/** Classement déterministe : pages citantes, puis domaines citants (décroissant), puis nom (égalité seulement). */
export function rankSeeds(candidates: readonly ResourceCandidate[]): ResourceCandidate[] {
  return [...candidates].sort(
    (a, b) =>
      (b.citedBy ?? 0) - (a.citedBy ?? 0) ||
      (b.referringDomains ?? 0) - (a.referringDomains ?? 0) ||
      a.domain.localeCompare(b.domain),
  );
}
